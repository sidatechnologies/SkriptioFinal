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

function EmptyState({ label }) { return (&lt;div className="border border-dashed border-border rounded-lg p-8 text-center text-foreground/70 text-sm">{label}&lt;/div&gt;); }

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
  const [isDesktop, setIsDesktop] = useState(() =&gt; (typeof window !== 'undefined' ? window.innerWidth &gt;= 768 : true));
  const [theory, setTheory] = useState([]);

  useEffect(() =&gt; { prewarmPDF(); prewarmML(); }, []);
  useEffect(() =&gt; { const onResize = () =&gt; setIsDesktop(window.innerWidth &gt;= 768); window.addEventListener('resize', onResize); return () =&gt; window.removeEventListener('resize', onResize); }, []);

  const ensureJsPDF = async () =&gt; { const maybe = await getJsPDF(1200); if (maybe) return maybe; const mod = await import('jspdf'); return mod.jsPDF; };
  const addHeader = (doc) =&gt; { try { doc.setFont('helvetica', 'normal'); } catch {} };
  const addFooter = (doc) =&gt; { const ph = doc.internal.pageSize.getHeight(); const pw = doc.internal.pageSize.getWidth(); doc.setFontSize(10); doc.text("skriptio.sidahq.com | aceel@sidahq.com", pw / 2, ph - 10, { align: "center" }); };
  const lineWrap = (doc, text, x, y, maxWidth) =&gt; { const lines = doc.splitTextToSize(text, maxWidth); lines.forEach((ln) =&gt; { const ph = doc.internal.pageSize.getHeight(); if (y &gt; ph - 20) { addFooter(doc); doc.addPage(); addHeader(doc); y = 32; } doc.text(ln, x, y); y += 7; }); return y; };

  const handleGenerate = async () =&gt; {
    if (loading) return;
    const hasText = (text || '').trim().length &gt; 0;
    if (!hasText &amp;&amp; !file) { toast({ title: 'Add content', description: 'Paste notes or upload a PDF first.' }); return; }
    setLoading(true); setLoadingStep('Reading input');
    try {
      let full = hasText ? text : '';
      if (file) {
        const quick = extractTextFromPDFQuick(file, { maxPages: 24, totalBudgetMs: 4500 });
        const fullSlow = extractTextFromPDF(file, { maxPages: 24 });
        const pdfText = (await Promise.race([quick, new Promise(r =&gt; setTimeout(() =&gt; r(null), 4800))])) || (await fullSlow);
        full = [full, pdfText].filter(Boolean).join('\n');
      }
      setLoadingStep('Generating study kit');
      const kit = await generateArtifacts(full, (title || '').trim() || null, { difficulty, includeFormulas, explain: showExplanations });
      setResult(kit); setAnswers({}); setScore(null); setEvaluated(false);
      const phrases = extractKeyPhrases(full, 18);
      const theoryQs = buildTheoryQuestions(full, phrases, 10, { difficulty, docTitle: (title || '').trim() });
      setTheory(theoryQs);
      toast({ title: 'Study kit ready', description: 'Review the quiz, flashcards, plan, and theory tabs.' });
    } catch (e) { toast({ title: 'Generation failed', description: String(e?.message || e) }); } finally { setLoading(false); setLoadingStep(''); }
  };

  const onPickOption = (qid, idx) =&gt; {
    setAnswers(prev =&gt; ({ ...prev, [qid]: idx }));
  };
  const onEvaluate = () =&gt; {
    if (!result?.quiz) return;
    let sc = 0;
    for (const q of result.quiz) {
      if (answers[q.id] === q.answer_index) sc++;
    }
    setScore(sc);
    setEvaluated(true);
  };

  return (
    &lt;div className="min-h-screen bg-background text-foreground"&gt;
      &lt;FloatingMenu /&gt;
      &lt;header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border"&gt;
        &lt;div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between"&gt;
          &lt;Link to="/" className="font-semibold tracking-tight"&gt;Skriptio&lt;/Link&gt;
          &lt;div className="flex items-center gap-2"&gt;
            &lt;ThemeToggle /&gt;
          &lt;/div&gt;
        &lt;/div&gt;
      &lt;/header&gt;

      &lt;main className="max-w-6xl mx-auto px-6 py-8 space-y-6"&gt;
        &lt;StudioNav /&gt;

        &lt;Card className="bg-card border border-black/70 dark:border-white/60"&gt;
          &lt;CardHeader&gt;
            &lt;CardTitle&gt;Study Kit Generator&lt;/CardTitle&gt;
            &lt;CardDescription&gt;Paste notes or upload a PDF, pick difficulty, then Generate.&lt;/CardDescription&gt;
          &lt;/CardHeader&gt;
          &lt;CardContent className="space-y-4"&gt;
            &lt;div className="grid md:grid-cols-3 gap-3"&gt;
              &lt;Input placeholder="Title (optional)" value={title} onChange={e =&gt; setTitle(e.target.value)} className="studio-input-title" /&gt;
              &lt;div className="select-wrap"&gt;
                &lt;select className="select-control rounded-md px-3 pr-7 py-2" value={difficulty} onChange={e =&gt; setDifficulty(e.target.value)}&gt;
                  &lt;option value="balanced"&gt;Balanced&lt;/option&gt;
                  &lt;option value="harder"&gt;Harder&lt;/option&gt;
                &lt;/select&gt;
                &lt;span className="select-arrow"&gt;&lt;ChevronDown size={16} /&gt;&lt;/span&gt;
              &lt;/div&gt;
              &lt;div className="flex items-center gap-3"&gt;
                &lt;label className="inline-flex items-center gap-2 text-sm"&gt;
                  &lt;input type="checkbox" checked={includeFormulas} onChange={e =&gt; setIncludeFormulas(e.target.checked)} /&gt;
                  Include formulas
                &lt;/label&gt;
                &lt;label className="inline-flex items-center gap-2 text-sm"&gt;
                  &lt;input type="checkbox" checked={showExplanations} onChange={e =&gt; setShowExplanations(e.target.checked)} /&gt;
                  Show explanations
                &lt;/label&gt;
              &lt;/div&gt;
            &lt;/div&gt;
            &lt;Textarea rows={10} placeholder="Paste notes here…" value={text} onChange={e =&gt; setText(e.target.value)} className="studio-textarea-notes" /&gt;
            &lt;div className="flex items-center gap-3"&gt;
              &lt;input ref={fileInputRef} type="file" accept="application/pdf" className="file-input-reset" onChange={e =&gt; setFile(e.target.files?.[0] || null)} /&gt;
              &lt;Button onClick={() =&gt; fileInputRef.current?.click()} variant="outline" className="button-upload"&gt;
                &lt;Upload size={16} className="mr-2" /&gt; Upload PDF
              &lt;/Button&gt;
              &lt;Button onClick={handleGenerate} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90"&gt;
                {loading ? (&lt;&gt;&lt;Loader2 className="mr-2 h-4 w-4 animate-spin" /&gt; {loadingStep || 'Working…'}&lt;/&gt;) : 'Generate'}
              &lt;/Button&gt;
            &lt;/div&gt;
          &lt;/CardContent&gt;
        &lt;/Card&gt;

        {result ? (
          &lt;Tabs defaultValue="quiz" className="studio-tabs-wrap"&gt;
            &lt;TabsList&gt;
              &lt;TabsTrigger value="quiz"&gt;Quiz&lt;/TabsTrigger&gt;
              &lt;TabsTrigger value="cards"&gt;Flashcards&lt;/TabsTrigger&gt;
              &lt;TabsTrigger value="plan"&gt;7‑Day Plan&lt;/TabsTrigger&gt;
              &lt;TabsTrigger value="theory"&gt;Theory Qs&lt;/TabsTrigger&gt;
            &lt;/TabsList&gt;

            &lt;TabsContent value="quiz" className="space-y-4"&gt;
              {result.quiz.map((q) =&gt; (
                &lt;div key={q.id} className="border rounded-md p-4"&gt;
                  &lt;div className="font-medium mb-2"&gt;{q.question}&lt;/div&gt;
                  &lt;div className="grid gap-2"&gt;
                    {q.options.map((opt, idx) =&gt; {
                      const selected = answers[q.id] === idx;
                      const correctNow = evaluated &amp;&amp; idx === q.answer_index;
                      return (
                        &lt;button key={idx} onClick={() =&gt; onPickOption(q.id, idx)} className={`text-left px-3 py-2 rounded-md border quiz-option ${selected ? 'quiz-option--selected' : ''} ${correctNow ? 'ring-2 ring-emerald-500' : ''}`}&gt;
                          &lt;span className="quiz-letter mr-2"&gt;{String.fromCharCode(65 + idx)}.&lt;/span&gt; {opt}
                        &lt;/button&gt;
                      );
                    })}
                  &lt;/div&gt;
                &lt;/div&gt;
              ))}
              &lt;div className="flex items-center gap-3"&gt;
                &lt;Button onClick={onEvaluate} disabled={evaluated} className="bg-primary text-primary-foreground"&gt;{evaluated ? 'Evaluated' : 'Evaluate'}&lt;/Button&gt;
                {evaluated ? &lt;div className="text-sm"&gt;Score: &lt;span className="font-semibold"&gt;{score} / {result.quiz.length}&lt;/span&gt;&lt;/div&gt; : null}
              &lt;/div&gt;
            &lt;/TabsContent&gt;

            &lt;TabsContent value="cards" className="grid md:grid-cols-2 gap-3"&gt;
              {result.flashcards.map((c, i) =&gt; (
                &lt;Card key={i} className="border"&gt;
                  &lt;CardHeader&gt;&lt;CardTitle className="text-base"&gt;{c.front}&lt;/CardTitle&gt;&lt;/CardHeader&gt;
                  &lt;CardContent&gt;&lt;p className="text-sm"&gt;{c.back}&lt;/p&gt;&lt;/CardContent&gt;
                &lt;/Card&gt;
              ))}
            &lt;/TabsContent&gt;

            &lt;TabsContent value="plan" className="grid md:grid-cols-2 gap-3"&gt;
              {result.plan.map((d, i) =&gt; (
                &lt;Card key={i} className="border"&gt;
                  &lt;CardHeader&gt;&lt;CardTitle className="text-base"&gt;{d.title}&lt;/CardTitle&gt;&lt;/CardHeader&gt;
                  &lt;CardContent&gt;
                    &lt;ul className="list-disc pl-5 space-y-1"&gt;
                      {d.objectives.map((o, j) =&gt; &lt;li key={j} className="plan-objective"&gt;{o}&lt;/li&gt;)}
                    &lt;/ul&gt;
                  &lt;/CardContent&gt;
                &lt;/Card&gt;
              ))}
            &lt;/TabsContent&gt;

            &lt;TabsContent value="theory" className="space-y-2"&gt;
              {theory.map((t, i) =&gt; &lt;div key={i} className="border rounded-md p-3 text-sm"&gt;{t}&lt;/div&gt;)}
            &lt;/TabsContent&gt;
          &lt;/Tabs&gt;
        ) : (
          &lt;EmptyState label="Generate to see your quiz, flashcards, plan and theory questions here." /&gt;
        )}
      &lt;/main&gt;
    &lt;/div&gt;
  );
}

export default function App() {
  return (
    &lt;Routes&gt;
      &lt;Route path="/" element={&lt;Landing /&gt;} /&gt;
      &lt;Route path="/studio" element={&lt;StudioHub /&gt;} /&gt;
      &lt;Route path="/studio/kit/*" element={&lt;KitRoute /&gt;} /&gt;
      &lt;Route path="/studio/:title/:code" element={&lt;Studio /&gt;} /&gt;
      &lt;Route path="/studio/summariser" element={&lt;StudioSummariser /&gt;} /&gt;
      &lt;Route path="/merch" element={&lt;Merch /&gt;} /&gt;
    &lt;/Routes&gt;
  );
}