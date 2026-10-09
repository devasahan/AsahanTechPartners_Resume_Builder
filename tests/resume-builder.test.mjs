import assert from "node:assert/strict";
import test from "node:test";
import { checkBullet, checkTitle, headlineFrom, sanitizeTailor, scoreMatch } from "../public/guard.js";
import { LOCKED } from "../public/locked.js";

test("locked fields match the draft resume", () => {
  assert.deepEqual(
    LOCKED.employers.map((e) => [e.name, e.dates]),
    [
      ["Lindy", "Feb 2025 – Present"],
      ["Acquire.com", "Jul 2024 – Feb 2025"],
      ["Orbital Education", "Jun 2021 – Jun 2024"],
      ["Q2 Holdings", "May 2020 – May 2021"],
      ["Bottle Rocket", "Mar 2019 – May 2020"],
    ],
  );
  assert.deepEqual(LOCKED.education, [{ name: "Fontbonne University", dates: "Aug 2016 – May 2020" }]);
});

test("grounded bullet passes", () => {
  assert.deepEqual(checkBullet("Cut clinician documentation time by 30–40% with LangGraph agents.", "lindy"), []);
});

test("invented metric and tool are rejected", () => {
  const p = checkBullet("Reduced latency 80% using Kubernetes.", "q2");
  assert.equal(p.length, 2);
});

test("a fact cannot move to another employer", () => {
  assert.ok(checkBullet("Served 500K+ users.", "lindy").length > 0);
});

const TITLES = {
  lindy: "Generative AI Engineer",
  acquire: "AI Engineer",
  orbital: "AI Engineer",
  q2: "Backend Software Engineer",
  bottlerocket: "Software Engineer (Part-Time)",
};
const employer = (id) => LOCKED.employers.find((e) => e.id === id);

test("sanitize drops bad bullets, ignores locked fields, filters skills", () => {
  const { result, violations } = sanitizeTailor({
    summary: "Engineer with 7+ years.",
    titles: TITLES,
    skillOrder: ["python", "COBOL", "Python"],
    bullets: {
      lindy: ["Cut documentation time by 30–40%.", "Saved $2M."],
      bottlerocket: ["Deployed services on Kubernetes."],
      name: "Hacker",
    },
  });
  assert.deepEqual(result.skills, ["Python"]);
  assert.equal(result.bullets.lindy.length, 1);
  assert.equal(result.bullets.bottlerocket.length, 0);
  assert.equal(violations.length, 2);
  assert.equal(result.name, undefined);
  assert.deepEqual(result.titles, TITLES);
});

test("numbers must match whole values, not pieces of other numbers", () => {
  assert.ok(checkBullet("Cut reporting effort by 30% at Orbital.", "orbital").length > 0);
  assert.deepEqual(checkBullet("Processed about 30K records nightly.", "orbital"), []);
  assert.deepEqual(checkBullet("Processed about 30,000 records nightly.", "orbital"), []);
  assert.deepEqual(checkBullet("Served 500,000+ users.", "q2"), []);
  assert.ok(checkBullet("Served 50,000 users.", "q2").length > 0);
});

test("titles may follow the job but never rise above the record", () => {
  assert.deepEqual(checkTitle("Generative AI Engineer", employer("lindy")), []);
  assert.deepEqual(checkTitle("Backend Software Engineer", employer("q2")), []);
  assert.ok(checkTitle("Senior AI Engineer", employer("lindy")).length > 0);
  assert.ok(checkTitle("Principal Software Engineer", employer("q2")).length > 0);
  assert.ok(checkTitle("Engineering Manager", employer("orbital")).length > 0);
  assert.ok(checkTitle("AI Engineer", employer("q2")).length > 0, "no AI title where the facts have no AI work");
  assert.ok(checkTitle("Machine Learning Engineer", employer("bottlerocket")).length > 0);
  assert.ok(checkTitle("Frontend Engineer", employer("bottlerocket")).length > 0, "must stay part-time");
  assert.deepEqual(checkTitle("Frontend Engineer (Part-Time)", employer("bottlerocket")), []);
  assert.ok(checkTitle("Engineer", employer("lindy")).length > 0);
  assert.ok(checkTitle("AI Engineer 3", employer("lindy")).length > 0);
});

test("a rejected title falls back to the title on record and is reported", () => {
  const { result, violations } = sanitizeTailor({
    summary: "",
    titles: { ...TITLES, q2: "AI Engineer", lindy: "Lead AI Architect" },
    skillOrder: [],
    bullets: {},
  });
  assert.equal(result.titles.q2, "Software Engineer");
  assert.equal(result.titles.lindy, "Applied AI Engineer");
  assert.equal(result.titles.acquire, "AI Engineer");
  assert.deepEqual(violations.filter((v) => v.kind === "title").map((v) => v.employer).sort(), ["lindy", "q2"]);
});

test("the headline is the job's title without levels above senior or location tails", () => {
  const fallback = "AI / LLM engineer";
  assert.equal(headlineFrom("Generative AI Engineer", fallback), "Generative AI Engineer");
  assert.equal(headlineFrom("Senior Generative AI Engineer (Remote)", fallback), "Senior Generative AI Engineer");
  assert.equal(headlineFrom("Lead Machine Learning Engineer - Dallas, TX", fallback), "Machine Learning Engineer");
  assert.equal(headlineFrom("Staff Software Engineer, ML II", fallback), "Software Engineer, ML");
  assert.equal(headlineFrom("Engineering Manager", fallback), fallback);
  assert.equal(headlineFrom("", fallback), fallback);
});

test("the summary must open with the job's title and not claim a higher level", () => {
  const raw = (summary) => ({ summary, titles: TITLES, skillOrder: [], bullets: {} });
  const headline = "Generative AI Engineer";
  const ok = sanitizeTailor(raw("Generative AI Engineer with 7+ years of experience building production LLM systems."), { headline });
  assert.equal(ok.violations.length, 0);
  assert.match(ok.result.summary, /^Generative AI Engineer with 7\+ years/);

  const old = sanitizeTailor(raw("Senior Software Engineer with 7+ years of experience."), { headline });
  assert.equal(old.violations.length, 1);
  assert.equal(old.result.summary, "Generative AI Engineer: Senior Software Engineer with 7+ years of experience.");

  const inflated = sanitizeTailor(raw("Generative AI Engineer and Principal Engineer with 12 years of experience."), { headline });
  assert.equal(inflated.result.summary, "");
  assert.ok(inflated.violations[0].problems.length >= 2);
});

test("match score is weighted and lists gaps", () => {
  const m = scoreMatch([
    { term: "Python", required: true },
    { term: "Rust", required: true },
    { term: "RAG", required: false },
  ]);
  assert.deepEqual(m.gaps, ["Rust"]);
  assert.equal(m.score, 60);
});
