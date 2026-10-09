import { normalizeProfile } from "./profile.js";

const $ = (id) => document.getElementById(id);
const STORAGE_KEY = "resumeBuilder.profile.v1";
const MAX_PDF = 5 * 1024 * 1024;
// profile: the saved draft résumé; editing: the form model while "Check what was read" is open;
// analysis/tailored: the current job and its tailored result.
const state = { profile: null, editing: null, analysis: null, tailored: null };

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

/* ---------- saved profile (this browser only) ---------- */

function loadStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const profile = raw ? normalizeProfile(JSON.parse(raw)) : null;
    return profile?.name ? profile : null;
  } catch {
    return null;
  }
}

function store(profile) {
  try {
    if (profile) localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private windows can block storage; the résumé just won't be remembered.
  }
}

/* ---------- the preview sheet ---------- */

const aiBadge = () => el("span", "ai-badge", "AI draft: verify");

function employerRow(employer, title, aiTitle) {
  const r = el("div", "row");
  const who = el("span", "who");
  who.append(el("strong", "", employer.name));
  if (title) {
    who.append(el("span", "sep", " | "), el("span", "title editable", title));
    if (aiTitle) who.append(aiBadge());
  }
  r.append(who, el("span", "", employer.dates));
  return r;
}

function section(title) {
  const s = el("section");
  s.append(el("h2", "", title));
  return s;
}

/** Name, contact, companies, dates and school come from the saved profile; the model only adds the rest. */
function renderResume() {
  const p = state.profile;
  const t = state.tailored;
  const root = $("resume");
  root.replaceChildren();
  if (!p) {
    root.append(
      el("p", "empty", state.editing
        ? "Check the details on the left, then confirm. Your résumé will appear here exactly as written."
        : "Upload your draft résumé to begin. It will appear here exactly as written."),
    );
    return;
  }

  root.append(el("h1", "", p.name.toUpperCase()));
  if (t?.headline) {
    // Headline under the name: the job's title, then the skills that best show fit.
    const focus = t.focus?.length ? ` | ${t.focus.join(" · ")}` : "";
    root.append(el("p", "headline editable", `${t.headline}${focus}`));
  }
  if (p.contact.length) root.append(el("p", "contact", p.contact.join(" | ")));

  if (t?.summary) {
    const s = section("Summary");
    s.append(el("p", "editable", t.summary));
    root.append(s);
  }
  const skills = t ? t.skills : p.skills;
  if (skills.length) {
    const s = section("Skills");
    const line = el("p");
    line.append(el("span", "editable", skills.join(" · ")));
    if (t?.ai.skills) line.append(aiBadge());
    s.append(line);
    root.append(s);
  }

  if (p.employers.length) {
    const exp = section("Professional Experience");
    for (const e of p.employers) {
      exp.append(employerRow(e, t ? t.titles[e.id] : e.title, t?.ai.titles[e.id]));
      const bullets = t ? t.bullets[e.id] : e.bullets;
      if (bullets.length) {
        const ul = el("ul");
        for (const b of bullets) {
          const li = el("li");
          li.append(el("span", "editable", b));
          if (t?.ai.bullets[e.id]) li.append(aiBadge());
          ul.append(li);
        }
        exp.append(ul);
      }
    }
    root.append(exp);
  }

  if (p.education.length) {
    const edu = section("Education");
    for (const e of p.education) {
      const r = el("div", "row");
      r.append(el("strong", "", e.name), el("span", "", e.dates));
      edu.append(r);
      if (e.detail) edu.append(el("p", "", e.detail));
    }
    root.append(edu);
  }

  for (const node of root.querySelectorAll(".editable")) node.contentEditable = "true";
}

/* ---------- step 1: upload, check what was read, save ---------- */

const toEditable = (p) => ({
  name: p.name,
  contact: p.contact.join("\n"),
  employers: p.employers.map((e) => ({ name: e.name, dates: e.dates, title: e.title, bullets: e.bullets.join("\n"), tech: e.tech.join(", ") })),
  education: p.education.map((e) => ({ ...e })),
  skills: p.skills.join(", "),
});

const fromEditable = (m) =>
  normalizeProfile({
    name: m.name,
    contact: m.contact.split("\n"),
    employers: m.employers.map((e) => ({ ...e, bullets: e.bullets.split("\n"), tech: e.tech.split(/[,\n]/) })),
    education: m.education,
    skills: m.skills.split(/[,\n]/),
  });

