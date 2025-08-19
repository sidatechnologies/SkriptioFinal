import React, { useRef, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2, Upload, Download, FileText, Brain } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import ThemeToggle from "../components/ThemeToggle";
import FloatingMenu from "../components/FloatingMenu";
import StudioNav from "../components/StudioNav";
import { extractTextFromPDF, extractTextFromPDFQuick, splitSentences, looksLikeHeadingStrong, isAuthorish, normalizeText, ensureSentence } from "../utils/textProcessor";
import { getJsPDF } from "../utils/pdf";
import { embedSentences, centralityRank, prewarmML } from "../utils/ml";
import { Helmet } from "react-helmet-async";

export default function StudioSummariser() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lengthPref, setLengthPref] = useState("short");
  const [sourceTitle, setSourceTitle] = useState("");
  const [aiUsed, setAiUsed] = useState(false);
  const fileRef = useRef();

  useEffect(() => { try { prewarmML(); } catch {} }, []);

  const LOGO_URL = "/assets/aceel-logo.png";
  const logoDataRef = useRef(null);
  const fetchAsDataURL = async (url) => {
    try { const res = await fetch(url); const blob = await res.blob(); return await new Promise((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(blob); }); } catch { return null; }
  };
  const ensureAssetsLoaded = async () => { if (!logoDataRef.current) logoDataRef.current = await fetchAsDataURL(LOGO_URL); };
  const addHeader = (doc) => { const pw = doc.internal.pageSize.getWidth(); try { if (logoDataRef.current) doc.addImage(logoDataRef.current, 'PNG', (pw - 18) / 2, 6, 18, 18, undefined, 'FAST'); } catch {} try { doc.setFont('helvetica','normal'); } catch {} };
  const addFooter = (doc) => { const ph = doc.internal.pageSize.getHeight(); const pw = doc.internal.pageSize.getWidth(); doc.setFontSize(10); doc.text("skriptio.sidahq.com | aceel@sidahq.com", pw / 2, ph - 10, { align: "center" }); };

  const cleanSentencesForSummary = (rawText) => {
    const metaRx = /(acm|ieee|elsevier|isbn|copyright|\bdept\.?\b|department|institute|university|college|affiliation|acknowledg(e)?ments?|biography|biographical|author|editor|edited by|prof\.|professor|dr\.|ph\.?d\.|m\.?tech|b\.?tech)/i;
    const disclaimRx = /(professional advice|appropriate professional|no (liability|warranty)|for informational purposes|disclaimer)/i;
    const sentences = splitSentences(rawText);
    const filtered = sentences.filter(s => !looksLikeHeadingStrong(s) && !isAuthorish(s) && !metaRx.test(s) && !disclaimRx.test(s));
    return (filtered.length ? filtered : sentences).slice(0, 120);
  };

  const pickTitle = (rawText) => {
    const lines = normalizeText(rawText).split(/\n+/).map(l => l.trim());
    const candidate = lines.find(l => l && !looksLikeHeadingStrong(l) && !isAuthorish(l)) || lines.find(Boolean) || "Untitled";
    return candidate.slice(0, 120);
  };

  const summarise = async (text, n) => {
    const sentences = cleanSentencesForSummary(text);
    if (sentences.length === 0) { setAiUsed(false); return []; }
    let picks = [];
    let usedAI = false;
    const tryML = sentences.length <= 140;
    try {
      if (tryML) {
        const vecs = await embedSentences(sentences, 160);
        if (vecs && Array.isArray(vecs) && vecs.length === sentences.length) {
          const scores = centralityRank(vecs);
          const idxs = scores.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]).slice(0, n).map(x => x[1]).sort((a, b) => a - b);
          picks = idxs.map(i => sentences[i]);
          usedAI = true;
        }
      }
    } catch {}
    if (!picks.length) {
      const pool = sentences.slice(0, Math.min(14, sentences.length));
      const step = Math.max(1, Math.ceil(pool.length / n));
      for (let i = 0; i < pool.length && picks.length < n; i += step) picks.push(pool[i]);
    }
    setAiUsed(usedAI);
    return picks.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  };

  const handleSummarise = async () => {
    if (!file) return;
    setLoading(true);
    try {
      // Use quick extractor first for instant responsiveness; fall back to full
      const quick = extractTextFromPDFQuick(file, { maxPages: 24, totalBudgetMs: 4500 });
      const fullSlow = extractTextFromPDF(file, { maxPages: 24 });
      const fastText = await Promise.race([quick, new Promise(r => setTimeout(() => r(null), 4800))]);
      const text = fastText || await fullSlow;
      setSourceTitle(pickTitle(text));
      const n = lengthPref === 'short' ? 3 : (lengthPref === 'long' ? 8 : 5);
      const bullets = await summarise(text.slice(0, 120000), n);
      setSummary(bullets);
    } catch (e) {
      setSummary([]);
      setAiUsed(false);
    } finally { setLoading(false); }
  };

  const downloadSummaryPDF = async () => { /* unchanged */ };

  return (
    <div className="min-h-screen bg-background text-foreground">{/* unchanged UI */}</div>
  );
}