import React from "react";
import { Link, Route, Routes } from "react-router-dom";
import { ArrowRight, ChevronDown, Upload, FileText, ListChecks, Calendar, Instagram, Twitter, Linkedin, Facebook, Mail, Menu } from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import StudioNav from "./components/StudioNav";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card";
import { Textarea } from "./components/ui/textarea";
import { Input } from "./components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { ToggleGroup, ToggleGroupItem } from "./components/ui/toggle-group";
import Merch from "./pages/Merch";
import StudioHub from "./pages/StudioHub";
import StudioSummariser from "./pages/StudioSummariser";
import KitRoute from "./pages/KitRoute";
import ResumeBuilder from "./pages/ResumeBuilder";
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
    <section className="max-w-6xl mx-auto px-6 py-14">
      <div className="border rounded-xl p-8 md:p-10 text-center bg-card card-glow">
        <h3 className="text-xl md:text-2xl font-semibold mb-3">Ready to study faster?</h3>
        <p className="text-foreground/80 mb-5">Open Skriptio Studio and generate your study kit in seconds.</p>
        <Link to="/studio" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm">
          Open Studio <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

function Landing() {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  return (
    <div className="min-h-screen hero-gradient text-foreground">
      <Helmet>
        <title>Skriptio — Study kits from your notes &amp; PDFs</title>
        <meta name="description" content="Skriptio turns your PDFs &amp; notes into a complete study kit in seconds. A 10‑question quiz, smart flashcards, and a 7‑day plan — all in your browser." />
        <link rel="canonical" href="https://skriptio.sidahq.com/" />
      </Helmet>

      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="font-semibold tracking-tight">Skriptio</div>
          <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center gap-6 text-sm text-foreground/80 mr-2">
              <a href="#how">How it works</a>
              <a href="#features">Features</a>
              <a href="#usecases">Use cases</a>
              <a href="#faq">FAQ</a>
              <Link to="/merch">Merch</Link>
            </nav>
            <ThemeToggle className="md:hidden" />
            <button aria-label="Open menu" aria-expanded={mobileOpen} className="md:hidden p-2 rounded-md border border-border" onClick={() => setMobileOpen(o => !o)}>
              {mobileOpen ? <span className="inline-block text-base">✕</span> : <Menu size={18} />}
            </button>
            <ThemeToggle className="hidden md:inline-flex" />
            <Link to="/studio" className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-sm text-sm">
              Open Studio <ArrowRight size={14} />
            </Link>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden border-t border-border bg-background/95 shadow">
            <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-3 text-sm">
              <a href="#how" onClick={() => setMobileOpen(false)}>How it works</a>
              <a href="#features" onClick={() => setMobileOpen(false)}>Features</a>
              <a href="#usecases" onClick={() => setMobileOpen(false)}>Use cases</a>
              <a href="#faq" onClick={() => setMobileOpen(false)}>FAQ</a>
              <Link to="/merch" onClick={() => setMobileOpen(false)}>Merch</Link>
              <Link to="/studio" onClick={() => setMobileOpen(false)} className="inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-sm w-max">Open Studio <ArrowRight size={14} /></Link>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-6 items-center">
          <div>
            <p className="gold-pill inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm mb-4">
              <span className="gold-dot w-1.5 h-1.5 rounded-full"></span>
              A product by Aceel AI
            </p>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-3">Skriptio turns your PDFs &amp; notes into a complete study kit in seconds.</h1>
            <p className="text-foreground/80 mb-5">Upload content or paste notes — get a 10‑question quiz, smart flashcards, and a 7‑day plan. Stay focused and learn faster — without complex setup.</p>
            <div className="flex items-center gap-3">
              <Link to="/studio" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                Try Skriptio Free <ArrowRight size={16} />
              </Link>
              <a href="#how" className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm">How it works</a>
            </div>
            <div className="flex items-center gap-5 mt-5 text-sm text-foreground/80">
              <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full border border-foreground/70"></span> Fast &amp; minimal</div>
              <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full border border-foreground/70"></span> Private (runs in your browser)</div>
              <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full border border-foreground/70"></span> Saves hours of prep</div>
            </div>
          </div>
          <div className="hidden md:flex justify-end">
            <HeroAtom />
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="max-w-6xl mx-auto px-6 py-10">
          <h2 className="section-title text-2xl font-semibold mb-6">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="card-glow"><CardHeader><CardTitle>Step 1</CardTitle><CardDescription>Add your material</CardDescription></CardHeader><CardContent className="text-sm text-foreground/80">Paste text notes or upload a PDF. You can combine both in one session.</CardContent></Card>
            <Card className="card-glow"><CardHeader><CardTitle>Step 2</CardTitle><CardDescription>Generate your kit</CardDescription></CardHeader><CardContent className="text-sm text-foreground/80">Skriptio builds a quiz, flashcards, and a 7‑day plan directly in your browser.</CardContent></Card>
            <Card className="card-glow"><CardHeader><CardTitle>Step 3</CardTitle><CardDescription>Study efficiently</CardDescription></CardHeader><CardContent className="text-sm text-foreground/80">Practice with active recall, flip flashcards, and follow your daily plan.</CardContent></Card>
          </div>
        </section>

        {/* Use cases */}
        <section id="usecases" className="max-w-6xl mx-auto px-6 py-10">
          <h2 className="section-title text-2xl font-semibold mb-6">Use cases</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="card-glow"><CardHeader><CardTitle>Students</CardTitle><CardDescription>Turn class notes and PDFs into practice kits before exams.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>Instructors</CardTitle><CardDescription>Create quick quizzes and handouts from lecture material.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>Teams</CardTitle><CardDescription>Share learning kits internally using private links.</CardDescription></CardHeader></Card>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-10">
          <h2 className="section-title text-2xl font-semibold mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="card-glow"><CardHeader><CardTitle>🧠 Tough quizzes</CardTitle><CardDescription>10 MCQs per kit: concept, property, and formula items tuned by difficulty.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>🗂️ Smart flashcards</CardTitle><CardDescription>Concise fronts, context‑rich backs derived from the text you provide.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>🗓️ 7‑Day plans</CardTitle><CardDescription>Clustered topics with daily objectives for steady, guided progress.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>➕ Combine sources</CardTitle><CardDescription>Upload PDFs and paste notes together for richer, more varied quizzes.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>🔒 Private by design</CardTitle><CardDescription>Runs 100% in your browser after load. No servers, no data sharing.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>⚡ Fast &amp; responsive</CardTitle><CardDescription>Optimized, incremental processing keeps the UI smooth even on large notes.</CardDescription></CardHeader></Card>
          </div>
        </section>

        {/* About */}
        <section id="about" className="max-w-6xl mx-auto px-6 py-10">
          <h2 className="section-title text-2xl font-semibold mb-3">About Skriptio</h2>
          <p className="text-foreground/80 max-w-3xl">Skriptio turns your PDFs and notes into a complete study kit — a tough quiz, smart flashcards, and a 7‑day plan — in seconds. It’s minimal, private, and designed for focused learning. Difficulty modes adjust question composition, and formula detection preserves math expressions for exact‑match questions. Everything runs locally in your browser.</p>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-6xl mx-auto px-6 py-10">
          <h2 className="section-title text-2xl font-semibold mb-3">FAQ</h2>
          <p className="text-foreground/70 mb-6">Answers to common questions.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="card-glow"><CardHeader><CardTitle>Do I need an internet connection?</CardTitle><CardDescription>No. Skriptio runs entirely in your browser after the initial page load.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>Can I use both PDF and text?</CardTitle><CardDescription>Yes. You can upload a PDF and also paste text notes in the same session.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>What kind of quiz is generated?</CardTitle><CardDescription>A 10‑question mix of concept checks, property questions, and formula items derived from your content. Difficulty modes change the composition.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>Do you save my content?</CardTitle><CardDescription>No. Everything runs in your browser session — nothing is sent to servers or saved.</CardDescription></CardHeader></Card>
          </div>
        </section>

        <LandingCTA />
      </main>

      {/* Floating feedback/merch menu on all pages via wrapper */}
      <FloatingMenu />

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-3 items-center">
          <div className="text-sm flex items-center gap-2"><Mail size={16}/> aceel@sidahq.com</div>
          <div className="text-center text-sm">© {new Date().getFullYear()} Aceel AI</div>
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

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Add Content */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border border-black/70 dark:border-white/60">
              <CardHeader>
                <CardTitle>Add Content</CardTitle>
                <CardDescription>Paste raw text or upload a PDF. Processing happens in your browser.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Title (optional)" className="studio-input-title" />
                <Textarea rows={10} placeholder="Paste text here (supports LaTeX like $...$)" className="studio-textarea-notes" />
                <div className="text-xs text-foreground/70">Tip: You can combine PDF + pasted notes. Math formulas in text are preserved.</div>
                <input ref={fileRef} type="file" accept="application/pdf" className="file-input-reset" />
                <Button onClick={() => fileRef.current?.click()} variant="outline" className="button-upload w-full">
                  <Upload size={16} className="mr-2" /> Upload PDF
                </Button>
                <div>
                  <div className="text-sm mb-2">Difficulty</div>
                  <div>
                    <div className="segmented">
                      <button className="item">Balanced</button>
                      <button className="item">Harder</button>
                      <button className="item">Expert</button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" defaultChecked />
                    Include formulas
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input type="checkbox" />
                    Show explanations
                  </label>
                </div>
                <div className="text-[11px] leading-relaxed text-foreground/70 space-y-1">
                  <div>Disclaimer:</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Image/scan‑only PDFs use on‑device OCR (beta). Results may vary for complex diagrams.</li>
                    <li>Password‑protected PDFs will fail to open.</li>
                    <li>Very large PDFs may take longer to process in the browser.</li>
                  </ul>
                </div>
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Generate Study Kit</Button>
              </CardContent>
            </Card>
          </div>

          {/* Right: Toolbar + Tabs */}
          <div className="lg:col-span-2 space-y-4">
            <div className="toolbar">
              <button className="btn" disabled>Download Quiz PDF</button>
              <button className="btn" disabled>Download Flashcards PDF</button>
              <button className="btn" disabled>Download Theory PDF</button>
              <button className="btn" disabled>Download 7‑Day Plan PDF</button>
              <button className="btn" disabled>Share</button>
              <button className="btn" disabled>Copy Link</button>
            </div>

            <Tabs defaultValue="quiz" className="studio-tabs-wrap">
              <TabsList>
                <TabsTrigger value="quiz">Quiz</TabsTrigger>
                <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
                <TabsTrigger value="plan">7‑Day Plan</TabsTrigger>
                <TabsTrigger value="theory">Theory Qs</TabsTrigger>
              </TabsList>
              <TabsContent value="quiz">
                <Card className="kit-surface">
                  <div className="kit-toolbar">Quiz</div>
                  <CardContent>
                    <div className="text-center text-sm text-foreground/70 py-10">Your quiz will appear here once generated.</div>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="flashcards">
                <Card className="kit-surface"><div className="kit-toolbar">Flashcards</div><CardContent><EmptyState label="No flashcards yet." /></CardContent></Card>
              </TabsContent>
              <TabsContent value="plan">
                <Card className="kit-surface"><div className="kit-toolbar">7‑Day Plan</div><CardContent><EmptyState label="No plan yet." /></CardContent></Card>
              </TabsContent>
              <TabsContent value="theory">
                <Card className="kit-surface"><div className="kit-toolbar">Theory Qs</div><CardContent><EmptyState label="No theory questions yet." /></CardContent></Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>

      <FloatingMenu />
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
      <Route path="/studio/resume" element={<ResumeBuilder />} />
      <Route path="/merch" element={<Merch />} />
    </Routes>
  );
}