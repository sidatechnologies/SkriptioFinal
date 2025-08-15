import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, ShoppingBag } from "lucide-react";

export default function FloatingMenu({ feedbackUrl = "https://forms.gle/jk7VCgX4UgMWzJjb9" }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const wrapRef = useRef(null);

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
      <div className={`absolute bottom-12 right-0 flex flex-col items-end gap-2 transition-all duration-200 ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        <button
          onClick={() => { setOpen(false); window.open(feedbackUrl, '_blank', 'noopener'); }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border shadow-sm bg-white text-black border-black/80 hover:bg-white/90 dark:bg-black dark:text-white dark:border-white/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
        >
          <span className="text-sm">Feedback</span>
          <MessageSquare size={16} />
        </button>
        <button
          onClick={() => { setOpen(false); navigate('/merch'); }}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md border shadow-sm bg-white text-black border-black/80 hover:bg-white/90 dark:bg-black dark:text-white dark:border-white/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white"
        >
          <span className="text-sm">Merch</span>
          <ShoppingBag size={16} />
        </button>
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