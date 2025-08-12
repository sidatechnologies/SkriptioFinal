import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { Loader2, Upload, FileText, ListChecks, BookOpen, Calendar, ArrowRight, Check, Zap, Shield, Clock, GraduationCap, Sparkles, Layers, Users, ChevronRight, Menu, X } from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import { extractTextFromPDF, generateArtifacts } from "./utils/textProcessor";
import { prewarmML } from "./utils/ml";
import { prewarmPDF, getJsPDF } from "./utils/pdf";
import { Button } from "./components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./components/ui/card";
import { Textarea } from "./components/ui/textarea";
import { Input } from "./components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { toast } from "./components/ui/use-toast";

function Landing() {
  const navigate = useNavigate();
  // Prewarm ML model in background so first Studio use is fast
  useEffect(() => { prewarmML(); prewarmPDF(); }, []);

  const heroBg = { background: 'radial-gradient(600px 200px at 20% 10%, rgba(255,255,255,0.06), transparent), radial-gradient(800px 300px at 80% 0%, rgba(255,255,255,0.05), transparent)' };

  const Step = ({ no, title, desc }) => (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="text-xs text-foreground/70">Step {no}</div>
      <div className="font-medium mt-1">{title}</div>
      <div className="text-sm text-foreground/80 mt-1">{desc}</div>
    </div>
  );
  const Feature = ({ icon, title, desc }) => (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="flex items-center gap-2 text-sm font-medium">{icon}{title}</div>
      <div className="text-sm text-foreground/80 mt-1">{desc}</div>
    </div>
  );
  const FAQ = ({ q, a }) => (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="font-medium">{q}</div>
      <div className="text-sm text-foreground/80 mt-1">{a}</div>
    </div>
  );

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

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-xs text-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"/> A product by <span className="font-medium">Aceel AI</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">Skriptio turns your PDFs &amp; notes into a complete study kit in seconds.</h1>
            <p className="text-foreground/80 text-lg">Upload content or paste notes → get a 10‑question quiz, smart flashcards, and a 7‑day plan. Stay focused and learn faster - without complex setup.</p>
            <div className="flex items-center gap-3">
              <Button onClick={() => navigate('/studio')} className="bg-primary text-primary-foreground hover:bg-primary/90">
                Open Studio <ArrowRight className="ml-2" size={16}/>
              </Button>
              <Button variant="secondary" onClick={() => navigate('/studio')} className="bg-white/10 hover:bg-white/20">Try now</Button>
            </div>
          </div>
          <div className="rounded-xl p-8 border border-border bg-[radial-gradient(600px_200px_at_20%_10%,rgba(255,255,255,0.06),transparent),radial-gradient(800px_300px_at_80%_0%,rgba(255,255,255,0.05),transparent)]">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Step no="1" title="Add your material" desc="Paste your notes or upload a PDF. You can combine both in a single session." />
              <Step no="2" title="Generate your kit" desc="Skriptio builds a 10‑question quiz, a set of flashcards, and a focused 7‑day plan." />
              <Step no="3" title="Study efficiently" desc="Use quizzes for active recall, flip through flashcards, and follow the daily objectives." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <Feature icon={<ListChecks size={18}/>} title="Quiz" desc="10 tough MCQs with explanations and exact answers."/>
              <Feature icon={<BookOpen size={18}/>} title="Flashcards" desc="Concept cards built from key sentences and keywords for spaced repetition."/>
              <Feature icon={<Calendar size={18}/>} title="7‑Day Plan" desc="Actionable objectives chunked to keep you moving each day."/>
              <Feature icon={<Layers size={18}/>} title="Combine sources" desc="Upload a PDF and paste notes together to create richer kits."/>
              <Feature icon={<GraduationCap size={18}/>} title="Learn anywhere" desc="Responsive design works on desktop and mobile so you can study on the go."/>
              <Feature icon={<Sparkles size={18}/>} title="On-device" desc="Everything runs in your browser after page load. No servers, no data sharing."/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <FAQ q="Do I need an internet connection?" a="No. Skriptio runs entirely in your browser after the initial page load." />
              <FAQ q="Can I use both PDF and text?" a="Yes. You can upload a PDF and also paste text notes in the same session." />
              <FAQ q="What kind of quiz is generated?" a="A 10‑question mix of concept checks, property questions, and formula items derived from your content. Difficulty modes change the composition." />
              <FAQ q="Do you save my content?" a="No. Everything runs in your browser session - nothing is sent to servers or saved." />
            </div>
          </div>
        </div>
      </main>
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
          toast({ title: 'Loaded shared answers', description: 'You are viewing a shared quiz.' });
        }
      }
    } catch {}
  }, []);

  const b64uEncode = (obj) => {
    const s = JSON.stringify(obj);
    const b64 = btoa(unescape(encodeURIComponent(s)));
    return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  const decodeShare = (b64u) => {
    try {
      const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/');
      const pad = '='.repeat((4 - (b64.length % 4)) % 4);
      const s = decodeURIComponent(escape(atob(b64 + pad)));
      return JSON.parse(s);
    } catch { return null; }
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
  };

  // PDF Helpers
  const ensureJsPDF = async () => {
    try {
      // Try prewarmed path first (non-blocking with deadline)
      const jsPDF = await getJsPDF(1200);
      if (jsPDF) return jsPDF;
      // Fallback to dynamic import if not ready yet
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
        // Correct answer line
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

  const shareAnswers = async () => {
    if (!result?.quiz?.length) return;
    const payload = {
      title: result.title,
      quiz: result.quiz.map(q => ({ question: q.question, options: q.options, answer_index: q.answer_index, explanation: q.explanation })),
      answers,
      score
    };
    const token = b64uEncode(payload);
    const url = `${window.location.origin}${window.location.pathname}#share=${token}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: result.title || 'Skriptio Quiz', text: 'Review my quiz answers', url });
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Share link copied', description: 'Paste it in chat or email.' });
      } else {
        // fallback: prompt
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
              Share Answers
            </Button>
          </div>

          <Tabs defaultValue="quiz" className="w_full">
            <TabsList className="bg.white/10">
              {/* ensure theme awareness */}
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
                              {q.options.map((opt, oi) => (
                                <button key={oi} onClick={() => selectOption(idx, oi)} className={`text-left rounded-md border px-3 py-2 quiz-option ${answers[idx] === oi ? 'quiz-option--selected' : ''}`}>
                                  <span className="mr-2 text-foreground/70">{String.fromCharCode(65 + oi)})</span> {opt}
                                </button>
                              ))}
                            </div>
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