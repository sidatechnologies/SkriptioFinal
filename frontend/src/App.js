import { useEffect, useRef, useState } from "react";
import "./App.css";
import axios from "axios";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Textarea } from "./components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Toaster } from "./components/ui/sonner";
import { toast } from "sonner";
import { Loader2, Upload, FileText, ListChecks, BookOpen, Calendar, ArrowRight, Check } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function Landing() {
  const navigate = useNavigate();
  useEffect(() => { axios.get(`${API}/`).catch(() => {}); }, []);
  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/40 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-white/90" />
            <div className="font-semibold tracking-tight text-lg">StudyCrafter</div>
          </Link>
          <nav className="flex items-center gap-3">
            <Link to="/studio" className="text-sm text-neutral-300 hover:text-white">Studio</Link>
            <a href="#features" className="text-sm text-neutral-300 hover:text-white">Features</a>
            <Button className="bg-neutral-100 text-black hover:bg-white" onClick={() => navigate("/studio")}>Open Studio <ArrowRight size={16} className="ml-1"/></Button>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-50" style={{background: "radial-gradient(600px 200px at 20% 10%, rgba(255,255,255,0.06), transparent), radial-gradient(800px 300px at 80% 0%, rgba(255,255,255,0.05), transparent)"}}/>
          <div className="max-w-6xl mx-auto px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-5xl font-semibold leading-tight">Turn PDFs & notes into a study kit in seconds.</h1>
              <p className="text-neutral-300 text-lg">Upload content → get a 10‑question quiz, smart flashcards, and a 7‑day plan. No external AI required.</p>
              <div className="flex items-center gap-3">
                <Button className="bg-neutral-100 text-black hover:bg-white" onClick={() => navigate("/studio")}>Try the Studio</Button>
                <Link to="#features" className="text-neutral-300 hover:text-white text-sm flex items-center">See features <ArrowRight size={16} className="ml-1"/></Link>
              </div>
              <div className="flex items-center gap-4 text-neutral-400 text-sm pt-2">
                <span className="flex items-center gap-2"><Check size={16}/> Minimal & fast</span>
                <span className="flex items-center gap-2"><Check size={16}/> Private (offline MVP)</span>
                <span className="flex items-center gap-2"><Check size={16}/> No setup</span>
              </div>
            </div>
            <div className="lg:block hidden">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6">
                <div className="text-sm text-neutral-300 mb-3">Preview</div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="h-28 rounded-xl bg-white/10"/>
                  <div className="h-28 rounded-xl bg-white/10"/>
                  <div className="h-28 rounded-xl bg-white/10"/>
                  <div className="col-span-3 h-14 rounded-xl bg-white/10"/>
                  <div className="col-span-2 h-14 rounded-xl bg-white/10"/>
                  <div className="h-14 rounded-xl bg-white/10"/>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Feature icon={<ListChecks size={18}/>} title="Auto Quiz" desc="10 focused questions generated from your content."/>
          <Feature icon={<BookOpen size={18}/>} title="Flashcards" desc="Concept cards built from key sentences & keywords."/>
          <Feature icon={<Calendar size={18}/>} title="7‑Day Plan" desc="Objectives chunked to keep you moving each day."/>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 text-center text-neutral-400 text-sm">© {new Date().getFullYear()} StudyCrafter</footer>
      <Toaster />
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">{icon} {title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function Studio() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => {
    axios.get(`${API}/`).catch(() => {});
  }, []);

  const handleGenerate = async () => {
    if (!text && !file) {
      toast("Paste text or upload a PDF to generate your study kit.");
      return;
    }
    setLoading(true);
    setScore(null);
    try {
      const form = new FormData();
      if (file) form.append("file", file);
      if (text) form.append("text", text);
      if (title) form.append("title", title);
      const { data } = await axios.post(`${API}/generate`, form, { headers: { "Content-Type": "multipart/form-data" } });
      setResult(data);
      toast("Generated! Quiz, flashcards and 7-day plan are ready.");
    } catch (e) {
      const msg = e?.response?.data?.detail || "Failed to generate";
      toast(String(msg));
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-[#0b0b0c] text-white">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-black/40 border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-full bg-white/90" />
            <div className="font-semibold tracking-tight">StudyCrafter</div>
          </Link>
          <div className="text-sm text-neutral-300">Offline MVP</div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText size={18}/> Add Content</CardTitle>
              <CardDescription>Paste raw text or upload a PDF. Fully local generation on server.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Title (optional)" value={title} onChange={e => setTitle(e.target.value)} className="bg-white/10 border-white/10 placeholder:text-neutral-400" />
              <div>
                <Textarea placeholder="Paste text here..." rows={8} value={text} onChange={e => setText(e.target.value)} className="bg-white/10 border-white/10 placeholder:text-neutral-400" />
                <div className="mt-2 text-xs text-neutral-400">Tip: You can combine PDF + pasted notes.</div>
              </div>
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
                <Button variant="secondary" className="bg-white/10 hover:bg-white/20" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={16} className="mr-2"/> Upload PDF
                </Button>
                {file && <div className="text-xs text-neutral-300 truncate max-w-[180px]">{file.name}</div>}
              </div>
              <Button disabled={loading} onClick={handleGenerate} className="w-full bg-neutral-100 text-black hover:bg-white">
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Generating</> : "Generate Study Kit"}
              </Button>
            </CardContent>
          </Card>

          {result?.id && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-sm">Saved Session</CardTitle>
                <CardDescription className="truncate">ID: {result.id}</CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Tabs defaultValue="quiz" className="w-full">
            <TabsList className="bg-white/10">
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
                      <div className="text-sm text-neutral-300">{result.title}</div>
                      <div className="text-sm text-neutral-400">{score ? `Score: ${score}` : `${result.quiz?.length || 0} questions`}</div>
                    </div>
                    <div className="space-y-4">
                      {result.quiz?.map((q, idx) => (
                        <Card key={q.id} className="bg-white/5 border-white/10">
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
                                    className={`text-left px-3 py-2 rounded-md border transition-colors ${selected ? 'bg-white text-black border-white' : 'bg-white/10 border-white/10 hover:bg-white/20'} ${isCorrect ? 'ring-1 ring-green-400' : ''} ${wrongSelected ? 'ring-1 ring-red-400' : ''}`}
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
                      <Button onClick={evaluate} disabled={!result?.quiz?.length || score !== null} className="bg-neutral-100 text-black hover:bg-white">Evaluate</Button>
                      {score && <div className="text-sm text-neutral-300">Great work! Review explanations in flashcards.</div>}
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
    <div className="border border-dashed border-white/15 rounded-xl p-8 text-center text-neutral-400 bg-white/5">
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
      <div className="text-sm text-neutral-300">Card {idx + 1} of {cards.length}</div>
      <div onClick={() => setFlipped(!flipped)} className="cursor-pointer select-none">
        <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
          <CardHeader>
            <CardTitle className="text-base">{flipped ? "Answer" : "Question"}</CardTitle>
            <CardDescription>{flipped ? card.back : card.front}</CardDescription>
          </CardHeader>
        </Card>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="secondary" className="bg-white/10 hover:bg-white/20" onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlipped(false); }}>Prev</Button>
        <Button className="bg-neutral-100 text-black hover:bg-white" onClick={() => { setIdx(i => Math.min(cards.length - 1, i + 1)); setFlipped(false); }}>Next</Button>
      </div>
    </div>
  );
}

function Plan({ days }) {
  if (!days?.length) return <EmptyState label="No plan"/>;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {days.map(d => (
        <Card key={d.day} className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-base">{d.title}</CardTitle>
            <CardDescription>Objectives</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-5 space-y-1 text-neutral-200">
              {d.objectives.map((o, i) => <li key={i}>{o}</li>)}
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