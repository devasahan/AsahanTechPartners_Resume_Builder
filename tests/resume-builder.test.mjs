import assert from "node:assert/strict";
import test from "node:test";
import { checkBullet, checkSummary, checkTitle, headlineFrom, resumeText, sanitizeTailor, scoreMatch } from "../public/guard.js";
import { normalizeProfile, yearsExperience } from "../public/profile.js";

// A sample draft: one company with real content, one with only a name and dates (the AI drafts those), one part-time.
const profile = normalizeProfile({
  name: "Sam Rivera",
  contact: ["Austin, Texas", "sam@example.com"],
  employers: [
    {
      name: "Acme Health",
      dates: "Feb 2023 – Present",
      title: "Applied AI Engineer",
      bullets: [
        "Built a retrieval-augmented generation service on PostgreSQL and pgvector serving 5,000+ clinicians.",
        "Cut documentation time by 30–40% with LangGraph agents.",
      ],
      tech: ["Python", "LangGraph"],
    },
    { name: "Northwind Bank", dates: "May 2019 – Jan 2023", title: "", bullets: [], tech: [] },
    { name: "Pixel Studio", dates: "Mar 2017 – Apr 2019", title: "Software Engineer (Part-Time)", bullets: [], tech: [] },
  ],
  education: [{ name: "State University", dates: "2013 – 2017", detail: "B.S. Computer Science" }],
  skills: ["Python", "PostgreSQL", "LangGraph"],
});
const [acme, bank, pixel] = profile.employers;

test("profiles are trimmed, numbered and capped", () => {
  assert.deepEqual(profile.employers.map((e) => e.id), ["e0", "e1", "e2"]);
  const messy = normalizeProfile({ name: "  A   B ", employers: [{ name: "" }, { name: " X ", bullets: ["a", "a", " "] }], skills: ["Go", "go"] });
  assert.equal(messy.name, "A B");
  assert.equal(messy.employers.length, 1);
  assert.deepEqual(messy.employers[0].bullets, ["a"]);
  assert.deepEqual(messy.skills, ["Go"]);
  assert.equal(normalizeProfile(null).name, "");
});

test("years of experience come from the earliest employment year", () => {
  assert.equal(yearsExperience(profile, new Date("2026-10-09")), 9);
  assert.equal(yearsExperience(normalizeProfile({ name: "A", employers: [{ name: "X", dates: "" }] })), 0);
});

test("rewritten bullets may not add numbers or tools the draft lacks", () => {
  assert.deepEqual(checkBullet("Cut documentation time by 30–40% using LangGraph agents.", acme), []);
  assert.deepEqual(checkBullet("Served more than 5000 clinicians with a PostgreSQL retrieval service.", acme), []);
  assert.ok(checkBullet("Cut documentation time by 70% using LangGraph agents.", acme).length > 0);
  assert.ok(checkBullet("Deployed the retrieval service on Kubernetes for all clinicians.", acme).length > 0);
  assert.deepEqual(checkBullet("Cut reporting effort by 30% using LangGraph agents.", acme), [], "30 is in the draft as part of 30–40%");
  assert.ok(checkBullet("Served 50 clinicians with a retrieval-augmented service.", acme).length > 0, "50 is not 5,000");
});

test("numbers match whole values, not pieces of other numbers", () => {
  const p = normalizeProfile({ name: "A", employers: [{ name: "X", dates: "2020", bullets: ["Processed about 30,000 records nightly."] }] });
  const e = p.employers[0];
  assert.deepEqual(checkBullet("Processed about 30K records every night for reporting.", e), []);
  assert.deepEqual(checkBullet("Processed about 30000 records every night for reporting.", e), []);
  assert.ok(checkBullet("Cut reporting effort by 30% with nightly processing jobs.", e).length > 0);
});

test("AI-drafted lines (no draft bullets) may not contain numbers, tools, or leadership claims", () => {
  assert.deepEqual(checkBullet("Built and maintained backend services supporting digital banking products.", bank), []);
  assert.ok(checkBullet("Built backend services for 500,000 banking customers every day.", bank).length > 0);
  assert.ok(checkBullet("Built backend services on AWS supporting digital banking products.", bank).length > 0);
  assert.ok(checkBullet("Led a team building backend services for digital banking products.", bank).length > 0);
  assert.ok(checkBullet("Won an award for backend services supporting banking products.", bank).length > 0);
  assert.ok(checkBullet("Built services.", bank).length > 0, "too short");
});

