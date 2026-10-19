import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

// Emits sw.js with the list of built files so the whole app is precached for offline use.
function serviceWorker() {
  return {
    name: "cert-navigator-sw",
    apply: "build",
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith(".map"));
      const precache = ["./", ...files.map((f) => "./" + f), "./manifest.webmanifest", "./favicon.svg", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/maskable-512.png", "./icons/apple-touch-icon.png"];
      const version = createHash("sha256").update(files.sort().join("|")).digest("hex").slice(0, 12);
      const source = readFileSync("src/sw.js", "utf8")
        .replaceAll("__VERSION__", version)
        .replaceAll("__PRECACHE__", JSON.stringify(precache));
      this.emitFile({ type: "asset", fileName: "sw.js", source });
    },
  };
}

export default defineConfig({
  // Relative base so the same build works on GitHub Pages, Netlify, Azure Static Web Apps or locally.
  base: "./",
  plugins: [react(), serviceWorker()],
  server: { host: "0.0.0.0" },
  // All exam content ships in the bundle on purpose (offline-first); ~240 kB gzipped.
  build: { chunkSizeWarningLimit: 1200 },
});
