import { useCallback, useEffect, useMemo, useState } from "react";
import { useStored, keys } from "../lib/storage.js";
import { quizId, drillId } from "../lib/progress.js";
import { buildDeck, DECK_CATEGORIES, MASTERED_BOX, MAX_BOX } from "../lib/deck.js";
import { matches, pct, shuffle } from "../lib/text.js";
import { Chips, Empty, Hl, Icon, Pill, Progress, Ring, SearchBox } from "../components/ui.jsx";

const LETTERS = ["A", "B", "C", "D", "E"];

function domainChips(exam) {
  return [{ id: "all", label: "All domains" }, ...exam.domains.map((d) => ({ id: d.id, label: d.short }))];
}

/* ---------------- Quiz ---------------- */

function Quiz({ exam, params }) {
  const [history, setHistory] = useStored(keys.quiz(exam.id), {});
  const [domain, setDomain] = useState(params.get("domain") && exam.domains.some((d) => d.id === params.get("domain")) ? params.get("domain") : "all");
  const [mode, setMode] = useState("all");
  const [size, setSize] = useState("10");
  const [run, setRun] = useState(null); // { list, i, picked, results }

  const pool = useMemo(() => {
    let qs = exam.quiz.filter((q) => domain === "all" || q.domain === domain);
    if (mode === "unanswered") qs = qs.filter((q) => !history[quizId(q)]);
    if (mode === "missed") qs = qs.filter((q) => history[quizId(q)] && !history[quizId(q)].last);
    return qs;
  }, [exam, domain, mode, history]);

  const answered = exam.quiz.filter((q) => history[quizId(q)]);
  const correct = answered.filter((q) => history[quizId(q)].last).length;
  const missed = answered.length - correct;

  const start = (list) => setRun({ list: shuffle(list).slice(0, size === "all" ? list.length : Number(size)), i: 0, picked: null, results: [] });

  const answer = useCallback(
    (idx) => {
      if (!run || run.picked != null) return;
      const q = run.list[run.i];
      const ok = idx === q.answer;
      setHistory((h) => {
        const prev = h[quizId(q)] || { n: 0, ok: 0 };
        return { ...h, [quizId(q)]: { n: prev.n + 1, ok: prev.ok + (ok ? 1 : 0), last: ok } };
      });
      setRun({ ...run, picked: idx, results: [...run.results, { q, ok, picked: idx }] });
    },
    [run, setHistory]
  );

  const next = useCallback(() => setRun((r) => (r && r.picked != null ? { ...r, i: r.i + 1, picked: null } : r)), []);

  useEffect(() => {
    if (!run || run.i >= run.list.length) return;
    const onKey = (e) => {
      if (e.target.tagName === "INPUT" || e.metaKey || e.ctrlKey || e.altKey) return;
      // A focused button already handles Enter/Space natively.
      if (e.target.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) return;
      const k = e.key.toUpperCase();
      const n = LETTERS.indexOf(k) >= 0 ? LETTERS.indexOf(k) : Number(e.key) - 1;
      const q = run.list[run.i];
      if (run.picked == null && n >= 0 && n < q.options.length) answer(n);
      else if (run.picked != null && (e.key === "Enter" || e.key === "ArrowRight")) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, answer, next]);

  // Setup screen
  if (!run) {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>Quiz</h1>
            <p>Exam-style multiple choice with an explanation for every answer — including why the distractors are wrong.</p>
          </div>
        </div>
        <div className="grid cols-4" style={{ marginBottom: 16 }}>
          <div className="card stat"><div className="stat-label">Answered</div><div className="stat-value">{answered.length}<span className="faint" style={{ fontSize: 16 }}>/{exam.quiz.length}</span></div></div>
          <div className="card stat"><div className="stat-label">Accuracy</div><div className="stat-value">{pct(correct, answered.length)}%</div></div>
          <div className="card stat"><div className="stat-label">To review</div><div className="stat-value" style={{ color: missed ? "var(--bad)" : undefined }}>{missed}</div></div>
        </div>
        <div className="card pad stack" style={{ gap: 14 }}>
          <div>
            <div className="stat-label" style={{ marginBottom: 6 }}>Domain</div>
            <Chips items={domainChips(exam)} value={domain} onChange={setDomain} />
          </div>
          <div>
            <div className="stat-label" style={{ marginBottom: 6 }}>Questions</div>
            <Chips items={[{ id: "all", label: "All questions" }, { id: "unanswered", label: "Not answered yet" }, { id: "missed", label: "Missed last time" }]} value={mode} onChange={setMode} />
          </div>
          <div>
            <div className="stat-label" style={{ marginBottom: 6 }}>Length</div>
            <Chips items={[{ id: "10", label: "10" }, { id: "20", label: "20" }, { id: "all", label: "All" }]} value={size} onChange={setSize} />
          </div>
          <div className="row">
            <button className="btn primary" disabled={!pool.length} onClick={() => start(pool)}>
              Start · {size === "all" ? pool.length : Math.min(Number(size), pool.length)} questions
            </button>
            {!pool.length && <span className="small muted">No questions match — change the filters.</span>}
          </div>
        </div>
      </>
    );
  }

  // Results screen
  if (run.i >= run.list.length) {
    const score = run.results.filter((r) => r.ok).length;
    const wrong = run.results.filter((r) => !r.ok);
    return (
      <>
        <div className="card pad row" style={{ gap: 18, marginBottom: 16 }}>
          <Ring value={pct(score, run.results.length)} size={84} />
          <div>
            <h1 style={{ fontSize: 22 }}>{score} / {run.results.length} correct</h1>
            <p className="muted small" style={{ marginTop: 4 }}>{pct(score, run.results.length) >= 70 ? "Above the 700/1000 pass line — keep it there." : "Below the pass line — review the misses below, then retry them."}</p>
            <div className="row" style={{ marginTop: 12 }}>
              {wrong.length > 0 && <button className="btn primary" onClick={() => start(wrong.map((w) => w.q))}>Retry {wrong.length} missed</button>}
              <button className="btn" onClick={() => setRun(null)}>New quiz</button>
            </div>
          </div>
        </div>
        {wrong.length > 0 && <div className="section-title">Review</div>}
        <div className="stack">
          {wrong.map(({ q, picked }) => (
            <div key={q.q} className="card pad">
              <div className="strong">{q.q}</div>
              <div className="small" style={{ marginTop: 8, color: "var(--bad)" }}>Your answer: {q.options[picked]}</div>
              <div className="small" style={{ marginTop: 2, color: "var(--ok)", fontWeight: 700 }}>Correct: {q.options[q.answer]}</div>
              <div className="explain" style={{ marginTop: 10 }}>{q.explain}</div>
            </div>
          ))}
        </div>
      </>
    );
  }

  // Question screen
  const q = run.list[run.i];
  const dom = exam.domains.find((d) => d.id === q.domain);
  const done = run.picked != null;
  return (
    <div style={{ maxWidth: 760 }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
        <span className="small faint">Question {run.i + 1} of {run.list.length}</span>
        <div className="row" style={{ gap: 6 }}>
          {dom && <Pill color={dom.color}>{dom.short}</Pill>}
          <button className="btn ghost sm" onClick={() => setRun(null)}>End</button>
        </div>
      </div>
      <Progress value={pct(run.i + (done ? 1 : 0), run.list.length)} />
      <h2 style={{ fontSize: 19, margin: "18px 0 14px", lineHeight: 1.4 }}>{q.q}</h2>
      <div className="stack" style={{ gap: 8 }}>
        {q.options.map((opt, idx) => {
          let cls = "option";
          if (done && idx === q.answer) cls += " correct";
          else if (done && idx === run.picked) cls += " wrong";
          return (
            <button key={idx} className={cls} disabled={done} onClick={() => answer(idx)}>
              <span className="key">{done && idx === q.answer ? <Icon name="check" size={15} stroke={3} /> : done && idx === run.picked ? <Icon name="x" size={15} stroke={3} /> : LETTERS[idx]}</span>
              <span>{opt}</span>
            </button>
          );
        })}
      </div>
      {done && (
        <div style={{ marginTop: 14 }}>
          <div className="explain">
            <b style={{ color: run.picked === q.answer ? "var(--ok)" : "var(--bad)" }}>{run.picked === q.answer ? "Correct. " : "Not quite. "}</b>
            {q.explain}
          </div>
          <div className="row" style={{ marginTop: 12, justifyContent: "flex-end" }}>
            <span className="tiny faint">Enter ↵</span>
            <button className="btn primary" onClick={next}>{run.i + 1 < run.list.length ? "Next question" : "See results"}</button>
          </div>
        </div>
      )}
      {!done && <p className="tiny faint" style={{ marginTop: 12 }}>Keys: A–D or 1–4 to answer.</p>}
    </div>
  );
}

/* ---------------- Drills ---------------- */

function DrillCard({ d, exam, status, onMark, q }) {
  const [open, setOpen] = useState(false);
  const dom = exam.domains.find((x) => x.id === d.domain);
  return (
    <div className="card pad" style={{ borderLeft: `4px solid ${status === "known" ? "var(--ok)" : status === "missed" ? "var(--bad)" : "var(--border)"}` }}>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 6 }}>
        {dom && <Pill color={dom.color}>{dom.short}</Pill>}
        {status && <Pill tone={status === "known" ? "ok" : "bad"}>{status === "known" ? "Got it" : "Weak"}</Pill>}
      </div>
      <div style={{ fontSize: 15, color: "var(--text-strong)", lineHeight: 1.55 }}><Hl text={d.s} q={q} /></div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className={"btn sm" + (open ? "" : " primary")} onClick={() => setOpen(!open)}>{open ? "Hide answer" : "Reveal answer"}</button>
        <button className="btn sm bad" onClick={() => onMark("missed")}>Missed it</button>
        <button className="btn sm ok" onClick={() => onMark("known")}>Got it</button>
      </div>
      {open && (
        <>
          <div className="drill-answer"><Hl text={d.a} q={q} /></div>
          <div className="why">
            <div className="stat-label" style={{ color: "var(--warn)" }}>Why not the traps?</div>
            <ul>{d.why.map((w) => <li key={w}>{w}</li>)}</ul>
          </div>
        </>
      )}
    </div>
  );
}

