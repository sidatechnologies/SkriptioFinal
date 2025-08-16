import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, FileText, PenLine, Sparkles, EyeOff, Menu } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import ThemeToggle from "../components/ThemeToggle";
import StudioNav from "../components/StudioNav";
import FloatingMenu from "../components/FloatingMenu";

export default function StudioHub() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground">
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
          {/* Study Kit Generator */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText size={18}/> Study Kit Generator</CardTitle>
              <CardDescription>Turn your notes or PDFs into a quiz, flashcards, and a 7‑day plan — in your browser.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Button onClick={() => navigate('/studio/kit')} className="bg-primary text-primary-foreground hover:bg-primary/90">
                  Open <ArrowRight size={16} className="ml-1"/>
                </Button>
                <Link to="/studio/kit" className="text-sm text-foreground/80 hover:underline">Learn more</Link>
              </div>
            </CardContent>
          </Card>

          {/* Handwriting to Typed */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><PenLine size={18}/> Handwriting → Typed</CardTitle>
              <CardDescription>Upload a handwritten text PDF and download a clean typed‑text PDF.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Button onClick={() => navigate('/studio/handwriting')} variant="outline">Try</Button>
                <Link to="/studio/handwriting" className="text-sm text-foreground/80 hover:underline">How it works</Link>
              </div>
            </CardContent>
          </Card>

          {/* AI PDF Summariser */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles size={18}/> AI PDF Summariser</CardTitle>
              <CardDescription>On‑device extractive summary of your PDF. Download as a neatly formatted PDF.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Button onClick={() => navigate('/studio/summariser')} variant="outline">Summarise</Button>
                <Link to="/studio/summariser" className="text-sm text-foreground/80 hover:underline">Details</Link>
              </div>
            </CardContent>
          </Card>

          {/* Coming soon */}
          <Card className="bg-card border-border relative overflow-hidden">
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