import { hashId } from "./text.js";

// Leitner boxes: 0 = new/missed … 4 = solid. A card counts as mastered from box 3.
export const MAX_BOX = 4;
export const MASTERED_BOX = 3;

export const DECK_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "services", label: "Services" },
  { id: "triggers", label: "Triggers" },
  { id: "confusables", label: "Confusables" },
  { id: "terms", label: "Terms" },
  { id: "traps", label: "Traps" },
];

// Turn "Front: back" / "Front = back" / "Front — back" traps into a prompt + answer when the split is clean.
function splitTrap(text) {
  for (const sep of [": ", " = ", " — ", " → "]) {
    const at = text.indexOf(sep);
    if (at > 6 && at < 90) return { f: text.slice(0, at).trim() + " — what's the catch?", b: text };
  }
  return null;
}

const cache = new Map();

export function buildDeck(exam) {
  if (cache.has(exam.id)) return cache.get(exam.id);
  const cards = [];
  const add = (cat, f, b, ctx) => cards.push({ id: hashId(cat + "|" + f + "|" + b), cat, f, b, ctx });

  exam.services.forEach((c) => c.services.forEach((s) => add("services", s.name, `${s.choose}\n\nTrap: ${s.not}`, c.category)));
  exam.triggers.forEach((t) => add("triggers", `“${t.phrase}”`, t.a, "what does it point to?"));
  exam.disambig.groups.forEach((g) => g.items.forEach((it) => add("confusables", it.t, `${it.d}\n\n${it.r}`, g.label)));
  exam.domains.forEach((d) => {
    d.terms.forEach((t) => add("terms", t.t, t.d, d.short));
    d.gotchas.forEach((g) => {
      const card = splitTrap(g);
      if (card) add("traps", card.f, card.b, d.short);
    });
  });

  cache.set(exam.id, cards);
  return cards;
}
