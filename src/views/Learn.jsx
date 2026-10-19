import { useState } from "react";
import { link } from "../lib/route.js";
import { matches, norm } from "../lib/text.js";
import { Chips, Collapse, DataTable, Empty, Hl, Icon, Pill, SearchBox, Tip } from "../components/ui.jsx";

function DomainList({ exam }) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Domains</h1>
          <p>Deep-dive notes per exam domain: key terms, comparison tables and the traps exam writers love.</p>
        </div>
      </div>
      <div className="grid cols-2">
        {exam.domains.map((d) => (
          <a key={d.id} className="card domain-card link-card" style={{ "--dom": d.color }} href={link(`${exam.id}/learn/domains/${d.id}`)}>
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="domain-icon" aria-hidden="true">{d.icon}</span>
              <Pill color={d.color}>{d.weight}</Pill>
            </div>
            <div>
              <h3 style={{ fontSize: 16.5 }}>{d.title}</h3>
              <p className="muted small" style={{ marginTop: 4 }}>{d.desc}</p>
            </div>
            <div className="domain-meta">
              <span>{d.terms.length} terms</span>
              <span>{d.tables.length} tables</span>
              <span>{d.gotchas.length} traps</span>
            </div>
          </a>
        ))}
      </div>
    </>
  );
}

