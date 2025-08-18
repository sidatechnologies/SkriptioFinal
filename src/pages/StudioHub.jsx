import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, FileText, PenLine, Sparkles, EyeOff, Menu } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import ThemeToggle from "../components/ThemeToggle";
import StudioNav from "../components/StudioNav";
import FloatingMenu from "../components/FloatingMenu";
import { Helmet } from "react-helmet-async";

export default function StudioHub() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const CardCommon = ({ icon, title, desc, onOpen, disabled = false }) => (
    <Card className="bg-card border border-black/70 dark:border-white/60 relative">
      {disabled && (
        <div className="absolute inset-0 backdrop-blur-[2px] bg-background/40 z-10 rounded-md" />
      )}
      <CardHeader>
        <CardTitle className="flex items-center gap-2">{icon} {title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onOpen}
          disabled={disabled}
          aria-disabled={disabled}
          className="bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          Open <ArrowRight size={16} className="ml-1"/>
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Skriptio — Studio Hub</title>
        <meta name="description" content="Choose a tool: Study Kit Generator, Handwriting → Typed, or AI PDF Summariser. All tools run on-device in your browser." />
        <link rel="canonical" href="https://skriptio.sidahq.com/studio" />
        <meta property="og:title" content="Skriptio — Studio Hub" />
        <meta property="og:description" content="Study tools that run fully in your browser: generate study kits, convert handwriting, summarise PDFs." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://skriptio.sidahq.com/studio" />
        <meta property="og:image" content="/assets/aceel-logo.png" />
      </Helmet>
      <FloatingMenu />
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="font-semibold tracking-tight">Skriptio</div>
          </Link>
          <div className="flex items-center gap-2">
            <div className="text-sm text-foreground/80">Skriptio Studio · by Aceel AI</div>
            <ThemeToggle className="hidden lg:inline-flex" />
            <ThemeToggle className="lg:hidden" />
            <button aria-label="Open menu" aria-expanded={mobileOpen} className="p-2 rounded-md border border-border lg:hidden" onClick={() => setMobileOpen(prev => !prev)}>
              {mobileOpen ? <span className="inline-block text-base">✕</span> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <StudioNav />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* 1. Study Kit */}
          <CardCommon
            icon={<FileText size={18}/>} 
            title="Study Kit Generator"
            desc="Notes or PDFs into quizzes, flashcards, theory, and a 7-day study planner."
            onOpen={() => navigate('/studio/kit')}
          />

          {/* 2. Summariser now in second slot */}
          <CardCommon
            icon={<Sparkles size={18}/>} 
            title="AI PDF Summariser"
            desc="On‑device extractive summary of your PDF. Download as a formatted PDF."
            onOpen={() => navigate('/studio/summariser')}
          />

          {/* 3. Handwriting moved to Coming Soon with frozen button */}
          <CardCommon
            icon={<PenLine size={18}/>} 
            title="Handwriting → Typed (Coming soon)"
            desc="Upload a handwritten text PDF and download a clean typed‑text PDF."
            onOpen={() => {}}
            disabled
          />

          {/* 4. Existing Coming soon */}
          <Card className="bg-card border border-black/70 dark:border-white/60 relative overflow-hidden">
            <div className="absolute inset-0 backdrop-blur-[2px] opacity-70 pointer-events-none" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><EyeOff size={18}/> Coming soon</CardTitle>
              <CardDescription>More studio tools are on the way.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-foreground/60">Stay tuned.</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}