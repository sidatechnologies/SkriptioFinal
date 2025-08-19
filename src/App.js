import React from "react";
import { Link, Route, Routes } from "react-router-dom";
import { ArrowRight, ChevronDown, Upload, FileText, ListChecks, Calendar, Instagram, Twitter, Linkedin, Facebook, Mail } from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import StudioNav from "./components/StudioNav";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card";
import { Textarea } from "./components/ui/textarea";
import { Input } from "./components/ui/input";
import Merch from "./pages/Merch";
import StudioHub from "./pages/StudioHub";
import StudioSummariser from "./pages/StudioSummariser";
import KitRoute from "./pages/KitRoute";
import FloatingMenu from "./components/FloatingMenu";
import { Helmet } from "react-helmet-async";
import "./App.css";

function HeroAtom() {
  return (
    <div className="hero-atom mx-auto">
      <div className="nucleus"></div>
      <div className="orbit orbit-1"><div className="electron" /></div>
      <div className="orbit orbit-2"><div className="electron" /></div>
      <div className="orbit orbit-3"><div className="electron" /></div>
      <div className="orbit orbit-4"><div className="electron" /></div>
      <div className="orbit orbit-5"><div className="electron" /></div>
    </div>
  );
}

function LandingCTA() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <div className="border rounded-xl p-8 md:p-10 text-center bg-card card-glow">
        <h3 className="text-xl md:text-2xl font-semibold mb-3">Ready to try the Studio?</h3>
        <p className="text-foreground/80 mb-5">Open the Studio to see the exact UI for Study Kit and Summariser in both themes.</p>
        <Link to="/studio" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm">
          Open Studio <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

function Landing() {
  return (
    <div className="min-h-screen hero-gradient text-foreground">
      <Helmet>
        <title>Skriptio — Study kits from your notes &amp; PDFs</title>
        <meta name="description" content="Turn your PDFs and notes into quizzes, flashcards and a 7‑day plan — all in your browser." />
        <link rel="canonical" href="https://skriptio.sidahq.com/" />
      </Helmet>

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="font-semibold tracking-tight">Skriptio</div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/studio" className="inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-sm text-sm">
              Open Studio <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 py-14 grid md:grid-cols-2 gap-10 items-start">
          <div>
            <p className="gold-pill inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm mb-4">
              <span className="gold-dot w-1.5 h-1.5 rounded-full"></span>
              A product by Aceel AI
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-4">Study kits from your notes &amp; PDFs</h1>
            <p className="text-foreground/80 mb-6">Paste notes or upload a PDF. Get a 10‑question quiz, flashcards and a 7‑day plan — instantly. Runs fully in your browser.</p>
            <div className="flex items-center gap-3">
              <Link to="/studio" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                Open Studio <ArrowRight size={16} />
              </Link>
              <a href="#how" className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm">How it works</a>
            </div>
          </div>
          <div className="hidden md:flex justify-end pt-1">
            <HeroAtom />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-10">
          <h2 className="section-title text-2xl font-semibold mb-6">Everything you need to study smarter</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="hero-card card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText size={18}/> Quiz</CardTitle>
                <CardDescription>10 questions to test understanding across your material.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="hero-card card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ListChecks size={18}/> Flashcards</CardTitle>
                <CardDescription>Front/back cards to quickly drill key ideas and definitions.</CardDescription>
              </CardHeader>
            </Card>
            <Card className="hero-card card-glow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Calendar size={18}/> 7‑Day Plan</CardTitle>
                <CardDescription>A simple weekly plan so you know exactly what to review.</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="max-w-6xl mx-auto px-6 py-10">
          <h2 className="section-title text-2xl font-semibold mb-6">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="card-glow"><CardHeader><CardTitle>1. Add content</CardTitle><CardDescription>Paste notes or choose a PDF.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>2. Review tabs</CardTitle><CardDescription>Quiz, Flashcards, Plan, Theory — all laid out.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>3. Study</CardTitle><CardDescription>Use the plan and cards to prepare efficiently.</CardDescription></CardHeader></Card>
          </div>
        </section>

        {/* About */}
        <section id="about" className="max-w-6xl mx-auto px-6 py-10">
          <h2 className="section-title text-2xl font-semibold mb-3">About</h2>
          <p className="text-foreground/80 max-w-3xl">Skriptio is a minimal study toolkit. It mirrors the exact UI from our Studio so you can see how everything looks in both themes. This UI-only version preserves all visuals without performing any processing.</p>
        </section>

        <LandingCTA />
      </main>

      {/* Floating feedback/merch menu on home */}
      <FloatingMenu />

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-3 items-center">
          <div className="text-sm flex items-center gap-2"><Mail size={16}/> aceel@sidahq.com</div>
          <div className="text-center text-sm">© {new Date().getFullYear()} Skriptio</div>
          <div className="flex items-center gap-3 justify-end text-foreground/80">
            <a href="#" aria-label="Instagram"><Instagram size={18}/></a>
            <a href="#" aria-label="Twitter"><Twitter size={18}/></a>
            <a href="#" aria-label="LinkedIn"><Linkedin size={18}/></a>
            <a href="#" aria-label="Facebook"><Facebook size={18}/></a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="border border-dashed border-border rounded-lg p-8 text-center text-foreground/70 text-sm">{label}</div>
  );
}

