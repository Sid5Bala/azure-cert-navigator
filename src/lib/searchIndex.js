import { norm } from "./text.js";

// Flattens every exam into searchable records that know where they live in the app.
const cache = new Map();

export function buildIndex(exam) {
  if (cache.has(exam.id)) return cache.get(exam.id);
  const items = [];
  const add = (type, title, body, path, ctx) => items.push({ exam: exam.id, type, title, body, path, ctx, hay: norm(title + " " + body + " " + (ctx || "")), t: norm(title) });
  const base = exam.id;

  exam.blueprint.forEach((b) => b.areas.forEach((a) => add("Objective", a.title, a.bullets.join(" · "), `${base}`, b.title)));
  exam.domains.forEach((d) => {
    const dp = `${base}/learn/domains/${d.id}`;
    d.terms.forEach((t) => add("Term", t.t, t.d, dp, d.short));
    d.tables.forEach((tb) => {
      add("Table", tb.title, tb.h.join(" · "), dp, d.short);
      tb.r.forEach((row) => add("Table row", row[0], row.slice(1).join(" · "), dp, tb.title));
    });
    d.gotchas.forEach((g) => add("Trap", g, "", dp, d.short));
  });
  exam.disambig.groups.forEach((g) => g.items.forEach((it) => add("Confusable", it.t, `${it.d} ${it.r}`, `${base}/learn/confused`, g.label)));
  exam.services.forEach((c) => c.services.forEach((s) => add("Service", s.name, `${s.use} ${s.choose}`, `${base}/learn/services`, c.category)));
  exam.decisions.forEach((d) => add("Decision tree", d.title, d.tree.join(" "), `${base}/decide/trees`, ""));
  exam.triggers.forEach((t) => add("Trigger", t.phrase, t.a, `${base}/decide/triggers`, ""));
  exam.drills.forEach((d) => add("Drill", d.s, d.a, `${base}/practice/drills`, ""));
  exam.quiz.forEach((q) => add("Quiz", q.q, q.explain, `${base}/practice/quiz`, ""));
  exam.docs.forEach((d) => add("Doc", d.n, d.p, `${base}/learn/docs`, ""));

  cache.set(exam.id, items);
  return items;
}

const TYPE_RANK = { Service: 0, Confusable: 1, Term: 2, Trigger: 3, "Decision tree": 4, Table: 5, "Table row": 6, Trap: 7, Drill: 8, Quiz: 9, Objective: 10, Doc: 11 };

export function search(examList, query, limit = 80) {
  const q = norm(query).trim();
  if (q.length < 2) return [];
  const terms = q.split(/\s+/);
  const out = [];
  for (const exam of examList) {
    for (const it of buildIndex(exam)) {
      if (!terms.every((t) => it.hay.includes(t))) continue;
      let score = 0;
      if (it.t === q) score += 50;
      else if (it.t.startsWith(q)) score += 25;
      else if (it.t.includes(q)) score += 15;
      terms.forEach((t) => { if (it.t.includes(t)) score += 4; });
      score -= (TYPE_RANK[it.type] ?? 12) * 0.5;
      score -= Math.min(it.t.length, 200) / 100;
      out.push({ ...it, score });
    }
  }
  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
