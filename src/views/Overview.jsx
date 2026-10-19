import { useMemo } from "react";
import { link } from "../lib/route.js";
import { useStored, useStoreVersion, keys, removeStorePrefix } from "../lib/storage.js";
import { examProgress, areaKey } from "../lib/progress.js";
import { parseWeight } from "../lib/text.js";
import { Collapse, Icon, Progress, Ring, Tip } from "../components/ui.jsx";

const LEVELS = ["Not yet", "Shaky", "Solid"];

function Confidence({ value, onChange }) {
  return (
    <div className="confidence" role="radiogroup" aria-label="Your confidence">
      {LEVELS.map((label, i) => (
        <button key={label} role="radio" aria-checked={value === i} className={(value === i ? "on " : "") + "c" + i} onClick={() => onChange(i)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function studyNext(exam, progress) {
  let best = null;
  for (const d of exam.domains) {
    const p = progress.perDomain[d.id];
    const quizAcc = p.quizDone ? p.quizCorrect / p.quizTotal : 0;
    const mastery = (p.confidence / 100 + quizAcc) / 2;
    const score = parseWeight(d.weight).mid * (1 - mastery);
    if (!best || score > best.score) best = { d, score, mastery };
  }
  return best;
}

export default function Overview({ exam }) {
  const version = useStoreVersion();
  const progress = useMemo(() => examProgress(exam), [exam, version]);
  const [blueprint, setBlueprint] = useStored(keys.blueprint(exam.id), {});
  const next = studyNext(exam, progress);
  const maxHi = Math.max(...exam.domains.map((d) => parseWeight(d.weight).hi), 40);

  const reset = () => {
    if (window.confirm(`Reset all ${exam.code} progress on this device? (blueprint ratings, quiz history, drills and flashcards)`)) {
      removeStorePrefix(`cn:${exam.id}:`);
    }
  };

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="page-head">
        <div>
          <div className="eyebrow">{exam.code} · {exam.level}</div>
          <h1 style={{ marginTop: 4 }}>{exam.name}</h1>
          <p>{exam.tagline}</p>
        </div>
        <a className="btn" href={exam.studyGuide} target="_blank" rel="noreferrer">
          Official study guide <Icon name="external" size={15} />
        </a>
      </div>

      <div className="grid cols-4">
        <div className="card stat row" style={{ gap: 14 }}>
          <Ring value={progress.readiness} size={60} label={`Readiness ${progress.readiness}%`} />
          <div>
            <div className="stat-label">Readiness</div>
            <div className="stat-sub">blend of all signals</div>
          </div>
        </div>
        <button className="card stat link-card" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => document.getElementById("blueprint")?.scrollIntoView({ behavior: "smooth" })}>
          <div className="stat-label">Blueprint</div>
          <div className="stat-value">{progress.confidencePct}%</div>
          <Progress value={progress.confidencePct} />
        </button>
        <a className="card stat link-card" href={link(`${exam.id}/practice/quiz`)}>
          <div className="stat-label">Quiz</div>
          <div className="stat-value">{progress.quizCorrect}<span className="faint" style={{ fontSize: 16 }}>/{progress.quizTotal}</span></div>
          <div className="stat-sub">{progress.quizAnswered} answered</div>
        </a>
        <a className="card stat link-card" href={link(`${exam.id}/practice/drills`)}>
          <div className="stat-label">Drills</div>
          <div className="stat-value">{progress.drillsKnown}<span className="faint" style={{ fontSize: 16 }}>/{progress.drillsTotal}</span></div>
          <div className="stat-sub">marked “got it”</div>
        </a>
        <a className="card stat link-card" href={link(`${exam.id}/practice/cards`)}>
          <div className="stat-label">Flashcards</div>
          <div className="stat-value">{progress.cardsMastered}<span className="faint" style={{ fontSize: 16 }}>/{progress.cardsTotal}</span></div>
          <div className="stat-sub">mastered</div>
        </a>
      </div>

      {next && (
        <Tip>
          Study next: <b>{next.d.title}</b> ({next.d.weight}) — high weight, {Math.round(next.mastery * 100)}% mastery.{" "}
          <a href={link(`${exam.id}/learn/domains/${next.d.id}`)} style={{ textDecoration: "underline" }}>Open domain</a>
          {" · "}
          <a href={link(`${exam.id}/practice/quiz`, { domain: next.d.id })} style={{ textDecoration: "underline" }}>Quiz it</a>
        </Tip>
      )}

      <section className="card pad">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 17 }}>Domain weights</h2>
          <span className="tiny faint">Skills measured as of {exam.skillsDate}</span>
        </div>
        <div style={{ marginTop: 6 }}>
          {exam.domains.map((d) => {
            const w = parseWeight(d.weight);
            const p = progress.perDomain[d.id];
            return (
              <a key={d.id} className="weight-row" href={link(`${exam.id}/learn/domains/${d.id}`)}>
                <div style={{ minWidth: 0 }}>
                  <div className="strong" style={{ fontSize: 14.5 }}>
                    <span aria-hidden="true">{d.icon}</span> {d.title}
                  </div>
                  <div className="tiny faint">
                    Confidence {p.confidence}% · Quiz {p.quizCorrect}/{p.quizTotal}
                  </div>
                </div>
                <div className="weight-bar" style={{ "--bar": d.color }}>
                  <span style={{ left: 0, width: (w.lo / maxHi) * 100 + "%", opacity: 0.55 }} />
                  <span style={{ left: (w.lo / maxHi) * 100 + "%", width: ((w.hi - w.lo) / maxHi) * 100 + "%" }} />
                </div>
                <div className="weight-label">{d.weight}</div>
              </a>
            );
          })}
        </div>
      </section>

      <section id="blueprint">
        <div className="row" style={{ justifyContent: "space-between", margin: "8px 0 10px" }}>
          <div>
            <h2 style={{ fontSize: 17 }}>Skills measured — rate yourself</h2>
            <p className="small muted" style={{ marginTop: 3 }}>Microsoft's official outline. Mark each objective so “Study next” knows where you're weak.</p>
          </div>
        </div>
        {exam.blueprint.map((b) => {
          const dom = exam.domains.find((d) => d.id === b.id);
          const rated = b.areas.filter((_, i) => blueprint[areaKey(b.id, i)] === 2).length;
          return (
            <Collapse key={b.id} title={`${dom?.icon || ""} ${b.title}`} sub={`${b.weight} · ${rated}/${b.areas.length} solid`}>
              {b.areas.map((a, i) => {
                const k = areaKey(b.id, i);
                return (
                  <div key={k} className="objective">
                    <div className="objective-body">
                      <div className="objective-title">{a.title}</div>
                      <ul>{a.bullets.map((x) => <li key={x}>{x}</li>)}</ul>
                    </div>
                    <Confidence value={blueprint[k] || 0} onChange={(v) => setBlueprint((prev) => ({ ...prev, [k]: v }))} />
                  </div>
                );
              })}
              <div className="row" style={{ marginTop: 10 }}>
                <a className="btn sm" href={link(`${exam.id}/learn/domains/${b.id}`)}>Study this domain</a>
                <a className="btn sm" href={link(`${exam.id}/practice/quiz`, { domain: b.id })}>Quiz this domain</a>
              </div>
            </Collapse>
          );
        })}
      </section>

      <footer className="footer">
        <span>
          {exam.code} content: {exam.domains.reduce((s, d) => s + d.terms.length, 0)} terms · {exam.domains.reduce((s, d) => s + d.gotchas.length, 0)} traps ·{" "}
          {exam.decisions.length} decision trees · {exam.quiz.length} quiz questions
        </span>
        <button className="btn ghost sm" onClick={reset}>Reset {exam.code} progress</button>
      </footer>
    </div>
  );
}
