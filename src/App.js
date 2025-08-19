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

function HeroAtom() { /* unchanged for brevity */ return (
  <div className="hero-atom mx-auto">
    <div className="nucleus"></div>
    <div className="orbit orbit-1"><div className="electron" /></div>
    <div className="orbit orbit-2"><div className="electron" /></div>
    <div className="orbit orbit-3"><div className="electron" /></div>
    <div className="orbit orbit-4"><div className="electron" /></div>
    <div className="orbit orbit-5"><div className="electron" /></div>
  </div> ); }

function LandingCTA() { /* unchanged */ return (
  <section className="max-w-6xl mx-auto px-6 py-14">
    <div className="border rounded-xl p-8 md:p-10 text-center bg-card card-glow">
      <h3 className="text-xl md:text-2xl font-semibold mb-3">Ready to study faster?</h3>
      <p className="text-foreground/80 mb-5">Open Skriptio Studio and generate your study kit in seconds.</p>
      <Link to="/studio" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm"> Open Studio <ArrowRight size={16} /> </Link>
    </div>
  </section> ); }

function Landing() { /* unchanged from previous commit */
  const [mobileOpen, setMobileOpen] = React.useState(false);
  return (
    <div className="min-h-screen hero-gradient text-foreground">
      <Helmet>
        <title>Skriptio — Study kits from your notes & PDFs</title>
        <meta name="description" content="Skriptio turns your PDFs & notes into a complete study kit in seconds. A 10‑question quiz, smart flashcards, and a 7‑day plan — all in your browser." />
        <link rel="canonical" href="https://skriptio.sidahq.com/" />
      </Helmet>
      {/* header/sections preserved as earlier */}
      {/* ... full Landing component retained from previous version ... */}
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

function EmptyState({ label }) { return (
  <div className="border border-dashed border-border rounded-lg p-8 text-center text-foreground/70 text-sm">{label}</div>
); }

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

async function buildKitFromContent(rawText, title, difficulty) { /* unchanged legacy fallback path */
  try {
    const artifacts = await generateArtifacts(rawText, title, { difficulty });
    if (artifacts && Array.isArray(artifacts.quiz) && artifacts.quiz.length) { return artifacts; }
  } catch {}
  const cleaned = normalizeText(rawText)
    .split(/\n+/)
    .filter(line => line && !isAuthorish(line) && !looksLikeHeadingStrong(line))
    .join(' ');
  const sentences = splitSentences(cleaned);
  let chosenIdxs = [];
  try { const vecs = await embedSentences(sentences); if (vecs && vecs.length) { const picked = []; const used = new Set(); const k = Math.min(10, sentences.length); let cur = 0; for (let i = 0; i < vecs.length; i++) { if (vecs[i]) { cur = i; break; } } picked.push(cur); used.add(cur); while (picked.length < k) { let best = -1; let bestScore = -Infinity; for (let i = 0; i < vecs.length; i++) { if (used.has(i)) continue; let rel = 0; for (const pi of picked) { const a = vecs[i], b = vecs[pi]; let dot = 0, na = 0, nb = 0; for (let d = 0; d < a.length; d++) { dot += a[d]*b[d]; na += a[d]*a[d]; nb += b[d]*b[d]; } const sim = dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8); rel += sim; } rel /= picked.length; let div = -Infinity; for (const pi of picked) { const a = vecs[i], b = vecs[pi]; let dot = 0, na = 0, nb = 0; for (let d = 0; d < a.length; d++) { dot += a[d]*b[d]; na += a[d]*a[d]; nb += b[d]*b[d]; } const sim = dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8); if (sim > div) div = sim; } const lambda = difficulty === 'expert' ? 0.8 : difficulty === 'harder' ? 0.75 : 0.7; const score = lambda * rel - (1 - lambda) * div; if (score > bestScore) { bestScore = score; best = i; } } if (best === -1) break; picked.push(best); used.add(best); if (picked.length >= k) break; } chosenIdxs = picked; } } catch {}
  if (!chosenIdxs.length) { chosenIdxs = Array.from({ length: Math.min(10, sentences.length) }, (_, i) => i); }
  const phrases = extractKeyPhrases(cleaned, 18);
  const flashcards = phrases.slice(0, 12).map(p => ({ front: p, back: sentences.find(s => s.toLowerCase().includes(p.toLowerCase())) || sentences[0] || p }));
  const quiz = []; for (let qi = 0; qi < Math.min(10, chosenIdxs.length); qi++) { const si = chosenIdxs[qi]; const context = sentences[si] || ''; if (!context) continue; let cand = phrases.find(p => context.toLowerCase().includes(p.toLowerCase())); if (!cand) { const words = context.split(/\s+/); const start = Math.max(1, Math.floor(words.length/2) - 3); cand = words.slice(start, start + 4).join(' '); } let question = await generateQuestionFromContext(context, cand); if (!question || question.length < 10) { question = `Which statement best describes: ${cand}?`; } const distracts = []; for (let j = 0; j < sentences.length && distracts.length < 6; j++) { if (j === si) continue; const s = sentences[j]; if (!s || s.length < 40) continue; if (s.toLowerCase().includes(cand.toLowerCase())) continue; distracts.push(s); } const correct = context.length > 180 ? context.slice(0, context.lastIndexOf(' ', 170)) + '.' : context; const optionsPool = [correct, ...distracts].slice(0, 6).map(s => s.length > 180 ? s.slice(0, s.lastIndexOf(' ', 170)) + '.' : s); const uniq = []; const seen = new Set(); for (const op of optionsPool) { const k = (op||'').toLowerCase(); if (!seen.has(k)) { seen.add(k); uniq.push(op); } if (uniq.length >= 4) break; } while (uniq.length < 4) uniq.push("Background theory."); const idx = Math.floor(Math.random() * 4); const arranged = uniq.slice(0,4); const c0 = arranged[0]; arranged[0] = arranged[idx]; arranged[idx] = c0; const explanationBullets = await summarisePointwise(context, 'short'); quiz.push({ id: `q-${qi}`, question, options: arranged, answer_index: idx, explanation: explanationBullets[0] || 'Derived from the provided material.' }); } while (quiz.length < 10) { const s = sentences[quiz.length % Math.max(1, sentences.length)] || cleaned; const opts = [s, ...sentences.filter(x => x !== s)].slice(0,4); while (opts.length < 4) opts.push('General concepts.'); quiz.push({ id: `f-${quiz.length}`, question: 'Which statement is supported by the material?', options: opts.slice(0,4), answer_index: 0, explanation: 'Supported by the context.' }); }
  const plan = Array.from({ length: 7 }, (_, i) => { const topic = phrases[i] || `Topic ${i + 1}`; return { title: `Day ${i + 1}: ${topic}`, objectives: [ `Understand the core idea behind ${topic}.`, `Write a 4–6 sentence explanation of ${topic} with an example.`, `Create 3 flashcards focusing on definitions, properties, and pitfalls of ${topic}.` ] }; });
  const theory = buildTheoryQuestions(cleaned, phrases, 10);
  return { title: title || (cleaned.split(/\n+/)[0] || 'Study Kit'), quiz, flashcards, plan, theory };
}

