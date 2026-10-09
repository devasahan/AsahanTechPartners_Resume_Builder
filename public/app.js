import { LOCKED } from "./locked.js";

const $ = (id) => document.getElementById(id);
const state = { analysis: null, tailored: null };

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function row(left, right) {
  const r = el("div", "row");
  r.append(el("strong", "", left), el("span", "", right));
  return r;
}

function section(title) {
  const s = el("section");
  s.append(el("h2", "", title));
  return s;
}

/** Locked fields come from locked.js; only summary/skills/bullets come from the model. */
function renderResume() {
  const t = state.tailored;
  const root = $("resume");
  root.replaceChildren();
  root.append(el("h1", "", LOCKED.name.toUpperCase()), el("p", "contact", LOCKED.contact.join(" | ")));

  if (t?.summary) {
    const s = section("Summary");
    s.append(el("p", "editable", t.summary));
    root.append(s);
  }
  if (t?.skills?.length) {
    const s = section("Skills");
    s.append(el("p", "editable", t.skills.join(" · ")));
    root.append(s);
  }

  const exp = section("Professional Experience");
  for (const e of LOCKED.employers) {
    exp.append(row(e.name, e.dates));
    const bullets = t?.bullets?.[e.id] ?? [];
    if (bullets.length) {
      const ul = el("ul");
      for (const b of bullets) ul.append(el("li", "editable", b));
      exp.append(ul);
    }
  }
  root.append(exp);

  const edu = section("Education");
  for (const e of LOCKED.education) edu.append(row(e.name, e.dates));
  root.append(edu);

  for (const node of root.querySelectorAll(".editable")) node.contentEditable = "true";
}

function chips(target, items) {
  target.replaceChildren(...items.map((i) => el("span", "", i)));
  if (!items.length) target.textContent = "None";
}

function renderAnalysis(data, workflows) {
  state.analysis = data.analysis;
  $("analysis").hidden = false;
  $("role-title").textContent = data.analysis.roleTitle;
  const must = $("must");
  must.replaceChildren(...data.analysis.mustHave.slice(0, 8).map((m) => el("li", "", m)));
  if (workflows && !$("workflow").options.length) {
    for (const [value, label] of Object.entries(workflows)) $("workflow").add(new Option(label, value));
  }
  $("workflow").value = data.analysis.roleType;
}

function renderMatch(match) {
  $("score").textContent = match.score;
  chips($("covered"), match.covered);
  chips($("gaps"), match.gaps);
}

async function post(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function tailor() {
  $("status").textContent = "Writing tailored resume…";
  const t = await post("/api/tailor", { analysis: state.analysis, workflow: $("workflow").value });
  state.tailored = t;
  renderMatch(t.match);
  $("dropped").textContent = t.dropped
    ? `${t.dropped} generated line(s) were removed because they used details not in the facts bank.`
    : "";
  renderResume();
  $("status").textContent = `Done. Workflow: ${t.workflow}.`;
}

async function run(fn) {
  $("build").disabled = true;
  try {
    await fn();
  } catch (error) {
    $("status").textContent = error.message;
  } finally {
    $("build").disabled = false;
  }
}

$("build").addEventListener("click", () =>
  run(async () => {
    $("status").textContent = "Analyzing job description…";
    const data = await post("/api/analyze", { jd: $("jd").value });
    renderAnalysis(data, data.workflows);
    renderMatch(data.match);
    await tailor();
  }),
);

$("workflow").addEventListener("change", () => run(tailor));
$("print").addEventListener("click", () => window.print());

$("copy").addEventListener("click", async () => {
  const text = $("resume").innerText;
  try {
    await navigator.clipboard.writeText(text);
    $("status").textContent = "Copied.";
  } catch {
    $("status").textContent = "Copy failed; select the resume text manually.";
  }
});

renderResume();