function Drills({ exam, params }) {
  const [state, setState] = useStored(keys.drills(exam.id), {});
  const [q, setQ] = useState(params.get("q") || "");
  const [domain, setDomain] = useState(params.get("domain") && exam.domains.some((d) => d.id === params.get("domain")) ? params.get("domain") : "all");
  const [filter, setFilter] = useState("all");
  const list = exam.drills.filter((d) => {
    const s = state[drillId(d)];
    if (domain !== "all" && d.domain !== domain) return false;
    if (filter === "unseen" && s) return false;
    if (filter === "weak" && s !== "missed") return false;
    if (filter === "known" && s !== "known") return false;
    return matches(d.s + " " + d.a, q);
  });
  const known = exam.drills.filter((d) => state[drillId(d)] === "known").length;
  const weak = exam.drills.filter((d) => state[drillId(d)] === "missed").length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Scenario drills</h1>
          <p>Read the scenario, say your answer out loud, then reveal. Each answer explains why the tempting alternatives are wrong.</p>
        </div>
        <div className="row">
          <Pill tone="ok">Got it {known}</Pill>
          <Pill tone="bad">Weak {weak}</Pill>
        </div>
      </div>
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Filter scenarios…" />
      </div>
      <div className="stack" style={{ gap: 8, marginBottom: 14 }}>
        <Chips items={domainChips(exam)} value={domain} onChange={setDomain} />
        <Chips items={[{ id: "all", label: "All" }, { id: "unseen", label: "Not tried" }, { id: "weak", label: "Weak" }, { id: "known", label: "Got it" }]} value={filter} onChange={setFilter} />
      </div>
      {!list.length && <Empty />}
      <div className="stack">
        {list.map((d) => (
          <DrillCard key={drillId(d)} d={d} exam={exam} q={q} status={state[drillId(d)]} onMark={(v) => setState((s) => ({ ...s, [drillId(d)]: v }))} />
        ))}
      </div>
    </>
  );
}

