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
import { extractTextFromPDF, splitSentences, normalizeText, isAuthorish, looksLikeHeadingStrong, extractKeyPhrases, buildTheoryQuestions } from "./utils/textProcessor";
import { embedSentences, selectTopSentences, bestSentenceForPhrase, tryEnhanceArtifacts } from "./utils/ml";

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
        <section id="features" className="max-w-6xl mx_auto px-6 py-10">
          <h2 className="section-title text-2xl font-semibold mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="card-glow"><CardHeader><CardTitle>Tough quizzes</CardTitle><CardDescription>10 MCQs per kit: concept, property, and formula items tuned by difficulty.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>Smart flashcards</CardTitle><CardDescription>Concise fronts, context‑rich backs derived from the text you provide.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>7‑Day plans</CardTitle><CardDescription>Clustered topics with daily objectives for steady, guided progress.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>Combine sources</CardTitle><CardDescription>Upload PDFs and paste notes together for richer, more varied quizzes.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>Private by design</CardTitle><CardDescription>Runs 100% in your browser after load. No servers, no data sharing.</CardDescription></CardHeader></Card>
            <Card className="card-glow"><CardHeader><CardTitle>Fast & responsive</CardTitle><CardDescription>Optimized, incremental processing keeps the UI smooth even on large notes.</CardDescription></CardHeader></Card>
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

  React.useEffect(() => { prewarmAI(); }, []);

  return { difficulty, setDifficulty, titleRef, notesRef, fileRef, fileMeta, setFileMeta, generating, setGenerating, kit, setKit, selected, setSelected, evaluated, setEvaluated };
}

