/**
 * Guardrails for the tailored résumé. Everything is checked against the
 * profile read from the uploaded draft:
 *  - a line rewritten from the draft may not add numbers or tools the draft lacks;
 *  - a line the AI wrote with no facts to go on ("AI draft") may not contain
 *    numbers, named tools, or leadership/award claims, since none can be checked;
 *  - titles never go above the level in the draft, and the summary opens with
 *    the target job's title without claiming seniority the draft doesn't show.
 * Pure functions so they can be unit-tested without the API.
 */
import { employerText, profileText } from "./profile.js";
import { TECH_TERMS, termsIn } from "./vocabulary.js";

const NUMBER = /\d+(?:[.,]\d+)*[KkMm]?/g;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const normalize = (s) => s.toLowerCase().replace(/,/g, "");

/** "30,000", "30K" and "30000" all become 30000, so only whole numbers match (not "30" inside "30,000"). */
function numberValue(token) {
  const match = normalize(token).match(/^(\d+(?:\.\d+)?)([km])?$/);
  if (!match) return NaN;
  return Number(match[1]) * ({ k: 1e3, m: 1e6 }[match[2]] ?? 1);
}
const numbersIn = (text) => new Set((text.match(NUMBER) || []).map(numberValue));

function mentions(text, term) {
  return new RegExp(`(?<![\\w])${escape(term)}(?![\\w])`, "i").test(text);
}

const LEVEL_WORDS = /\b(senior|sr|lead|principal|staff|head|director|manager|vp|vice president|chief|architect|junior|jr|intern)\b/gi;
const CLAIMED_LEVEL = /\b(principal|staff|director|manager|vp|vice president|chief|head of)\b/i;
const AI_TITLE = /\b(ai|ml|llm|llms|generative|genai|nlp|machine learning|deep learning|data scientist)\b/i;
const AI_TEXT = /\b(ai|ml|llm|llms|rag|agents?|embeddings?|machine learning|generative|nlp|deep learning|data scien\w+)\b/i;
const CLAIMS = /\b(led|leading|lead|managed|managing|mentored|mentoring|supervised|directed|oversaw|headed|founded|owned|spearheaded|award|awarded|promoted|ranked)\b/i;

/**
 * Problems with one bullet written for `employer` (empty array = OK).
 * With draft bullets the line is a rewrite of them; without, it is an AI draft.
 */
export function checkBullet(bullet, employer) {
  const problems = [];
  const words = bullet.split(/\s+/).filter(Boolean).length;
  if (words < 5 || words > 50) problems.push("a bullet should be 5-50 words");
  if (employer.bullets.length) {
    const text = employerText(employer);
    const known = numbersIn(text);
    for (const n of bullet.match(NUMBER) || []) {
      if (!known.has(numberValue(n))) problems.push(`number "${n}" is not in the draft for ${employer.name}`);
    }
    const draftTerms = termsIn(text);
    for (const term of termsIn(bullet)) {
      if (!draftTerms.has(term)) problems.push(`"${term}" is not in the draft for ${employer.name}`);
    }
  } else {
    if (/\d/.test(bullet)) problems.push("AI-drafted lines can't contain numbers");
    if (CLAIMS.test(bullet)) problems.push("AI-drafted lines can't claim leadership, ownership or awards");
    const tools = termsIn(bullet);
    if (tools.size) problems.push(`AI-drafted lines can't name tools (${[...tools].join(", ")})`);
  }
  return problems;
}

/**
 * Problems with a suggested job title for `employer`. A title may be reworded
 * for the job but never rises above the draft's level, and AI wording is only
 * allowed where the draft shows AI work (or shows nothing at all).
 */