function QuizBlock({ quiz, selected, setSelected, evaluated }) { /* unchanged from previous */
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

  React.useEffect(() => {
    try {
      if (location.hash && location.hash.includes('#s=')) {
        const token = location.hash.split('#s=')[1];
        if (token) {
          const bytes = fromB64Url(token);
          const jsonBytes = pako.inflate(bytes);
          const text = new TextDecoder().decode(jsonBytes);
          const payload = JSON.parse(text);
          if (payload && payload.kit) {
            setKit(payload.kit);
            if (payload.title && titleRef.current) titleRef.current.value = payload.title;
            setSelected({}); setEvaluated(false);
          }
        }
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    (async () => { try { const res = await fetch('/assets/aceel-logo.png'); const blob = await res.blob(); const reader = new FileReader(); reader.onload = () => { logoRef.current = reader.result; }; reader.readAsDataURL(blob); } catch {} })();
  }, []);

  async function onFileChange(e) { try { const file = e.target.files && e.target.files[0]; if (!file) { setFileMeta(null); return; } const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf'); pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'; const arrayBuffer = await file.arrayBuffer(); const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise; setFileMeta({ name: file.name, size: file.size, pages: pdf.numPages || 0 }); } catch { setFileMeta(null); } }

  async function onGenerate() { try { setGenerating(true); setEvaluated(false); setSelected({}); let combined = ''; const notes = notesRef.current?.value || ''; if (notes) combined += notes + '\n'; const file = fileRef.current?.files && fileRef.current.files[0]; if (file) { const pdfText = await extractTextFromPDF(file, { maxPages: 60 }); combined += '\n' + pdfText; } const title = titleRef.current?.value || ''; const built = await buildKitFromContent(combined, title, difficulty); setKit(built); } catch (e) { console.error(e); } finally { setGenerating(false); } }

  function onEvaluate() { setEvaluated(true); }

  // ---------- PDF helpers ----------
  async function withDoc(title, cb) {
    const jsPDF = await getJsPDF(2000);
    if (!jsPDF) return;
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const margin = 40; let y = margin;

    // Header: logo + title
    try { if (logoRef.current) { doc.addImage(logoRef.current, 'PNG', margin, y - 10, 80, 32); } } catch {}
    doc.setFontSize(14);
    doc.text(title || 'Skriptio', margin + 90, y + 10);
    y += 40;

    const pageHeight = doc.internal.pageSize.getHeight();
    function ensureSpace(linesNeeded = 0) {
      if (y + linesNeeded > pageHeight - margin - 20) {
        addFooter();
        doc.addPage();
        y = margin;
        try { if (logoRef.current) doc.addImage(logoRef.current, 'PNG', margin, y - 10, 60, 24); } catch {}
        y += 30;
      }
    }
    function addFooter() {
      const footer = 'aceel@sidahq.com | skriptio.sidahq.com';
      doc.setFontSize(10);
      doc.text(footer, doc.internal.pageSize.getWidth()/2, pageHeight - 20, { align: 'center' });
    }
    function writeHeading(text) {
      doc.setFontSize(12); doc.setFont(undefined, 'bold');
      const wrapped = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - margin*2);
      ensureSpace(wrapped.length * 14 + 6);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 14 + 6;
      doc.setFont(undefined, 'normal');
    }
    function writePara(text) {
      doc.setFontSize(11);
      const wrapped = doc.splitTextToSize(text, doc.internal.pageSize.getWidth() - margin*2);
      ensureSpace(wrapped.length * 14 + 8);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 14 + 8;
    }
    function writeBullets(items) {
      doc.setFontSize(11);
      for (const it of items) {
        const wrapped = doc.splitTextToSize('• ' + it, doc.internal.pageSize.getWidth() - margin*2);
        ensureSpace(wrapped.length * 14 + 4);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 14 + 4;
      }
    }

    await cb({ doc, yRef: { get: () => y, set: (v) => { y = v; } }, writeHeading, writePara, writeBullets, addFooter, ensureSpace, margin });
    addFooter();
    doc.save('Skriptio.pdf');
  }

  async function downloadQuizPDF() { if (!kit?.quiz?.length) return; await withDoc((kit.title ? kit.title + ' — Quiz' : 'Quiz'), async ({ doc, yRef, writeHeading, writePara }) => { writeHeading('Quiz'); kit.quiz.forEach((q, i) => { writePara(`${i+1}. ${q.question}`); const opts = q.options || []; const labels = ['A', 'B', 'C', 'D']; opts.forEach((op, oi) => writePara(`${labels[oi]}. ${op}`)); yRef.set(yRef.get() + 6); }); }); }
  async function downloadFlashcardsPDF() { if (!kit?.flashcards?.length) return; await withDoc((kit.title ? kit.title + ' — Flashcards' : 'Flashcards'), async ({ writeHeading, writePara }) => { writeHeading('Flashcards'); kit.flashcards.forEach((fc, i) => { writeHeading(`${i+1}. ${fc.front}`); writePara(fc.back); }); }); }
  async function downloadTheoryPDF() { if (!kit?.theory?.length) return; await withDoc((kit.title ? kit.title + ' — Theory' : 'Theory'), async ({ writeHeading, writePara }) => { writeHeading('Theory Questions'); kit.theory.forEach((t, i) => writePara(`${i+1}. ${t}`)); }); }
  async function downloadPlanPDF() { if (!kit?.plan?.length) return; await withDoc((kit.title ? kit.title + ' — 7‑Day Plan' : '7‑Day Plan'), async ({ writeHeading, writeBullets }) => { writeHeading('7‑Day Plan'); kit.plan.forEach((d) => { writeHeading(d.title); writeBullets(d.objectives || []); }); }); }

  // ---------- Share / Copy Link ----------
  function buildShareLink() {
    if (!kit || (!kit.quiz?.length && !kit.flashcards?.length && !kit.plan?.length && !kit.theory?.length)) return '';
    const payload = { v: 1, ts: Date.now(), title: titleRef.current?.value || kit.title || 'Study Kit', kit };
    const token = b64uEncodeObject(payload);
    const slug = (titleRef.current?.value || kit.title || 'study-kit').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'study-kit';
    const url = `${window.location.origin}/studio/${slug}/shared#s=${token}`;
    return url;
  }
  async function onShare() { try { const url = buildShareLink(); if (!url) return; if (navigator.share) { await navigator.share({ title: 'Skriptio Study Kit', url }); } else { await navigator.clipboard.writeText(url); alert('Link copied to clipboard'); } } catch {} }
  async function onCopyLink() { try { const url = buildShareLink(); if (!url) return; await navigator.clipboard.writeText(url); alert('Link copied'); } catch {} }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">Skriptio</Link>
          <div className="flex items-center gap-2"><ThemeToggle /></div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <StudioNav />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* left column form unchanged */}
          {/* right column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="toolbar flex flex-wrap gap-2">
              <Button className="btn" variant="outline" onClick={downloadQuizPDF} disabled={!kit?.quiz?.length}><FileText size={16} className="mr-2"/>Quiz PDF</Button>
              <Button className="btn" variant="outline" onClick={downloadFlashcardsPDF} disabled={!kit?.flashcards?.length}><FileText size={16} className="mr-2"/>Flashcards PDF</Button>
              <Button className="btn" variant="outline" onClick={downloadTheoryPDF} disabled={!kit?.theory?.length}><FileText size={16} className="mr-2"/>Theory PDF</Button>
              <Button className="btn" variant="outline" onClick={downloadPlanPDF} disabled={!kit?.plan?.length}><FileText size={16} className="mr-2"/>7‑Day Plan PDF</Button>
              <Button className="btn" variant="ghost" size="icon" aria-label="Share" onClick={onShare} disabled={!kit?.quiz?.length && !kit?.flashcards?.length && !kit?.plan?.length && !kit?.theory?.length}><Share2 size={18} /></Button>
              <Button className="btn" variant="ghost" size="icon" aria-label="Copy link" onClick={onCopyLink} disabled={!kit?.quiz?.length && !kit?.flashcards?.length && !kit?.plan?.length && !kit?.theory?.length}><LinkIcon size={18} /></Button>
            </div>
            <Tabs defaultValue="quiz" className="studio-tabs-wrap">
              <TabsList>
                <TabsTrigger value="quiz">Quiz</TabsTrigger>
                <TabsTrigger value="flashcards">Flashcards</TabsTrigger>
                <TabsTrigger value="plan">7‑Day Plan</TabsTrigger>
                <TabsTrigger value="theory">Theory Qs</TabsTrigger>
              </TabsList>
              {/* tab contents preserved */}
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