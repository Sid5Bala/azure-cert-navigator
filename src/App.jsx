import { useEffect, useState } from "react";
import { exams, examById } from "./data/index.js";
import { useRoute, go } from "./lib/route.js";
import { useStored, keys } from "./lib/storage.js";
import { defaultTab, sectionById } from "./nav.js";
import Header from "./components/Header.jsx";
import BottomNav from "./components/BottomNav.jsx";
import Home from "./views/Home.jsx";
import Overview from "./views/Overview.jsx";
import Learn from "./views/Learn.jsx";
import Decide from "./views/Decide.jsx";
import Practice from "./views/Practice.jsx";
import SearchView from "./views/Search.jsx";

function useThemeAttribute(theme) {
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "light" || theme === "dark") root.setAttribute("data-theme", theme);
    else root.removeAttribute("data-theme");
  }, [theme]);
}

function useUpdateToast() {
  const [reg, setReg] = useState(null);
  useEffect(() => {
    const onUpdate = (e) => setReg(e.detail);
    window.addEventListener("cn-sw-update", onUpdate);
    return () => window.removeEventListener("cn-sw-update", onUpdate);
  }, []);
  return [reg, () => setReg(null)];
}

export default function App() {
  const route = useRoute();
  const [theme, setTheme] = useStored(keys.theme, "system");
  const [lastExam, setLastExam] = useStored(keys.lastExam, exams[0].id);
  const [updateReg, dismissUpdate] = useUpdateToast();
  useThemeAttribute(theme);

  const [p0, p1, p2, p3] = route.parts;
  const isSearch = p0 === "search";
  const exam = !isSearch && p0 ? examById[p0] : null;
  const activeExam = exam || examById[lastExam] || exams[0];
  const section = isSearch ? "search" : exam ? (sectionById[p1] ? p1 : "overview") : "home";
  const tab = exam && sectionById[section]?.tabs ? (sectionById[section].tabs.some((t) => t.id === p2) ? p2 : defaultTab(section)) : undefined;
  const path = route.parts.join("/");

  useEffect(() => {
    if (exam && exam.id !== lastExam) setLastExam(exam.id);
  }, [exam, lastExam, setLastExam]);

  // Unknown exam ids fall back to home.
  useEffect(() => {
    if (p0 && !isSearch && !exam) go("");
  }, [p0, isSearch, exam]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  useEffect(() => {
    document.title = exam ? `${exam.code} · Cert Navigator` : "Azure Cert Navigator";
  }, [exam]);

  // "/" opens search from anywhere (except while typing).
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target.tagName || "").toLowerCase();
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && tag !== "input" && tag !== "textarea" && tag !== "select") {
        e.preventDefault();
        go("search");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  let view;
  if (section === "home") view = <Home />;
  else if (section === "search") view = <SearchView key={route.key} params={route.params} />;
  else if (section === "overview") view = <Overview exam={exam} />;
  else if (section === "learn") view = <Learn key={route.key} exam={exam} tab={tab} item={p3} params={route.params} />;
  else if (section === "decide") view = <Decide key={route.key} exam={exam} tab={tab} params={route.params} />;
  else if (section === "practice") view = <Practice key={exam.id + tab} exam={exam} tab={tab} params={route.params} />;

  return (
    <div className="app" style={{ "--accent": activeExam.color }}>
      <Header exam={exam} activeExam={activeExam} section={section} tab={tab} theme={theme} onTheme={setTheme} />
      <main className="main">
        <div className="wrap">{view}</div>
      </main>
      <BottomNav exam={exam} activeExam={activeExam} section={section} />
      {updateReg && (
        <div className="toast" role="status">
          New content is available.
          <button
            className="btn sm"
            onClick={() => {
              navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), { once: true });
              updateReg.waiting?.postMessage("SKIP_WAITING");
              dismissUpdate();
            }}
          >
            Reload
          </button>
        </div>
      )}
    </div>
  );
}
