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

// Service Worker: disable in preview/dev to avoid cache-related black screens
if ('serviceWorker' in navigator) {
  const isProd = process.env.NODE_ENV === 'production';
  const isPreview = /preview\.emergentagent\.com$/.test(window.location.hostname);
  if (isProd && !isPreview) {
    // Only register SW for real production domains (not preview)
    window.addEventListener('load', () => {
      try { navigator.serviceWorker.register('/sw.js'); } catch (e) { /* noop */ }
    });
  } else {
    // Ensure any previously registered SW is removed to prevent stale JS caching
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach(r => r.unregister().catch(() => {}));
    }).catch(() => {});
  }
}