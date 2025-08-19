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
  const navigate = useNavigate();
  useEffect(() => {
    // Quick fix: redirect root to Studio Hub to avoid blank page
    navigate('/studio', { replace: true });
  }, [navigate]);
  // Fallback UI if redirect is blocked
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl mb-3">Skriptio</h1>
        <a href="/studio" className="inline-flex items-center gap-2 px-4 py-2 border rounded">
          Open Studio
          <span aria-hidden>→</span>
        </a>
      </div>
    </div>
  );
}

function EmptyState({ label }) { return (<div className="border border-dashed border-border rounded-lg p-8 text-center text-foreground/70 text-sm">{label}</div>); }

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
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 768 : true));
  const [theory, setTheory] = useState([]);

  useEffect(() => { prewarmPDF(); prewarmML(); }, []);
  useEffect(() => { const onResize = () => setIsDesktop(window.innerWidth >= 768); window.addEventListener('resize', onResize); return () => window.removeEventListener('resize', onResize); }, []);

  const ensureJsPDF = async () => { const maybe = await getJsPDF(1200); if (maybe) return maybe; const mod = await import('jspdf'); return mod.jsPDF; };
  const addHeader = (doc) => { try { doc.setFont('helvetica', 'normal'); } catch {} };
  const addFooter = (doc) => { const ph = doc.internal.pageSize.getHeight(); const pw = doc.internal.pageSize.getWidth(); doc.setFontSize(10); doc.text("skriptio.sidahq.com | aceel@sidahq.com", pw / 2, ph - 10, { align: "center" }); };
  const lineWrap = (doc, text, x, y, maxWidth) => { const lines = doc.splitTextToSize(text, maxWidth); lines.forEach((ln) => { const ph = doc.internal.pageSize.getHeight(); if (y > ph - 20) { addFooter(doc); doc.addPage(); addHeader(doc); y = 32; } doc.text(ln, x, y); y += 7; }); return y; };

  const handleGenerate = async () => {
    if (loading) return;
    const hasText = (text || '').trim().length > 0;
    if (!hasText && !file) { toast({ title: 'Add content', description: 'Paste notes or upload a PDF first.' }); return; }
    setLoading(true); setLoadingStep('Reading input');
    try {
      let full = hasText ? text : '';
      if (file) {
        // Race quick extractor against full with a short deadline, so UI remains responsive
        const quick = extractTextFromPDFQuick(file, { maxPages: 24, totalBudgetMs: 4500 });
        const fullSlow = extractTextFromPDF(file, { maxPages: 24 });
        const pdfText = (await Promise.race([quick, new Promise(r => setTimeout(() => r(null), 4800))])) || (await fullSlow);
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

  // ... (rest of Studio component unchanged)
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/studio" element={<StudioHub />} />
      <Route path="/studio/kit/*" element={<KitRoute />} />
      <Route path="/studio/:title/:code" element={<Studio />} />
      <Route path="/studio/summariser" element={<StudioSummariser />} />
      <Route path="/merch" element={<Merch />} />
    </Routes>
  );
}