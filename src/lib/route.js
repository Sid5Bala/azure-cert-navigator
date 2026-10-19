import { useEffect, useState } from "react";

// Hash routing: #/<exam>/<section>/<tab>/<item>?q=... — works offline and on any static host.
export function parseHash(hash) {
  const raw = (hash || "").replace(/^#\/?/, "");
  const [path, query = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean).map(decodeURIComponent);
  return { parts, params: new URLSearchParams(query), key: raw };
}

export function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return parseHash(hash);
}

export function link(path, params) {
  const qs = params ? new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== "")).toString() : "";
  return "#/" + path.replace(/^\/+/, "") + (qs ? "?" + qs : "");
}

export function go(path, params) {
  window.location.hash = link(path, params);
}
