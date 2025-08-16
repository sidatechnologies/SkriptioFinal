import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Upload, Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import ThemeToggle from "../components/ThemeToggle";
import FloatingMenu from "../components/FloatingMenu";
import StudioNav from "../components/StudioNav";
import { extractTextFromPDF, splitSentences, looksLikeHeadingStrong, isAuthorish, normalizeText } from "../utils/textProcessor";
import { getJsPDF } from "../utils/pdf";
import { embedSentences, centralityRank } from "../utils/ml";

export default function StudioSummariser() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lengthPref, setLengthPref] = useState("short");
  const [sourceTitle, setSourceTitle] = useState("");
  const fileRef = useRef();

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
    return (filtered.length ? filtered : sentences).slice(0, 220);
  };

  const pickTitle = (rawText) => {
    const lines = normalizeText(rawText).split(/\n+/).map(l => l.trim());
    const candidate = lines.find(l => l && !looksLikeHeadingStrong(l) && !isAuthorish(l)) || lines.find(Boolean) || "Untitled";
    return candidate.slice(0, 120);
  };

  const summarise = async (text, n) => {
    const sentences = cleanSentencesForSummary(text);
    if (sentences.length === 0) return [];
    let picks = [];
    try {
      const vecs = await embedSentences(sentences, 160);
      if (vecs && Array.isArray(vecs) && vecs.length === sentences.length) {
        const scores = centralityRank(vecs);
        const idxs = scores.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]).slice(0, n).map(x => x[1]).sort((a, b) => a - b);
        picks = idxs.map(i => sentences[i]);
      }
    } catch {}
    if (!picks.length) {
      const pool = sentences.slice(0, Math.min(14, sentences.length));
      const step = Math.max(1, Math.ceil(pool.length / n));
      for (let i = 0; i < pool.length && picks.length < n; i += step) picks.push(pool[i]);
    }
    // Final sanitize: remove author-ish fragments if any slipped, trim
    return picks.map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
  };

  const handleSummarise = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const text = await extractTextFromPDF(file);
      setSourceTitle(pickTitle(text));
      const n = lengthPref === 'short' ? 3 : (lengthPref === 'long' ? 8 : 5);
      const bullets = await summarise(text.slice(0, 120000), n);
      setSummary(bullets);
    } catch (e) {
      setSummary([]);
    } finally { setLoading(false); }
  };

  const downloadSummaryPDF = async () => {
    if (!summary.length) return;
    setLoading(true);
    try {
      const jsPDF = await getJsPDF(1200);
      const doc = new jsPDF();
      await ensureAssetsLoaded();
      addHeader(doc);
      let y = 32;
      doc.setFontSize(13);
      doc.text(`Summary: ${sourceTitle || 'Document'}`, 15, y);
      y += 8;
      doc.setFontSize(12);
      summary.forEach((s) => {
        const lines = doc.splitTextToSize(`• ${s}`, 180);
        lines.forEach((ln) => {
          const ph = doc.internal.pageSize.getHeight();
          if (y > ph - 20) { addFooter(doc); doc.addPage(); addHeader(doc); y = 32; }
          doc.text(ln, 15, y); y += 7;
        });
        y += 2;
      });
      addFooter(doc);
      doc.save("skriptio-summary.pdf");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FloatingMenu />
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

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <StudioNav />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Upload PDF</CardTitle>
                <CardDescription>Extract a concise, readable summary — all in your browser.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Hidden native input + clear button trigger for better visibility */}
                <Input type="file" accept="application/pdf" ref={fileRef} onChange={e => setFile(e.target.files?.[0] || null)} disabled={loading} className="hidden" />
                <Button type="button" variant="secondary" className="button-upload bg-white hover:bg-white/90 text-black border border-black/60" onClick={() => fileRef.current?.click()} disabled={loading}>
                  <Upload className="mr-2 h-4 w-4"/> Choose PDF
                </Button>
                {file && <div className="text-xs text-foreground/80 truncate" title={file.name}>{file.name}</div>}

                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Length</div>
                  <div className="inline-flex rounded-md overflow-hidden border border-border">
                    <button type="button" className={`px-3 py-1 text-sm ${lengthPref === 'short' ? 'bg-white text-black' : 'bg-transparent text-foreground/80'}`} onClick={() => setLengthPref('short')}>Short</button>
                    <button type="button" className={`px-3 py-1 text-sm border-l border-border ${lengthPref === 'medium' ? 'bg-white text-black' : 'bg-transparent text-foreground/80'}`} onClick={() => setLengthPref('medium')}>Medium</button>
                    <button type="button" className={`px-3 py-1 text-sm border-l border-border ${lengthPref === 'long' ? 'bg-white text-black' : 'bg-transparent text-foreground/80'}`} onClick={() => setLengthPref('long')}>Long</button>
                  </div>
                </div>
                <Button disabled={!file || loading} onClick={handleSummarise} className="w-full">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Summarising...</> : <><Upload className="mr-2 h-4 w-4"/> Summarise PDF</>}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                <CardDescription>Review the bullet points and download as a PDF.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.length ? (
                  <ul className="list-disc pl-5 text-sm space-y-2">
                    {summary.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                ) : (
                  <div className="text-sm text-foreground/70">Your summary will appear here once generated.</div>
                )}
                <Button onClick={downloadSummaryPDF} disabled={!summary.length || loading} variant="outline">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Preparing PDF...</> : <><Download className="mr-2 h-4 w-4"/> Download Summary PDF</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}