function DomainDetail({ exam, domain, params }) {
  const [q, setQ] = useState(params.get("q") || "");
  const terms = domain.terms.filter((t) => matches(t.t + " " + t.d, q));
  const tables = domain.tables
    .map((t) => {
      if (!q || matches(t.title + " " + t.h.join(" "), q)) return t;
      const rows = t.r.filter((row) => matches(row.join(" "), q));
      return rows.length ? { ...t, r: rows } : null;
    })
    .filter(Boolean);
  const traps = domain.gotchas.map((g, i) => ({ g, n: i + 1 })).filter((x) => matches(x.g, q));
  const bp = exam.blueprint.find((b) => b.id === domain.id);
  const nothing = q && !terms.length && !tables.length && !traps.length;

  return (
    <>
      <a className="btn ghost sm" href={link(`${exam.id}/learn/domains`)} style={{ marginBottom: 8, marginLeft: -8 }}>
        <Icon name="back" size={15} /> All domains
      </a>
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ color: domain.color }}>{exam.code} · {domain.weight}</div>
          <h1 style={{ marginTop: 4 }}><span aria-hidden="true">{domain.icon}</span> {domain.title}</h1>
          <p>{domain.desc}</p>
        </div>
        <div className="row">
          <a className="btn" href={link(`${exam.id}/practice/quiz`, { domain: domain.id })}>Quiz this domain</a>
          <a className="btn" href={link(`${exam.id}/practice/drills`, { domain: domain.id })}>Drills</a>
        </div>
      </div>

      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder={`Filter ${domain.short} terms, tables, traps…`} />
      </div>

      {nothing && <Empty />}

      {terms.length > 0 && (
        <section>
          <div className="section-title">Key terms · {terms.length}</div>
          <div className="grid cols-3">
            {terms.map((t) => (
              <div key={t.t} className="card term">
                <div className="term-t"><Hl text={t.t} q={q} /></div>
                <div className="term-d"><Hl text={t.d} q={q} /></div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tables.length > 0 && (
        <section>
          <div className="section-title">Comparison tables · {tables.length}</div>
          {tables.map((t) => (
            <Collapse key={t.title} title={t.title} sub={`${t.r.length} rows`} forceOpen={!!q}>
              <DataTable h={t.h} r={t.r} q={q} />
            </Collapse>
          ))}
        </section>
      )}

      {traps.length > 0 && (
        <section>
          <div className="section-title">Exam traps · {traps.length}</div>
          <div className="stack" style={{ gap: 8 }}>
            {traps.map(({ g, n }) => (
              <div key={n} className="trap">
                <span className="trap-n">{String(n).padStart(2, "0")}</span>
                <span><Hl text={g} q={q} /></span>
              </div>
            ))}
          </div>
        </section>
      )}

      {bp && !q && (
        <section>
          <div className="section-title">What Microsoft measures here</div>
          <Collapse title={bp.title} sub={`${bp.areas.length} objective groups · ${bp.weight}`}>
            {bp.areas.map((a) => (
              <div key={a.title} className="objective">
                <div className="objective-body">
                  <div className="objective-title">{a.title}</div>
                  <ul>{a.bullets.map((x) => <li key={x}>{x}</li>)}</ul>
                </div>
              </div>
            ))}
          </Collapse>
        </section>
      )}
    </>
  );
}

function Services({ exam, params }) {
  const [q, setQ] = useState(params.get("q") || "");
  const [cat, setCat] = useState("all");
  const cats = [{ id: "all", label: "All" }, ...exam.services.map((c) => ({ id: c.category, label: c.category }))];
  const groups = exam.services
    .filter((c) => cat === "all" || c.category === cat)
    .map((c) => ({ ...c, services: c.services.filter((s) => matches([s.name, s.use, s.choose, s.not, s.cues.join(" ")].join(" "), q)) }))
    .filter((c) => c.services.length);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Service navigator</h1>
          <p>What each service is, when to choose it, what it gets confused with, and the exam cue words that point to it.</p>
        </div>
      </div>
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Filter services or cue words…" />
      </div>
      <div style={{ marginBottom: 14 }}>
        <Chips items={cats} value={cat} onChange={setCat} />
      </div>
      {!groups.length && <Empty />}
      {groups.map((c) => (
        <section key={c.category} style={{ marginBottom: 20 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
            <h2 style={{ fontSize: 16, color: c.color }}>{c.category}</h2>
            <Pill color={c.color}>{c.services.length}</Pill>
          </div>
          <div className="grid cols-2">
            {c.services.map((s) => (
              <div key={s.name} className="card svc" style={{ "--svc": c.color }}>
                <div className="svc-name"><Hl text={s.name} q={q} /></div>
                <div className="svc-use"><Hl text={s.use} q={q} /></div>
                <div className="svc-line choose"><b>Choose when </b><Hl text={s.choose} q={q} /></div>
                <div className="svc-line not"><b>Don't confuse: </b><Hl text={s.not} q={q} /></div>
                <div className="cues">{s.cues.map((cue) => <Pill key={cue} color={c.color}>{cue}</Pill>)}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

function Confused({ exam, params }) {
  const [q, setQ] = useState(params.get("q") || "");
  const groups = exam.disambig.groups
    .map((g) => (matches(g.label + " " + g.tip, q) ? g : { ...g, items: g.items.filter((it) => matches(`${it.t} ${it.d} ${it.r}`, q)) }))
    .filter((g) => g.items.length);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Same word, different thing</h1>
          <p>{exam.disambig.desc}</p>
        </div>
      </div>
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Filter confusables…" />
      </div>
      {!groups.length && <Empty />}
      {groups.map((g) => (
        <section key={g.label} style={{ marginBottom: 22 }}>
          <h2 style={{ fontSize: 16, marginBottom: 10 }}>“{g.label}”</h2>
          <div className="grid cols-3" style={{ marginBottom: 10 }}>
            {g.items.map((it) => (
              <div key={it.t} className="card confuse-item">
                <div className="confuse-t"><Hl text={it.t} q={q} /></div>
                <div className="confuse-d"><Hl text={it.d} q={q} /></div>
                <div className="confuse-r"><Hl text={it.r} q={q} /></div>
              </div>
            ))}
          </div>
          <Tip>{g.tip}</Tip>
        </section>
      ))}
    </>
  );
}

function Docs({ exam, params }) {
  const [q, setQ] = useState(params.get("q") || "");
  const docs = exam.docs.filter((d) => matches(d.n + " " + d.p, q));
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Docs & open-book lookup</h1>
          <p>The Microsoft Learn pages worth knowing for {exam.code}. The search phrase is what to type on learn.microsoft.com when you need a fact fast.</p>
        </div>
      </div>
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Filter docs…" />
      </div>
      {!docs.length && <Empty />}
      <div className="grid cols-2">
        {docs.map((d) => (
          <a key={d.url + d.n} className="card pad link-card" href={d.url} target="_blank" rel="noreferrer">
            <div className="row" style={{ justifyContent: "space-between", flexWrap: "nowrap" }}>
              <span className="strong"><Hl text={d.n} q={q} /></span>
              <Icon name="external" size={15} className="faint" />
            </div>
            <div className="small muted" style={{ marginTop: 4 }}>Search: “<Hl text={d.p} q={q} />”</div>
            <div className="tiny faint" style={{ marginTop: 6, wordBreak: "break-all" }}>{norm(d.url).replace("https://", "")}</div>
          </a>
        ))}
      </div>
    </>
  );
}

export default function Learn({ exam, tab, item, params }) {
  if (tab === "domains") {
    const domain = item && exam.domains.find((d) => d.id === item);
    return domain ? <DomainDetail exam={exam} domain={domain} params={params} /> : <DomainList exam={exam} />;
  }
  if (tab === "services") return <Services exam={exam} params={params} />;
  if (tab === "confused") return <Confused exam={exam} params={params} />;
  return <Docs exam={exam} params={params} />;
}
