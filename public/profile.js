/**
 * The profile: everything read from the uploaded draft résumé. It is the only
 * source of truth: the name, contact line, companies, dates and school are
 * locked, and any titles, bullets and skills in the draft are the facts the
 * tailored résumé may use. Pure functions, shared by the page and the server.
 *
 * Profile = {
 *   name, contact: [string],
 *   employers: [{ id, name, dates, title, bullets: [string], tech: [string] }],
 *   education: [{ name, dates, detail }],
 *   skills: [string],
 * }
 */
export const LIMITS = { employers: 12, bullets: 12, tech: 30, skills: 60, contact: 8, education: 4 };

const clean = (value, max = 600) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);

function list(values, max, maxLength) {
  const seen = new Set();
  const out = [];
  for (const value of Array.isArray(values) ? values : []) {
    const text = clean(value, maxLength);
    if (text && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      out.push(text);
    }
  }
  return out.slice(0, max);
}

/** Trim, cap and re-number whatever came from the PDF reader or the editor. */
export function normalizeProfile(raw) {
  const employers = (Array.isArray(raw?.employers) ? raw.employers : [])
    .map((e) => ({
      name: clean(e?.name, 120),
      dates: clean(e?.dates, 60),
      title: clean(e?.title, 120),
      bullets: list(e?.bullets, LIMITS.bullets, 400),
      tech: list(e?.tech, LIMITS.tech, 60),
    }))
    .filter((e) => e.name)
    .slice(0, LIMITS.employers)
    .map((e, i) => ({ id: `e${i}`, ...e }));
  const education = (Array.isArray(raw?.education) ? raw.education : [])
    .map((e) => ({ name: clean(e?.name, 160), dates: clean(e?.dates, 60), detail: clean(e?.detail, 200) }))
    .filter((e) => e.name)
    .slice(0, LIMITS.education);
  return {
    name: clean(raw?.name, 100),
    contact: list(raw?.contact, LIMITS.contact, 160),
    employers,
    education,
    skills: list(raw?.skills, LIMITS.skills, 60),
  };
}

/** All the draft text for one company (no dates), used to check what a rewritten line may claim. */
export const employerText = (employer) => [employer.title, ...employer.bullets, ...employer.tech].join(" ");

/** All the draft text that may be used in the summary. */
export const profileText = (profile) =>
  [
    profile.skills.join(" "),
    ...profile.employers.map((e) => `${e.name} ${employerText(e)}`),
    ...profile.education.map((e) => `${e.name} ${e.detail}`),
  ].join(" ");

/** Whole years since the earliest year in the employment dates (0 when none can be read). */
export function yearsExperience(profile, now = new Date()) {
  const years = profile.employers.flatMap((e) => (e.dates.match(/\b(?:19|20)\d{2}\b/g) || []).map(Number));
  if (!years.length) return 0;
  return Math.max(0, now.getFullYear() - Math.min(...years));
}
