// Drives /api/extract, /api/analyze and /api/tailor against a fake Claude API running in this process.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { PassThrough } from "node:stream";
import test, { after, before } from "node:test";
import { normalizeProfile } from "../public/profile.js";

let fake;
const seen = []; // every request the fake received
const replies = { extract: null, analyze: null, tailor: [] }; // what it answers

before(async () => {
  fake = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw);
      const kind = body.system.includes("résumé PDF") ? "extract" : body.system.includes("job descriptions") ? "analyze" : "tailor";
      seen.push({ kind, body });
      const out = kind === "tailor" ? replies.tailor.shift() : replies[kind];
      res.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({
          id: "msg_1",
          type: "message",
          role: "assistant",
          model: body.model,
          stop_reason: "end_turn",
          content: [{ type: "text", text: JSON.stringify(out) }],
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      );
    });
  });
  await new Promise((resolve) => fake.listen(0, "127.0.0.1", resolve));
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${fake.address().port}`;
  process.env.ANTHROPIC_API_KEY = "test-key";
});
after(() => fake.close());

const { handleApi } = await import("../scripts/resume-api.mjs");

function call(path, body) {
  const req = new PassThrough();
  req.method = "POST";
  req.headers = { host: "localhost:3000", "content-type": "application/json" };
  req.end(JSON.stringify(body));
  return new Promise((resolve) => {
    const res = {
      writeHead(status) {
        this.status = status;
        return this;
      },
      end(text) {
        resolve({ status: this.status, body: JSON.parse(text) });
      },
    };
    handleApi(req, res, path);
  });
}

const PDF = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF\n").toString("base64");

const DRAFT = {
  name: "  Sam   Rivera ",
  contact: ["Austin, Texas", "sam@example.com"],
  employers: [
    { name: "Acme Health", dates: "Feb 2023 – Present", title: "Applied AI Engineer", bullets: ["Built a retrieval service on PostgreSQL serving 5,000+ clinicians."], tech: ["Python"] },
    { name: "Northwind Bank", dates: "May 2019 – Jan 2023", title: "", bullets: [], tech: [] },
  ],
  education: [{ name: "State University", dates: "2013 – 2017", detail: "" }],
  skills: ["Python", "PostgreSQL"],
};

test("extract reads the PDF as a document block and returns a clean, numbered profile", async () => {
  replies.extract = DRAFT;
  const { status, body } = await call("/api/extract", { pdf: PDF });
  assert.equal(status, 200);
  assert.equal(body.profile.name, "Sam Rivera");
  assert.deepEqual(body.profile.employers.map((e) => [e.id, e.name, e.dates]), [
    ["e0", "Acme Health", "Feb 2023 – Present"],
    ["e1", "Northwind Bank", "May 2019 – Jan 2023"],
  ]);
  const sent = seen.at(-1).body.messages[0].content[0];
  assert.deepEqual([sent.type, sent.source.media_type, sent.source.data], ["document", "application/pdf", PDF]);
});

test("extract rejects files that are not PDFs, and PDFs that are not résumés", async () => {
  const notPdf = await call("/api/extract", { pdf: Buffer.from("hello there").toString("base64") });
  assert.equal(notPdf.status, 400);
  assert.match(notPdf.body.error, /isn't a PDF/);
  assert.equal((await call("/api/extract", {})).status, 400);
  replies.extract = { name: "", contact: [], employers: [], education: [], skills: [] };
  const empty = await call("/api/extract", { pdf: PDF });
  assert.equal(empty.status, 422);
  assert.match(empty.body.error, /doesn't look like a résumé/);
});

const ANALYSIS = {
  roleTitle: "Generative AI Engineer (Remote)",
  roleType: "ai-llm",
  seniority: "Mid",
  mustHave: ["Python", "LLMs"],
  niceToHave: [],
  keywords: [{ term: "Python", required: true }, { term: "Rust", required: false }],
};

test("analyze returns the analysis and the workflow list", async () => {
  replies.analyze = ANALYSIS;
  const { status, body } = await call("/api/analyze", { jd: "We need a generative AI engineer who builds LLM apps in Python and ships them." });
  assert.equal(status, 200);
  assert.equal(body.analysis.roleTitle, "Generative AI Engineer (Remote)");
  assert.equal(body.workflows["ai-llm"], "AI / LLM engineer");
  assert.equal(body.match, undefined);
});

const goodTailor = () => ({
  summary: "Generative AI Engineer with 7+ years of experience building retrieval services in Python.",
  focus: ["Python", "PostgreSQL"],
  skillOrder: ["Python", "PostgreSQL"],
  titles: { e0: "Generative AI Engineer", e1: "Backend Software Engineer" },
  bullets: {
    e0: ["Built a retrieval service on PostgreSQL serving 5,000+ clinicians."],
    e1: ["Built and maintained backend services supporting digital banking products."],
  },
});

test("tailor sends only the uploaded draft, retries once with feedback, and flags AI-drafted parts", async () => {
  const bad = goodTailor();
  bad.bullets.e0 = ["Built a retrieval service on PostgreSQL serving 90,000 clinicians."];
  bad.bullets.e1 = ["Led a team of six building backend services for banking products."];
  replies.tailor = [bad, goodTailor()];
  const before = seen.length;

  const { status, body } = await call("/api/tailor", { profile: DRAFT, analysis: ANALYSIS, workflow: "ai-llm" });
  assert.equal(status, 200);
  const requests = seen.slice(before);
  assert.equal(requests.length, 2, "one retry");
  assert.match(requests[1].body.messages[0].content, /<fix>/);
  assert.match(requests[0].body.system, /Sam Rivera/);
  assert.match(requests[0].body.system, /start with exactly "Generative AI Engineer"/);
  assert.match(requests[0].body.messages[0].content, /Acme Health/);
  assert.doesNotMatch(JSON.stringify(requests), /Juan|Lindy|Bottle Rocket|Orbital/, "nothing from outside the uploaded draft");
  const schema = requests[0].body.output_config.format.schema;
  assert.deepEqual(schema.properties.titles.required, ["e0", "e1"]);

  assert.equal(body.headline, "Generative AI Engineer");
  assert.equal(body.dropped, 0);
  assert.deepEqual(body.titles, { e0: "Generative AI Engineer", e1: "Backend Software Engineer" });
  assert.deepEqual(body.ai.bullets, { e0: false, e1: true });
  assert.deepEqual(body.ai.titles, { e0: false, e1: true });
  assert.equal(body.ai.skills, false);
  assert.equal(body.match.score, 67);
  assert.deepEqual(body.match.gaps, ["Rust"]);
});

test("tailor needs an uploaded draft and an analysis", async () => {
  assert.equal((await call("/api/tailor", { analysis: ANALYSIS })).status, 400);
  assert.equal((await call("/api/tailor", { profile: normalizeProfile(DRAFT) })).status, 400);
});