export function Studio() {
  const fileRef = React.useRef(null);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">Skriptio</Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <StudioNav />

        {/* Two-column layout: Upload left, Results right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Upload/controls */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border border-black/70 dark:border-white/60">
              <CardHeader>
                <CardTitle>Upload &amp; Options</CardTitle>
                <CardDescription>Paste notes or upload a PDF; pick difficulty.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Title (optional)" className="studio-input-title" />
                <div className="select-wrap">
                  <select className="select-control rounded-md px-3 pr-7 py-2" defaultValue="balanced">
                    <option value="balanced">Balanced</option>
                    <option value="harder">Harder</option>
                  </select>
                  <span className="select-arrow"><ChevronDown size={16} /></span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked />
                    Include formulas
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" />
                    Show explanations
                  </label>
                </div>
                <Textarea rows={8} placeholder="Paste notes here…" className="studio-textarea-notes" />
                <input ref={fileRef} type="file" accept="application/pdf" className="file-input-reset" />
                <div className="flex items-center gap-3">
                  <Button onClick={() => fileRef.current?.click()} variant="outline" className="button-upload">
                    <Upload size={16} className="mr-2" /> Upload PDF
                  </Button>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Generate</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right: Results placeholders */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-card border border-black/70 dark:border-white/60">
              <CardHeader><CardTitle>Quiz</CardTitle></CardHeader>
              <CardContent><EmptyState label="No quiz yet. Click Generate to see questions here." /></CardContent>
            </Card>
            <Card className="bg-card border border-black/70 dark:border-white/60">
              <CardHeader><CardTitle>Flashcards</CardTitle></CardHeader>
              <CardContent><EmptyState label="No flashcards yet." /></CardContent>
            </Card>
            <Card className="bg-card border border-black/70 dark:border-white/60">
              <CardHeader><CardTitle>7‑Day Plan</CardTitle></CardHeader>
              <CardContent><EmptyState label="No plan yet." /></CardContent>
            </Card>
            <Card className="bg-card border border-black/70 dark:border-white/60">
              <CardHeader><CardTitle>Theory Qs</CardTitle></CardHeader>
              <CardContent><EmptyState label="No theory questions yet." /></CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/studio" element={<StudioHub />} />
      <Route path="/studio/kit/*" element={<KitRoute />} />
      <Route path="/studio/:title/:code" element={<Studio />} />
      <Route path="/studio/summariser" element={<StudioSummariser />} />
      <Route path="/merch" element={<Merch />} />
    </Routes>
  );
}