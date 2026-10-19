// Validates every exam module against the schema in src/data/README.md.
// Usage: node scripts/validate-data.mjs [examId ...]
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { existsSync } from "node:fs";

const ALL = ["az104", "az305", "ai103"];
const ids = process.argv.slice(2).length ? process.argv.slice(2) : ALL;

let failures = 0;

function check(ok, exam, where, msg) {
  if (!ok) {
    failures++;
    console.error(`  ✗ [${exam}] ${where}: ${msg}`);
  }
}

const isStr = (v) => typeof v === "string" && v.trim().length > 0;
const isArr = (v) => Array.isArray(v);
const strArr = (v) => isArr(v) && v.every((x) => typeof x === "string");

for (const id of ids) {
  const file = resolve("src/data", `${id}.js`);
  if (!existsSync(file)) {
    console.log(`- ${id}: (missing, skipped)`);
    continue;
  }
  const mod = await import(pathToFileURL(file).href + `?t=${Date.now()}`);
  const e = mod.default;
  const before = failures;

  for (const k of ["id", "code", "name", "level", "color", "skillsDate", "tagline", "studyGuide"]) check(isStr(e[k]), id, "root", `missing ${k}`);
  check(e.id === id, id, "root", `id "${e.id}" should equal file name "${id}"`);

  // blueprint
  check(isArr(e.blueprint) && e.blueprint.length > 0, id, "blueprint", "must be a non-empty array");
  const domainIds = new Set((e.domains || []).map((d) => d.id));
  (e.blueprint || []).forEach((b, i) => {
    const w = `blueprint[${i}]`;
    check(isStr(b.id) && isStr(b.title) && isStr(b.weight), id, w, "needs id, title, weight");
    check(domainIds.has(b.id), id, w, `id "${b.id}" has no matching domain`);
    check(isArr(b.areas) && b.areas.length > 0, id, w, "needs areas");
    (b.areas || []).forEach((a, j) => check(isStr(a.title) && strArr(a.bullets) && a.bullets.length > 0, id, `${w}.areas[${j}]`, "needs title + bullets"));
  });

  // domains
  check(isArr(e.domains) && e.domains.length > 0, id, "domains", "must be a non-empty array");
  const seen = new Set();
  (e.domains || []).forEach((d, i) => {
    const w = `domains[${i}] (${d.id})`;
    for (const k of ["id", "title", "short", "icon", "weight", "color", "desc"]) check(isStr(d[k]), id, w, `missing ${k}`);
    check(!seen.has(d.id), id, w, "duplicate domain id");
    seen.add(d.id);
    check(isArr(d.terms), id, w, "terms must be an array");
    (d.terms || []).forEach((t, j) => check(isStr(t.t) && isStr(t.d), id, `${w}.terms[${j}]`, "needs t + d"));
    check(isArr(d.tables), id, w, "tables must be an array");
    (d.tables || []).forEach((t, j) => {
      const tw = `${w}.tables[${j}] "${t.title}"`;
      check(isStr(t.title) && strArr(t.h) && isArr(t.r), id, tw, "needs title, h[], r[][]");
      (t.r || []).forEach((row, k) => check(strArr(row) && row.length === t.h.length, id, `${tw}.r[${k}]`, `expected ${t.h?.length} string cells, got ${row?.length}`));
    });
    check(strArr(d.gotchas), id, w, "gotchas must be string[]");
  });

  // disambig
  check(e.disambig && isStr(e.disambig.desc) && isArr(e.disambig.groups), id, "disambig", "needs desc + groups");
  (e.disambig?.groups || []).forEach((g, i) => {
    const w = `disambig.groups[${i}] (${g.label})`;
    check(isStr(g.label) && isStr(g.tip) && isArr(g.items) && g.items.length > 1, id, w, "needs label, tip, 2+ items");
    (g.items || []).forEach((it, j) => check(isStr(it.t) && isStr(it.d) && isStr(it.r), id, `${w}.items[${j}]`, "needs t, d, r"));
  });

  // services
  check(isArr(e.services) && e.services.length > 0, id, "services", "must be a non-empty array");
  (e.services || []).forEach((c, i) => {
    const w = `services[${i}] (${c.category})`;
    check(isStr(c.category) && isStr(c.color) && isArr(c.services), id, w, "needs category, color, services");
    (c.services || []).forEach((s, j) => check(isStr(s.name) && isStr(s.use) && isStr(s.choose) && isStr(s.not) && strArr(s.cues) && s.cues.length > 0, id, `${w}.services[${j}] (${s.name})`, "needs name, use, choose, not, cues[]"));
  });

  // decisions
  check(isArr(e.decisions) && e.decisions.length > 0, id, "decisions", "must be a non-empty array");
  (e.decisions || []).forEach((d, i) => {
    const w = `decisions[${i}] (${d.title})`;
    check(isStr(d.title) && isStr(d.color) && strArr(d.tree) && d.tree.length > 2, id, w, "needs title, color, tree[]");
    check(strArr(d.combos) && strArr(d.antipatterns), id, w, "combos and antipatterns must be string[]");
  });

  // triggers
  check(isArr(e.triggers) && e.triggers.length > 0, id, "triggers", "must be a non-empty array");
  (e.triggers || []).forEach((t, i) => check(isStr(t.phrase) && isStr(t.a), id, `triggers[${i}]`, "needs phrase + a"));

  // drills
  check(isArr(e.drills) && e.drills.length > 0, id, "drills", "must be a non-empty array");
  (e.drills || []).forEach((d, i) => {
    const w = `drills[${i}]`;
    check(isStr(d.s) && isStr(d.a), id, w, "needs s + a");
    check(domainIds.has(d.domain), id, w, `unknown domain "${d.domain}"`);
    check(strArr(d.why) && d.why.length >= 2, id, w, "why needs 2+ strings");
  });

  // quiz
  check(isArr(e.quiz) && e.quiz.length > 0, id, "quiz", "must be a non-empty array");
  const qs = new Set();
  (e.quiz || []).forEach((q, i) => {
    const w = `quiz[${i}]`;
    check(isStr(q.q) && isStr(q.explain), id, w, "needs q + explain");
    check(strArr(q.options) && q.options.length >= 3 && q.options.length <= 5, id, w, "needs 3-5 options");
    check(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < (q.options || []).length, id, w, `answer index ${q.answer} out of range`);
    check(new Set(q.options).size === (q.options || []).length, id, w, "duplicate options");
    check(domainIds.has(q.domain), id, w, `unknown domain "${q.domain}"`);
    check(!qs.has(q.q), id, w, "duplicate question text");
    qs.add(q.q);
  });

  // docs
  check(isArr(e.docs) && e.docs.length > 0, id, "docs", "must be a non-empty array");
  (e.docs || []).forEach((d, i) => check(isStr(d.n) && isStr(d.p) && isStr(d.url) && d.url.startsWith("https://"), id, `docs[${i}]`, "needs n, p, https url"));

  const count = (a) => (isArr(a) ? a.length : 0);
  const terms = (e.domains || []).reduce((s, d) => s + count(d.terms), 0);
  const tables = (e.domains || []).reduce((s, d) => s + count(d.tables), 0);
  const gotchas = (e.domains || []).reduce((s, d) => s + count(d.gotchas), 0);
  const svc = (e.services || []).reduce((s, c) => s + count(c.services), 0);
  const ok = failures === before;
  console.log(
    `${ok ? "✓" : "✗"} ${e.code}: ${count(e.domains)} domains, ${terms} terms, ${tables} tables, ${gotchas} gotchas, ` +
      `${count(e.disambig?.groups)} disambig groups, ${svc} services, ${count(e.decisions)} decisions, ${count(e.triggers)} triggers, ` +
      `${count(e.drills)} drills, ${count(e.quiz)} quiz, ${count(e.docs)} docs`
  );
}

if (failures) {
  console.error(`\n${failures} problem(s) found.`);
  process.exit(1);
}
