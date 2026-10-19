import { useState } from "react";
import { useStored, keys } from "../lib/storage.js";
import { hashId, matches } from "../lib/text.js";
import { Empty, Hl, Pill, SearchBox, Tip } from "../components/ui.jsx";

// Renders "├── │ └──" ASCII trees as indented, wrapping lines (readable on phones).
const PREFIX = /^[\s│├└─|]*/;

function TreeView({ lines, q }) {
  return (
    <div className="tree">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="tree-gap" />;
        const prefix = line.match(PREFIX)[0];
        const depth = Math.round(prefix.length / 4);
        const text = line.slice(prefix.length);
        const arrow = text.indexOf("→");
        const isRoot = depth === 0 && arrow === -1;
        const isAnswer = arrow === 0;
        let body;
        if (arrow === -1) body = <Hl text={text} q={q} />;
        else {
          const before = text.slice(0, arrow).trim();
          const after = text.slice(arrow + 1).trim();
          body = (
            <>
              {before && <><Hl text={before} q={q} />{" "}</>}
              <span className="tree-ans">→ <Hl text={after} q={q} /></span>
            </>
          );
        }
        return (
          <div key={i} className={"tree-line" + (isRoot ? " root" : "") + (isAnswer ? " answer" : "")} style={{ "--d": depth }}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

function Trees({ exam, params }) {
  const [q, setQ] = useState(params.get("q") || "");
  const list = exam.decisions.filter((d) => matches([d.title, ...d.tree, ...d.combos, ...d.antipatterns].join(" "), q));
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Decision trees</h1>
          <p>Read top-down and follow the branch that matches the requirement. Green arrows are the answer; combos and anti-patterns are the architect's reasoning.</p>
        </div>
      </div>
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Filter decision trees…" />
      </div>
      {!list.length && <Empty />}
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 480px), 1fr))", alignItems: "start" }}>
        {list.map((d) => (
          <article key={d.title} className="card pad" style={{ borderTop: `4px solid ${d.color}`, "--tree": d.color }}>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <h2 style={{ fontSize: 17 }}><Hl text={d.title} q={q} /></h2>
              <Pill color={d.color}>decision</Pill>
            </div>
            <TreeView lines={d.tree} q={q} />
            {d.combos.length > 0 && (
              <>
                <div className="section-title" style={{ margin: "14px 0 8px", color: "var(--ok)" }}>Real-world combos</div>
                <div className="stack" style={{ gap: 6 }}>{d.combos.map((c) => <Tip key={c} kind="combo"><Hl text={c} q={q} /></Tip>)}</div>
              </>
            )}
            {d.antipatterns.length > 0 && (
              <>
                <div className="section-title" style={{ margin: "14px 0 8px", color: "var(--bad)" }}>Anti-patterns</div>
                <div className="stack" style={{ gap: 6 }}>{d.antipatterns.map((c) => <Tip key={c} kind="anti"><Hl text={c} q={q} /></Tip>)}</div>
              </>
            )}
          </article>
        ))}
      </div>
    </>
  );
}

function Triggers({ exam, params }) {
  const [q, setQ] = useState(params.get("q") || "");
  const [selfTest, setSelfTest] = useState(false);
  const [revealed, setRevealed] = useState({});
  const [seen, setSeen] = useStored(keys.triggers(exam.id), {});
  const list = exam.triggers.filter((t) => matches(t.phrase + " " + t.a, q));
  const reveal = (id) => {
    setRevealed((r) => ({ ...r, [id]: true }));
    setSeen((s) => ({ ...s, [id]: true }));
  };
  const seenCount = exam.triggers.filter((t) => seen[hashId(t.phrase)]).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Trigger phrases</h1>
          <p>Exam wording → the answer it points to. Turn on self-test to hide answers and tap to reveal.</p>
        </div>
        <Pill tone="neutral">{seenCount}/{exam.triggers.length} self-tested</Pill>
      </div>
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Filter trigger phrases…" />
        <button className={"btn" + (selfTest ? " primary" : "")} onClick={() => { setSelfTest(!selfTest); setRevealed({}); }} aria-pressed={selfTest}>
          {selfTest ? "Self-test on" : "Self-test off"}
        </button>
      </div>
      {!list.length && <Empty />}
      <div className="grid cols-2">
        {list.map((t) => {
          const id = hashId(t.phrase);
          const hidden = selfTest && !revealed[id];
          return (
            <div key={id} className="card trigger">
              <div className="trigger-q">“<Hl text={t.phrase} q={q} />”</div>
              <div
                className={"trigger-a" + (hidden ? " hidden" : "")}
                onClick={hidden ? () => reveal(id) : undefined}
                role={hidden ? "button" : undefined}
                tabIndex={hidden ? 0 : undefined}
                onKeyDown={hidden ? (e) => (e.key === "Enter" || e.key === " ") && reveal(id) : undefined}
                aria-label={hidden ? "Reveal answer" : undefined}
              >
                → <Hl text={t.a} q={q} />
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function Decide({ exam, tab, params }) {
  return tab === "triggers" ? <Triggers exam={exam} params={params} /> : <Trees exam={exam} params={params} />;
}
