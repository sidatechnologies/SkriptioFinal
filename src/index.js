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

// Service Worker: in preview/dev, register a kill-switch SW once to purge old caches
if ('serviceWorker' in navigator) {
  const isProd = process.env.NODE_ENV === 'production';
  const isPreview = /preview\.emergentagent\.com$/.test(window.location.hostname);
  if (isProd && !isPreview) {
    // Real production: keep normal SW
    window.addEventListener('load', () => {
      try { navigator.serviceWorker.register('/sw.js'); } catch (e) { /* noop */ }
    });
  } else {
    // Preview/dev: ensure any previous SW is updated to a kill-switch then unregistered
    window.addEventListener('load', () => {
      try { navigator.serviceWorker.register('/sw.js'); } catch (e) { /* ignore */ }
      // Also request registrations to be removed
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach(r => r.unregister().catch(() => {}));
      }).catch(() => {});
    });
  }
}