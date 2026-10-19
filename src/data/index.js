// Every exam module in this folder is picked up automatically (see README.md for the schema).
const ORDER = ["az104", "az305", "ai103"];
const modules = import.meta.glob(["./*.js", "!./index.js"], { eager: true });

export const exams = Object.values(modules)
  .map((m) => m.default)
  .filter((e) => e && e.id && Array.isArray(e.blueprint))
  .sort((a, b) => (ORDER.indexOf(a.id) + 1 || 99) - (ORDER.indexOf(b.id) + 1 || 99));

export const examById = Object.fromEntries(exams.map((e) => [e.id, e]));