async function buildKitFromContent(rawText, title, difficulty) {
  const cleaned = normalizeText(rawText)
    .split(/\n+/)
    .filter(line => line && !isAuthorish(line) && !looksLikeHeadingStrong(line))
    .join(' ');
  const sentences = splitSentences(cleaned);

  let chosenIdxs = [];
  try {
    const vecs = await embedTexts(sentences);
    if (vecs && vecs.length) {
      const picked = [];
      const used = new Set();
      const k = Math.min(10, sentences.length);
      let cur = 0;
      for (let i = 0; i < vecs.length; i++) { if (vecs[i]) { cur = i; break; } }
      picked.push(cur); used.add(cur);
      while (picked.length < k) {
        let best = -1; let bestScore = -Infinity;
        for (let i = 0; i < vecs.length; i++) {
          if (used.has(i)) continue;
          let rel = 0;
          for (const pi of picked) {
            const a = vecs[i], b = vecs[pi];
            let dot = 0, na = 0, nb = 0;
            for (let d = 0; d < a.length; d++) { dot += a[d]*b[d]; na += a[d]*a[d]; nb += b[d]*b[d]; }
            const sim = dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
            rel += sim;
          }
          rel /= picked.length;
          let div = -Infinity;
          for (const pi of picked) {
            const a = vecs[i], b = vecs[pi];
            let dot = 0, na = 0, nb = 0;
            for (let d = 0; d < a.length; d++) { dot += a[d]*b[d]; na += a[d]*a[d]; nb += b[d]*b[d]; }
            const sim = dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
            if (sim > div) div = sim;
          }
          const lambda = difficulty === 'expert' ? 0.8 : difficulty === 'harder' ? 0.75 : 0.7;
          const score = lambda * rel - (1 - lambda) * div;
          if (score > bestScore) { bestScore = score; best = i; }
        }
        if (best === -1) break;
        picked.push(best); used.add(best);
        if (picked.length >= k) break;
      }
      chosenIdxs = picked;
    }
  } catch {}

  if (!chosenIdxs.length) {
    chosenIdxs = Array.from({ length: Math.min(10, sentences.length) }, (_, i) => i);
  }

  const phrases = extractKeyPhrases(cleaned, 18);
  const flashcards = phrases.slice(0, 12).map(p => ({ front: p, back: sentences.find(s => s.toLowerCase().includes(p.toLowerCase())) || sentences[0] || p }));

  const quiz = [];
  for (let qi = 0; qi < Math.min(10, chosenIdxs.length); qi++) {
    const si = chosenIdxs[qi];
    const context = sentences[si] || '';
    if (!context) continue;
    let cand = phrases.find(p => context.toLowerCase().includes(p.toLowerCase()));
    if (!cand) {
      const words = context.split(/\s+/);
      const start = Math.max(1, Math.floor(words.length/2) - 3);
      cand = words.slice(start, start + 4).join(' ');
    }
    let question = await generateQuestionFromContext(context, cand);
    if (!question || question.length < 10) {
      question = `Which statement best describes: ${cand}?`;
    }
    const distracts = [];
    for (let j = 0; j < sentences.length && distracts.length < 6; j++) {
      if (j === si) continue;
      const s = sentences[j];
      if (!s || s.length < 40) continue;
      if (s.toLowerCase().includes(cand.toLowerCase())) continue;
      distracts.push(s);
    }
    const correct = context.length > 180 ? context.slice(0, context.lastIndexOf(' ', 170)) + '.' : context;
    const optionsPool = [correct, ...distracts].slice(0, 6).map(s => s.length > 180 ? s.slice(0, s.lastIndexOf(' ', 170)) + '.' : s);
    const uniq = [];
    const seen = new Set();
    for (const op of optionsPool) { const k = (op||'').toLowerCase(); if (!seen.has(k)) { seen.add(k); uniq.push(op); } if (uniq.length >= 4) break; }
    while (uniq.length < 4) uniq.push("Background theory.");
    const idx = Math.floor(Math.random() * 4);
    const arranged = uniq.slice(0,4);
    const c0 = arranged[0]; arranged[0] = arranged[idx]; arranged[idx] = c0;
    const explanationBullets = await summarisePointwise(context, 'short');
    quiz.push({ id: `q-${qi}`, question, options: arranged, answer_index: idx, explanation: explanationBullets[0] || 'Derived from the provided material.' });
  }
  while (quiz.length < 10) {
    const s = sentences[quiz.length % Math.max(1, sentences.length)] || cleaned;
    const opts = [s, ...sentences.filter(x => x !== s)].slice(0,4);
    while (opts.length < 4) opts.push('General concepts.');
    quiz.push({ id: `f-${quiz.length}`, question: 'Which statement is supported by the material?', options: opts.slice(0,4), answer_index: 0, explanation: 'Supported by the context.' });
  }

  const plan = Array.from({ length: 7 }, (_, i) => {
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
  return (
    <div className="space-y-4">
      {quiz.map((q, i) => {
        const picked = selected[q.id];
        return (
          <div key={q.id} className="border rounded-md p-4">
            <div className="font-medium mb-3">{i + 1}. {q.question}</div>
            <div className="space-y-2">
              {q.options.map((op, oi) => {
                const isCorrect = evaluated && oi === q.answer_index;
                const isWrong = evaluated && picked === oi && oi !== q.answer_index;
                return (
                  <label key={oi} className={`flex items-start gap-2 p-2 rounded-md border cursor-pointer ${isCorrect ? 'border-green-600 bg-green-600/10' : isWrong ? 'border-red-600 bg-red-600/10' : 'border-border'}`}>
                    <input type="radio" name={q.id} className="mt-1" checked={picked === oi} onChange={() => setSelected(s => ({ ...s, [q.id]: oi }))} />
                    <span className="text-sm leading-relaxed">{op}</span>
                  </label>
                );
              })}
            </div>
            {evaluated && (
              <div className="mt-2 text-sm text-foreground/80">
                {selected[q.id] === q.answer_index ? 'Correct.' : 'Incorrect.'} Correct answer: <span className="font-medium">{q.options[q.answer_index]}</span>
                {q.explanation ? <div className="mt-1">Explanation: {q.explanation}</div> : null}
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

  async function onFileChange(e) {
    try {
      const file = e.target.files && e.target.files[0];
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
      if (notes) combined += notes + '\n';
      const file = fileRef.current?.files && fileRef.current.files[0];
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
                <Textarea rows={10} placeholder="Paste text here (supports LaTeX like $...$)" className="studio-textarea-notes" ref={notesRef} />
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
                          <div className="font-medium">{fc.front}</div>
                          <div className="mt-2 text-sm text-foreground/80">{fc.back}</div>
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
                            {d.objectives.map((o, j) => (<li key={j}>{o}</li>))}
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
                      {kit.theory.map((q, i) => (<li key={i}>{q}</li>))}
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