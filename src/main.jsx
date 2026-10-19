import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Chrome/Edge/Android install prompt: keep it until the user asks to install.
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  window.__cnInstallPrompt = event;
  window.dispatchEvent(new Event("cn-install-ready"));
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => {
        const announce = () => window.dispatchEvent(new CustomEvent("cn-sw-update", { detail: reg }));
        if (reg.waiting && navigator.serviceWorker.controller) announce();
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) announce();
          });
        });
      })
      .catch((error) => console.warn("Service worker registration failed:", error));
  });
}
