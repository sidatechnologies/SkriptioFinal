import React from "react";
import { Link, Route, Routes, useLocation, useParams, useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, Upload, FileText, ListChecks, Calendar, Instagram, Twitter, Linkedin, Facebook, Mail, Menu, Share2, Link as LinkIcon } from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import StudioNav from "./components/StudioNav";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card";
import { Textarea } from "./components/ui/textarea";
import { Input } from "./components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import Merch from "./pages/Merch";
import StudioHub from "./pages/StudioHub";
import StudioSummariser from "./pages/StudioSummariser";
import KitRoute from "./pages/KitRoute";
import ResumeBuilder from "./pages/ResumeBuilder";
import FloatingMenu from "./components/FloatingMenu";
import { Helmet } from "react-helmet-async";
import "./App.css";

// New AI helpers
import { prewarmAI, summarisePointwise, generateQuestionFromContext } from "./utils/ai";
import { extractTextFromPDF, splitSentences, normalizeText, isAuthorish, looksLikeHeadingStrong, extractKeyPhrases, buildTheoryQuestions, generateArtifacts } from "./utils/textProcessor";
import { embedSentences, selectTopSentences, bestSentenceForPhrase, tryEnhanceArtifacts } from "./utils/ml";
import { prewarmPDF, getJsPDF } from "./utils/pdf";
import { b64uEncodeObject, fromB64Url } from "./utils/b64url";
import pako from "pako";

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
        <title>Skriptio — Study kits from your notes & PDFs</title>
        <meta name="description" content="Skriptio turns your PDFs & notes into a complete study kit in seconds. A 10‑question quiz, smart flashcards, and a 7‑day plan — all in your browser." />
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
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight mb-3">Skriptio turns your PDFs & notes into a complete study kit in seconds.</h1>
            <p className="text-foreground/80 mb-5">Upload content or paste notes — get a 10‑question quiz, smart flashcards, and a 7‑day plan. Stay focused and learn faster — without complex setup.</p>
            <div className="flex items-center gap-3">
              <Link to="/studio" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm">
                Try Skriptio Free <ArrowRight size={16} />
              </Link>
              <a href="#how" className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-md text-sm">How it works</a>
            </div>
            <div className="flex items-center gap-5 mt-5 text-sm text-foreground/80">
              <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full border border-foreground/70"></span> Fast & minimal</div>
              <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full border border-foreground/70"></span> Private (runs in your browser)</div>
              <div className="flex items-center gap-2"><span className="inline-block w-2 h-2 rounded-full border border-foreground/70"></span> Saves hours of prep</div>
            </div>
          </div>
          <div className="hidden md:block hero-aside">
            <div className="hero-anchor">
              <HeroAtom />
            </div>
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
            <Card className="card-glow"><CardHeader><CardTitle>Tough quizzes</CardTitle><CardDescription>10 MCQs per kit: concept, property, and formula items tuned by difficulty.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>Smart flashcards</CardTitle><CardDescription>Concise fronts, context‑rich backs derived from the text you provide.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>7‑Day plans</CardTitle><CardDescription>Clustered topics with daily objectives for steady, guided progress.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>Combine sources</CardTitle><CardDescription>Upload PDFs and paste notes together for richer, more varied quizzes.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>Private by design</CardTitle><CardDescription>Runs 100% in your browser after load. No servers, no data sharing.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>Fast &amp; responsive</CardTitle><CardDescription>Optimized, incremental processing keeps the UI smooth even on large notes.</CardDescription></CardHeader></Card>
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

      <FloatingMenu />

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

function useKitState() {
  const [difficulty, setDifficulty] = React.useState('balanced');
  const titleRef = React.useRef(null);
  const notesRef = React.useRef(null);
  const fileRef = React.useRef(null);
  const [fileMeta, setFileMeta] = React.useState(null);

  const [generating, setGenerating] = React.useState(false);
  const [kit, setKit] = React.useState({ quiz: [], flashcards: [], plan: [], theory: [], title: '' });
  const [selected, setSelected] = React.useState({});
  const [evaluated, setEvaluated] = React.useState(false);

  React.useEffect(() => { prewarmAI(); prewarmPDF(); }, []);

  return { difficulty, setDifficulty, titleRef, notesRef, fileRef, fileMeta, setFileMeta, generating, setGenerating, kit, setKit, selected, setSelected, evaluated, setEvaluated };
}

