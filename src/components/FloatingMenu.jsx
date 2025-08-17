import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ShoppingBag, Smartphone, MonitorDown } from "lucide-react";

export default function FloatingMenu({ feedbackUrl = "https://forms.gle/jk7VCgX4UgMWzJjb9" }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef(null);

  // PWA install prompt state
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      // Prevent the mini-infobar on mobile
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => { setInstalled(true); };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const doInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try { await deferredPrompt.userChoice; } catch {}
      setDeferredPrompt(null);
    } else {
      // Show simple guidance when prompt not available (e.g., iOS Safari)
      alert('To install: use your browser\'s menu and choose "Add to Home Screen" or "Install App".');
    }
  };

  const isStandalone = () => (
    window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches) || (window.navigator.standalone === true)
  );

  // Close on outside click and ESC
  useEffect(() => {
    const onDocPointer = (e) => {
      if (!open) return;
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDocPointer);
    document.addEventListener('touchstart', onDocPointer, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocPointer);
      document.removeEventListener('touchstart', onDocPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="fixed bottom-6 right-6 z-50">
      {/* Children (show when open) */}
      <div className={`absolute bottom-14 right-0 flex flex-col items-end gap-2 transition-all duration-200 ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setOpen(false); window.open(feedbackUrl, '_blank', 'noopener'); }}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full border shadow-sm bg-white text-black border-black/80 hover:bg-white/90 dark:bg-black dark:text-white dark:border-white/80"
            aria-label="Feedback"
          >
            <MessageSquare size={16} />
          </button>
          <span className="text-xs px-2 py-1 rounded-md bg-card border border-border text-foreground/80">Feedback</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setOpen(false); navigate('/merch'); }}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full border shadow-sm bg-white text-black border-black/80 hover:bg-white/90 dark:bg-black dark:text-white dark:border-white/80"
            aria-label="Merch"
          >
            <ShoppingBag size={16} />
          </button>
          <span className="text-xs px-2 py-1 rounded-md bg-card border border-border text-foreground/80">Merch</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setOpen(false); doInstall(); }}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full border shadow-sm bg-white text-black border-black/80 hover:bg-white/90 dark:bg-black dark:text-white dark:border-white/80"
            aria-label="Add to Home Screen"
            title={installed || isStandalone() ? 'Already installed' : 'Add to Home Screen'}
          >
            <Smartphone size={16} />
          </button>
          <span className="text-xs px-2 py-1 rounded-md bg-card border border-border text-foreground/80">Add to home</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setOpen(false); doInstall(); }}
            className="inline-flex items-center justify-center w-10 h-10 rounded-full border shadow-sm bg-white text-black border-black/80 hover:bg-white/90 dark:bg-black dark:text-white dark:border-white/80"
            aria-label="Install Desktop App"
            title={installed || isStandalone() ? 'Already installed' : 'Install on desktop'}
          >
            <MonitorDown size={16} />
          </button>
          <span className="text-xs px-2 py-1 rounded-md bg-card border border-border text-foreground/80">Install app</span>
        </div>
      </div>
      {/* Main toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle menu"
        aria-expanded={open}
        className="inline-flex items-center justify-center w-11 h-11 rounded-full border bg-white text-black border-black/80 hover:bg-white/90 dark:bg-black dark:text-white dark:border-white/80"
        style={{ boxShadow: '0 0 0 2px currentColor inset' }}
      >
        {open ? '×' : '!'}
      </button>
    </div>
  );
}