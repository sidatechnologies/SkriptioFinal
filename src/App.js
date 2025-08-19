import React, { useEffect, useRef, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { Loader2, Upload, FileText, ListChecks, BookOpen, Calendar, ArrowRight, Instagram, Twitter, Linkedin, Facebook, Mail, Menu, ChevronDown, Zap, Shield, Clock } from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import StudioNav from "./components/StudioNav";
import { extractTextFromPDF, extractTextFromPDFQuick, generateArtifacts, generateUUID, buildTheoryQuestions, extractKeyPhrases, ensureSentence } from "./utils/textProcessor";
import { prewarmML } from "./utils/ml";
import { prewarmPDF, getJsPDF } from "./utils/pdf";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card";
import { Textarea } from "./components/ui/textarea";
import { Input } from "./components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { toast } from "./components/ui/use-toast";
import pako from "pako";
import "./App.css";
import { friendlySlugFromString } from "./utils/shortener";
import Merch from "./pages/Merch";
import StudioHub from "./pages/StudioHub";
// import StudioHandwriting from "./pages/StudioHandwriting";
import StudioSummariser from "./pages/StudioSummariser";
import KitRoute from "./pages/KitRoute";
import FloatingMenu from "./components/FloatingMenu";
import { fromB64Url, b64uEncodeObject as b64uEncode } from "./utils/b64url";
import { Helmet } from "react-helmet-async";

function Landing() {
  return (
    <div className="min-h-screen hero-gradient text-foreground">
      <Helmet>
        <title>Skriptio — Study kits from your notes & PDFs</title>
        <meta name="description" content="Turn your PDFs and notes into quizzes, flashcards and a 7‑day plan — all in your browser." />
        <link rel="canonical" href="https://skriptio.sidahq.com/" />
      </Helmet>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="font-semibold tracking-tight">Skriptio</div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/studio" className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-md">
              Open Studio <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className="gold-pill inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm mb-4">
            <span className="gold-dot w-1.5 h-1.5 rounded-full"></span>
            A product by Aceel AI
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-4">Study kits from your notes & PDFs</h1>
          <p className="text-foreground/80 mb-6">Paste notes or upload a PDF. Get a 10‑question quiz, flashcards and a 7‑day plan — instantly. Runs fully in your browser.</p>
          <div className="flex items-center gap-3">
            <Link to="/studio" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
              Open Studio <ArrowRight size={16} />
            </Link>
            <a href="#how" className="inline-flex items-center gap-2 px-4 py-2 border rounded-md">How it works</a>
          </div>
        </div>
        <div className="hidden md:block">
          <div className="hero-atom mx-auto">
            <div className="nucleus"></div>
            <div className="orbit orbit-3"><div className="electron"></div></div>
            <div className="orbit orbit-4"><div className="electron"></div></div>
            <div className="orbit orbit-5"><div className="electron"></div></div>
          </div>
        </div>
      </main>
    </div>
  );
}

function EmptyState({ label }) { return (<div className="border border-dashed border-border rounded-lg p-8 text-center text-foreground/70 text-sm">{label}</div>); }

export function Studio() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [result, setResult] = useState(null);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [evaluated, setEvaluated] = useState(false);
  const fileInputRef = useRef();
  const [pdfBusy, setPdfBusy] = useState({ quiz: false, cards: false, plan: false, theory: false });
  const [difficulty, setDifficulty] = useState('balanced');
  const [includeFormulas, setIncludeFormulas] = useState(true);
  const [showExplanations, setShowExplanations] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));
  const [theory, setTheory] = useState([]);

  // UI-only mode: disable any prewarm side-effects
  useEffect(() => { /* disabled in UI-only replica */ }, []);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth >= 768); window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize); }, []);

  const ensureJsPDF = async () => { const maybe = await getJsPDF(1200); if (maybe) return maybe; const mod = await import('jspdf'); return mod.jsPDF; };
  const addHeader = (doc) => { try { doc.setFont('helvetica', 'normal'); } catch {} };
  const addFooter = (doc) => { const ph = doc.internal.pageSize.getHeight(); const pw = doc.internal.pageSize.getWidth(); doc.setFontSize(10); doc.text("skriptio.sidahq.com | aceel@sidahq.com", pw / 2, ph - 10, { align: "center" }); };
  const lineWrap = (doc, text, x, y, maxWidth) => { const lines = doc.splitTextToSize(text, maxWidth); lines.forEach((ln) => { const ph = doc.internal.pageSize.getHeight(); if (y > ph - 20) { addFooter(doc); doc.addPage(); addHeader(doc); y = 32; } doc.text(ln, x, y); y += 7; }); return y; };

  const handleGenerate = async () => {
    // UI-only replica: disable generation functionality
    return;
  };

  const onPickOption = (qid, idx) => {
    // UI-only replica: disable option selection
    return;
  };
  const onEvaluate = () => {
    if (!result?.quiz) return;
    let sc = 0;
    for (const q of result.quiz) {
      if (answers[q.id] === q.answer_index) sc++;
    }
    setScore(sc);
    setEvaluated(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FloatingMenu />
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

        <Card className="bg-card border border-black/70 dark:border-white/60">
          <CardHeader>
            <CardTitle>Study Kit Generator</CardTitle>
            <CardDescription>Paste notes or upload a PDF, pick difficulty, then Generate.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <Input placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} className="studio-input-title" />
              <div className="select-wrap">
                <select className="select-control rounded-md px-3 pr-7 py-2" value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                  <option value="balanced">Balanced</option>
                  <option value="harder">Harder</option>
                </select>
                <span className="select-arrow"><ChevronDown size={16} /></span>
              </div>
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={includeFormulas} onChange={e => setIncludeFormulas(e.target.checked)} />
                  Include formulas
                </label>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={showExplanations} onChange={e => setShowExplanations(e.target.checked)} />
                  Show explanations
                </label>
              </div>
            </div>
            <Textarea rows={10} placeholder="Paste notes here…" value={text} onChange={e => setText(e.target.value)} className="studio-textarea-notes" />
            <div className="flex items-center gap-3">
              <input ref={fileInputRef} type="file" accept="application/pdf" className="file-input-reset" onChange={e => setFile(e.target.files?.[0] || null)} />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="button-upload">
                <Upload size={16} className="mr-2" /> Upload PDF
              </Button>
              <Button onClick={handleGenerate} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {loadingStep || 'Working…'}</>) : 'Generate'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result ? (
          <Tabs defaultValue="quiz" className="studio-tabs-wrap">
            <TabsList>
              <TabsTrigger value="quiz">Quiz</TabsTrigger>
              <TabsTrigger value="cards">Flashcards</TabsTrigger>
              <TabsTrigger value="plan">7‑Day Plan</TabsTrigger>
              <TabsTrigger value="theory">Theory Qs</TabsTrigger>
            </TabsList>

            <TabsContent value="quiz" className="space-y-4">
              {result.quiz.map((q) => (
                <div key={q.id} className="border rounded-md p-4">
                  <div className="font-medium mb-2">{q.question}</div>
                  <div className="grid gap-2">
                    {q.options.map((opt, idx) => {
                      const selected = answers[q.id] === idx;
                      const correctNow = evaluated && idx === q.answer_index;
                      return (
                        <button key={idx} onClick={() => onPickOption(q.id, idx)} className={`text-left px-3 py-2 rounded-md border quiz-option ${selected ? 'quiz-option--selected' : ''} ${correctNow ? 'ring-2 ring-emerald-500' : ''}`}>
                          <span className="quiz-letter mr-2">{String.fromCharCode(65 + idx)}.</span> {opt}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-3">
                <Button onClick={onEvaluate} disabled={evaluated} className="bg-primary text-primary-foreground">{evaluated ? 'Evaluated' : 'Evaluate'}</Button>
                {evaluated ? <div className="text-sm">Score: <span className="font-semibold">{score} / {result.quiz.length}</span></div> : null}
              </div>
            </TabsContent>

            <TabsContent value="cards" className="grid md:grid-cols-2 gap-3">
              {result.flashcards.map((c, i) => (
                <Card key={i} className="border">
                  <CardHeader><CardTitle className="text-base">{c.front}</CardTitle></CardHeader>
                  <CardContent><p className="text-sm">{c.back}</p></CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="plan" className="grid md:grid-cols-2 gap-3">
              {result.plan.map((d, i) => (
                <Card key={i} className="border">
                  <CardHeader><CardTitle className="text-base">{d.title}</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="list-disc pl-5 space-y-1">
                      {d.objectives.map((o, j) => <li key={j} className="plan-objective">{o}</li>)}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="theory" className="space-y-2">
              {theory.map((t, i) => <div key={i} className="border rounded-md p-3 text-sm">{t}</div>)}
            </TabsContent>
          </Tabs>
        ) : (
          <EmptyState label="Generate to see your quiz, flashcards, plan and theory questions here." />
        )}
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