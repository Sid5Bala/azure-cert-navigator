import { useState } from "react";
import { norm } from "../lib/text.js";

const PATHS = {
  home: ["m3 10 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"],
  overview: ["M12 3a9 9 0 1 0 9 9", "M12 12 19 5", "M16 3h5v5"],
  learn: ["M4 19.5A2.5 2.5 0 0 1 6.5 17H20", "M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"],
  decide: ["M6 3v12", "M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M18 9a9 9 0 0 1-9 9"],
  practice: ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z", "M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z", "M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"],
  search: ["M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z", "m21 21-4.3-4.3"],
  sun: ["M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M12 2v2", "M12 20v2", "m4.93 4.93 1.41 1.41", "m17.66 17.66 1.41 1.41", "M2 12h2", "M20 12h2", "m6.34 17.66-1.41 1.41", "m19.07 4.93-1.41 1.41"],
  moon: ["M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"],
  system: ["M4 4h16v12H4z", "M8 20h8", "M12 16v4"],
  chevron: ["m9 18 6-6-6-6"],
  back: ["m15 18-6-6 6-6"],
  external: ["M15 3h6v6", "M10 14 21 3", "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"],
  x: ["M18 6 6 18", "m6 6 12 12"],
  check: ["M20 6 9 17l-5-5"],
  shuffle: ["M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22", "m18 2 4 4-4 4", "M2 6h1.9c1.5 0 2.9.9 3.6 2.2", "M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8", "m18 14 4 4-4 4"],
  flip: ["M3 12a9 9 0 0 1 15-6.7L21 8", "M21 3v5h-5", "M21 12a9 9 0 0 1-15 6.7L3 16", "M8 16H3v5"],
  download: ["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", "m7 10 5 5 5-5", "M12 15V3"],
};

export function Icon({ name, size = 18, stroke = 2, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {(PATHS[name] || []).map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

export function Pill({ children, color, tone, title }) {
  const cls = "pill" + (tone ? " " + tone : "");
  return <span className={cls} style={color ? { "--pill": color } : undefined} title={title}>{children}</span>;
}

export function Tip({ kind = "rule", children }) {
  const icon = kind === "combo" ? "🔗" : kind === "anti" ? "⛔" : "⚡";
  return (
    <div className={"tip " + kind}>
      <span className="tip-icon" aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </div>
  );
}

export function Collapse({ title, sub, children, defaultOpen = false, forceOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = forceOpen || open;
  return (
    <div className={"collapse" + (isOpen ? " open" : "")}>
      <button className="collapse-head" onClick={() => setOpen(!open)} aria-expanded={isOpen}>
        <span>
          <span className="title">{title}</span>
          {sub && <span className="sub">{sub}</span>}
        </span>
        <Icon name="chevron" />
      </button>
      {isOpen && <div className="collapse-body">{children}</div>}
    </div>
  );
}

// Wraps every occurrence of each query term in <mark>.
export function Hl({ text, q }) {
  const s = String(text ?? "");
  const terms = norm(q).trim().split(/\s+/).filter((t) => t.length > 1);
  if (!terms.length) return s;
  const re = new RegExp("(" + terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "ig");
  return s.split(re).map((part, i) => (i % 2 ? <mark key={i}>{part}</mark> : part));
}

export function DataTable({ h, r, q }) {
  return (
    <div className="table-wrap">
      <table className={"data" + (h.length > 3 ? " wide" : "")}>
        <thead>
          <tr>{h.map((x, i) => <th key={i}>{x}</th>)}</tr>
        </thead>
        <tbody>
          {r.map((row, ri) => (
            <tr key={ri}>{row.map((c, ci) => <td key={ci}><Hl text={c} q={q} /></td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = "Filter…", autoFocus }) {
  return (
    <div className="search-box">
      <Icon name="search" size={17} />
      <input className="input" type="search" value={value} placeholder={placeholder} autoFocus={autoFocus} onChange={(e) => onChange(e.target.value)} aria-label={placeholder} />
      {value && (
        <button className="btn ghost sm clear" onClick={() => onChange("")} aria-label="Clear filter">
          <Icon name="x" size={15} />
        </button>
      )}
    </div>
  );
}

export function Empty({ title = "Nothing matches", children }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children || "Try a different filter."}
    </div>
  );
}

export function Ring({ value, size = 64, label }) {
  return (
    <div className="ring" style={{ "--p": Math.max(0, Math.min(100, value)), "--size": size + "px" }} role="img" aria-label={label || value + "%"}>
      <span>{value}%</span>
    </div>
  );
}

export function Progress({ value }) {
  return (
    <div className="progress" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: Math.max(0, Math.min(100, value)) + "%" }} />
    </div>
  );
}

export function Chips({ items, value, onChange }) {
  return (
    <div className="chips" role="tablist">
      {items.map((it) => (
        <button key={it.id} role="tab" aria-selected={value === it.id} className={"chip" + (value === it.id ? " active" : "")} onClick={() => onChange(it.id)}>
          {it.label}
        </button>
      ))}
    </div>
  );
}