export function checkTitle(title, employer) {
  const problems = [];
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 6) problems.push("title should be 2-6 words");
  if (!/^[A-Za-z][A-Za-z &/,.()+'-]*$/.test(title)) problems.push("title has digits or odd characters");
  for (const level of title.match(LEVEL_WORDS) || []) {
    if (!mentions(employer.title, level)) problems.push(`level word "${level}" is not on the title in the draft`);
  }
  if (/part-time/i.test(employer.title) && !/part[- ]time/i.test(title)) problems.push('title must keep "(Part-Time)"');
  const text = employerText(employer).trim();
  if (text && AI_TITLE.test(title) && !AI_TEXT.test(text)) problems.push("no AI work in this role's draft");
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

/** Problems with the summary: numbers, tools or seniority the draft doesn't show. */
export function checkSummary(summary, profile, years) {
  const text = profileText(profile);
  const known = numbersIn(`${text} ${years}`);
  const problems = (summary.match(NUMBER) || [])
    .filter((n) => !known.has(numberValue(n)))
    .map((n) => `summary number "${n}" is not in the draft`);
  const claimed = summary.match(CLAIMED_LEVEL)?.[0];
  if (claimed && !CLAIMED_LEVEL.test(text)) problems.push(`summary claims "${claimed}"`);
  const draftTerms = termsIn(text);
  for (const term of termsIn(summary)) if (!draftTerms.has(term)) problems.push(`summary names "${term}", which is not in the draft`);
  return problems;
}

const opensWith = (summary, headline) => summary.toLowerCase().startsWith(headline.toLowerCase());

/**
 * Clean a raw tailor() response. Returns the safe result plus any violations
 * found (so the caller can retry once with feedback).
 * - lines that break the rules are dropped; if every rewritten line of a company
 *   is dropped, its own draft bullets are kept
 * - a title that breaks the rules falls back to the draft's title (or none)
 * - the summary must open with `headline`; if it doesn't, it is prefixed with it
 * - skills come from the draft; with none in the draft, up to 12 suggestions from
 *   the vocabulary are allowed and flagged
 * - `ai` says which parts the AI wrote without facts, so the page can flag them
 * - company names, dates and education are never read from the model
 */
export function sanitizeTailor(raw, profile, { headline = "", years = 0 } = {}) {
  const violations = [];
  const bullets = {};
  const titles = {};
  const ai = { bullets: {}, titles: {}, skills: false };

  for (const e of profile.employers) {
    let kept = [];
    for (const b of (raw.bullets?.[e.id] || []).map((x) => String(x).replace(/\s+/g, " ").trim()).filter(Boolean)) {
      const problems = checkBullet(b, e);
      if (problems.length) violations.push({ employer: e.name, bullet: b, problems });
      else kept.push(b);
    }
    kept = kept.slice(0, e.bullets.length ? 4 : 3);
    if (!kept.length && e.bullets.length) kept = e.bullets.slice(0, 4);
    bullets[e.id] = kept;
    ai.bullets[e.id] = !e.bullets.length && kept.length > 0;

    const title = String(raw.titles?.[e.id] ?? "").replace(/\s+/g, " ").trim();
    const problems = title ? checkTitle(title, e) : [];
    if (problems.length) violations.push({ employer: e.name, kind: "title", bullet: title, problems });
    titles[e.id] = title && !problems.length ? title : e.title;
    ai.titles[e.id] = !e.title && Boolean(titles[e.id]);
  }

  let summary = String(raw.summary || "").replace(/\s+/g, " ").trim();
  const summaryProblems = checkSummary(summary, profile, years);
  if (summaryProblems.length) {
    violations.push({ employer: "summary", bullet: summary, problems: summaryProblems });
    summary = "";
  } else if (headline && summary && !opensWith(summary, headline)) {
    violations.push({ employer: "summary", bullet: summary, problems: [`summary must start with "${headline}"`] });
    summary = `${headline}: ${summary}`;
  }

  const draftSkills = profile.skills;
  const source = new Map((draftSkills.length ? draftSkills : TECH_TERMS).map((s) => [s.toLowerCase(), s]));
  const pick = (list) => [...new Set((list || []).map((s) => source.get(String(s).trim().toLowerCase())).filter(Boolean))];
  let skills = pick(raw.skillOrder);
  if (draftSkills.length) skills = [...skills, ...draftSkills.filter((s) => !skills.includes(s))];
  else skills = skills.slice(0, 12);
  ai.skills = !draftSkills.length && skills.length > 0;

  // Headline skills: only from the skills above; the first ones if the model gave fewer than two.
  const picked = pick(raw.focus).filter((s) => skills.includes(s)).slice(0, 3);
  const focus = picked.length >= 2 ? picked : skills.slice(0, 3);

  return { result: { summary, focus, skills, bullets, titles, ai }, violations };
}

/** Everything the résumé says, for scoring keyword coverage. */
export function resumeText(result, headline = "") {
  return [headline, result.summary, ...result.skills, ...Object.values(result.titles), ...Object.values(result.bullets).flat()].join(" \n ");
}

/** Deterministic coverage of the job's keywords in the finished résumé text. */
export function scoreMatch(keywords, text) {
  let got = 0;
  let total = 0;
  const covered = [];
  const gaps = [];
  for (const k of keywords) {
    const weight = k.required ? 2 : 1;
    total += weight;
    if (mentions(text, k.term)) {
      got += weight;
      covered.push(k.term);
    } else gaps.push(k.term);
  }
  return { score: total ? Math.round((100 * got) / total) : 0, covered, gaps };
}