test("titles may follow the job but never rise above the draft", () => {
  assert.deepEqual(checkTitle("Generative AI Engineer", acme), []);
  assert.ok(checkTitle("Senior Applied AI Engineer", acme).length > 0);
  assert.ok(checkTitle("Principal Software Engineer", bank).length > 0, "no level words when the draft has no title");
  assert.deepEqual(checkTitle("Backend Software Engineer", bank), []);
  assert.deepEqual(checkTitle("Machine Learning Engineer", bank), [], "AI wording allowed when the draft shows nothing");
  assert.ok(checkTitle("Frontend Engineer", pixel).length > 0, "must stay part-time");
  assert.deepEqual(checkTitle("Frontend Engineer (Part-Time)", pixel), []);
  assert.ok(checkTitle("Engineer", acme).length > 0);
  assert.ok(checkTitle("AI Engineer 3", acme).length > 0);
  const plain = normalizeProfile({ name: "A", employers: [{ name: "X", title: "Software Engineer", bullets: ["Built REST APIs for payments."] }] }).employers[0];
  assert.ok(checkTitle("AI Engineer", plain).length > 0, "no AI title where the draft shows no AI work");
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

test("the summary uses only years, numbers and tools the draft shows, and may not claim seniority", () => {
  assert.deepEqual(checkSummary("Generative AI Engineer with 9+ years of experience in Python and PostgreSQL.", profile, 9), []);
  assert.ok(checkSummary("Generative AI Engineer with 12+ years of experience.", profile, 9).length > 0);
  assert.ok(checkSummary("Generative AI Engineer experienced with Kubernetes.", profile, 9).length > 0);
  assert.ok(checkSummary("Generative AI Engineer and Principal Engineer.", profile, 9).length > 0);
});

const good = () => ({
  summary: "Generative AI Engineer with 9+ years of experience building production retrieval systems in Python.",
  focus: ["python", "LangGraph", "Hybrid RAG"],
  skillOrder: ["LangGraph", "Python"],
  titles: { e0: "Generative AI Engineer", e1: "Backend Software Engineer", e2: "Software Engineer (Part-Time)" },
  bullets: {
    e0: ["Built a retrieval-augmented generation service on PostgreSQL and pgvector for 5,000+ clinicians."],
    e1: ["Built and maintained backend services supporting digital banking products."],
    e2: ["Developed and maintained web applications for client projects."],
  },
});

test("sanitize keeps good output and flags what the AI wrote without facts", () => {
  const { result, violations } = sanitizeTailor(good(), profile, { headline: "Generative AI Engineer", years: 9 });
  assert.equal(violations.length, 0);
  assert.deepEqual(result.ai.bullets, { e0: false, e1: true, e2: true });
  assert.deepEqual(result.ai.titles, { e0: false, e1: true, e2: false }, "only a title with no draft counterpart is an AI suggestion");
  assert.equal(result.ai.skills, false);
  assert.deepEqual(result.skills, ["LangGraph", "Python", "PostgreSQL"], "draft skills are never lost");
  assert.deepEqual(result.focus, ["Python", "LangGraph"]);
});

test("sanitize drops bad lines, resets bad titles, and ignores locked fields from the model", () => {
  const raw = good();
  raw.bullets.e0 = ["Cut documentation time by 70% using LangGraph agents.", "Built a retrieval-augmented generation service on PostgreSQL and pgvector for 5,000+ clinicians."];
  raw.bullets.e1 = ["Led a team of eight building backend services for digital banking products."];
  raw.titles.e0 = "Principal AI Architect";
  raw.titles.e1 = "Staff Software Engineer";
  raw.name = "Hacker";
  raw.employers = [{ name: "Evil Corp" }];
  const { result, violations } = sanitizeTailor(raw, profile, { headline: "Generative AI Engineer", years: 9 });
  assert.equal(result.bullets.e0.length, 1);
  assert.deepEqual(result.bullets.e1, [], "AI draft with a leadership claim is dropped");
  assert.equal(result.titles.e0, "Applied AI Engineer", "falls back to the draft title");
  assert.equal(result.titles.e1, "", "no draft title and a bad suggestion: no title");
  assert.equal(result.ai.titles.e1, false);
  assert.equal(violations.filter((v) => v.kind === "title").length, 2);
  assert.equal(result.name, undefined);
  assert.equal(result.employers, undefined);
});

test("if every rewritten line is dropped, the draft's own bullets are kept", () => {
  const raw = good();
  raw.bullets.e0 = ["Cut documentation time by 99% using LangGraph agents and Kubernetes."];
  const { result } = sanitizeTailor(raw, profile, { headline: "Generative AI Engineer", years: 9 });
  assert.deepEqual(result.bullets.e0, acme.bullets);
});

test("the summary must open with the job's title and is dropped if it breaks the rules", () => {
  const wrongOpener = good();
  wrongOpener.summary = "Senior Software Engineer with 9+ years of experience.";
  const a = sanitizeTailor(wrongOpener, profile, { headline: "Generative AI Engineer", years: 9 });
  assert.equal(a.result.summary, "Generative AI Engineer: Senior Software Engineer with 9+ years of experience.");
  assert.equal(a.violations.length, 1);
  const inflated = good();
  inflated.summary = "Generative AI Engineer with 15 years of experience and a Director background.";
  const b = sanitizeTailor(inflated, profile, { headline: "Generative AI Engineer", years: 9 });
  assert.equal(b.result.summary, "");
});

test("without draft skills the AI may suggest up to 12 known technologies, flagged; anything else is dropped", () => {
  const bare = normalizeProfile({ name: "A", employers: [{ name: "X", dates: "2020", title: "Engineer" }] });
  const raw = { summary: "", focus: ["React", "Node.js", "Prompt wizardry"], skillOrder: ["React", "Node.js", "Prompt wizardry", ...Array(20).fill("Python")], titles: { e0: "Software Engineer" }, bullets: { e0: [] } };
  const { result } = sanitizeTailor(raw, bare, { headline: "", years: 0 });
  assert.deepEqual(result.skills, ["React", "Node.js", "Python"]);
  assert.equal(result.ai.skills, true);
  assert.deepEqual(result.focus, ["React", "Node.js"], "two valid headline skills are enough; the unknown one is dropped");
});

test("match score is weighted, reads the finished résumé, and lists gaps", () => {
  const { result } = sanitizeTailor(good(), profile, { headline: "Generative AI Engineer", years: 9 });
  const m = scoreMatch(
    [{ term: "Python", required: true }, { term: "Rust", required: true }, { term: "PostgreSQL", required: false }],
    resumeText(result, "Generative AI Engineer"),
  );
  assert.deepEqual(m.gaps, ["Rust"]);
  assert.equal(m.score, 60);
});