async function buildKitFromContent(rawText, title, difficulty) {
  // Use robust textProcessor.generateArtifacts first; fallback to legacy pipeline if needed
  try {
    const artifacts = await generateArtifacts(rawText, title, { difficulty });
    if (artifacts &amp;&amp; Array.isArray(artifacts.quiz) &amp;&amp; artifacts.quiz.length) {
      return artifacts;
    }
  } catch {}

  const cleaned = normalizeText(rawText)
    .split(/\n+/)
    .filter(line => line &amp;&amp; !isAuthorish(line) &amp;&amp; !looksLikeHeadingStrong(line))
    .join(' ');
  const sentences = splitSentences(cleaned);

  let chosenIdxs = [];
  try {
    const vecs = await embedSentences(sentences);
    if (vecs &amp;&amp; vecs.length) {
      const picked = [];
      const used = new Set();
      const k = Math.min(10, sentences.length);
      let cur = 0;
      for (let i = 0; i &lt; vecs.length; i++) { if (vecs[i]) { cur = i; break; } }
      picked.push(cur); used.add(cur);
      while (picked.length &lt; k) {
        let best = -1; let bestScore = -Infinity;
        for (let i = 0; i &lt; vecs.length; i++) {
          if (used.has(i)) continue;
          let rel = 0;
          for (const pi of picked) {
            const a = vecs[i], b = vecs[pi];
            let dot = 0, na = 0, nb = 0;
            for (let d = 0; d &lt; a.length; d++) { dot += a[d]*b[d]; na += a[d]*a[d]; nb += b[d]*b[d]; }
            const sim = dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
            rel += sim;
          }
          rel /= picked.length;
          let div = -Infinity;
          for (const pi of picked) {
            const a = vecs[i], b = vecs[pi];
            let dot = 0, na = 0, nb = 0;
            for (let d = 0; d &lt; a.length; d++) { dot += a[d]*b[d]; na += a[d]*a[d]; nb += b[d]*b[d]; }
            const sim = dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
            if (sim &gt; div) div = sim;
          }
          const lambda = difficulty === 'expert' ? 0.8 : difficulty === 'harder' ? 0.75 : 0.7;
          const score = lambda * rel - (1 - lambda) * div;
          if (score &gt; bestScore) { bestScore = score; best = i; }
        }
        if (best === -1) break;
        picked.push(best); used.add(best);
        if (picked.length &gt;= k) break;
      }
      chosenIdxs = picked;
    }
  } catch {}

  if (!chosenIdxs.length) {
    chosenIdxs = Array.from({ length: Math.min(10, sentences.length) }, (_, i) =&gt; i);
  }

  const phrases = extractKeyPhrases(cleaned, 18);
  let flashcards = phrases.slice(0, 12).map(p =&gt; ({ front: p, back: sentences.find(s =&gt; (s||'').toLowerCase().includes((p||'').toLowerCase())) || sentences[0] || p }));
  // Ensure at least 8 flashcards by backfilling from phrases
  if (flashcards.length &lt; 8) {
    const pool = phrases.slice(0, 24);
    for (let i = 0; i &lt; pool.length &amp;&amp; flashcards.length &lt; 8; i++) {
      const p = pool[i];
      if (!p) continue;
      let best = '';
      try { best = await bestSentenceForPhrase(p, sentences, 160); } catch {}
      const back = best || sentences.find(s =&gt; (s||'').toLowerCase().includes((p||'').toLowerCase())) || sentences[i] || cleaned;
      const front = p;
      if (!flashcards.some(fc =&gt; (fc.front||'').toLowerCase() === (front||'').toLowerCase())) {
        flashcards.push({ front, back });
      }
    }
  }
  flashcards = flashcards.slice(0, Math.max(8, Math.min(12, flashcards.length)));

  const quiz = [];
  for (let qi = 0; qi &lt; Math.min(10, chosenIdxs.length); qi++) {
    const si = chosenIdxs[qi];
    const context = sentences[si] || '';
    if (!context) continue;
    let cand = phrases.find(p =&gt; context.toLowerCase().includes(p.toLowerCase()));
    if (!cand) {
      const words = context.split(/\s+/);
      const start = Math.max(1, Math.floor(words.length/2) - 3);
      cand = words.slice(start, start + 4).join(' ');
    }
    let question = await generateQuestionFromContext(context, cand);
    if (!question || question.length &lt; 10) {
      question = `Which statement is accurate based on the material?`;
    }
    const distracts = [];
    for (let j = 0; j &lt; sentences.length &amp;&amp; distracts.length &lt; 6; j++) {
      if (j === si) continue;
      const s = sentences[j];
      if (!s || s.length &lt; 40) continue;
      if (s.toLowerCase().includes(cand.toLowerCase())) continue;
      distracts.push(s);
    }
    const correct = context.length &gt; 180 ? context.slice(0, context.lastIndexOf(' ', 170)) + '.' : context;
    const optionsPool = [correct, ...distracts].slice(0, 6).map(s =&gt; s.length &gt; 180 ? s.slice(0, s.lastIndexOf(' ', 170)) + '.' : s);
    const uniq = [];
    const seen = new Set();
    const normKey = (s) =&gt; String(s||'').trim().replace(/[\s]+/g,' ').toLowerCase();
    for (const op of optionsPool) {
      const k = normKey(op);
      if (!k || seen.has(k)) continue;
      seen.add(k); uniq.push(op);
      if (uniq.length &gt;= 4) break;
    }
    const generics = [
      'A related but inaccurate claim about the topic.',
      'A plausible but incorrect detail about the material.',
      'An unrelated statement that does not follow from the text.',
      'A misinterpretation of the concept discussed.'
    ];
    let gi = 0;
    while (uniq.length &lt; 4 &amp;&amp; gi &lt; generics.length) {
      const g = generics[gi++];
      const k = normKey(g);
      if (!seen.has(k)) { seen.add(k); uniq.push(g); }
    }
    // If still short, derive light modal variants of the correct sentence
    function tweakModal(s) { return String(s||'').replace(/\bmay\b/gi,'must').replace(/\boften\b/gi,'always').replace(/\bsometimes\b/gi,'always'); }
    while (uniq.length &lt; 4) {
      const v = tweakModal(correct);
      const k = normKey(v);
      if (k &amp;&amp; !seen.has(k)) { seen.add(k); uniq.push(v); }
      else break;
    }
    const idx = Math.floor(Math.random() * 4);
    const arranged = uniq.slice(0,4);
    const c0 = arranged[0]; arranged[0] = arranged[idx]; arranged[idx] = c0;
    const explanationBullets = await summarisePointwise(context, 'short');
    quiz.push({ id: `q-${qi}`, question, options: arranged, answer_index: idx, explanation: explanationBullets[0] || 'Derived from the provided material.' });
  }
  while (quiz.length &lt; 10) {
    const s = sentences[quiz.length % Math.max(1, sentences.length)] || cleaned;
    const opts = [s, ...sentences.filter(x =&gt; x !== s)].slice(0,4);
    while (opts.length &lt; 4) opts.push('General concepts.');
    quiz.push({ id: `f-${quiz.length}`, question: 'Which statement is accurate based on the material?', options: opts.slice(0,4), answer_index: 0, explanation: 'Supported by the context.' });
  }

  const plan = Array.from({ length: 7 }, (_, i) =&gt; {
    const topic = phrases[i] || `Topic ${i + 1}`;
    return { title: `Day ${i + 1}: ${topic}`,
      objectives: [
        `Understand the core idea behind ${topic}.`,
        `Write a 4–6 sentence explanation of ${topic} with an example.`,
        `Create 3 flashcards focusing on definitions, properties, and pitfalls of ${topic}.`
      ] };
  });

  const theory = buildTheoryQuestions(cleaned, phrases, 10);

  return { title: title || (cleaned.split(/\n+/)[0] || 'Study Kit'), quiz, flashcards, plan, theory };
}

