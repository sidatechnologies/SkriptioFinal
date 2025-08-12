import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { toast, Toaster } from "sonner";
import { Loader2, Upload, FileText, ListChecks, BookOpen, Calendar, ArrowRight, Check, Zap, Shield, Clock, GraduationCap, Sparkles, Layers, Users, ChevronRight, Menu, X } from "lucide-react";
import ThemeToggle from "./components/ThemeToggle";
import { extractTextFromPDF, generateArtifacts } from "./utils/textProcessor";
import { prewarmML } from "./utils/ml";
import { prewarmPDF, getJsPDF } from "./utils/pdf";

function Landing() {
  const navigate = useNavigate();
  const [navOpen, setNavOpen] = useState(false);
  // Prewarm ML model in background so first Studio use is fast
  useEffect(() => { prewarmML(); prewarmPDF(); }, []);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="font-semibold tracking-tight">Skriptio</div>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#how-it-works" className="text-sm">How it works</a>
            <a href="#features" className="text-sm">Features</a>
            <a href="#faq" className="text-sm">FAQ</a>
            <span className="text-xs px-2 py-1 border rounded-full border-yellow-500 text-yellow-500">A product by Aceel AI</span>
            <ThemeToggle />
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/studio")}>Open Studio <ArrowRight size={16} className="ml-1"/></Button>
          </nav>
          <button className="md:hidden" onClick={() => setNavOpen(!navOpen)}>
            {navOpen ? <X/> : <Menu/>}
          </button>
        </div>
        {navOpen && (
          <div className="md:hidden px-6 pb-4 space-y-2">
            <a href="#how-it-works" className="text-sm" onClick={() => setNavOpen(false)}>How it works</a>
            <a href="#features" className="text-sm" onClick={() => setNavOpen(false)}>Features</a>
            <a href="#faq" className="text-sm" onClick={() => setNavOpen(false)}>FAQ</a>
            <div className="text-xs text-foreground/70">A product by Aceel AI</div>
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { setNavOpen(false); navigate("/studio"); }}>
              Open Studio
            </Button>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-sm px-3 py-1 rounded-full border border-yellow-500 text-yellow-500 bg-yellow-500/10">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"/> A product by <span className="font-medium">Aceel AI</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-semibold leading-tight">Skriptio turns your PDFs & notes into a complete study kit in seconds.</h1>
            <p className="text-foreground/80 text-lg">Upload content or paste notes → get a 10‑question quiz, smart flashcards, and a 7‑day plan. Stay focused and learn faster - without complex setup.</p>
            <div className="flex items-center gap-3">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/studio")}>Try Skriptio Free</Button>
              <a href="#how-it-works" className="text-foreground/80 hover:text-foreground text-sm flex items-center">How it works <ArrowRight size={16} className="ml-1"/></a>
            </div>
          </div>
          <div className="relative">
            <div className="absolute right-0 top-8 w-[320px] animate-fade-in-up">
              <Card className="bg-card/90 border-border shadow-xl animate-float-slow">
                <CardHeader>
                  <CardTitle className="text-base">Auto Quiz</CardTitle>
                  <CardDescription>10 questions generated from your content for quick recall.</CardDescription>
                </CardHeader>
              </Card>
            </div>
            <div className="absolute right-24 top-40 w-[280px] animate-fade-in-up" style={{animationDelay: '150ms'}}>
              <Card className="bg-card/90 border-border shadow-xl animate-float-slow" style={{animationDelay: '300ms'}}>
                <CardHeader>
                  <CardTitle className="text-base">Flashcards</CardTitle>
                  <CardDescription>Key concepts organized for spaced repetition.</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </div>

        <section id="features" className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Feature icon={<Zap size={20}/>} title="Fast in-browser" desc="Everything runs on your device. No uploads or servers."/>
          <Feature icon={<Shield size={20}/>} title="Private by design" desc="Your content never leaves the browser."/>
          <Feature icon={<Clock size={20}/>} title="Ready in seconds" desc="Generate a study kit without setup."/>
          <Feature icon={<Layers size={20}/>} title="Rich quiz" desc="10 MCQs with strict option diversity and no duplicates."/>
          <Feature icon={<Users size={20}/>} title="Helpful flashcards" desc="Concise definitions and contexts."/>
          <Feature icon={<GraduationCap size={20}/>} title="7-day plan" desc="Structured review across topics."/>
        </section>


        <div className="mt-14">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Sparkles size={18}/> Get Started</CardTitle>
              <CardDescription>Generate your first study kit with Skriptio in under a minute.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/studio")}>Open Skriptio Studio <ChevronRight className="ml-1" size={16}/></Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-6xl mx-auto px-6 py-8 text-sm text-foreground/70 flex items-center justify-between">
          <div>© {new Date().getFullYear()} Skriptio • by Aceel AI</div>
          <div className="flex items-center gap-4">
            <a href="#features">Features</a>
            <a href="#faq">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">{icon} {title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function FAQ({ q, a }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base">{q}</CardTitle>
        <CardDescription>{a}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function Studio() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState("");
  const [result, setResult] = useState(null);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const fileInputRef = useRef();
  const [pdfBusy, setPdfBusy] = useState({ quiz: false, cards: false, plan: false });
  const [difficulty, setDifficulty] = useState('balanced');

  // Prewarm ML model here as well, in case user lands directly on Studio
  useEffect(() => { prewarmML(); prewarmPDF(); }, []);

  const pause = () => new Promise(res => setTimeout(res, 0));

  const handleGenerate = async () => {
    if (!text && !file) {
      toast("Paste text or upload a PDF to generate your study kit.");
      return;
    }
    setLoading(true);
    setLoadingStep('Preparing...');
    setScore(null);
    setAnswers({});
    await pause();

    try {
      let extractedText = "";

      if (file) {
        if (!file.name.toLowerCase().endsWith(".pdf")) {
          throw new Error("Only PDF files are supported");
        }
        setLoadingStep('Reading PDF...');
        await pause();
        extractedText = await extractTextFromPDF(file);
      }

      if (text) {
        extractedText = extractedText ? extractedText + "\n" + text : text;
      }

      setLoadingStep('Analyzing content...');
      await pause();

      setLoadingStep('Generating study kit...');
      await pause();
      const studyData = await generateArtifacts(extractedText, title, { difficulty });
      setResult(studyData);

      toast("Generated! Quiz, flashcards and 7-day plan are ready.");
    } catch (error) {
      const msg = error.message || "Failed to generate study kit";
      toast(String(msg));
      console.error("Generation error:", error);
    } finally {
      setLoading(false);
      setLoadingStep("");
    }
  };

  const evaluate = () => {
    if (!result?.quiz) return;
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
          y = lineWrap(doc, `• ${q.options[oi]}`, 20, y, 170);
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
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Difficulty</div>
                <div className="inline-flex rounded-md overflow-hidden border border-border">
                  <button type="button" className={`px-3 py-1 text-sm ${difficulty === 'balanced' ? 'bg-white text-black' : 'bg-transparent text-foreground/80'}`} onClick={() => setDifficulty('balanced')}>Balanced</button>
                  <button type="button" className={`px-3 py-1 text-sm border-l border-border ${difficulty === 'harder' ? 'bg-white text-black' : 'bg-transparent text-foreground/80'}`} onClick={() => setDifficulty('harder')}>Harder</button>
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
          </div>

          <Tabs defaultValue="quiz" className="w-full">
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
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {q.options.map((opt, oi) => {
                                const selected = answers[idx] === oi;
                                const isCorrect = score && oi === q.answer_index;
                                const wrongSelected = score && selected && oi !== q.answer_index;
                                return (
                                  <button
                                    key={oi}
                                    className={`quiz-option text-left px-3 py-2 rounded-md border transition-colors ${selected ? 'quiz-option--selected' : ''} ${isCorrect ? 'ring-1 ring-green-500' : ''} ${wrongSelected ? 'ring-1 ring-red-500' : ''}`}
                                    onClick={() => {
                                      if (score) return; // lock after evaluation
                                      setAnswers(prev => ({ ...prev, [idx]: oi }));
                                    }}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button onClick={evaluate} disabled={!result?.quiz?.length || score !== null} className="bg-primary text-primary-foreground hover:bg-primary/90">Evaluate</Button>
                      {score && <div className="text-sm text-foreground/80">Great work! Review explanations in flashcards.</div>}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="flashcards">
                {!result ? (
                  <EmptyState label="Your flashcards will appear here once generated."/>
                ) : (
                  <Flashcards cards={result.flashcards || []} />
                )}
              </TabsContent>

              <TabsContent value="plan">
                {!result ? (
                  <EmptyState label="Your 7-day plan will appear here once generated."/>
                ) : (
                  <Plan days={result.plan || []} />
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>
      <Toaster />
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="border border-dashed border-border rounded-xl p-8 text-center text-foreground/70 bg-card">
      {label}
    </div>
  );
}

function Flashcards({ cards }) {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const card = cards[idx];
  if (!card) return <EmptyState label="No flashcards"/>;
  return (
    <div className="space-y-4">
      <div className="text-sm text-foreground/80">Card {idx + 1} of {cards.length}</div>
      <div className="cursor-pointer select-none" onClick={() => setFlipped(!flipped)}>
        <Card className="bg-card border-border hover:bg-white/10 transition-colors">
          <CardHeader>
            <CardTitle className="text-base">{flipped ? "Answer" : "Question"}</CardTitle>
            <CardDescription>{flipped ? card.back : card.front}</CardDescription>
          </CardHeader>
        </Card>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" className="bg-white/10 hover:bg-white/20" onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlipped(false); }}>Prev</Button>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { setIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}>Next</Button>
      </div>
    </div>
  );
}

function Plan({ days }) {
  if (!days?.length) return <EmptyState label="No plan"/>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {days.map(d => (
        <Card key={d.day} className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">{d.title}</CardTitle>
            <CardDescription>Objectives</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-foreground/90">
              {d.objectives.map((o, i) => <li key={i} className="plan-objective">{o}</li>)}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/studio" element={<Studio />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;