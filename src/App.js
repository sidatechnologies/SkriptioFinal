import { useEffect, useRef, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
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

  const heroBg = { background: 'radial-gradient(600px 200px at 20% 10%, rgba(255,255,255,0.06), transparent), radial-gradient(800px 300px at 80% 0%, rgba(255,255,255,0.05), transparent)' };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="font-semibold tracking-tight text-lg">Skriptio</div>
          </Link>
          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-2">
            <a href="#how-it-works" className="text-sm text-foreground/80 hover:text-foreground">How it works</a>
            <a href="#features" className="text-sm text-foreground/80 hover:text-foreground">Features</a>
            <a href="#use-cases" className="text-sm text-foreground/80 hover:text-foreground">Use cases</a>
            <a href="#faq" className="text-sm text-foreground/80 hover:text-foreground">FAQ</a>
            <span className="text-xs px-2 py-1 border rounded-full border-yellow-500 text-yellow-500">A product by Aceel AI</span>
            <ThemeToggle />
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/studio")}>
              Open Studio <ArrowRight size={16} className="ml-1"/>
            </Button>
          </nav>
          {/* Mobile nav toggle */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle />
            <button aria-label="Toggle menu" className="p-2 border rounded-md border-border" onClick={() => setNavOpen(o => !o)}>
              {navOpen ? <X size={18}/> : <Menu size={18}/>}
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        {navOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-3">
              <a href="#how-it-works" className="text-sm" onClick={() => setNavOpen(false)}>How it works</a>
              <a href="#features" className="text-sm" onClick={() => setNavOpen(false)}>Features</a>
              <a href="#use-cases" className="text-sm" onClick={() => setNavOpen(false)}>Use cases</a>
              <a href="#faq" className="text-sm" onClick={() => setNavOpen(false)}>FAQ</a>
              <div className="text-xs text-foreground/70">A product by Aceel AI</div>
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => { setNavOpen(false); navigate("/studio"); }}>
                Open Studio
              </Button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-50" style={heroBg}/>
          <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 text-xs bg-card border rounded-full px-3 py-1 w-fit border-yellow-500 text-yellow-500">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-500"/> A product by <span className="font-medium">Aceel AI</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-semibold leading-tight">Skriptio turns your PDFs & notes into a complete study kit in seconds.</h1>
              <p className="text-foreground/80 text-lg">Upload content or paste notes → get a 10‑question quiz, smart flashcards, and a 7‑day plan. Stay focused and learn faster - without complex setup.</p>
              <div className="flex items-center gap-3">
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/studio")}>Try Skriptio Free</Button>
                <a href="#how-it-works" className="text-foreground/80 hover:text-foreground text-sm flex items-center">How it works <ArrowRight size={16} className="ml-1"/></a>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-foreground/70 text-sm pt-2">
                <span className="flex items-center gap-2"><Check size={16}/> Fast & minimal</span>
                <span className="flex items-center gap-2"><Shield size={16}/> Private (runs in your browser)</span>
                <span className="flex items-center gap-2"><Clock size={16}/> Saves hours of prep</span>
              </div>
            </div>
            {/* Animated hero cards */}
            <div className="lg:block hidden">
              <div className="relative h-[320px]">
                <div className="absolute -top-6 -right-6 h-48 w-48 rounded-full bg-primary/10 blur-2xl" />
                <div className="absolute bottom-0 -left-10 h-40 w-40 rounded-full bg-foreground/10 blur-2xl" />
                <div className="absolute right-0 top-8 w-[320px] animate-fade-in-up">
                  <Card className="bg-card/90 border-border shadow-xl animate-float-slow">
                    <CardHeader>
                      <CardTitle className="text;base">Auto Quiz</CardTitle>
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
                <div className="absolute right-10 top-64 w-[300px] animate-fade-in-up" style={{animationDelay: '300ms'}}>
                  <Card className="bg-card/90 border-border shadow-xl animate-float-slow" style={{animationDelay: '600ms'}}>
                    <CardHeader>
                      <CardTitle className="text-base">7‑Day Plan</CardTitle>
                      <CardDescription>Daily objectives to keep you moving.</CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Social proof / value props */}
        <section id="benefits" className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Benefit icon={<Zap size={18}/>} title="Instant study kits" desc="Turn raw content into a quiz, flashcards, and a 7‑day plan in one click." />
          <Benefit icon={<Sparkles size={18}/>} title="Better retention" desc="Active recall + spaced repetition baked in to help you remember more." />
          <Benefit icon={<Shield size={18}/>} title="Own your data" desc="Process content locally in your browser with no server needed." />
        </section>

        {/* How it works */}
        <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-16">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold">How Skriptio works</h2>
            <p className="text-foreground/80 mt-2">Three simple steps to go from information overload to structured learning.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Step no="1" title="Add your material" desc="Paste your notes or upload a PDF. You can combine both in a single session." />
            <Step no="2" title="Generate your kit" desc="Skriptio builds a 10‑question quiz, a set of flashcards, and a focused 7‑day plan." />
            <Step no="3" title="Study efficiently" desc="Use quizzes for active recall, flip through flashcards, and follow the daily objectives." />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="max-w-6xl mx-auto px-6 py-16">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold">What you get</h2>
            <p className="text-foreground/80 mt-2">Everything you need to understand and retain material, without distractions.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Feature icon={<ListChecks size={18}/>} title="Auto Quiz" desc="10 focused questions generated from your content for quick recall."/>
            <Feature icon={<BookOpen size={18}/>} title="Flashcards" desc="Concept cards built from key sentences and keywords for spaced repetition."/>
            <Feature icon={<Calendar size={18}/>} title="7‑Day Plan" desc="Actionable objectives chunked to keep you moving each day."/>
            <Feature icon={<Layers size={18}/>} title="Combine sources" desc="Upload a PDF and paste notes together to create richer kits."/>
            <Feature icon={<GraduationCap size={18}/>} title="Learn anywhere" desc="Responsive design works on desktop and mobile so you can study on the go."/>
            <Feature icon={<Shield size={18}/>} title="Private by default" desc="Your content is processed entirely in your browser - no data sent to servers."/>
          </div>
        </section>

        {/* Use cases */}
        <section id="use-cases" className="max-w-6xl mx-auto px-6 py-16">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold">Who is Skriptio for?</h2>
            <p className="text-foreground/80 mt-2">Created for learners who want results fast.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UseCase title="Students" points={["Prepare for exams with auto‑generated quizzes", "Memorize key concepts using flashcards", "Stay on track with daily objectives"]} />
            <UseCase title="Professionals" points={["Digest PDFs and reports quickly", "Build recall on critical topics", "Structure learning across busy weeks"]} />
            <UseCase title="Lifelong learners" points={["Turn articles and notes into study kits", "Revisit concepts over time", "Make learning a repeatable habit"]} />
          </div>
        </section>

        {/* SEO text block */}
        <section id="about" className="max-w-4xl mx-auto px-6 py-12">
          <h2 className="text-2xl font-semibold">What is Skriptio?</h2>
          <p className="text-foreground/80 mt-3 leading-7">
            Skriptio by Aceel AI is a minimal study companion that converts your documents and notes into
            a structured plan for learning. Instead of passively re‑reading, Skriptio helps you practice
            active recall, organize key ideas as flashcards, and focus on achievable daily objectives.
            Upload a PDF or paste text, click generate, and start studying immediately.
          </p>
          <p className="text-foreground/80 mt-4 leading-7">
            The result is a self‑contained study kit: a 10‑question quiz to test understanding, a stack of
            flashcards to reinforce memory, and a 7‑day plan that breaks content into manageable steps.
            Whether you are preparing for exams, onboarding at work, or learning a new topic, Skriptio keeps
            you consistent and reduces overwhelm.
          </p>
        </section>

        {/* FAQ */}
        <section id="faq" className="max-w-6xl mx-auto px-6 py-16">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold">Frequently asked questions</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FAQ q="Do I need an internet connection?" a="No. Skriptio runs entirely in your browser after the initial page load." />
            <FAQ q="Can I use both PDF and text?" a="Yes. You can upload a PDF and also paste text notes in the same session." />
            <FAQ q="What kind of quiz is generated?" a="A 10‑question mix of concept checks and True/False derived from your content. We use a lightweight ML model locally to improve relevance and avoid headings." />
            <FAQ q="Do you save my content?" a="No. Everything runs in your browser session - nothing is sent to servers or saved." />
          </div>
        </section>

        {/* CTA */}
        <section className="max-w-6xl mx-auto px-6 pb-6">
          <Card className="bg-card border-border">
            <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-semibold">Ready to turn notes into progress?</h3>
                <p className="text-foreground/80 mt-2">Generate your first study kit with Skriptio in under a minute.</p>
              </div>
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/studio")}>Open Skriptio Studio <ChevronRight className="ml-1" size={16}/></Button>
            </CardContent>
          </Card>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-foreground/70 text-sm">
        © {new Date().getFullYear()} Skriptio · A product by <span className="font-medium">Aceel AI</span>
        <div className="mt-2 space-x-4">
          <a className="underline hover:no-underline" href="mailto:skriptio@sidahq.com">Email</a>
          <a className="underline hover:no-underline" href="https://instagram.com/skriptio" target="_blank" rel="noreferrer">Instagram</a>
          <a className="underline hover:no-underline" href="https://linkedin.com/company/Skriptio" target="_blank" rel="noreferrer">LinkedIn</a>
          <a className="underline hover:no-underline" href="https://x.com/Skriptio" target="_blank" rel="noreferrer">X</a>
          <a className="underline hover:no-underline" href="https://facebook.com/Skriptio" target="_blank" rel="noreferrer">Facebook</a>
        </div>
      </footer>
      <Toaster />
    </div>
  );
}

function Benefit({ icon, title, desc }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">{icon} {title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function Step({ no, title, desc }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base">Step {no}: {title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">{icon} {title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function UseCase({ title, points }) {
  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          <ul className="list-disc pl-5 space-y-1 text-foreground/80">
            {points.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </CardDescription>
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
        <div className="max-w-6xl mx_auto px-6 py-4 flex items-center justify-between">
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