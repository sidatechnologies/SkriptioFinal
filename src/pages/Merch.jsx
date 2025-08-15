import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import ThemeToggle from "../components/ThemeToggle";
import { Download, PackageOpen } from "lucide-react";
import FloatingMenu from "../components/FloatingMenu";

export default function Merch() {
  const navigate = useNavigate();
  const assetUrl = "/assets/aceel-logo.png";
  const posterUrl = "https://customer-assets.emergentagent.com/job_footer-dismiss/artifacts/lwt16b59_Skriptio%20Poster.png";

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
              <a href="/\#how">How it works</a>
              <a href="/\#features">Features</a>
              <a href="/\#usecases">Use cases</a>
              <a href="/\#faq">FAQ</a>
              <Link to="/merch" className="hover:text-foreground">Merch</Link>
              <span className="px-3 py-1 rounded-full gold-pill hidden lg:inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full gold-dot"/>A product by Aceel AI</span>
            </nav>
            <div className="hidden lg:inline-flex"><Button size="sm" onClick={() => navigate('/studio')} className="bg-primary text-primary-foreground hover:bg-primary/90">Open Studio</Button></div>
            <ThemeToggle className="lg:ml-2" />
          </div>
        </div>
      </header>

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
                <a href={assetUrl} download className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border transition-all bg-white text-black border-black/70 hover:bg-white/95 dark:bg-black dark:text-white dark:border-white/70 shadow-sm hover:shadow-md group">
                  <Download size={14} className="transition-transform group-hover:-translate-y-0.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
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
                <a href={posterUrl} download className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border transition-all bg-white text-black border-black/70 hover:bg-white/95 dark:bg-black dark:text-white dark:border-white/70 shadow-sm hover:shadow-md group">
                  <Download size={14} className="transition-transform group-hover:-translate-y-0.5" />
                  <span className="hidden sm:inline">Download</span>
                </a>
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