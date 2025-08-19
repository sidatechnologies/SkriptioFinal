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
    const tryML = sentences.length &lt;= 140;
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
      for (let i = 0; i &lt; pool.length && picks.length &lt; n; i += step) picks.push(pool[i]);
    }
    setAiUsed(usedAI);
    return picks.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  };

  const handleSummarise = async () => {
    if (!file) return;
    setLoading(true);
    try {
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

  const downloadSummaryPDF = async () => {
    try {
      const jsPDF = await getJsPDF(1200);
      if (!jsPDF) return;
      await ensureAssetsLoaded();
      const doc = new jsPDF({ unit: 'pt', format: 'a4' });
      addHeader(doc);
      doc.setFontSize(14);
      let y = 48;
      doc.text(sourceTitle || 'Summary', 40, y); y += 18;
      doc.setFontSize(12);
      (summary || []).forEach((s, i) => {
        const lines = doc.splitTextToSize(`${i+1}. ${s}`, 515);
        lines.forEach((ln) => { doc.text(ln, 40, y); y += 16; if (y &gt; 780) { addFooter(doc); doc.addPage(); y = 48; addHeader(doc); } });
      });
      addFooter(doc);
      doc.save((sourceTitle || 'summary') + '.pdf');
    } catch {}
  };

  return (
    &lt;div className="min-h-screen bg-background text-foreground"&gt;
      &lt;Helmet&gt;
        &lt;title&gt;Skriptio — PDF Summariser&lt;/title&gt;
      &lt;/Helmet&gt;
      &lt;FloatingMenu /&gt;
      &lt;header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border"&gt;
        &lt;div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between"&gt;
          &lt;Link to="/" className="font-semibold tracking-tight"&gt;Skriptio&lt;/Link&gt;
          &lt;ThemeToggle /&gt;
        &lt;/div&gt;
      &lt;/header&gt;

      &lt;main className="max-w-6xl mx-auto px-6 py-8 space-y-6"&gt;
        &lt;StudioNav /&gt;

        &lt;Card className="bg-card border border-black/70 dark:border-white/60"&gt;
          &lt;CardHeader&gt;
            &lt;CardTitle&gt;AI PDF Summariser&lt;/CardTitle&gt;
            &lt;CardDescription&gt;Upload a PDF and get Short / Medium / Long bullet summaries. Runs fully in your browser.&lt;/CardDescription&gt;
          &lt;/CardHeader&gt;
          &lt;CardContent className="space-y-4"&gt;
            &lt;div className="grid md:grid-cols-3 gap-3"&gt;
              &lt;div className="select-wrap"&gt;
                &lt;select className="select-control rounded-md px-3 pr-7 py-2" value={lengthPref} onChange={e =&gt; setLengthPref(e.target.value)}&gt;
                  &lt;option value="short"&gt;Short&lt;/option&gt;
                  &lt;option value="medium"&gt;Medium&lt;/option&gt;
                  &lt;option value="long"&gt;Long&lt;/option&gt;
                &lt;/select&gt;
                &lt;span className="select-arrow"&gt;▼&lt;/span&gt;
              &lt;/div&gt;
              &lt;input ref={fileRef} type="file" accept="application/pdf" className="file-input-reset" onChange={e =&gt; setFile(e.target.files?.[0] || null)} /&gt;
              &lt;Button onClick={() =&gt; fileRef.current?.click()} variant="outline" className="button-upload"&gt;
                &lt;Upload size={16} className="mr-2" /&gt; Upload PDF
              &lt;/Button&gt;
            &lt;/div&gt;
            &lt;div className="flex items-center gap-3"&gt;
              &lt;Button onClick={handleSummarise} disabled={!file || loading} className="bg-primary text-primary-foreground hover:bg-primary/90"&gt;
                {loading ? (&lt;&gt;&lt;Loader2 className="mr-2 h-4 w-4 animate-spin" /&gt; Working…&lt;/&gt;) : 'Summarise'}
              &lt;/Button&gt;
              {summary.length ? &lt;Button onClick={downloadSummaryPDF} variant="outline"&gt;&lt;Download size={16} className="mr-2" /&gt; Download PDF&lt;/Button&gt; : null}
            &lt;/div&gt;
          &lt;/CardContent&gt;
        &lt;/Card&gt;

        {summary.length ? (
          &lt;Card className="bg-card border border-black/70 dark:border-white/60"&gt;
            &lt;CardHeader&gt;
              &lt;CardTitle&gt;Summary {aiUsed ? '(AI-ranked)' : ''}&lt;/CardTitle&gt;
            &lt;/CardHeader&gt;
            &lt;CardContent&gt;
              &lt;ol className="list-decimal pl-5 space-y-2"&gt;
                {summary.map((s, i) =&gt; &lt;li key={i} className="text-sm"&gt;{s}&lt;/li&gt;)}
              &lt;/ol&gt;
            &lt;/CardContent&gt;
          &lt;/Card&gt;
        ) : &lt;div className="text-sm text-foreground/70"&gt;Upload a PDF and click Summarise to see results here.&lt;/div&gt;}
      &lt;/main&gt;
    &lt;/div&gt;
  );
}