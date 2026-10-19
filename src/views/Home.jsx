import { useEffect, useMemo, useState } from "react";
import { exams, examById } from "../data/index.js";
import { link } from "../lib/route.js";
import { useStoreVersion, readStore, keys, exportProgress, importProgress } from "../lib/storage.js";
import { examProgress } from "../lib/progress.js";
import { parseWeight } from "../lib/text.js";
import { Icon, Pill, Ring } from "../components/ui.jsx";

function useInstall() {
  const [ready, setReady] = useState(() => !!window.__cnInstallPrompt);
  useEffect(() => {
    const on = () => setReady(true);
    window.addEventListener("cn-install-ready", on);
    return () => window.removeEventListener("cn-install-ready", on);
  }, []);
  const install = async () => {
    const prompt = window.__cnInstallPrompt;
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice.catch(() => null);
    window.__cnInstallPrompt = null;
    setReady(false);
  };
  return [ready, install];
}

const isStandalone = () => window.matchMedia?.("(display-mode: standalone)").matches || window.navigator.standalone === true;
const isIOS = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

function ExamCard({ exam, progress }) {
  const total = exam.domains.reduce((s, d) => s + parseWeight(d.weight).mid, 0);
  return (
    <div className="card exam-card" style={{ "--exam": exam.color }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="exam-code">{exam.code}</span>
        <Pill color={exam.color}>{exam.level}</Pill>
      </div>
      <div>
        <div className="exam-title">{exam.name}</div>
        <p className="muted small" style={{ marginTop: 6 }}>{exam.tagline}</p>
      </div>
      <div>
        <div className="mini-weights" aria-label="Domain weights">
          {exam.domains.map((d) => (
            <span key={d.id} title={`${d.title} ${d.weight}`} style={{ flex: parseWeight(d.weight).mid / total, background: d.color }} />
          ))}
        </div>
        <div className="row tiny faint" style={{ marginTop: 6, gap: 10 }}>
          {exam.domains.map((d) => (
            <span key={d.id}>{d.short} {d.weight}</span>
          ))}
        </div>
      </div>
      <div className="row" style={{ gap: 14 }}>
        <Ring value={progress.readiness} size={58} label={`Readiness ${progress.readiness}%`} />
        <div className="small muted">
          <div><b className="strong">Readiness</b></div>
          Quiz {progress.quizCorrect}/{progress.quizTotal} · Cards {progress.cardsMastered}/{progress.cardsTotal}
        </div>
      </div>
      <div className="row">
        <a className="btn primary" href={link(exam.id)} style={{ background: exam.color, borderColor: exam.color }}>
          Open {exam.code}
        </a>
        <a className="btn" href={link(`${exam.id}/practice/quiz`)}>Quick quiz</a>
      </div>
    </div>
  );
}

function BackupCard() {
  const [msg, setMsg] = useState("");
  const download = () => {
    const blob = new Blob([JSON.stringify(exportProgress(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `cert-navigator-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setMsg("Backup downloaded.");
  };
  const restore = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const n = importProgress(JSON.parse(await file.text()));
      setMsg(`Restored ${n} progress entries.`);
    } catch (err) {
      setMsg(err.message || "Couldn't read that file.");
    }
  };
  return (
    <section className="card pad row" style={{ justifyContent: "space-between", gap: 12 }}>
      <div style={{ minWidth: 0, flex: "1 1 260px" }}>
        <div className="strong">Move progress between devices</div>
        <div className="small muted">Progress lives in this browser. Download a backup here and restore it on your phone or laptop.</div>
        {msg && <div className="small" style={{ marginTop: 6, color: "var(--accent-ink)" }} role="status">{msg}</div>}
      </div>
      <div className="row">
        <button className="btn" onClick={download}><Icon name="download" size={16} /> Back up</button>
        <label className="btn" style={{ cursor: "pointer" }}>
          Restore
          <input type="file" accept="application/json,.json" onChange={restore} style={{ display: "none" }} />
        </label>
      </div>
    </section>
  );
}

export default function Home() {
  const version = useStoreVersion();
  const progress = useMemo(() => Object.fromEntries(exams.map((e) => [e.id, examProgress(e)])), [version]);
  const last = examById[readStore(keys.lastExam, exams[0].id)] || exams[0];
  const [canInstall, install] = useInstall();
  const showIOSHint = isIOS() && !isStandalone();

  return (
    <div className="stack" style={{ gap: 22 }}>
      <section className="hero">
        <div className="eyebrow">Microsoft certification prep · works offline</div>
        <h1 style={{ marginTop: 6 }}>One navigator for AZ-104, AZ-305 and AI-103</h1>
        <p>
          Learn each domain, decode exam wording into the right service, then prove it with drills, quizzes and spaced-repetition flashcards.
          Progress stays on this device.
        </p>
        <div className="row" style={{ marginTop: 16 }}>
          <a className="btn primary" href={link(last.id)}>
            Continue {last.code} <Icon name="chevron" size={16} />
          </a>
          <a className="btn" href={link("search")}>
            <Icon name="search" size={16} /> Search everything
          </a>
          {canInstall && (
            <button className="btn" onClick={install}>
              <Icon name="download" size={16} /> Install app
            </button>
          )}
        </div>
        {showIOSHint && <p className="small" style={{ marginTop: 12 }}>On iPhone/iPad: Share → Add to Home Screen to install.</p>}
      </section>

      <section>
        <div className="section-title">Your exams</div>
        <div className="grid cols-3">
          {exams.map((e) => <ExamCard key={e.id} exam={e} progress={progress[e.id]} />)}
        </div>
      </section>

      <section>
        <div className="section-title">The study loop</div>
        <div className="loop">
          <div className="card loop-step"><b>1 · Learn</b><span>Domains, services and the “same word, different thing” traps.</span></div>
          <div className="card loop-step"><b>2 · Decide</b><span>Decision trees and trigger phrases: requirement → service.</span></div>
          <div className="card loop-step"><b>3 · Practice</b><span>Scenario drills and quizzes with trap-elimination explanations.</span></div>
          <div className="card loop-step"><b>4 · Review weak</b><span>Flashcards resurface what you missed until it sticks.</span></div>
        </div>
      </section>

      <BackupCard />

      <footer className="footer">
        <span>Skills outlines checked against Microsoft Learn: AZ-104 &amp; AZ-305 (Apr 17, 2026), AI-103 (Apr 16, 2026).</span>
        <span>Not affiliated with Microsoft.</span>
      </footer>
    </div>
  );
}