/* ---------------- Flashcards ---------------- */

function order(cards, mode, boxes) {
  if (mode === "shuffle") return shuffle(cards);
  if (mode === "weak") return shuffle(cards.filter((c) => boxes[c.id] === 0));
  // Smart: missed cards (box 0) first, then unseen, then boxes 1…4; random within a group.
  const rank = (c) => (boxes[c.id] === undefined ? 0.5 : boxes[c.id]);
  return shuffle(cards).sort((a, b) => rank(a) - rank(b));
}

function Flashcards({ exam }) {
  const deck = useMemo(() => buildDeck(exam), [exam]);
  const [boxes, setBoxes] = useStored(keys.cards(exam.id), {});
  const [cat, setCat] = useState("all");
  const [mode, setMode] = useState("smart");
  const [seed, setSeed] = useState(0);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Order is fixed per session so cards don't jump while you mark them.
  const list = useMemo(() => {
    const cards = cat === "all" ? deck : deck.filter((c) => c.cat === cat);
    return order(cards, mode, boxes);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, cat, mode, seed]);

  const card = list[i % Math.max(1, list.length)];
  const mastered = deck.filter((c) => (boxes[c.id] || 0) >= MASTERED_BOX).length;
  const counts = Object.fromEntries(DECK_CATEGORIES.map((c) => [c.id, c.id === "all" ? deck.length : deck.filter((d) => d.cat === c.id).length]));

  const move = useCallback((delta) => { setFlipped(false); setI((n) => Math.max(0, n + delta)); }, []);
  const mark = useCallback(
    (good) => {
      if (!card) return;
      setBoxes((b) => ({ ...b, [card.id]: good ? Math.min(MAX_BOX, (b[card.id] || 0) + 1) : 0 }));
      move(1);
    },
    [card, setBoxes, move]
  );

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") return; // focused buttons / the card handle Enter themselves
      if (e.key === " ") { e.preventDefault(); setFlipped((f) => !f); }
      else if (e.key === "ArrowRight") move(1);
      else if (e.key === "ArrowLeft") move(-1);
      else if (e.key === "1") mark(false);
      else if (e.key === "2") mark(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move, mark]);

  const reset = (fn) => { fn(); setI(0); setFlipped(false); };
  const box = card ? boxes[card.id] : undefined;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Flashcards</h1>
          <p>Spaced repetition: “Got it” moves a card up a box, “Again” sends it back. Smart order shows your weakest cards first.</p>
        </div>
        <Pill tone="ok">{mastered}/{deck.length} mastered</Pill>
      </div>
      <div className="stack" style={{ gap: 8, marginBottom: 16 }}>
        <Chips items={DECK_CATEGORIES.map((c) => ({ id: c.id, label: `${c.label} ${counts[c.id]}` }))} value={cat} onChange={(v) => reset(() => setCat(v))} />
        <Chips items={[{ id: "smart", label: "Smart (weak first)" }, { id: "shuffle", label: "Shuffled" }, { id: "weak", label: "Missed only" }]} value={mode} onChange={(v) => reset(() => setMode(v))} />
      </div>

      {!card ? (
        <Empty title="No cards here">{mode === "weak" ? "Cards you mark “Again” collect here." : "Pick another category."}</Empty>
      ) : (
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <span className="small faint">Card {(i % list.length) + 1} of {list.length}</span>
            <span className="small faint">{box == null ? "New" : `Box ${box}/${MAX_BOX}`}</span>
          </div>
          <div className="flash">
            <div className={"flash-card" + (flipped ? " flipped" : "")} onClick={() => setFlipped(!flipped)} role="button" tabIndex={0} aria-label={flipped ? "Show prompt" : "Reveal answer"} onKeyDown={(e) => e.key === "Enter" && setFlipped(!flipped)}>
              <div className="flash-face flash-front">
                <div className="flash-label">{DECK_CATEGORIES.find((c) => c.id === card.cat)?.label} · {card.ctx}</div>
                <div className="flash-text">{card.f}</div>
                <div className="tiny faint" style={{ marginTop: 14 }}>Tap or press Space to flip</div>
              </div>
              <div className="flash-face flash-back">
                <div className="flash-label">Answer</div>
                <div className="flash-text">{card.b}</div>
              </div>
            </div>
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 14 }}>
            <button className="btn bad" onClick={() => mark(false)}>Again <span className="kbd">1</span></button>
            <button className="btn primary" onClick={() => mark(true)}>Got it <span className="kbd" style={{ color: "#fff", borderColor: "rgba(255,255,255,.4)", background: "transparent" }}>2</span></button>
          </div>
          <div className="row" style={{ justifyContent: "space-between", marginTop: 10 }}>
            <button className="btn ghost sm" onClick={() => move(-1)} disabled={i === 0}><Icon name="back" size={15} /> Prev</button>
            <button className="btn ghost sm" onClick={() => reset(() => setSeed((s) => s + 1))}><Icon name="shuffle" size={15} /> Reshuffle</button>
            <button className="btn ghost sm" onClick={() => move(1)}>Skip <Icon name="chevron" size={15} /></button>
          </div>
        </div>
      )}
    </>
  );
}

export default function Practice({ exam, tab, params }) {
  if (tab === "drills") return <Drills exam={exam} params={params} />;
  if (tab === "cards") return <Flashcards exam={exam} />;
  return <Quiz exam={exam} params={params} />;
}
