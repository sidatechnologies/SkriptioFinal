import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { Loader2, Upload, FileText, ListChecks, BookOpen, Calendar, ArrowRight, Check, Sparkles, Layers, GraduationCap, Shield, Clock, Users, HelpCircle, Zap, Instagram, Twitter, Linkedin, Facebook, Mail, Menu, X, ChevronDown, MessageSquare, ShoppingBag } from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import { extractTextFromPDF, generateArtifacts, generateUUID, buildTheoryQuestions } from "./utils/textProcessor";
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
import FloatingMenu from "./components/FloatingMenu";

function Landing() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [heroTab, setHeroTab] = useState('quiz');
  useEffect(() => { prewarmPDF(); }, []);

  const HeroCard = ({ icon, title, desc, className = "" }) => (
    <div className={`rounded-xl border bg-card/90 p-4 card-glow hero-card hover:shadow-xl transition-shadow ${className}`}>
      <div className="flex items-center gap-2 text-sm font-medium mb-1">{icon}{title}</div>
      <div className="text-xs text-foreground/80">{desc}</div>
    </div>
  );

  const Section = ({ id, title, subtitle, children, centerTitle = false }) => (
    <section id={id} className="py-14">
      <div className="max-w-6xl mx-auto px-6">
        {title && (
          <div className={`mb-6 ${centerTitle ? 'text-center' : ''}`}>
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
            <div className="font-semibold tracking-tight">Skriptio</div>
          </Link>
          <div className="flex items-center gap-2">
            <nav className="hidden lg:flex items-center gap-6 text-sm text-foreground/80 mr-2">
              <a href="#how" className="hover:text-foreground">How it works</a>
              <a href="#features" className="hover:text-foreground">Features</a>
              <a href="#usecases" className="hover:text-foreground">Use cases</a>
              <a href="#faq" className="hover:text-foreground">FAQ</a>
              <Link to="/merch" className="hover:text-foreground">Merch</Link>
              <span className="px-3 py-1 rounded-full gold-pill hidden lg:inline-flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full gold-dot"/>A product by Aceel AI</span>
            </nav>
            <div className="hidden lg:inline-flex"><Button size="sm" onClick={() => navigate('/studio')} className="bg-primary text-primary-foreground hover:bg-primary/90">Open Studio <ArrowRight className="ml-1" size={14}/></Button></div>
            {/* Mobile/Tablet: theme toggle then menu button */}
            <ThemeToggle className="lg:hidden" />
            <button aria-label="Open menu" aria-expanded={mobileOpen} className="p-2 rounded-md border border-border lg:hidden" onClick={() => setMobileOpen(prev => !prev)}>
              {mobileOpen ? <span className="inline-block text-base">✕</span> : <Menu size={18} />}
            </button>
            {/* Desktop: theme toggle at far right */}
            <ThemeToggle className="hidden lg:inline-flex" />
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-b border-border bg-background/95">
          <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-3 text-sm">

            <a href="#how" className="hover:text-foreground" onClick={() => setMobileOpen(false)}>How it works</a>
            <a href="#features" className="hover:text-foreground" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#usecases" className="hover:text-foreground" onClick={() => setMobileOpen(false)}>Use cases</a>
            <a href="#faq" className="hover:text-foreground" onClick={() => setMobileOpen(false)}>FAQ</a>
            <Link to="/merch" className="hover:text-foreground" onClick={() => setMobileOpen(false)}>Merch</Link>
            <Button size="sm" onClick={() => { setMobileOpen(false); navigate('/studio'); }} className="bg-primary text-primary-foreground hover:bg-primary/90 w-fit">Open Studio <ArrowRight className="ml-1" size={14}/></Button>
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="hero-gradient">
        <div className="max-w-6xl mx-auto px-6 py-14 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center">
              <span className="gold-pill inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs">
                <span className="h-1.5 w-1.5 rounded-full gold-dot"/>
                <span className="text-[#F5C542]">A product by <span className="font-medium text-[#F5C542]">Aceel AI</span></span>
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight section-title">Skriptio turns your PDFs &amp; notes into a complete study kit in seconds.</h1>
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
          <div className="relative flex justify-center lg:justify-end">
            {/* Marketable hero visual: abstract atom animation */}
            <div className="hero-atom">
              <div className="nucleus" />
              <div className="orbit orbit-1"><span className="electron" /></div>
              <div className="orbit orbit-2"><span className="electron" /></div>
              <div className="orbit orbit-3"><span className="electron" /></div>
              <div className="orbit orbit-4"><span className="electron" /></div>
              <div className="orbit orbit-5"><span className="electron" /></div>
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

      {/* Features (restored) */}
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

      {/* About (minimal, centered) */}
      <Section id="about" title="About Skriptio" centerTitle>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-foreground/80">
            Skriptio turns your PDFs and notes into a complete study kit — a tough quiz, smart flashcards, and a 7‑day plan — in seconds. It’s minimal, private, and designed for focused learning. Difficulty modes adjust question composition, and formula detection preserves math expressions for exact‑match questions. Everything runs locally in your browser.
          </p>
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

      {/* CTA above footer */}
      <section className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="bg-card border border-border rounded-xl p-8 text-center">
            <h3 className="text-2xl md:text-3xl font-semibold">Ready to study faster?</h3>
            <p className="text-foreground/80 mt-1">Open Skriptio Studio and generate your study kit in seconds.</p>
            <Button onClick={() => navigate('/studio')} className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">Open Studio</Button>
          </div>
        </div>
      </section>

      {/* Global Floating menu on Landing */}
      <FloatingMenu />

      {/* Footer: email left, copyright center, socials right */}
      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
          <div className="justify-self-start text-sm text-foreground/80">
            <a href="mailto:aceel@sidahq.com" className="inline-flex items-center gap-2 hover-gold"><Mail size={16}/> aceel@sidahq.com</a>
          </div>
          <div className="justify-self-center text-sm text-foreground/80">
            © {new Date().getFullYear()} Aceel AI
          </div>
          <div className="justify-self-end flex items-center gap-4 text-foreground/80">
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
  const [pdfBusy, setPdfBusy] = useState({ quiz: false, cards: false, plan: false, theory: false });
  const [difficulty, setDifficulty] = useState('balanced');
  const [includeFormulas, setIncludeFormulas] = useState(true);
  const [showExplanations, setShowExplanations] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));
  const [theory, setTheory] = useState([]);

  // Floating menu state handled by FloatingMenu component

  // Prewarm ML model here as well, in case user lands directly on Studio
  useEffect(() => { prewarmPDF(); }, []);

  // Track viewport to switch between segmented control and dropdown reliably
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    try {
      const search = new URLSearchParams(window.location.search);
      const hashParams = window.location.hash ? new URLSearchParams(window.location.hash.replace(/^#/, '')) : null;
      const token = search.get('s') || (hashParams ? hashParams.get('s') : null);
      if (token) {
        const json = decodeShare(token);
        let quiz = null; let title = 'Shared Quiz';
        if (json?.compact) { quiz = expandQuiz(json.compact); title = json.compact.t || json.title || title; }
        else if (json?.quiz) { quiz = json.quiz; title = json.title || title; }
        if (quiz) {
          setResult({ title, quiz, flashcards: [], plan: [] });
          // Do not auto-load answers/score from shared links
          setAnswers({});
          setScore(null);
          setEvaluated(false);
          toast({ title: 'Loaded shared quiz', description: 'Select answers and click Evaluate to see results.' });
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
      const deflated = pako.deflate(input, { level: 9 });
      return toB64Url(deflated);
    } catch (e) {
      const s = JSON.stringify(obj);
      const b64 = btoa(unescape(encodeURIComponent(s)));
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    }
  };

  // Compact quiz payload: dictionary of strings to reduce size
  const compactQuiz = (quiz, title) => {
    const dict = [];
    const indexOf = (s) => {
      const str = String(s || '');
      let i = dict.indexOf(str);
      if (i === -1) { dict.push(str); i = dict.length - 1; }
      return i;
    };
    const q = quiz.map(qq => [
      indexOf(qq.question),
      qq.options.map(o => indexOf(o)),
      qq.answer_index
    ]);
    return { v: 1, t: title || '', d: dict, q };
  };

  const expandQuiz = (payload) => {
    if (!payload || payload.v !== 1) return null;
    const dict = payload.d || [];
    return (payload.q || []).map(item => {
      const qIdx = item[0];
      const optIdxs = item[1] || [];
      const ansIdx = item[2] || 0;
      return {
        question: dict[qIdx] || '',
        options: optIdxs.map(i => dict[i] || ''),
        answer_index: ansIdx
      };
    });
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
      // Build 10 theory questions (descriptive prompts without answers)
      const theoryQs = buildTheoryQuestions(studyData.text, studyData.flashcards.map(c => c.front.replace(/^Define:\s*/i, '').trim()), 10, { difficulty, docTitle: studyData.title });
      setTheory(theoryQs);
      // Normalize quiz to guarantee 4 visible options (UI safeguard)
      const normalizedQuiz = (studyData.quiz || []).map((q) => {
        const GENERICS = ['General concepts', 'Background theory', 'Implementation details', 'Best practices'];
        const clean = (v) => (v ?? '').toString().trim();
        let opts = Array.isArray(q.options) ? q.options.map(clean) : [];
        let ai = Number.isInteger(q.answer_index) ? q.answer_index : 0;
        let correct = clean(opts[ai]);
        opts = opts.filter(v => v.length > 0);
        let gi = 0;
        while (opts.length < 4 && gi < GENERICS.length + 4) {
          const cand = GENERICS[gi % GENERICS.length];
          if (!opts.includes(cand)) opts.push(cand);
          gi++;
        }
        if (opts.length > 4) {
          if (correct &amp;&amp; !opts.slice(0, 4).includes(correct) &amp;&amp; opts.includes(correct)) {
            opts[3] = correct;
          }
          opts = opts.slice(0, 4);
        }
        if (!correct || !opts.includes(correct)) {
          correct = opts[0] || GENERICS[0];
          ai = 0;
        } else {
          ai = opts.indexOf(correct);
          if (ai < 0 || ai > 3) ai = 0;
        }
        return { ...q, options: opts, answer_index: ai };
      });
      setResult({ ...studyData, quiz: normalizedQuiz });
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
    // Require all questions to be answered before evaluating
    const unanswered = result.quiz.findIndex((_, idx) => !Number.isInteger(answers[idx]));
    if (unanswered !== -1) {
      toast({ title: 'Answer all questions', description: `Please select an option for Q${unanswered + 1} before evaluating.` });
      return;
    }
    let sc = 0;
    result.quiz.forEach((q, idx) => {
      const selected = answers[idx];
      if (selected === q.answer_index) sc += 1;
    });
    setScore(`${sc}/${result.quiz.length}`);
    setEvaluated(true);
  };

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

  // PDF assets: logo and Poppins font
  const LOGO_URL = "/assets/aceel-logo.png";
  const POPPINS_URL = "/fonts/Poppins-Regular.ttf";
  const logoDataRef = useRef(null);
  const wordmarkDataRef = useRef(null);

  const fetchAsDataURL = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  };

  const loadPoppinsAndWordmark = async () => {
    try {
      // Load font with FontFace from local /public
      const ff = new FontFace('PoppinsEmbed', `url(${POPPINS_URL})`);
      await ff.load();
      document.fonts.add(ff);
      // Render wordmark to canvas to avoid jsPDF custom-font issues
      const canvas = document.createElement('canvas');
      canvas.width = 220; canvas.height = 30;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '600 18px PoppinsEmbed, Poppins, Helvetica, Arial';
      ctx.fillText('Skriptio', canvas.width / 2, canvas.height / 2);
      wordmarkDataRef.current = canvas.toDataURL('image/png');
      return true;
    } catch {
      // Fallback: render with Helvetica
      const canvas = document.createElement('canvas');
      canvas.width = 220; canvas.height = 30;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 18px Helvetica, Arial';
      ctx.fillText('Skriptio', canvas.width / 2, canvas.height / 2);
      wordmarkDataRef.current = canvas.toDataURL('image/png');
      return false;
    }
  };

  const ensureAssetsLoaded = async () => {
    if (!logoDataRef.current) {
      logoDataRef.current = await fetchAsDataURL(LOGO_URL);
    }
  };

  const addHeader = (doc) => {
    const pw = doc.internal.pageSize.getWidth();
    const topY = 12;

    // Draw logo if available (never fail the PDF if image is missing)
    try {
      if (logoDataRef.current) {
        const imgW = 18; // mm
        const imgH = 18;
        doc.addImage(logoDataRef.current, 'PNG', (pw - imgW) / 2, topY - 6, imgW, imgH, undefined, 'FAST');
      }
    } catch (e) {
      // ignore logo errors, continue
    }

    // No text wordmark as requested; only logo. Keep some spacing.
    // Reset to body font (Helvetica) for downstream content
    try { doc.setFont('helvetica', 'normal'); } catch {}
  };

  const addFooter = (doc) => {
    const ph = doc.internal.pageSize.getHeight();
    const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(10);
    doc.text("skriptio.sidahq.com | aceel@sidahq.com", pw / 2, ph - 10, { align: "center" });
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
        // add footer before moving to next page, then start a new page with header
        addFooter(doc);
        newPage(doc);
        y = 32;
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
      await ensureAssetsLoaded();
      addHeader(doc);
      let y = 32;
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
        if (showExplanations &amp;&amp; q.explanation) {
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
      await ensureAssetsLoaded();
      addHeader(doc);
      let y = 32;
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

  const downloadTheoryPDF = async () => {
    if (!theory?.length) return;
    setPdfBusy(s => ({ ...s, plan: true }));
    try {
      const jsPDF = await ensureJsPDF();
      const doc = new jsPDF();
      await ensureAssetsLoaded();
      addHeader(doc);
      let y = 32;
      doc.setFontSize(13);
      y = lineWrap(doc, `Title: ${result?.title || "Untitled"}`, 15, y, 180);
      doc.setFontSize(12);
      theory.forEach((t, idx) => {
        y = lineWrap(doc, `Q${idx + 1}: ${t}`, 15, y, 180);
        y += 4;
      });
      addFooter(doc);
      doc.save("skriptio-theory.pdf");
    } finally {
      setPdfBusy(s => ({ ...s, plan: false }));
    }
  };

  const downloadPlanPDF = async () => {
    if (!result?.plan?.length) return;
    setPdfBusy(s => ({ ...s, plan: true }));
    try {
      const jsPDF = await ensureJsPDF();
      const doc = new jsPDF();
      await ensureAssetsLoaded();
      addHeader(doc);
      let y = 32;
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
    // Compact the quiz to minimize token size
    compact: compactQuiz(result.quiz, result.title)
  });

  const slugify = (s) => {
    const t = (s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    return t.slice(0, 60) || 'study-kit';
  };
  const inferTitle = () => {
    if (title &amp;&amp; title.trim()) return title.trim();
    const firstNonEmpty = (text || '').split(/\n+/).map(l => l.trim()).find(Boolean) || '';
    return firstNonEmpty.slice(0, 80) || 'Study Kit';
  };
  const buildShareURL = () => {
    const payload = buildSharePayload();
    const token = b64uEncode(payload);
    const base = `${window.location.origin}/studio`;
    const name = slugify(inferTitle());
    const code = friendlySlugFromString(token, 5);
    // Short path + token in hash to keep URL visually short; no backend required
    return `${base}/${name}/${code}#s=${token}`;
  };

  const shareAnswers = async () => {
    if (!result?.quiz?.length) return;
    const url = buildShareURL();
    try {
      if (navigator.share) {
        await navigator.share({ title: result.title || 'Skriptio Quiz', text: 'Review my quiz answers', url });
      } else {
        const ok = await robustCopy(url);
        if (ok) toast({ title: 'Share link copied', description: 'Paste it in chat or email.' });
        else toast({ title: 'Copy failed', description: 'Please copy manually from the prompt.' });
      }
    } catch {}
  };

  const robustCopy = async (text) => {
    try {
      if (navigator.clipboard &amp;&amp; window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {}
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.left = '-9999px'; ta.style.top = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (ok) return true;
    } catch {}
    try {
      window.prompt('Copy this link', text);
      return true;
    } catch {}
    return false;
  };

  const copyShareURL = async () => {
    if (!result?.quiz?.length) return;
    const url = buildShareURL();
    const ok = await robustCopy(url);
    if (ok) toast({ title: 'Share link copied', description: 'Paste it anywhere.' });
    else toast({ title: 'Copy failed', description: 'Please copy manually from the prompt.' });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Global Floating menu on Studio */}
      <FloatingMenu />
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
              <Input placeholder="Title (optional)" value={title} onChange={e =&gt; setTitle(e.target.value)} className="bg-white/10 border-white/10 placeholder:text-foreground/60 studio-input-title" />
              <div>
                <Textarea placeholder="Paste text here (supports LaTeX like $...$)" rows={8} value={text} onChange={e =&gt; setText(e.target.value)} className="bg-white/10 border-white/10 placeholder:text-foreground/60 studio-textarea-notes" />
                <div className="mt-2 text-xs text-foreground/70">Tip: You can combine PDF + pasted notes. Math formulas in text are preserved.</div>
              </div>
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept="application/pdf" onChange={e =&gt; setFile(e.target.files?.[0] || null)} className="hidden" />
                <Button variant="secondary" className="button-upload bg-white hover:bg-white/90 text-black border border-black/60" onClick={() =&gt; fileInputRef.current?.click()}>
                  <Upload size={16} className="mr-2"/> Upload PDF
                </Button>
                {file &amp;&amp; <div className="text-xs text-foreground/80 truncate max-w-[180px]">{file.name}</div>}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Difficulty</div>
                  {/* Desktop/tablet segmented control */}
                  {isDesktop &amp;&amp; (
                    <div className="inline-flex rounded-md overflow-hidden border border-border">
                      <button type="button" className={`px-3 py-1 text-sm ${difficulty === 'balanced' ? 'bg-white text-black' : 'bg-transparent text-foreground/80'}`} onClick={() =&gt; setDifficulty('balanced')}>Balanced</button>
                      <button type="button" className={`px-3 py-1 text-sm border-l border-border ${difficulty === 'harder' ? 'bg-white text-black' : 'bg-transparent text-foreground/80'}`} onClick={() =&gt; setDifficulty('harder')}>Harder</button>
                      <button type="button" className={`px-3 py-1 text-sm border-l border-border ${difficulty === 'expert' ? 'bg-white text-black' : 'bg-transparent text-foreground/80'}`} onClick={() =&gt; setDifficulty('expert')}>Expert</button>
                    </div>
                  )}
                  {/* Mobile dropdown */}
                  {!isDesktop &amp;&amp; (
                    <div className="select-wrap">
                      <select className="select-control text-sm rounded-md px-2 py-1 pr-7" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                        <option value="balanced">Balanced</option>
                        <option value="harder">Harder</option>
                        <option value="expert">Expert</option>
                      </select>
                      <span className="select-arrow"><ChevronDown size={16} /></span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Include formulas</div>
                  <label className="text-sm flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={includeFormulas} onChange={e =&gt; setIncludeFormulas(e.target.checked)} />
                    <span className="text-foreground/80">Yes</span>
                  </label>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Show explanations</div>
                  <label className="text-sm flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={showExplanations} onChange={e =&gt; setShowExplanations(e.target.checked)} />
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
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" disabled={!result?.quiz?.length || pdfBusy.quiz} onClick={downloadQuizPDF} aria-busy={pdfBusy.quiz}>
              {pdfBusy.quiz ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin"/> Generating...</> : 'Download Quiz PDF'}
            </Button>
            <Button variant="outline" disabled={!result?.flashcards?.length || pdfBusy.cards} onClick={downloadCardsPDF} aria-busy={pdfBusy.cards}>
              {pdfBusy.cards ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin"/> Generating...</> : 'Download Flashcards PDF'}
            </Button>
            <Button variant="outline" disabled={!theory?.length || pdfBusy.plan} onClick={downloadTheoryPDF} aria-busy={pdfBusy.plan}>
              {pdfBusy.plan ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin"/> Generating...</> : 'Download Theory PDF'}
            </Button>
            <Button variant="outline" disabled={!result?.plan?.length || pdfBusy.plan} onClick={downloadPlanPDF} aria-busy={pdfBusy.plan}>
              {pdfBusy.plan ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin"/> Generating...</> : 'Download 7-Day Plan PDF'}
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
              <TabsTrigger value="theory" className="data-[state=active]:bg-white data-[state=active]:text-black"><BookOpen size={16} className="mr-2"/>Theory Qs</TabsTrigger>
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
                              {(() => {
                                const GENERICS = ['General concepts', 'Background theory', 'Implementation details', 'Best practices'];
                                let displayOpts = Array.isArray(q.options) ? q.options.map(o => (o ?? '').toString().trim()) : [];
                                displayOpts = displayOpts.filter(v => v.length > 0);
                                while (displayOpts.length < 4) displayOpts.push(GENERICS[displayOpts.length % GENERICS.length]);
                                displayOpts = displayOpts.slice(0, 4);
                                return displayOpts.map((opt, oi) => {
                                  const isSelected = answers[idx] === oi;
                                  const isCorrect = evaluated &amp;&amp; q.answer_index === oi;
                                  const showAsWrong = evaluated &amp;&amp; isSelected &amp;&amp; !isCorrect;
                                  const selectedClass = !evaluated &amp;&amp; isSelected ? 'quiz-option--selected' : '';
                                  return (
                                    <button
                                      key={oi}
                                      onClick={() => selectOption(idx, oi)}
                                      className={`text-left rounded-md border px-3 py-2 flex items-start gap-2 quiz-option ${selectedClass} ${isCorrect ? 'border-green-500/70 bg-green-500/10' : ''} ${showAsWrong ? 'border-red-500/70 bg-red-500/10' : ''}`}
                                    >
                                      <span className="shrink-0 mr-2 quiz-letter">{String.fromCharCode(65 + oi)})</span>
                                      <span className="flex-1 whitespace-normal break-words min-w-0 leading-snug">{(opt || '').replace(/\.\.\.$/, '.')}</span>
                                      {evaluated &amp;&amp; isSelected &amp;&amp; (
                                        <span className={`text-xs ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>{isCorrect ? 'Your choice ✓' : 'Your choice ✗'}</span>
                                      )}
                                    </button>
                                  );
                                });
                              })()}
                            </div>
                            {evaluated &amp;&amp; (() => {
                              const GENERICS = ['General concepts', 'Background theory', 'Implementation details', 'Best practices'];
                              let displayOpts = Array.isArray(q.options) ? q.options.map(o => (o ?? '').toString().trim()) : [];
                              displayOpts = displayOpts.filter(v => v.length > 0);
                              while (displayOpts.length < 4) displayOpts.push(GENERICS[displayOpts.length % GENERICS.length]);
                              displayOpts = displayOpts.slice(0, 4);
                              const correctText = ((q.options[q.answer_index] ?? '') + '').trim();
                              let correctIdx = displayOpts.indexOf(correctText);
                              if (correctIdx < 0) correctIdx = 0;
                              const userIdx = Number.isInteger(answers[idx]) ? Math.min(Math.max(0, answers[idx]), 3) : null;
                              return (
                                <div className="text-xs text-foreground/80 space-y-1">
                                  <div>Correct answer: {String.fromCharCode(65 + correctIdx)}) {displayOpts[correctIdx]}</div>
                                  {userIdx !== null &amp;&amp; (
                                    <div className={`${userIdx === correctIdx ? 'text-green-600' : 'text-red-600'}`}>
                                      Your answer: {String.fromCharCode(65 + userIdx)}) {displayOpts[userIdx]}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            {evaluated &amp;&amp; showExplanations &amp;&amp; q.explanation &amp;&amp; (
                              <div className="text-xs text-foreground/70">Why: {q.explanation}</div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button onClick={evaluate} className="bg-primary text-primary-foreground hover:bg-primary/90">Evaluate</Button>
                      {score &amp;&amp; <div className="text-sm text-foreground/80">Your score: {score}</div>}
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

              <TabsContent value="theory">
                {!result ? (
                  <EmptyState label="Your Theory Questions will appear here once generated."/>
                ) : (
                  <div className="grid gap-3">
                    {theory?.length ? theory.map((t, i) => (
                      <Card key={i} className="bg-card border-border">
                        <CardContent className="p-5">
                          <div className="text-sm">Q{i + 1}: {t}</div>
                        </CardContent>
                      </Card>
                    )) : <EmptyState label="Your Theory Questions will appear here once generated."/>}
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
      <Route path="/studio/*" element={<Studio />} />
      <Route path="/merch" element={<Merch />} />
    </Routes>
  );
}