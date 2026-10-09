/**
 * Guardrails: model output may only use numbers and technologies that exist in
 * the facts bank, titles never rise above the title on record, and the summary
 * opens with the target job's title. Pure functions so they can be unit-tested
 * without the API.
 */
import { FACTS, SKILLS } from "./facts.js";
import { LOCKED } from "./locked.js";

const NUMBER = /\d+(?:[.,]\d+)*[KkMm]?/g;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const normalize = (s) => s.toLowerCase().replace(/,/g, "");

const factsText = (employerId) => normalize((FACTS[employerId] || []).join(" "));

/** "30,000", "30K" and "30000" all become 30000, so only whole numbers match (not "30" inside "30,000"). */
function numberValue(token) {
  const match = normalize(token).match(/^(\d+(?:\.\d+)?)([km])?$/);
  if (!match) return NaN;
  return Number(match[1]) * ({ k: 1e3, m: 1e6 }[match[2]] ?? 1);
}
const numbersIn = (text) => new Set((text.match(NUMBER) || []).map(numberValue));

const allFactsNumbers = numbersIn(Object.values(FACTS).flat().join(" ") + " 7+");

function mentions(text, term) {
  return new RegExp(`(?<![\\w])${escape(term)}(?![\\w])`, "i").test(text);
}

/** Problems with one bullet written for one employer (empty array = OK). */
export function checkBullet(bullet, employerId) {
  const problems = [];
  const facts = factsText(employerId);
  if (!facts) return [`no facts for ${employerId}`];
  const known = numbersIn(facts);
  for (const n of bullet.match(NUMBER) || []) {
    if (!known.has(numberValue(n))) problems.push(`number "${n}" not in ${employerId} facts`);
  }
  for (const term of SKILLS) {
    if (mentions(bullet, term) && !mentions(facts, term)) problems.push(`"${term}" not in ${employerId} facts`);
  }
  return problems;
}

const LEVEL_WORDS = /\b(senior|sr|lead|principal|staff|head|director|manager|vp|vice president|chief|architect|junior|jr|intern)\b/gi;
const AI_TITLE = /\b(ai|ml|llm|llms|generative|genai|nlp|machine learning|deep learning|data scientist)\b/i;
const AI_FACT = /\b(ai|ml|llm|llms|rag|agents?|embeddings?|machine learning|generative)\b/i;
const CLAIMED_LEVEL = /\b(principal|staff|director|manager|vp|vice president|chief|head of)\b/i;

/**
 * Problems with a suggested job title for `employer` ({ id, recordTitle }).
 * A title may be reworded for the job but must describe the work in that
 * employer's facts and never be more senior than the title on record.
 */
export function checkTitle(title, employer) {
  const problems = [];
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 6) problems.push("title should be 2-6 words");
  if (!/^[A-Za-z][A-Za-z &/,.()+'-]*$/.test(title)) problems.push("title has digits or odd characters");
  for (const level of title.match(LEVEL_WORDS) || []) {
    if (!mentions(employer.recordTitle, level)) problems.push(`level word "${level}" is not on the title on record`);
  }
  if (/part-time/i.test(employer.recordTitle) && !/part[- ]time/i.test(title)) problems.push('title must keep "(Part-Time)"');
  if (AI_TITLE.test(title) && !AI_FACT.test(FACTS[employer.id].join(" "))) problems.push("no AI work in this role's facts");
  return problems;
}

/**
 * The target job's title, cleaned up to open the summary: drops "(Remote)",
 * "- Location" tails and levels above senior. Falls back when little is left.
 */
export function headlineFrom(roleTitle, fallback) {
  const cleaned = String(roleTitle || "")
    .replace(/\([^)]*\)/g, " ")
    .split(/\s[-–—|@]\s/)[0]
    .replace(/\b(principal|staff|lead|head of|director of|director|manager|vp of|vp|vice president of|vice president|chief)\b/gi, " ")
    .replace(/\b(I{1,3}|IV|V|L\d)\s*$/, " ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,:;-]+|[\s,:;-]+$/g, "");
  const words = cleaned.split(" ").filter(Boolean);
  return words.length >= 2 && words.length <= 8 ? cleaned : fallback;
}

/** Problems with the summary: unknown numbers, claimed seniority, or not opening with the target title. */
export function checkSummary(summary, { headline } = {}) {
  const problems = (summary.match(NUMBER) || [])
    .filter((n) => !allFactsNumbers.has(numberValue(n)))
    .map((n) => `summary number "${n}" not in facts`);
  const claimed = summary.match(CLAIMED_LEVEL)?.[0];
  if (claimed) problems.push(`summary claims "${claimed}"`);
  return problems;
}

const opensWith = (summary, headline) => summary.toLowerCase().startsWith(headline.toLowerCase());

/**
 * Clean a raw tailor() response. Returns the safe result plus any violations
 * that were found (so the caller can retry once with feedback).
 * - bullets that fail are dropped; employers without facts get none
 * - a title that breaks the rules falls back to the title on record
 * - the summary must open with `headline`; if it doesn't, it is prefixed with it
 * - skills are limited to SKILLS (case-normalised, de-duplicated)
 * - locked fields (company names, dates, education) are never read from the model
 */
export function sanitizeTailor(raw, { headline } = {}) {
  const violations = [];
  const bullets = {};
  const titles = {};
  for (const e of LOCKED.employers) {
    const kept = [];
    for (const b of (raw.bullets?.[e.id] || []).map((x) => String(x).trim()).filter(Boolean)) {
      const problems = checkBullet(b, e.id);
      if (problems.length) violations.push({ employer: e.id, bullet: b, problems });
      else kept.push(b);
    }
    bullets[e.id] = kept.slice(0, 4);

    const title = String(raw.titles?.[e.id] ?? "").replace(/\s+/g, " ").trim();
    const problems = title ? checkTitle(title, e) : ["no title given"];
    if (problems.length) violations.push({ employer: e.id, kind: "title", bullet: title, problems });
    titles[e.id] = problems.length ? e.recordTitle : title;
  }

  let summary = String(raw.summary || "").trim();
  const summaryProblems = checkSummary(summary, { headline });
  if (summaryProblems.length) {
    violations.push({ employer: "summary", bullet: summary, problems: summaryProblems });
    summary = "";
  } else if (headline && summary && !opensWith(summary, headline)) {
    violations.push({ employer: "summary", bullet: summary, problems: [`summary must start with "${headline}"`] });
    summary = `${headline}: ${summary}`;
  }

  const byLower = new Map(SKILLS.map((s) => [s.toLowerCase(), s]));
  const skills = [...new Set((raw.skillOrder || []).map((s) => byLower.get(String(s).toLowerCase())).filter(Boolean))];
  return { result: { summary, skills, bullets, titles }, violations };
}

/** Deterministic coverage of JD keywords against the facts bank + skills. */
export function scoreMatch(keywords) {
  const corpus = normalize(Object.values(FACTS).flat().join(" ") + " " + SKILLS.join(" "));
  let got = 0;
  let total = 0;
  const covered = [];
  const gaps = [];
  for (const k of keywords) {
    const weight = k.required ? 2 : 1;
    total += weight;
    if (mentions(corpus, k.term)) {
      got += weight;
      covered.push(k.term);
    } else gaps.push(k.term);
  }
  return { score: total ? Math.round((100 * got) / total) : 0, covered, gaps };
}
