import { exams } from "../data/index.js";
import { link } from "../lib/route.js";
import { SECTIONS, sectionById } from "../nav.js";
import { Icon } from "./ui.jsx";

const THEME_NEXT = { system: "light", light: "dark", dark: "system" };
const THEME_ICON = { system: "system", light: "sun", dark: "moon" };

function ExamSwitch({ exam, section, tab }) {
  return (
    <nav className="exam-switch" aria-label="Exam">
      {exams.map((e) => {
        const path = section && section !== "home" && section !== "search" ? [e.id, section !== "overview" && section, tab].filter(Boolean).join("/") : e.id;
        return (
          <a key={e.id} href={link(path)} className={"exam-chip" + (exam?.id === e.id ? " active" : "")} style={{ "--chip": e.color }} aria-current={exam?.id === e.id ? "page" : undefined}>
            <span className="dot" />
            {e.code}
          </a>
        );
      })}
    </nav>
  );
}

export default function Header({ exam, activeExam, section, tab, theme, onTheme }) {
  const sec = sectionById[section];
  return (
    <header className="header">
      <div className="wrap">
        <div className="header-row top">
          <a className="brand" href={link("")} aria-label="Azure Cert Navigator home">
            <img src="./favicon.svg" alt="" />
            <span className="brand-name">
              Cert Navigator
              <small>AZ-104 · AZ-305 · AI-103</small>
            </span>
          </a>
          <ExamSwitch exam={exam} section={section} tab={tab} />
          <div className="header-spacer" />
          <nav className="section-nav" aria-label="Sections">
            {SECTIONS.map((s) => (
              <a key={s.id} href={link(s.id === "overview" ? activeExam.id : `${activeExam.id}/${s.id}`)} className={"section-link" + (exam && section === s.id ? " active" : "")}>
                <Icon name={s.icon} size={16} />
                {s.label}
              </a>
            ))}
          </nav>
          <a className="icon-btn" href={link("search")} aria-label="Search all content (/)" title="Search (/)">
            <Icon name="search" />
          </a>
          <button className="icon-btn" onClick={() => onTheme(THEME_NEXT[theme] || "system")} aria-label={`Theme: ${theme}. Switch theme`} title={`Theme: ${theme}`}>
            <Icon name={THEME_ICON[theme] || "system"} />
          </button>
        </div>
        <div className="exam-row">
          <ExamSwitch exam={exam} section={section} tab={tab} />
        </div>
        {exam && sec?.tabs && (
          <nav className="subtabs" aria-label={`${sec.label} views`}>
            {sec.tabs.map((t) => {
              const n = t.count?.(exam);
              return (
                <a key={t.id} href={link(`${exam.id}/${sec.id}/${t.id}`)} className={"subtab" + (tab === t.id ? " active" : "")} aria-current={tab === t.id ? "page" : undefined}>
                  {t.label}
                  {n != null && <span className="count">{n}</span>}
                </a>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