function QuizBlock({ quiz, selected, setSelected, evaluated }) {
  // Collapse weird spaced-letter artifacts like "T e c h" to "Tech"
  function unspaceLetters(t) {
    try {
      // Only when there is a long run of single-letter tokens
      if (!/\b(?:[A-Za-z]\s){5,}[A-Za-z]\b/.test(t)) return t;
      return t.replace(/\b(([A-Za-z])(?:\s+[A-Za-z]){5,})\b/g, (m) =&gt; m.replace(/\s+/g, ''));
    } catch { return t; }
  }
  const sanitize = (s) =&gt; {
    try {
      let t = String(s || '');
      const pad = 'In practice, this may vary under specific constraints.';
      const padNoDot = 'In practice, this may vary under specific constraints';
      if (t.includes(pad)) t = t.split(pad).join(' ');
      if (t.includes(padNoDot)) t = t.split(padNoDot).join(' ');
      t = unspaceLetters(t);
      t = t.replace(/\s+/g, ' ').trim();
      if (t &amp;&amp; !/[.!?]$/.test(t)) t += '.';
      return t;
    } catch { return s; }
  };
  const ensureFourOptions = (q) =&gt; {
    const base = Array.isArray(q.options) ? q.options.map(sanitize) : [];
    const correct = sanitize(q.options?.[q.answer_index] ?? '');
    const norm = (x) =&gt; String(x || '').toLowerCase();
    const tokenize = (t) =&gt; String(t||'').toLowerCase().match(/[a-z][a-z\-']+/g) || [];
    const jaccard = (a, b) =&gt; {
      const A = new Set(tokenize(a)); const B = new Set(tokenize(b));
      if (!A.size &amp;&amp; !B.size) return 0; let inter = 0; for (const x of A) if (B.has(x)) inter++; const uni = A.size + B.size - inter; return uni ? inter/inter : 0; // safe fallback
    };
    const balanceLen = (text, target) =&gt; {
      let t = sanitize(text);
      const min = Math.max(60, Math.floor(target * 0.9));
      if (t.length &lt; min) {
        const qualifiers = [
          'within the organization network.',
          'under internal policy controls.',
          'subject to authorization requirements.',
          'in accordance with governance standards.',
          'under defined risk thresholds.',
          'with appropriate safeguards and reviews.',
          'as per established procedures.',
          'with documented approvals in place.'
        ];
        const pick = qualifiers[(Math.abs(t.length + target) % qualifiers.length)];
        t = t.replace(/[.!?]$/, '');
        t = t + ' ' + pick;
      }
      if (!/[.!?]$/.test(t)) t = t.trim() + '.';
      return t.trim();
    };

    const out = [];
    const seen = new Set();
    const targetLen = Math.max(90, Math.min(180, String(correct||'').length));

    const addIf = (cand) =&gt; {
      if (!cand) return false;
      let c = balanceLen(cand, targetLen);
      const k = norm(c);
      if (!k || seen.has(k)) return false;
      if (out.some(x =&gt; jaccard(x, c) &gt;= 0.5)) return false;
      out.push(c); seen.add(k); return true;
    };

    if (correct) addIf(correct);

    for (const o of base) {
      if (out.length &gt;= 4) break;
      addIf(o);
    }

    if (out.length &lt; 4 &amp;&amp; correct) {
      const cands = [];
      cands.push(correct.replace(/\bmay\b/gi, 'must'));
      cands.push(correct.replace(/\bmust\b/gi, 'may'));
      cands.push(correct.replace(/\boften\b/gi, 'sometimes'));
      cands.push(correct.replace(/\bsometimes\b/gi, 'often'));
      cands.push(correct.replace(/\bis\b/gi, 'is not'));
      cands.push(correct.replace(/\bare\b/gi, 'are not'));
      cands.push(correct.replace(/\bincludes\b/gi, 'excludes'));
      cands.push(correct.replace(/\bexcludes\b/gi, 'includes'));
      const numRx = /(\d+(?:\.\d+)?%?)/;
      if (numRx.test(correct)) {
        const m = correct.match(numRx);
        const n = parseFloat((m &amp;&amp; m[1] || '0').replace('%',''));
        if (!isNaN(n)) {
          const variants = [n * 0.85, n * 1.15, n + 1, Math.max(0, n - 1)];
          for (const v of variants) {
            const rep = m[1].endsWith('%') ? v.toFixed(1) + '%' : String(Math.round(v));
            cands.push(correct.replace(numRx, rep));
          }
        }
      }
      for (const c of cands) {
        if (out.length &gt;= 4) break;
        addIf(c);
      }
    }

    if (out.length &lt; 4) {
      const generics = [
        'This statement appears related but does not reflect the material.',
        'This conclusion does not follow from the provided context.',
        'A plausible but incorrect interpretation of the content.',
        'A misreading that conflicts with the material.'
      ];
      for (const g of generics) { if (out.length &gt;= 4) break; addIf(g); }
    }

    const idx = Math.min(out.length - 1, Math.max(0, q.answer_index || 0));
    const arranged = out.slice(0, 4);
    const curIdx = arranged.findIndex(o =&gt; norm(o) === norm(correct));
    if (curIdx !== -1 &amp;&amp; curIdx !== idx) { const tmp = arranged[idx]; arranged[idx] = arranged[curIdx]; arranged[curIdx] = tmp; }
    return { arranged, idx };
  };
  return (
    <div className="space-y-4">
      {quiz.map((q, i) =&gt; {
        const picked = selected[q.id];
        const fixed = ensureFourOptions(q);
        return (
          <div key={q.id} className="border rounded-md p-4">
            <div className="font-medium mb-3">{i + 1}. {q.question}</div>
            <div className="space-y-2">
              {fixed.arranged.map((op, oi) =&gt; {
                const isCorrect = evaluated &amp;&amp; oi === fixed.idx;
                const isWrong = evaluated &amp;&amp; picked === oi &amp;&amp; oi !== fixed.idx;
                return (
                  <label key={oi} className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer ${isCorrect ? 'border-green-600 bg-green-600/10' : isWrong ? 'border-red-600 bg-red-600/10' : 'border-border'}`}>
                    <input type="radio" name={q.id} className="mt-1" checked={picked === oi} onChange={() =&gt; setSelected(s =&gt; ({ ...s, [q.id]: oi }))} />
                    <span className="text-sm leading-relaxed">{op}</span>
                  </label>
                );
              })}
            </div>
            {evaluated &amp;&amp; (
              <div className="mt-2 text-sm text-foreground/80">
                {selected[q.id] === fixed.idx ? 'Correct.' : 'Incorrect.'} Correct answer: <span className="font-medium">{fixed.arranged[fixed.idx]}</span>
                {q.explanation ? &lt;div className="mt-1">Explanation: {q.explanation}&lt;/div> : null}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Studio() {
  const { difficulty, setDifficulty, titleRef, notesRef, fileRef, fileMeta, setFileMeta, generating, setGenerating, kit, setKit, selected, setSelected, evaluated, setEvaluated } = useKitState();
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();
  const logoRef = React.useRef(null);
  const [notesVal, setNotesVal] = React.useState('');
  const [hasFile, setHasFile] = React.useState(false);

  // Decode shared kit if present in hash
  React.useEffect(() => {
    try {
      if (location.hash &amp;&amp; location.hash.includes('#s=')) {
        const token = location.hash.split('#s=')[1];
        if (token) {
          const bytes = fromB64Url(token);
          const jsonBytes = pako.inflate(bytes);
          const text = new TextDecoder().decode(jsonBytes);
          const payload = JSON.parse(text);
          if (payload &amp;&amp; payload.kit) {
            setKit(payload.kit);
            if (payload.title &amp;&amp; titleRef.current) titleRef.current.value = payload.title;
            setSelected({}); setEvaluated(false);
          }
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preload logo (data URL + natural dimensions) for PDFs
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/assets/aceel-logo.png');
        const blob = await res.blob();
        // Read as data URL for jsPDF
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result;
          // Also get natural dimensions using an Image element
          const img = new Image();
          img.onload = () => {
            logoRef.current = { dataUrl, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
            URL.revokeObjectURL(img.src);
          };
          img.src = URL.createObjectURL(blob);
        };
        reader.readAsDataURL(blob);
      } catch {}
    })();
  }, []);

  async function onFileChange(e) {
    try {
      const file = e.target.files &amp;&amp; e.target.files[0];
      setHasFile(!!file);
      if (!file) { setFileMeta(null); return; }
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setFileMeta({ name: file.name, size: file.size, pages: pdf.numPages || 0 });
    } catch {
      setFileMeta(null);
    }
  }

  async function onGenerate() {
    try {
      setGenerating(true); setEvaluated(false); setSelected({});
      let combined = '';
      const notes = notesRef.current?.value || '';
      const file = fileRef.current?.files &amp;&amp; fileRef.current.files[0];
      if (!notes &amp;&amp; !file) {
        alert('Please paste some text or upload a PDF before generating.');
        setGenerating(false);
        return;
      }
      if (notes) combined += notes + '\n';
      if (file) {
        const pdfText = await extractTextFromPDF(file, { maxPages: 60 });
        combined += '\n' + pdfText;
      }
      const title = titleRef.current?.value || '';
      const built = await buildKitFromContent(combined, title, difficulty);
      setKit(built);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  function onEvaluate() { setEvaluated(true); }

  // ---------- PDF helpers ----------
  async function withDoc(title, cb) {
    const jsPDF = await getJsPDF(2000);
    if (!jsPDF) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40; let y = margin;

    function drawHeader(small = false) {
      const headerH = small ? 24 : 28;
      const pageW = doc.internal.pageSize.getWidth();
      try {
        if (logoRef.current &amp;&amp; logoRef.current.dataUrl) {
          const { dataUrl, width, height } = logoRef.current;
          const ratio = (width &amp;&amp; height) ? (width / height) : 1.0;
          const logoW = Math.min(120, headerH * ratio);
          const x = (pageW - logoW) / 2;
          doc.addImage(dataUrl, 'PNG', x, y - 6, logoW, headerH, undefined, 'FAST');
        }
      } catch {}
      // No title text next to logo — per spec: centered logo only
      y += small ? 34 : 42;
    }

    function addFooter() {
      const pageH = doc.internal.pageSize.getHeight();
      const footer = 'aceel@sidahq.com | skriptio.sidahq.com';
      doc.setFontSize(10);
      doc.text(footer, doc.internal.pageSize.getWidth() / 2, pageH - 20, { align: 'center' });
    }

    // First page header
    drawHeader(false);

    const pageHeight = doc.internal.pageSize.getHeight();
    function ensureSpace(linesNeeded = 0) {
      if (y + linesNeeded &gt; pageHeight - margin - 20) {
        addFooter();
        doc.addPage();
        y = margin;
        drawHeader(true);
      }
    }

    function writeHeading(text) {
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      const wrapped = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - margin * 2);
      ensureSpace(wrapped.length * 14 + 6);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 14 + 6;
      doc.setFont(undefined, 'normal');
    }
    function writePara(text) {
      doc.setFontSize(11);
      const wrapped = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - margin * 2);
      ensureSpace(wrapped.length * 14 + 8);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 14 + 8;
    }
    function writeBullets(items) {
      doc.setFontSize(11);
      for (const it of items) {
        const wrapped = doc.splitTextToSize('• ' + it, doc.internal.pageSize.getWidth() - margin * 2);
        ensureSpace(wrapped.length * 14 + 4);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 14 + 4;
      }
    }

    await cb({ doc, yRef: { get: () =&gt; y, set: (v) =&gt; { y = v; } }, writeHeading, writePara, writeBullets, addFooter, ensureSpace, margin });
    addFooter();
    doc.save('Skriptio.pdf');
  }

  async function downloadQuizPDF() {
    if (!kit?.quiz?.length) return;
    // Local helpers to mirror on-screen repair
    const sanitize = (s) =&gt; {
      try {
        let t = String(s || '');
        const pad = 'In practice, this may vary under specific constraints.';
        const padNoDot = 'In practice, this may vary under specific constraints';
        if (t.includes(pad)) t = t.split(pad).join(' ');
        if (t.includes(padNoDot)) t = t.split(padNoDot).join(' ');
        t = t.replace(/\s+/g, ' ').trim();
        if (t &amp;&amp; !/[.!?]$/.test(t)) t += '.';
        return t;
      } catch { return s; }
    };
    const ensureFour = (q) =&gt; {
      const base = Array.isArray(q.options) ? q.options.map(sanitize) : [];
      const correct = sanitize(q.options?.[q.answer_index] ?? '');
      const norm = (x) =&gt; String(x || '').toLowerCase();
      const tokenize = (t) =&gt; String(t||'').toLowerCase().match(/[a-z][a-z\-']+/g) || [];
      const jaccard = (a, b) =&gt; {
        const A = new Set(tokenize(a)); const B = new Set(tokenize(b));
        if (!A.size &amp;&amp; !B.size) return 0; let inter = 0; for (const x of A) if (B.has(x)) inter++; const uni = A.size + B.size - inter; return uni ? inter/uni : 0;
      };
      const balanceLen = (text, target) =&gt; {
        let t = sanitize(text);
        const min = Math.max(60, Math.floor(target * 0.9));
        if (t.length &lt; min) {
          const qualifiers = [
            'within the organization network.',
            'under internal policy controls.',
            'subject to authorization requirements.',
            'in accordance with governance standards.',
            'under defined risk thresholds.',
            'with appropriate safeguards and reviews.',
            'as per established procedures.',
            'with documented approvals in place.'
          ];
          const pick = qualifiers[(Math.abs(t.length + target) % qualifiers.length)];
          t = t.replace(/[.!?]$/,'');
          t = t + ' ' + pick;
        }
        if (!/[.!?]$/.test(t)) t = t.trim() + '.';
        return t.trim();
      };

      const out = [];
      const seen = new Set();
      const targetLen = Math.max(90, Math.min(180, String(correct||'').length));

      const addIf = (cand) =&gt; {
        if (!cand) return false;
        let c = balanceLen(cand, targetLen);
        const k = norm(c);
        if (!k || seen.has(k)) return false;
        if (out.some(x =&gt; jaccard(x, c) &gt;= 0.5)) return false;
        out.push(c); seen.add(k); return true;
      };

      if (correct) addIf(correct);

      for (const o of base) {
        if (out.length &gt;= 4) break;
        addIf(o);
      }

      if (out.length &lt; 4 &amp;&amp; correct) {
        const cands = [];
        cands.push(correct.replace(/\bmay\b/gi, 'must'));
        cands.push(correct.replace(/\bmust\b/gi, 'may'));
        cands.push(correct.replace(/\boften\b/gi, 'sometimes'));
        cands.push(correct.replace(/\bsometimes\b/gi, 'often'));
        cands.push(correct.replace(/\bis\b/gi, 'is not'));
        cands.push(correct.replace(/\bare\b/gi, 'are not'));
        cands.push(correct.replace(/\bincludes\b/gi, 'excludes'));
        cands.push(correct.replace(/\bexcludes\b/gi, 'includes'));
        const numRx = /(\d+(?:\.\d+)?%?)/;
        if (numRx.test(correct)) {
          const m = correct.match(numRx);
          const n = parseFloat((m &amp;&amp; m[1] || '0').replace('%',''));
          if (!isNaN(n)) {
            const variants = [n * 0.85, n * 1.15, n + 1, Math.max(0, n - 1)];
            for (const v of variants) {
              const rep = m[1].endsWith('%') ? v.toFixed(1) + '%' : String(Math.round(v));
              cands.push(correct.replace(numRx, rep));
            }
          }
        }
        for (const c of cands) {
          if (out.length &gt;= 4) break;
          addIf(c);
        }
      }

      if (out.length &lt; 4) {
        const generics = [
          'This statement appears related but does not reflect the material.',
          'This conclusion does not follow from the provided context.',
          'A plausible but incorrect interpretation of the content.',
          'A misreading that conflicts with the material.'
        ];
        for (const g of generics) { if (out.length &gt;= 4) break; addIf(g); }
      }

      const idx = Math.min(out.length - 1, Math.max(0, q.answer_index || 0));
      const arranged = out.slice(0, 4);
      const curIdx = arranged.findIndex(o =&gt; norm(o) === norm(correct));
      if (curIdx !== -1 &amp;&amp; curIdx !== idx) { const tmp = arranged[idx]; arranged[idx] = arranged[curIdx]; arranged[curIdx] = tmp; }
      return { arranged, idx };
    };
    await withDoc((kit.title ? kit.title + ' — Quiz' : 'Quiz'), async ({ writeHeading, writePara }) => {
      writeHeading('Quiz');
      kit.quiz.forEach((q, i) => {
        writePara(`${i+1}. ${q.question}`);
        const fixed = ensureFour(q);
        const labels = ['A', 'B', 'C', 'D'];
        fixed.arranged.forEach((op, oi) => writePara(`${labels[oi]}. ${op}`));
        writePara(`Correct answer: ${labels[fixed.idx]}. ${fixed.arranged[fixed.idx]}`);
        if (q.explanation) writePara(`Explanation: ${q.explanation}`);
      });
    });
  }
  async function downloadFlashcardsPDF() {
    if (!kit?.flashcards?.length) return;
    await withDoc((kit.title ? kit.title + ' — Flashcards' : 'Flashcards'), async ({ writeHeading, writePara }) => {
      writeHeading('Flashcards');
      kit.flashcards.forEach((fc, i) => {
        writeHeading(`${i+1}. ${fc.front}`);
        writePara(fc.back);
      });
    });
  }
  async function downloadTheoryPDF() {
    if (!kit?.theory?.length) return;
    await withDoc((kit.title ? kit.title + ' — Theory' : 'Theory'), async ({ writeHeading, writePara }) => {
      writeHeading('Theory Questions');
      kit.theory.forEach((t, i) => writePara(`${i+1}. ${t}`));
    });
  }
  async function downloadPlanPDF() {
    if (!kit?.plan?.length) return;
    await withDoc((kit.title ? kit.title + ' — 7‑Day Plan' : '7‑Day Plan'), async ({ writeHeading, writeBullets }) => {
      writeHeading('7‑Day Plan');
      kit.plan.forEach((d) => { writeHeading(d.title); writeBullets(d.objectives || []); });
    });
  }

  // ---------- Share / Copy Link ----------
  function buildShareLink() {
    if (!kit || (!kit.quiz?.length &amp;&amp; !kit?.flashcards?.length &amp;&amp; !kit?.plan?.length &amp;&amp; !kit?.theory?.length)) return '';
    const payload = { v: 1, ts: Date.now(), title: titleRef.current?.value || kit.title || 'Study Kit', kit };
    const token = b64uEncodeObject(payload);
    const slug = (titleRef.current?.value || kit.title || 'study-kit').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'study-kit';
    const url = `${window.location.origin}/studio/${slug}/shared#s=${token}`;
    return url;
  }
  async function onShare() {
    try {
      const url = buildShareLink(); if (!url) return;
      if (navigator.share) {
        await navigator.share({ title: 'Skriptio Study Kit', url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard');
      }
    } catch {}
  }
  async function onCopyLink() {
    try { const url = buildShareLink(); if (!url) return; await navigator.clipboard.writeText(url); alert('Link copied'); } catch {}
  }

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border border-black/70 dark:border-white/60">
              <CardHeader>
                <CardTitle>Add Content</CardTitle>
                <CardDescription>Paste raw text or upload a PDF. Processing happens in your browser.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input placeholder="Title (optional)" className="studio-input-title" ref={titleRef} />
                <Textarea rows={10} placeholder="Paste text here (supports LaTeX like $...$)" className="studio-textarea-notes" ref={notesRef} onChange={(e)=>setNotesVal(e.target.value)} />
                <div className="text-xs text-foreground/70">Tip: You can combine PDF + pasted notes. Math formulas in text are preserved.</div>
                <input ref={fileRef} type="file" accept="application/pdf" className="file-input-reset" onChange={onFileChange} />
                <Button onClick={() => fileRef.current?.click()} variant="outline" className="button-upload w-full">
                  <Upload size={16} className="mr-2" /> Upload PDF
                </Button>
                {fileMeta ? (
                  <div className="text-xs text-foreground/80">
                    Selected: <span className="font-medium">{fileMeta.name}</span> · {Math.round(fileMeta.size/1024)} KB · {fileMeta.pages} page{fileMeta.pages===1?'':'s'}
                  </div>
                ) : null}
                <div>
                  <div className="text-sm mb-2">Difficulty</div>
                  <div className="segmented" role="tablist" aria-label="Difficulty">
                    <button className={`item ${difficulty==='balanced'?'active':''}`} role="tab" aria-selected={difficulty==='balanced'} onClick={()=>setDifficulty('balanced')}>Balanced</button>
                    <button className={`item ${difficulty==='harder'?'active':''}`} role="tab" aria-selected={difficulty==='harder'} onClick={()=>setDifficulty('harder')}>Harder</button>
                    <button className={`item ${difficulty==='expert'?'active':''}`} role="tab" aria-selected={difficulty==='expert'} onClick={()=>setDifficulty('expert')}>Expert</button>
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
                <Button onClick={onGenerate} disabled={generating} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">{generating ? 'Generating…' : 'Generate Study Kit'}</Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <div className="toolbar flex flex-wrap gap-2">
              <Button className="btn" variant="outline" onClick={downloadQuizPDF} disabled={!kit?.quiz?.length}><FileText size={16} className="mr-2"/>Quiz PDF</Button>
              <Button className="btn" variant="outline" onClick={downloadFlashcardsPDF} disabled={!kit?.flashcards?.length}><FileText size={16} className="mr-2"/>Flashcards PDF</Button>
              <Button className="btn" variant="outline" onClick={downloadTheoryPDF} disabled={!kit?.theory?.length}><FileText size={16} className="mr-2"/>Theory PDF</Button>
              <Button className="btn" variant="outline" onClick={downloadPlanPDF} disabled={!kit?.plan?.length}><FileText size={16} className="mr-2"/>7‑Day Plan PDF</Button>
              <Button className="btn" variant="ghost" size="icon" aria-label="Share" onClick={onShare} disabled={!kit?.quiz?.length &amp;&amp; !kit?.flashcards?.length &amp;&amp; !kit?.plan?.length &amp;&amp; !kit?.theory?.length}><Share2 size={18} /></Button>
              <Button className="btn" variant="ghost" size="icon" aria-label="Copy link" onClick={onCopyLink} disabled={!kit?.quiz?.length &amp;&amp; !kit?.flashcards?.length &amp;&amp; !kit?.plan?.length &amp;&amp; !kit?.theory?.length}><LinkIcon size={18} /></Button>
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
                  <div className="kit-toolbar flex items-center justify-between">
                    <div>Quiz</div>
                    {kit.quiz?.length ? <Button size="sm" onClick={onEvaluate} disabled={evaluated}>Evaluate</Button> : null}
                  </div>
                  <CardContent>
                    {kit.quiz?.length ? (
                      <QuizBlock quiz={kit.quiz} selected={selected} setSelected={setSelected} evaluated={evaluated} />
                    ) : (
                      <div className="text-center text-sm text-foreground/70 py-10">Your quiz will appear here once generated.</div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="flashcards">
                <Card className="kit-surface"><div className="kit-toolbar">Flashcards</div><CardContent>
                  {kit.flashcards?.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {kit.flashcards.map((fc, i) => (
                        <div key={i} className="border rounded-md p-4">
                          <div className="font-medium flashcard-front">{fc.front}</div>
                          <div className="mt-2 text-sm text-foreground/80 flashcard-back">{fc.back}</div>
                        </div>
                      ))}
                    </div>
                  ) : <EmptyState label="No flashcards yet." />}
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="plan">
                <Card className="kit-surface"><div className="kit-toolbar">7‑Day Plan</div><CardContent>
                  {kit.plan?.length ? (
                    <div className="space-y-3">
                      {kit.plan.map((d, i) => (
                        <div key={i} className="border rounded-md p-4">
                          <div className="font-medium mb-1">{d.title}</div>
                          <ul className="list-disc pl-5 text-sm text-foreground/80 space-y-1">
                            {d.objectives.map((o, j) => (&lt;li key={j}>{o}&lt;/li>))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ) : <EmptyState label="No plan yet." />}
                </CardContent></Card>
              </TabsContent>
              <TabsContent value="theory">
                <Card className="kit-surface"><div className="kit-toolbar">Theory Qs</div><CardContent>
                  {kit.theory?.length ? (
                    <ol className="list-decimal pl-5 space-y-2 text-sm">
                      {kit.theory.map((q, i) => (&lt;li key={i}>{q}&lt;/li>))}
                    </ol>
                  ) : <EmptyState label="No theory questions yet." />}
                </CardContent></Card>
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