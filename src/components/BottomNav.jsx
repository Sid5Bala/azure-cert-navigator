import { link } from "../lib/route.js";
import { SECTIONS } from "../nav.js";
import { Icon } from "./ui.jsx";

export default function BottomNav({ exam, activeExam, section }) {
  const items = [
    ...SECTIONS.map((s) => ({ id: s.id, label: s.label, icon: s.icon, href: link(s.id === "overview" ? activeExam.id : `${activeExam.id}/${s.id}`), active: !!exam && section === s.id })),
    { id: "search", label: "Search", icon: "search", href: link("search"), active: section === "search" },
  ];
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((it) => (
        <a key={it.id} href={it.href} className={"bottom-link" + (it.active ? " active" : "")} aria-current={it.active ? "page" : undefined}>
          <Icon name={it.icon} size={21} />
          {it.label}
        </a>
      ))}
    </nav>
  );
}
