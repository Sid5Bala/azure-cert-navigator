import { readStore, keys } from "./storage.js";
import { hashId, pct } from "./text.js";
import { buildDeck, MASTERED_BOX } from "./deck.js";

export const quizId = (q) => hashId(q.q);
export const drillId = (d) => hashId(d.s);
export const areaKey = (domainId, i) => `${domainId}:${i}`;

// Snapshot of everything a learner has done for one exam, read straight from storage.
export function examProgress(exam) {
  const blueprint = readStore(keys.blueprint(exam.id), {});
  const quiz = readStore(keys.quiz(exam.id), {});
  const drills = readStore(keys.drills(exam.id), {});
  const cards = readStore(keys.cards(exam.id), {});

  const areas = exam.blueprint.flatMap((b) => b.areas.map((_, i) => areaKey(b.id, i)));
  const confidence = areas.reduce((s, k) => s + (blueprint[k] || 0), 0) / (areas.length * 2 || 1);

  const answered = exam.quiz.filter((q) => quiz[quizId(q)]);
  const correct = answered.filter((q) => quiz[quizId(q)].last).length;

  const deck = buildDeck(exam);
  const mastered = deck.filter((c) => (cards[c.id] || 0) >= MASTERED_BOX).length;

  const drillsKnown = exam.drills.filter((d) => drills[drillId(d)] === "known").length;

  const perDomain = Object.fromEntries(
    exam.domains.map((d) => {
      const qs = exam.quiz.filter((q) => q.domain === d.id);
      const done = qs.filter((q) => quiz[quizId(q)]);
      const ok = done.filter((q) => quiz[quizId(q)].last).length;
      const bp = exam.blueprint.find((b) => b.id === d.id);
      const conf = bp ? bp.areas.reduce((s, _, i) => s + (blueprint[areaKey(d.id, i)] || 0), 0) / (bp.areas.length * 2) : 0;
      return [d.id, { quizTotal: qs.length, quizDone: done.length, quizCorrect: ok, confidence: Math.round(conf * 100) }];
    })
  );

  const confidencePct = Math.round(confidence * 100);
  const quizPct = pct(correct, exam.quiz.length);
  const cardsPct = pct(mastered, deck.length);
  const drillsPct = pct(drillsKnown, exam.drills.length);
  const readiness = Math.round(confidencePct * 0.3 + quizPct * 0.4 + drillsPct * 0.15 + cardsPct * 0.15);

  return {
    readiness, confidencePct, quizPct, cardsPct, drillsPct,
    quizAnswered: answered.length, quizCorrect: correct, quizTotal: exam.quiz.length,
    cardsMastered: mastered, cardsTotal: deck.length,
    drillsKnown, drillsTotal: exam.drills.length,
    perDomain,
  };
}
