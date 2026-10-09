import { LOCKED } from "./locked.js";

const $ = (id) => document.getElementById(id);
const state = { analysis: null, tailored: null };

// The script loaded, so the page came from the server: drop the "open it through the server" banner.
$("no-server")?.remove();

const NO_SERVER =
  "Can't reach the local server. Is the Command Prompt window running npm run dev still open? Start it again, then reload this page.";

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

/** Company and (editable) job title on the left, dates on the right. */
function employerRow(employer, title) {
  const r = el("div", "row");
  const who = el("span", "who");
  who.append(el("strong", "", employer.name));
  if (title) who.append(el("span", "sep", " | "), el("span", "title editable", title));
  r.append(who, el("span", "", employer.dates));
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
    exp.append(employerRow(e, t?.titles?.[e.id]));
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

/** Side panel: the title on record next to the one shown, so it's clear what was changed. */
function renderTitles(t) {
  const list = $("titles");
  list.replaceChildren(
    ...LOCKED.employers.map((e) => {
      const shown = t.titles[e.id];
      const li = el("li");
      li.append(el("strong", "", `${e.name}: `), shown === e.recordTitle ? shown : `${shown} (on record: ${e.recordTitle})`);
      return li;
    }),
  );
}

function renderMatch(match) {
  $("score").textContent = match.score;
  chips($("covered"), match.covered);
  chips($("gaps"), match.gaps);
}

async function checkHealth() {
  let health;
  try {
    health = await (await fetch("/api/health")).json();
  } catch {
    health = { error: "Can't reach the local server." };
  }
  const ready = health.ok && health.keySet;
  $("health").textContent = ready
    ? `Ready · ${health.model}`
    : (health.error ?? "No API key found: add it to the .env file, then restart the server.");
  $("health").className = `health ${ready ? "ok" : "bad"}`;
}

let timer;
/** Show what is running, with a spinner and the seconds elapsed. */
function progress(label) {
  clearInterval(timer);
  const started = Date.now();
  const tick = () => ($("status").textContent = `${label} ${Math.round((Date.now() - started) / 1000)}s`);
  tick();
  timer = setInterval(tick, 1000);
  $("status").classList.add("busy");
}

function done(text) {
  clearInterval(timer);
  $("status").classList.remove("busy");
  $("status").textContent = text;
}

function showError(message) {
  $("error").textContent = message;
  $("error").hidden = !message;
}

async function post(path, body) {
  let res;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(NO_SERVER);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

async function tailor() {
  progress("Writing the tailored resume…");
  const t = await post("/api/tailor", { analysis: state.analysis, workflow: $("workflow").value });
  state.tailored = t;
  renderMatch(t.match);
  renderTitles(t);
  const notes = [];
  if (t.dropped) notes.push(`${t.dropped} generated line(s) were removed because they used details not in the facts bank.`);
  if (t.titleResets.length) notes.push(`Kept the title on record for ${t.titleResets.join(", ")} (the suggestion broke the title rules).`);
  $("dropped").textContent = notes.join(" ");
  renderResume();
  done(`Done. Workflow: ${t.workflow}.`);
}

async function run(fn) {
  $("build").disabled = true;
  showError("");
  try {
    await fn();
  } catch (error) {
    done("");
    showError(error.message);
  } finally {
    $("build").disabled = false;
  }
}

$("build").addEventListener("click", () =>
  run(async () => {
    progress("Analyzing the job description…");
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
    done("Copied.");
  } catch {
    done("Copy failed; select the resume text manually.");
  }
});

renderResume();
checkHealth();