function field(label, model, key, { rows = 0, placeholder = "" } = {}) {
  const wrap = el("label", "field");
  wrap.append(el("span", "", label));
  const input = rows ? el("textarea") : el("input");
  if (rows) input.rows = rows;
  else input.type = "text";
  input.value = model[key];
  input.placeholder = placeholder;
  input.addEventListener("input", () => (model[key] = input.value));
  wrap.append(input);
  return wrap;
}

function card(title, onRemove) {
  const box = el("fieldset", "card");
  box.append(el("legend", "", title));
  const remove = el("button", "link", "Remove");
  remove.type = "button";
  remove.addEventListener("click", onRemove);
  box.append(remove);
  return box;
}

function renderEditor() {
  const m = state.editing;
  const root = $("editor-fields");
  root.replaceChildren(field("Name", m, "name"), field("Contact line (one item per line)", m, "contact", { rows: 3 }));

  m.employers.forEach((e, i) => {
    const box = card(`Company ${i + 1}`, () => {
      m.employers.splice(i, 1);
      renderEditor();
    });
    box.append(
      field("Company", e, "name"),
      field("Dates", e, "dates", { placeholder: "e.g. Jan 2020 – Mar 2022" }),
      field("Job title (optional)", e, "title", { placeholder: "Left empty, the AI suggests one" }),
      field("Bullets (optional, one per line)", e, "bullets", { rows: 4, placeholder: "Left empty, the AI drafts some for you to verify" }),
      field("Technologies (optional, comma separated)", e, "tech"),
    );
    root.append(box);
  });
  const addCompany = el("button", "secondary small", "+ Add a company");
  addCompany.type = "button";
  addCompany.addEventListener("click", () => {
    m.employers.push({ name: "", dates: "", title: "", bullets: "", tech: "" });
    renderEditor();
  });
  root.append(addCompany);

  m.education.forEach((e, i) => {
    const box = card(`School ${i + 1}`, () => {
      m.education.splice(i, 1);
      renderEditor();
    });
    box.append(field("School", e, "name"), field("Dates", e, "dates"), field("Degree or detail (optional)", e, "detail"));
    root.append(box);
  });
  const addSchool = el("button", "secondary small", "+ Add a school");
  addSchool.type = "button";
  addSchool.addEventListener("click", () => {
    m.education.push({ name: "", dates: "", detail: "" });
    renderEditor();
  });
  root.append(addSchool);

  root.append(field("Skills (optional, comma separated)", m, "skills", { rows: 2, placeholder: "Left empty, the AI suggests some for you to verify" }));
}

function showView() {
  $("upload").hidden = Boolean(state.profile || state.editing);
  $("editor").hidden = !state.editing;
  $("resume-summary").hidden = !state.profile || Boolean(state.editing);
  $("build").disabled = !state.profile;
  if (state.profile) {
    const n = state.profile.employers.length;
    $("profile-line").textContent = `${state.profile.name} · ${n} ${n === 1 ? "company" : "companies"} · saved in this browser`;
  }
}

function showUploadError(message) {
  $("upload-error").textContent = message;
  $("upload-error").hidden = !message;
}

const toBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(file);
  });

async function handleFile(file) {
  showUploadError("");
  if (!file) return;
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) return showUploadError("Choose a PDF file.");
  if (file.size > MAX_PDF) return showUploadError("That PDF is bigger than 5 MB.");
  $("upload-status").textContent = "Reading your résumé… this can take a minute.";
  try {
    const { profile } = await post("/api/extract", { pdf: await toBase64(file) });
    state.editing = toEditable(profile);
    renderEditor();
    showView();
    renderResume();
  } catch (error) {
    showUploadError(error.message);
  } finally {
    $("upload-status").textContent = "";
    $("pdf").value = "";
  }
}

function resetJob() {
  state.analysis = null;
  state.tailored = null;
  $("analysis").hidden = true;
  showError("");
  done("");
}

function saveProfile() {
  const profile = fromEditable(state.editing);
  if (!profile.name || (!profile.employers.length && !profile.education.length)) {
    return showUploadError("Add at least your name and one company or school.");
  }
  showUploadError("");
  state.profile = profile;
  state.editing = null;
  store(profile);
  resetJob();
  showView();
  renderResume();
}

