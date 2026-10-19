import { useCallback, useEffect, useState } from "react";

// Per-browser persistence. Every read/write is guarded: storage can be missing or blocked
// (private mode, cleared site data) and the app must still work.
const EVENT = "cn-store";

export function readStore(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeStore(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
}

export function removeStorePrefix(prefix) {
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => window.localStorage.removeItem(k));
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT, { detail: prefix }));
}

// Backup / restore of every "cn:" key so progress can move between devices.
export function exportProgress() {
  const data = {};
  try {
    Object.keys(window.localStorage)
      .filter((k) => k.startsWith("cn:"))
      .forEach((k) => (data[k] = JSON.parse(window.localStorage.getItem(k))));
  } catch {}
  return { app: "azure-cert-navigator", version: 1, exportedAt: new Date().toISOString(), data };
}

export function importProgress(payload) {
  if (!payload || payload.app !== "azure-cert-navigator" || typeof payload.data !== "object") throw new Error("Not a Cert Navigator backup file.");
  const entries = Object.entries(payload.data).filter(([k]) => k.startsWith("cn:"));
  entries.forEach(([k, v]) => writeStore(k, v));
  return entries.length;
}

// useState backed by localStorage and kept in sync across components using the same key.
export function useStored(key, fallback) {
  const [value, setValue] = useState(() => readStore(key, fallback));

  useEffect(() => {
    setValue(readStore(key, fallback));
    const sync = (e) => {
      if (!e.detail || key.startsWith(e.detail)) setValue(readStore(key, fallback));
    };
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
    // fallback is intentionally not a dependency: callers pass literals.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (next) => {
      const resolved = typeof next === "function" ? next(readStore(key, fallback)) : next;
      writeStore(key, resolved);
      setValue(resolved);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key]
  );

  return [value, set];
}

// Re-render when any stored value changes (used by progress summaries).
export function useStoreVersion() {
  const [v, setV] = useState(0);
  useEffect(() => {
    const bump = () => setV((n) => n + 1);
    window.addEventListener(EVENT, bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener(EVENT, bump);
      window.removeEventListener("storage", bump);
    };
  }, []);
  return v;
}

export const keys = {
  theme: "cn:theme",
  lastExam: "cn:lastExam",
  blueprint: (exam) => `cn:${exam}:blueprint`,
  quiz: (exam) => `cn:${exam}:quiz`,
  drills: (exam) => `cn:${exam}:drills`,
  cards: (exam) => `cn:${exam}:cards`,
  triggers: (exam) => `cn:${exam}:triggers`,
};
