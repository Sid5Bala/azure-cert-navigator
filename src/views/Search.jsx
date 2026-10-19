import { useEffect, useMemo, useState } from "react";
import { exams, examById } from "../data/index.js";
import { link } from "../lib/route.js";
import { search } from "../lib/searchIndex.js";
import { Chips, Empty, Hl, Pill, SearchBox } from "../components/ui.jsx";

const SUGGESTIONS = ["private endpoint", "managed identity", "RPO", "Cosmos consistency", "guardrail", "hybrid search", "Front Door", "SAS"];

export default function SearchView({ params }) {
  const [q, setQ] = useState(params.get("q") || "");
  const [scope, setScope] = useState(params.get("exam") || "all");
  const scopes = [{ id: "all", label: "All exams" }, ...exams.map((e) => ({ id: e.id, label: e.code }))];
  const results = useMemo(() => search(scope === "all" ? exams : [examById[scope]], q), [q, scope]);

  // Keep the query in the URL (without re-routing) so Back returns to the same results.
  useEffect(() => {
    window.history.replaceState(null, "", link("search", { q: q.trim() || null, exam: scope !== "all" ? scope : null }));
  }, [q, scope]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Search everything</h1>
          <p>Services, terms, table rows, traps, decision trees, triggers, drills and quiz questions across all three exams.</p>
        </div>
      </div>
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="e.g. private endpoint, PTU, Backup vault…" autoFocus />
      </div>
      <div style={{ marginBottom: 14 }}>
        <Chips items={scopes} value={scope} onChange={setScope} />
      </div>

      {q.trim().length < 2 ? (
        <div className="card pad">
          <div className="strong" style={{ marginBottom: 8 }}>Try</div>
          <div className="row">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="chip" onClick={() => setQ(s)}>{s}</button>
            ))}
          </div>
        </div>
      ) : !results.length ? (
        <Empty title={`No results for “${q}”`}>Check spelling or try fewer words.</Empty>
      ) : (
        <>
          <div className="small faint" style={{ marginBottom: 8 }}>{results.length === 80 ? "Top 80 results" : `${results.length} results`}</div>
          <div className="stack" style={{ gap: 8 }}>
            {results.map((r, i) => {
              const exam = examById[r.exam];
              const target = r.type === "Objective" || r.type === "Quiz" ? link(r.path) : link(r.path, { q: r.type === "Table row" ? r.title : q });
              return (
                <a key={i} className="card result link-card" href={target}>
                  <div className="row" style={{ gap: 6 }}>
                    <Pill color={exam.color}>{exam.code}</Pill>
                    <span className="result-type">{r.type}{r.ctx ? ` · ${r.ctx}` : ""}</span>
                  </div>
                  <div className="result-title"><Hl text={r.title} q={q} /></div>
                  {r.body && <div className="result-body"><Hl text={r.body} q={q} /></div>}
                </a>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
