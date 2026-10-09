import assert from "node:assert/strict";
import test from "node:test";
import { checkBullet, sanitizeTailor, scoreMatch } from "../public/guard.js";
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

test("sanitize drops bad bullets, ignores locked fields, filters skills", () => {
  const { result, violations } = sanitizeTailor({
    summary: "Engineer with 7+ years.",
    skillOrder: ["python", "COBOL", "Python"],
    bullets: {
      lindy: ["Cut documentation time by 30–40%.", "Saved $2M."],
      bottlerocket: ["Made things."],
      name: "Hacker",
    },
  });
  assert.deepEqual(result.skills, ["Python"]);
  assert.equal(result.bullets.lindy.length, 1);
  assert.equal(result.bullets.bottlerocket.length, 0);
  assert.equal(violations.length, 2);
  assert.equal(result.name, undefined);
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
