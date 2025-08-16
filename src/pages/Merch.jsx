import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import ThemeToggle from "../components/ThemeToggle";
import { Download, PackageOpen, Menu } from "lucide-react";
import FloatingMenu from "../components/FloatingMenu";

export default function Merch() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const assetUrl = "/assets/aceel-logo.png";
  const posterUrl = "/assets/skriptio-poster.png"; // local copy for reliable download

  const downloadFile = async (url, filename) => {
    try {
      const res = await fetch(url, { mode: 'cors' });
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = filename || url.split('/').pop() || 'download';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
    } catch (e) {
      // Fallback: open in new tab if CORS blocks blob download
      window.open(url, '_blank', 'noopener');
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header (full navbar like landing) */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="font-semibold tracking-tight">Skriptio</div>
          </Link>
          <div className="flex items-center gap-2">
            <nav className="hidden lg:flex items-center gap-6 text-sm text-foreground/80 mr-2">
              <Link to="/">Home</Link>
              <Link to="/studio">Studio</Link>

            </nav>
            <div className="hidden lg:inline-flex"><Button size="sm" onClick={() => navigate('/studio')} className="bg-primary text-primary-foreground hover:bg-primary/90">Open Studio</Button></div>
            {/* Mobile/Tablet controls */}
            <ThemeToggle className="lg:hidden" />
            <button aria-label="Open menu" aria-expanded={mobileOpen} className="p-2 rounded-md border border-border lg:hidden" onClick={() => setMobileOpen(prev => !prev)}>
              {mobileOpen ? <span className="inline-block text-base">✕</span> : <Menu size={18} />}
            </button>
            {/* Desktop theme toggle */}
            <ThemeToggle className="hidden lg:inline-flex" />
          </div>
        </div>
      </header>

      {/* Mobile menu (only Home + Studio) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-x-0 top-16 z-50 border-b border-border bg-background/95 shadow-lg">
          <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-3 text-sm max-h-[calc(100vh-4rem)] overflow-y-auto">
            <Link to="/" className="hover:text-foreground" onClick={() => setMobileOpen(false)}>Home</Link>
            <Link to="/studio" className="hover:text-foreground" onClick={() => setMobileOpen(false)}>Studio</Link>
          </div>
        </div>
      )}

      {/* Global Floating menu on Merch */}
      <FloatingMenu />

      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-semibold">Merch &amp; Freebies</h1>
          <p className="text-foreground/80 mt-1 text-sm">Download digital freebies. More items coming soon.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Column 1: Aceel AI Logo freebie */}
          <div className="relative border border-border rounded-xl overflow-hidden backdrop-blur-sm bg-white/10 dark:bg-white/5">
            <div className="p-4 flex items-center justify-between border-b border-border/70">
              <div className="font-medium">Aceel AI Logo</div>
              <span className="text-xs text-foreground/70">Freebie</span>
            </div>
            <div className="p-4">
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 border border-border">
                <img src={assetUrl} alt="Aceel AI Logo" className="absolute inset-0 w-full h-full object-contain p-6" />
                {/* Download button bottom-right */}
                <button onClick={() => downloadFile(assetUrl, 'aceel-logo.png')} className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border transition-all bg-white text-black border-black/70 hover:bg-white/95 dark:bg-black dark:text-white dark:border-white/70 shadow-sm hover:shadow-md group">
                  <Download size={14} className="transition-transform group-hover:-translate-y-0.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </div>
            </div>
          </div>

          {/* Column 2: Skriptio Poster */}
          <div className="relative border border-border rounded-xl overflow-hidden backdrop-blur-sm bg-white/10 dark:bg-white/5">
            <div className="p-4 flex items-center justify-between border-b border-border/70">
              <div className="font-medium">Skriptio Poster</div>
              <span className="text-xs text-foreground/70">Freebie</span>
            </div>
            <div className="p-4">
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 border border-border">
                <img src={posterUrl} alt="Skriptio Poster" className="absolute inset-0 w-full h-full object-cover" />
                <button onClick={() => downloadFile(posterUrl, 'Skriptio-Poster.png')} className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border transition-all bg-white text-black border-black/70 hover:bg-white/95 dark:bg-black dark:text-white dark:border-white/70 shadow-sm hover:shadow-md group">
                  <Download size={14} className="transition-transform group-hover:-translate-y-0.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>
              </div>
            </div>
          </div>

          {/* Column 3: Coming soon glass placeholder */}
          <div className="relative border border-border rounded-xl overflow-hidden backdrop-blur-sm bg-white/10 dark:bg-white/5">
            <div className="p-4 flex items-center justify-between border-b border-border/70">
              <div className="font-medium">Wallpapers</div>
              <span className="text-xs text-foreground/70">Coming</span>
            </div>
            <div className="p-4">
              <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden bg-gradient-to-br from-white/40 to-white/10 dark:from-white/10 dark:to-white/5 border border-border flex items-center justify-center">
                <div className="text-sm text-foreground/80 inline-flex items-center gap-2">
                  <PackageOpen size={16} /> Coming soon
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}