$("pdf").addEventListener("change", (event) => handleFile(event.target.files[0]));
$("drop").addEventListener("dragover", (event) => {
  event.preventDefault();
  $("drop").classList.add("over");
});
$("drop").addEventListener("dragleave", () => $("drop").classList.remove("over"));
$("drop").addEventListener("drop", (event) => {
  event.preventDefault();
  $("drop").classList.remove("over");
  handleFile(event.dataTransfer.files[0]);
});
$("manual").addEventListener("click", () => {
  state.editing = {
    name: "",
    contact: "",
    employers: [{ name: "", dates: "", title: "", bullets: "", tech: "" }],
    education: [{ name: "", dates: "", detail: "" }],
    skills: "",
  };
  renderEditor();
  showView();
  renderResume();
});
$("save-profile").addEventListener("click", saveProfile);
$("cancel-edit").addEventListener("click", () => {
  state.editing = null;
  showUploadError("");
  showView();
  renderResume();
});
$("edit-profile").addEventListener("click", () => {
  state.editing = toEditable(state.profile);
  renderEditor();
  showView();
});
$("replace-profile").addEventListener("click", () => $("pdf").click());
$("forget-profile").addEventListener("click", () => {
  if (!confirm("Remove this résumé from this browser? You can upload it again any time.")) return;
  state.profile = null;
  store(null);
  resetJob();
  showView();
  renderResume();
});

/* ---------- step 2: the job ---------- */

function chips(target, items) {
  target.replaceChildren(...items.map((i) => el("span", "", i)));
  if (!items.length) target.textContent = "None";
}

function renderAnalysis(data) {
  state.analysis = data.analysis;
  $("analysis").hidden = false;
  $("role-title").textContent = data.analysis.roleTitle;
  $("score").textContent = "–";
  $("covered").replaceChildren();
  $("gaps").replaceChildren();
  $("ai-box").hidden = true;
  $("must").replaceChildren(...data.analysis.mustHave.slice(0, 8).map((m) => el("li", "", m)));
  if (!$("workflow").options.length) {
    for (const [value, label] of Object.entries(data.workflows)) $("workflow").add(new Option(label, value));
  }
  $("workflow").value = data.analysis.roleType;
}

/** Side panel: the title in the draft next to the one shown, so it's clear what was changed or suggested. */
function renderTitles(t) {
  $("titles").replaceChildren(
    ...state.profile.employers.map((e) => {
      const shown = t.titles[e.id];
      const li = el("li");
      li.append(el("strong", "", `${e.name}: `));
      if (!shown) li.append("(no title)");
      else if (t.ai.titles[e.id]) li.append(`${shown} (suggested: not in your draft, verify)`);
      else li.append(e.title && shown !== e.title ? `${shown} (draft: ${e.title})` : shown);
      return li;
    }),
  );
}

function renderMatch(match) {
  $("score").textContent = match.score;
  chips($("covered"), match.covered);
  chips($("gaps"), match.gaps);
}

const updatePrintState = () => ($("print").disabled = !$("ai-box").hidden && !$("confirm").checked);

/** Lines the AI wrote without facts must be confirmed before downloading. */
function renderAiNote(t) {
  const count =
    Object.values(t.ai.bullets).filter(Boolean).length + Object.values(t.ai.titles).filter(Boolean).length + (t.ai.skills ? 1 : 0);
  $("ai-box").hidden = !count;
  $("ai-count").textContent = `${count} ${count === 1 ? "item" : "items"}`;
  $("confirm").checked = false;
  updatePrintState();
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
  const t = await post("/api/tailor", { profile: state.profile, analysis: state.analysis, workflow: $("workflow").value });
  state.tailored = t;
  renderMatch(t.match);
  renderTitles(t);
  renderAiNote(t);
  const notes = [];
  if (t.dropped) notes.push(`${t.dropped} generated line(s) were removed because they used details your draft doesn't have.`);
  if (t.titleResets.length) notes.push(`Kept your draft's title (or none) for ${t.titleResets.join(", ")}: the suggestion broke the title rules.`);
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
    $("build").disabled = !state.profile;
  }
}

$("build").addEventListener("click", () =>
  run(async () => {
    progress("Analyzing the job description…");
    renderAnalysis(await post("/api/analyze", { jd: $("jd").value }));
    await tailor();
  }),
);

$("workflow").addEventListener("change", () => run(tailor));
$("confirm").addEventListener("change", updatePrintState);
$("print").addEventListener("click", () => window.print());

$("copy").addEventListener("click", async () => {
  // Hide the "AI draft" badges while reading the text so they aren't copied.
  $("resume").classList.add("copying");
  const text = $("resume").innerText;
  $("resume").classList.remove("copying");
  try {
    await navigator.clipboard.writeText(text);
    done("Copied.");
  } catch {
    done("Copy failed; select the resume text manually.");
  }
});

state.profile = loadStored();
showView();
renderResume();
checkHealth();
