import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import { ThemeProvider } from "./theme";
import ScrollToTop from "./components/ScrollToTop";
import { HelmetProvider } from "react-helmet-async";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <HelmetProvider>
        <ThemeProvider>
          <ScrollToTop />
          <App />
        </ThemeProvider>
      </HelmetProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

// Service Worker kill-switch: Unregister any existing SWs and clear caches once (prevents stale black screens).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const onceKey = 'sw_kill_once_v2';
    // Unregister all active registrations
    navigator.serviceWorker.getRegistrations()
      .then((regs) => regs.forEach((r) => { try { r.unregister(); } catch (e) {} }))
      .catch(() => {});
    // Clear caches and reload once
    if (!sessionStorage.getItem(onceKey)) {
      sessionStorage.setItem(onceKey, '1');
      if (window.caches) {
        caches.keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .finally(() => setTimeout(() => { try { location.reload(); } catch {} }, 150));
      }
    }
  });
}