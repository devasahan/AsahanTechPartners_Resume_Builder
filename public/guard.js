/**
 * Guardrails: model output may only use numbers and technologies that exist in
 * the facts bank. Pure functions so they can be unit-tested without the API.
 */
import { FACTS, SKILLS } from "./facts.js";
import { LOCKED } from "./locked.js";

const NUMBER = /\d+(?:[.,]\d+)*[KkMm]?/g;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");
const normalize = (s) => s.toLowerCase().replace(/,/g, "");

const factsText = (employerId) => normalize((FACTS[employerId] || []).join(" "));
const allFactsText = normalize(Object.values(FACTS).flat().join(" ") + " 7+ 7");

function mentions(text, term) {
  return new RegExp(`(?<![\\w])${escape(term)}(?![\\w])`, "i").test(text);
}

/** Problems with one bullet written for one employer (empty array = OK). */
export function checkBullet(bullet, employerId) {
  const problems = [];
  const facts = factsText(employerId);
  if (!facts) return [`no facts for ${employerId}`];
  for (const n of bullet.match(NUMBER) || []) {
    if (!facts.includes(normalize(n))) problems.push(`number "${n}" not in ${employerId} facts`);
  }
  for (const term of SKILLS) {
    if (mentions(bullet, term) && !mentions(facts, term)) problems.push(`"${term}" not in ${employerId} facts`);
  }
  return problems;
}

/** Problems with the summary (numbers must exist somewhere in the facts bank). */
export function checkSummary(summary) {
  return (summary.match(NUMBER) || [])
    .filter((n) => !allFactsText.includes(normalize(n)))
    .map((n) => `summary number "${n}" not in facts`);
}

/**
 * Clean a raw tailor() response. Returns the safe result plus any violations
 * that were found (so the caller can retry once with feedback).
 * - bullets that fail are dropped; employers without facts get none
 * - skills are limited to SKILLS (case-normalised, de-duplicated)
 * - locked fields are never read from the model
 */
export function sanitizeTailor(raw) {
  const violations = [];
  const bullets = {};
  for (const e of LOCKED.employers) {
    const kept = [];
    for (const b of (raw.bullets?.[e.id] || []).map((x) => String(x).trim()).filter(Boolean)) {
      const problems = checkBullet(b, e.id);
      if (problems.length) violations.push({ employer: e.id, bullet: b, problems });
      else kept.push(b);
    }
    bullets[e.id] = kept.slice(0, 4);
  }
  let summary = String(raw.summary || "").trim();
  const summaryProblems = checkSummary(summary);
  if (summaryProblems.length) {
    violations.push({ employer: "summary", bullet: summary, problems: summaryProblems });
    summary = "";
  }
  const byLower = new Map(SKILLS.map((s) => [s.toLowerCase(), s]));
  const skills = [...new Set((raw.skillOrder || []).map((s) => byLower.get(String(s).toLowerCase())).filter(Boolean))];
  return { result: { summary, skills, bullets }, violations };
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
