import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { Loader2, Upload, FileText, ListChecks, BookOpen, Calendar, ArrowRight, Check, Sparkles, Layers, GraduationCap, Shield, Clock, Users, HelpCircle, Zap, Instagram, Twitter, Linkedin, Facebook, Mail } from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import { extractTextFromPDF, generateArtifacts, generateUUID } from "./utils/textProcessor";
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

function Landing() {
  const navigate = useNavigate();
  useEffect(() => { prewarmML(); prewarmPDF(); }, []);

  const HeroCard = ({ icon, title, desc, className = "" }) => (
    <div className={`rounded-xl border bg-card/90 p-4 card-glow hero-card hover:shadow-xl transition-shadow ${className}`}>
      <div className="flex items-center gap-2 text-sm font-medium mb-1">{icon}{title}</div>
      <div className="text-xs text-foreground/80">{desc}</div>
    </div>
  );

  const Section = ({ id, title, subtitle, children }) => (
    <section id={id} className="py-14">
      <div className="max-w-6xl mx-auto px-6">
        {title && (
          <div className="mb-6">
            <h2 className="section-title text-2xl md:text-3xl font-semibold">{title}</h2>
            {subtitle && <p className="text-foreground/80 mt-1">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
    </section>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="font-semibold tracking-tight gold-outline">Skriptio</div>
          </Link>
          <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center gap-6 text-sm text-foreground/80 mr-2">
              <a href="#how" className="hover:text-foreground">How it works</a>
              <a href="#features" className="hover:text-foreground">Features</a>
              <a href="#usecases" className="hover:text-foreground">Use cases</a>
              <a href="#faq" className="hover:text-foreground">FAQ</a>
              <span className="px-3 py-1 rounded-full gold-pill hidden lg:inline-flex">A product by Aceel AI</span>
            </nav>
            <Button size="sm" onClick={() => navigate('/studio')} className="bg-primary text-primary-foreground hover:bg-primary/90 hidden md:inline-flex">Open Studio <ArrowRight className="ml-1" size={14}/></Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="hero-gradient">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 text-xs text-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full gold-dot"/> A product by <span className="font-medium">Aceel AI</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight section-title gold-outline">Skriptio turns your PDFs &amp; notes into a complete study kit in seconds.</h1>
            <p className="text-foreground/80 text-lg">Upload content or paste notes — get a 10‑question quiz, smart flashcards, and a 7‑day plan. Stay focused and learn faster — without complex setup.</p>
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate('/studio')} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Try Skriptio Free
              </Button>
              <button onClick={() => document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })} className="text-sm inline-flex items-center text-foreground/90 hover:underline">
                How it works <ArrowRight size={14} className="ml-1"/>
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-5 text-xs text-foreground/80 pt-1">
              <div className="inline-flex items-center gap-2"><Zap size={14}/> Fast &amp; minimal</div>
              <div className="inline-flex items-center gap-2"><Shield size={14}/> Private (runs in your browser)</div>
              <div className="inline-flex items-center gap-2"><Clock size={14}/> Saves hours of prep</div>
            </div>
          </div>
          <div className="relative">
            <div className="flex flex-col gap-4 max-w-sm ml-auto">
              <HeroCard className="float-slow" icon={<ListChecks size={16}/>} title="Auto Quiz" desc="10 questions generated from your content for quick recall." />
              <HeroCard className="float-med float-delay-1" icon={<BookOpen size={16}/>} title="Flashcards" desc="Key concepts organized for spaced repetition." />
              <HeroCard className="float-fast float-delay-2" icon={<Calendar size={16}/>} title="7‑Day Plan" desc="Daily objectives to keep you moving." />
            </div>
          </div>
        </div>
      </div>

      {/* How it works */}
      <Section id="how" title="How it works" subtitle="Three simple steps to get your personalized study kit.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-xs text-foreground/70">Step 1</div>
            <div className="font-medium mt-1">Add your material</div>
            <p className="text-sm text-foreground/80 mt-1">Paste text notes or upload a PDF. You can combine both in one session.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-xs text-foreground/70">Step 2</div>
            <div className="font-medium mt-1">Generate your kit</div>
            <p className="text-sm text-foreground/80 mt-1">Skriptio builds a quiz, flashcards, and a 7‑day plan directly in your browser.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="text-xs text-foreground/70">Step 3</div>
            <div className="font-medium mt-1">Study efficiently</div>
            <p className="text-sm text-foreground/80 mt-1">Practice with active recall, flip flashcards, and follow your daily plan.</p>
          </div>
        </div>
      </Section>

      {/* Use cases (lightweight) */}
      <Section id="usecases" title="Use cases" subtitle="Designed for students, instructors, and teams.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="font-medium">Students</div>
            <p className="text-sm text-foreground/80 mt-1">Turn class notes and PDFs into practice kits before exams.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="font-medium">Instructors</div>
            <p className="text-sm text-foreground/80 mt-1">Create quick quizzes and handouts from lecture material.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="font-medium">Teams</div>
            <p className="text-sm text-foreground/80 mt-1">Share learning kits internally using private links.</p>
          </div>
        </div>
      </Section>

      {/* Features */}
      <Section id="features" title="Features" subtitle="Everything you need to turn notes into learning outcomes.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 text-sm font-medium"><ListChecks size={16}/> Tough quizzes</div>
            <p className="text-sm text-foreground/80 mt-1">10 MCQs per kit: concept, property, and formula items tuned by difficulty.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 text-sm font-medium"><BookOpen size={16}/> Smart flashcards</div>
            <p className="text-sm text-foreground/80 mt-1">Concise fronts; context-rich backs derived from the text you provide.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 text-sm font-medium"><Calendar size={16}/> 7‑Day plans</div>
            <p className="text-sm text-foreground/80 mt-1">Clustered topics with 3 daily objectives for steady, guided progress.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 text-sm font-medium"><Layers size={16}/> Combine sources</div>
            <p className="text-sm text-foreground/80 mt-1">Upload PDFs and paste notes together for richer, more varied quizzes.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 text-sm font-medium"><Shield size={16}/> Private by design</div>
            <p className="text-sm text-foreground/80 mt-1">Runs 100% in your browser after load. No servers, no data sharing.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="flex items-center gap-2 text-sm font-medium"><Clock size={16}/> Fast &amp; responsive</div>
            <p className="text-sm text-foreground/80 mt-1">Optimized, incremental processing keeps the UI smooth even on large notes.</p>
          </div>
        </div>
      </Section>

      {/* About */}
      <Section id="about" title="About Skriptio" subtitle="Built to help you learn faster with the material you already have.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-3">
            <p className="text-foreground/80">Skriptio turns your PDFs and notes into a complete study kit — a tough quiz, smart flashcards, and a 7‑day plan — in seconds. It’s minimal, private, and designed for focused learning.</p>
            <p className="text-foreground/80">Difficulty modes alter question composition and distractor tightness, while formula detection preserves math expressions for exact-match questions. Everything runs locally in your browser.</p>
            <div className="flex items-center gap-3 pt-2">
              <Button onClick={() => navigate('/studio')} className="bg-primary text-primary-foreground hover:bg-primary/90">Open Studio</Button>
              <Button variant="secondary" onClick={() => navigate('/studio')} className="bg-white/10 hover:bg-white/20">Try now</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 text-sm font-medium"><Sparkles size={16}/> On-device</div>
              <p className="text-sm text-foreground/80 mt-1">No uploads. No accounts. Just results.</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 text-sm font-medium"><GraduationCap size={16}/> Effective learning</div>
              <p className="text-sm text-foreground/80 mt-1">Active recall + spaced repetition baked in.</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 text-sm font-medium"><Users size={16}/> For students &amp; teams</div>
              <p className="text-sm text-foreground/80 mt-1">Share your kit via a private link; no server store.</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-5">
              <div className="flex items-center gap-2 text-sm font-medium"><Shield size={16}/> Privacy-first</div>
              <p className="text-sm text-foreground/80 mt-1">We don’t collect or store your data. Ever.</p>
            </div>
          </div>
        </div>
      </Section>

      {/* FAQ */}
      <Section id="faq" title="FAQ" subtitle="Answers to common questions.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="font-medium">Do I need an internet connection?</div>
            <p className="text-sm text-foreground/80 mt-1">No. Skriptio runs entirely in your browser after the initial page load.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="font-medium">Can I use both PDF and text?</div>
            <p className="text-sm text-foreground/80 mt-1">Yes. You can upload a PDF and also paste text notes in the same session.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="font-medium">What kind of quiz is generated?</div>
            <p className="text-sm text-foreground/80 mt-1">A 10‑question mix of concept checks, property questions, and formula items derived from your content. Difficulty modes change the composition.</p>
          </div>
          <div className="bg-card border border-border rounded-lg p-5">
            <div className="font-medium">Do you save my content?</div>
            <p className="text-sm text-foreground/80 mt-1">No. Everything runs in your browser session — nothing is sent to servers or saved.</p>
          </div>
        </div>
      </Section>

      {/* Footer: email + social only */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-foreground/80">
            © {new Date().getFullYear()} Aceel AI — <a href="mailto:aceel@sidahq.com" className="inline-flex items-center gap-2 hover-gold"><Mail size={16}/> aceel@sidahq.com</a>
          </div>
          <div className="flex items-center gap-4 text-foreground/80">
            <a href="https://instagram.com/aceel.ai" target="_blank" rel="noreferrer" aria-label="Instagram" className="hover-gold"><Instagram size={18}/></a>
            <a href="https://x.com/aceeldotai" target="_blank" rel="noreferrer" aria-label="X" className="hover-gold"><Twitter size={18}/></a>
            <a href="https://www.linkedin.com/company/aceel-ai" target="_blank" rel="noreferrer" aria-label="LinkedIn" className="hover-gold"><Linkedin size={18}/></a>
            <button type="button" className="opacity-40 cursor-not-allowed" aria-disabled="true" title="Facebook (coming soon)"><Facebook size={18}/></button>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Studio() {
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
  const [pdfBusy, setPdfBusy] = useState({ quiz: false, cards: false, plan: false });
  const [difficulty, setDifficulty] = useState('balanced');
  const [includeFormulas, setIncludeFormulas] = useState(true);
  const [showExplanations, setShowExplanations] = useState(false);

  // Prewarm ML model here as well, in case user lands directly on Studio
  useEffect(() => { prewarmML(); prewarmPDF(); }, []);

  // Handle shared answers from URL hash
  useEffect(() => {
    try {
      const h = window.location.hash || '';
      const m = h.match(/#share=([A-Za-z0-9_\-]+)/);
      if (m && m[1]) {
        const b64u = m[1];
        const json = decodeShare(b64u);
        if (json && json.quiz) {
          setResult({ title: json.title || 'Shared Quiz', quiz: json.quiz, flashcards: [], plan: [] });
          setAnswers(json.answers || {});
          if (json.score) setScore(json.score);
          setEvaluated(Boolean(json.score));
          toast({ title: 'Loaded shared answers', description: 'You are viewing a shared quiz.' });
        }
      }
    } catch {}
  }, []);

  const toB64Url = (bytes) => {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    const b64 = btoa(binary);
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };
  const fromB64Url = (b64u) => {
    const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const binary = atob(b64 + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const b64uEncode = (obj) => {
    try {
      const json = JSON.stringify(obj);
      const input = new TextEncoder().encode(json);
      const deflated = pako.deflate(input);
      return toB64Url(deflated);
    } catch (e) {
      const s = JSON.stringify(obj);
      const b64 = btoa(unescape(encodeURIComponent(s)));
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
  };
  const decodeShare = (b64u) => {
    try {
      const bytes = fromB64Url(b64u);
      const inflated = pako.inflate(bytes);
      const jsonStr = new TextDecoder().decode(inflated);
      return JSON.parse(jsonStr);
    } catch {
      try {
        const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
        const pad = '='.repeat((4 - (b64.length % 4)) % 4);
        const s = decodeURIComponent(escape(atob(b64 + pad)));
        return JSON.parse(s);
      } catch { return null; }
    }
  };

  const pause = () => new Promise(res => setTimeout(res, 15));

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setLoadingStep('Processing content...');
      let extractedText = text || '';
      if (file) {
        const pdfText = await extractTextFromPDF(file);
        extractedText = `${extractedText}\n\n${pdfText}`.trim();
      }
      await pause();
      setLoadingStep('Generating study kit...');
      await pause();
      const studyData = await generateArtifacts(extractedText, title, { difficulty, includeFormulas, explain: showExplanations });
      setResult(studyData);
      setAnswers({});
      setScore(null);
      setEvaluated(false);
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const selectOption = (qi, oi) => {
    setAnswers(prev => ({ ...prev, [qi]: oi }));
  };
  const evaluate = () => {
    if (!result?.quiz?.length) return;
    let sc = 0;
    result.quiz.forEach((q, idx) => {
      const selected = answers[idx];
      if (selected === q.answer_index) sc += 1;
    });
    setScore(`${sc}/${result.quiz.length}`);
    setEvaluated(true);
  };

  // PDF Helpers
  const ensureJsPDF = async () => {
    try {
      const jsPDF = await getJsPDF(1200);
      if (jsPDF) return jsPDF;
      const mod = await import("jspdf");
      return mod.jsPDF;
    } catch (err) {
      toast("Download not available in this runtime.");
      throw err;
    }
  };

  const addHeader = (doc) => {
    const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(16);
    doc.text("Skriptio", pw / 2, 15, { align: "center" });
    doc.setFontSize(11);
  };

  const addFooter = (doc) => {
    const ph = doc.internal.pageSize.getHeight();
    const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(10);
    doc.text("skriptio@sidahq.com", pw / 2, ph - 10, { align: "center" });
  };

  const newPage = (doc) => {
    doc.addPage();
    addHeader(doc);
  };

  const lineWrap = (doc, text, x, y, maxWidth) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((ln) => {
      const ph = doc.internal.pageSize.getHeight();
      if (y > ph - 20) {
        newPage(doc);
        y = 25;
      }
      doc.text(ln, x, y);
      y += 7;
    });
    return y;
  };

  const downloadQuizPDF = async () => {
    if (!result?.quiz?.length) return;
    setPdfBusy(s => ({ ...s, quiz: true }));
    try {
      const jsPDF = await ensureJsPDF();
      const doc = new jsPDF();
      addHeader(doc);
      let y = 25;
      doc.setFontSize(13);
      y = lineWrap(doc, `Title: ${result.title || "Untitled"}`, 15, y, 180);
      doc.setFontSize(12);
      for (let i = 0; i < result.quiz.length; i++) {
        const q = result.quiz[i];
        y = lineWrap(doc, `Q${i + 1}. ${q.question}`, 15, y, 180);
        for (let oi = 0; oi < q.options.length; oi++) {
          const prefix = String.fromCharCode(65 + oi);
          y = lineWrap(doc, `${prefix}) ${q.options[oi]}`, 20, y, 170);
        }
        const correctLetter = String.fromCharCode(65 + (q.answer_index ?? 0));
        y = lineWrap(doc, `Correct: ${correctLetter}) ${q.options[q.answer_index]}`, 20, y + 2, 170);
        if (showExplanations && q.explanation) {
          y = lineWrap(doc, `Why: ${q.explanation}`, 20, y + 2, 170);
        }
        y += 4;
      }
      addFooter(doc);
      doc.save("skriptio-quiz.pdf");
    } finally {
      setPdfBusy(s => ({ ...s, quiz: false }));
    }
  };

  const downloadCardsPDF = async () => {
    if (!result?.flashcards?.length) return;
    setPdfBusy(s => ({ ...s, cards: true }));
    try {
      const jsPDF = await ensureJsPDF();
      const doc = new jsPDF();
      addHeader(doc);
      let y = 25;
      doc.setFontSize(13);
      y = lineWrap(doc, `Title: ${result.title || "Untitled"}`, 15, y, 180);
      doc.setFontSize(12);
      result.flashcards.forEach((c, idx) => {
        y = lineWrap(doc, `Card ${idx + 1}:`, 15, y, 180);
        y = lineWrap(doc, `Q: ${c.front}`, 20, y, 170);
        y = lineWrap(doc, `A: ${c.back}`, 20, y, 170);
        y += 4;
      });
      addFooter(doc);
      doc.save("skriptio-flashcards.pdf");
    } finally {
      setPdfBusy(s => ({ ...s, cards: false }));
    }
  };

  const downloadPlanPDF = async () => {
    if (!result?.plan?.length) return;
    setPdfBusy(s => ({ ...s, plan: true }));
    try {
      const jsPDF = await ensureJsPDF();
      const doc = new jsPDF();
      addHeader(doc);
      let y = 25;
      doc.setFontSize(13);
      y = lineWrap(doc, `Title: ${result.title || "Untitled"}`, 15, y, 180);
      doc.setFontSize(12);
      result.plan.forEach((d) => {
        y = lineWrap(doc, `${d.title}`, 15, y, 180);
        d.objectives.forEach((o) => {
          y = lineWrap(doc, `• ${o}`, 20, y, 170);
        });
        y += 4;
      });
      addFooter(doc);
      doc.save("skriptio-plan.pdf");
    } finally {
      setPdfBusy(s => ({ ...s, plan: false }));
    }
  };

  const buildSharePayload = () => ({
    uid: generateUUID(),
    ts: Date.now(),
    title: result.title,
    quiz: result.quiz.map(q => ({ question: q.question, options: q.options, answer_index: q.answer_index, explanation: q.explanation })),
    answers,
    score
  });

  const buildShareURL = () => {
    const payload = buildSharePayload();
    const token = b64uEncode(payload);
    return `${window.location.origin}${window.location.pathname}#share=${token}`;
  };

  const shareAnswers = async () => {
    if (!result?.quiz?.length) return;
    const url = buildShareURL();
    try {
      if (navigator.share) {
        await navigator.share({ title: result.title || 'Skriptio Quiz', text: 'Review my quiz answers', url });
      } else {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url);
          toast({ title: 'Share link copied', description: 'Paste it in chat or email.' });
        } else {
          window.prompt('Copy this link', url);
        }
      }
    } catch {}
  };

  const copyShareURL = async () => {
    if (!result?.quiz?.length) return;
    const url = buildShareURL();
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Share link copied', description: 'Paste it anywhere.' });
      } else {
        window.prompt('Copy this link', url);
      }
    } catch {}
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="font-semibold tracking-tight">Skriptio</div>
          </Link>
          <div className="flex items-center gap-2">
            <div className="text-sm text-foreground/80">Skriptio Studio · by Aceel AI</div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText size={18}/> Add Content</CardTitle>
              <CardDescription>Paste raw text or upload a PDF. Processing happens in your browser.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} className="bg-white/10 border-white/10 placeholder:text-foreground/60" />
              <div>
                <Textarea placeholder="Paste text here (supports LaTeX like $...$)" rows={8} value={text} onChange={e => setText(e.target.value)} className="bg-white/10 border-white/10 placeholder:text-foreground/60" />
                <div className="mt-2 text-xs text-foreground/70">Tip: You can combine PDF + pasted notes. Math formulas in text are preserved.</div>
              </div>
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
                <Button variant="secondary" className="bg-white/10 hover:bg-white/20" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} className="mr-2"/> Upload PDF
                </Button>
                {file && <div className="text-xs text-foreground/80 truncate max-w-[180px]">{file.name}</div>}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Difficulty</div>
                  <div className="inline-flex rounded-md overflow-hidden border border-border">
                    <button type="button" className={`px-3 py-1 text-sm ${difficulty === 'balanced' ? 'bg-white text-black' : 'bg-transparent text-foreground/80'}`} onClick={() => setDifficulty('balanced')}>Balanced</button>
                    <button type="button" className={`px-3 py-1 text-sm border-l border-border ${difficulty === 'harder' ? 'bg-white text-black' : 'bg-transparent text-foreground/80'}`} onClick={() => setDifficulty('harder')}>Harder</button>
                    <button type="button" className={`px-3 py-1 text-sm border-l border-border ${difficulty === 'expert' ? 'bg-white text-black' : 'bg-transparent text-foreground/80'}`} onClick={() => setDifficulty('expert')}>Expert</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Include formulas</div>
                  <label className="text-sm flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeFormulas} onChange={e => setIncludeFormulas(e.target.checked)} />
                    <span className="text-foreground/80">Yes</span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Show explanations</div>
                  <label className="text-sm flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showExplanations} onChange={e => setShowExplanations(e.target.checked)} />
                    <span className="text-foreground/80">On</span>
                  </label>
                </div>
              </div>
              <div className="text-xs text-foreground/70 space-y-1">
                <div className="mt-2">Disclaimer:</div>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Image/scan-only PDFs use on-device OCR (beta). Results may vary for complex diagrams.</li>
                  <li>Password-protected PDFs will fail to open.</li>
                  <li>Very large PDFs may take longer to process in the browser.</li>
                </ul>
              </div>
              <Button disabled={loading} onClick={handleGenerate} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> {loadingStep || 'Generating'} </> : "Generate Study Kit"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {/* Download toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" disabled={!result?.quiz?.length || pdfBusy.quiz} onClick={downloadQuizPDF} aria-busy={pdfBusy.quiz}>
              {pdfBusy.quiz ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin"/> Generating...</> : 'Download Quiz PDF'}
            </Button>
            <Button variant="outline" disabled={!result?.flashcards?.length || pdfBusy.cards} onClick={downloadCardsPDF} aria-busy={pdfBusy.cards}>
              {pdfBusy.cards ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin"/> Generating...</> : 'Download Flashcards PDF'}
            </Button>
            <Button variant="outline" disabled={!result?.plan?.length || pdfBusy.plan} onClick={downloadPlanPDF} aria-busy={pdfBusy.plan}>
              {pdfBusy.plan ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin"/> Generating...</> : 'Download Plan PDF'}
            </Button>
            <Button variant="outline" disabled={!result?.quiz?.length} onClick={shareAnswers}>
              Share
            </Button>
            <Button variant="outline" disabled={!result?.quiz?.length} onClick={copyShareURL}>
              Copy Link
            </Button>
          </div>

          <Tabs defaultValue="quiz" className="w_full">
            <TabsList className="bg.white/10">
              <TabsTrigger value="quiz" className="data-[state=active]:bg-white data-[state=active]:text-black"><ListChecks size={16} className="mr-2"/>Quiz</TabsTrigger>
              <TabsTrigger value="flashcards" className="data-[state=active]:bg-white data-[state=active]:text-black"><BookOpen size={16} className="mr-2"/>Flashcards</TabsTrigger>
              <TabsTrigger value="plan" className="data-[state=active]:bg-white data-[state=active]:text-black"><Calendar size={16} className="mr-2"/>7-Day Plan</TabsTrigger>
            </TabsList>
            <div className="mt-4 space-y-6">
              <TabsContent value="quiz">
                {!result ? (
                  <EmptyState label="Your quiz will appear here once generated."/>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-foreground/80">{result.title}</div>
                      <div className="text-sm text-foreground/70">{score ? `Score: ${score}` : `${result.quiz?.length || 0} questions`}</div>
                    </div>
                    <div className="space-y-4">
                      {result.quiz?.map((q, idx) => (
                        <Card key={q.id} className="bg-card border-border">
                          <CardContent className="p-5 space-y-3">
                            <div className="font-medium">Q{idx + 1}. {q.question}</div>
                            <div className="grid gap-2">
                              {q.options.map((opt, oi) => {
                                const isSelected = answers[idx] === oi;
                                const isCorrect = evaluated && q.answer_index === oi;
                                const showAsWrong = evaluated && isSelected && !isCorrect;
                                return (
                                  <button
                                    key={oi}
                                    onClick={() => selectOption(idx, oi)}
                                    className={`text-left rounded-md border px-3 py-2 quiz-option ${isSelected ? 'quiz-option--selected' : ''} ${isCorrect ? 'border-green-500/70 bg-green-500/10' : ''} ${showAsWrong ? 'border-red-500/70 bg-red-500/10' : ''}`}
                                  >
                                    <span className="mr-2 text-foreground/70">{String.fromCharCode(65 + oi)})</span> {opt}
                                  </button>
                                );
                              })}
                            </div>
                            {evaluated && (
                              <div className="text-xs text-foreground/80">
                                Correct answer: {String.fromCharCode(65 + (q.answer_index ?? 0))}) {q.options[q.answer_index]}
                              </div>
                            )}
                            {showExplanations && q.explanation && (
                              <div className="text-xs text-foreground/70">Why: {q.explanation}</div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button onClick={evaluate} className="bg-primary text-primary-foreground hover:bg-primary/90">Evaluate</Button>
                      {score && <div className="text-sm text-foreground/80">Your score: {score}</div>}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="flashcards">
                {!result ? (
                  <EmptyState label="Your flashcards will appear here once generated."/>
                ) : (
                  <div className="grid gap-3">
                    {result.flashcards?.map((c, i) => (
                      <Card key={i} className="bg-card border-border">
                        <CardContent className="p-5">
                          <div className="font-medium mb-2">Card {i + 1}</div>
                          <div className="text-sm">Q: {c.front}</div>
                          <div className="text-sm text-foreground/80 mt-1">A: {c.back}</div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="plan">
                {!result ? (
                  <EmptyState label="Your 7-day plan will appear here once generated."/>
                ) : (
                  <div className="grid gap-3">
                    {result.plan?.map((d, i) => (
                      <Card key={i} className="bg-card border-border">
                        <CardContent className="p-5">
                          <div className="font-medium mb-2">{d.title}</div>
                          <ul className="list-disc pl-5 text-sm">
                            {d.objectives.map((o, oi) => (
                              <li key={oi}>{o}</li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="border border-dashed border-border rounded-lg p-8 text-center text-foreground/70 text-sm">
      {label}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/studio" element={<Studio />} />
    </Routes>
  );
}