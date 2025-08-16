import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Upload, Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import ThemeToggle from "../components/ThemeToggle";
import FloatingMenu from "../components/FloatingMenu";
import StudioNav from "../components/StudioNav";
import { extractTextFromPDF } from "../utils/textProcessor";
import { getJsPDF } from "../utils/pdf";
import { embedSentences, centralityRank } from "../utils/ml";

function splitSentencesLight(text) {
  const raw = String(text || "").replace(/\s+/g, " ").trim();
  if (!raw) return [];
  const parts = raw.split(/(?&lt;=[\.!?])\s+(?=[A-Z0-9\(\[])/);
  return parts.map(s =&gt; s.trim()).filter(Boolean);
}

export default function StudioSummariser() {
  const [file, setFile] = useState(null);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lengthPref, setLengthPref] = useState("medium");
  const [sourceTitle, setSourceTitle] = useState("");
  const fileRef = useRef();

  const LOGO_URL = "/assets/aceel-logo.png";
  const logoDataRef = useRef(null);
  const fetchAsDataURL = async (url) =&gt; {
    try { const res = await fetch(url); const blob = await res.blob(); return await new Promise((resolve) =&gt; { const r = new FileReader(); r.onload = () =&gt; resolve(r.result); r.readAsDataURL(blob); }); } catch { return null; }
  };
  const ensureAssetsLoaded = async () =&gt; { if (!logoDataRef.current) logoDataRef.current = await fetchAsDataURL(LOGO_URL); };
  const addHeader = (doc) =&gt; { const pw = doc.internal.pageSize.getWidth(); try { if (logoDataRef.current) doc.addImage(logoDataRef.current, 'PNG', (pw - 18) / 2, 6, 18, 18, undefined, 'FAST'); } catch {} try { doc.setFont('helvetica','normal'); } catch {} };
  const addFooter = (doc) =&gt; { const ph = doc.internal.pageSize.getHeight(); const pw = doc.internal.pageSize.getWidth(); doc.setFontSize(10); doc.text("skriptio.sidahq.com | aceel@sidahq.com", pw / 2, ph - 10, { align: "center" }); };

  const summarise = async (text, n) =&gt; {
    const sentences = splitSentencesLight(text).filter(s =&gt; s.length &gt;= 40);
    if (sentences.length === 0) return [];
    // Try embeddings; fallback to lead-based
    let picks = [];
    try {
      const vecs = await embedSentences(sentences, 140);
      if (vecs &amp;&amp; Array.isArray(vecs) &amp;&amp; vecs.length === sentences.length) {
        const scores = centralityRank(vecs);
        const idxs = scores.map((s, i) =&gt; [s, i]).sort((a, b) =&gt; b[0] - a[0]).slice(0, n).map(x =&gt; x[1]).sort((a, b) =&gt; a - b);
        picks = idxs.map(i =&gt; sentences[i]);
      }
    } catch {}
    if (!picks.length) {
      // Lead-3 style fallback with de-dup heuristics
      const pool = sentences.slice(0, Math.min(12, sentences.length));
      picks = pool.filter((s, i) =&gt; i % Math.ceil(pool.length / n) === 0).slice(0, n);
    }
    return picks;
  };

  const handleSummarise = async () =&gt; {
    if (!file) return;
    setLoading(true);
    try {
      const text = await extractTextFromPDF(file);
      const title = (String(text).split(/\n+/).map(l =&gt; l.trim()).find(Boolean)) || "Untitled";
      setSourceTitle(title.slice(0, 120));
      const n = lengthPref === 'short' ? 3 : (lengthPref === 'long' ? 8 : 5);
      const bullets = await summarise(text, n);
      setSummary(bullets);
    } finally { setLoading(false); }
  };

  const downloadSummaryPDF = async () =&gt; {
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
      summary.forEach((s) =&gt; {
        const lines = doc.splitTextToSize(`• ${s}`, 180);
        lines.forEach((ln) =&gt; {
          const ph = doc.internal.pageSize.getHeight();
          if (y &gt; ph - 20) { addFooter(doc); doc.addPage(); addHeader(doc); y = 32; }
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
                <Input type="file" accept="application/pdf" ref={fileRef} onChange={e =&gt; setFile(e.target.files?.[0] || null)} disabled={loading} className="file-input-reset" />
                {file &amp;&amp; &lt;div className="text-xs text-foreground/80 truncate"&gt;{file.name}&lt;/div&gt;}
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">Length</div>
                  <div className="inline-flex rounded-md overflow-hidden border border-border">
                    <button type="button" className={`${lengthPref === 'short' ? 'bg-white text-black' : 'bg-transparent text-foreground/80'} px-3 py-1 text-sm`} onClick={() =&gt; setLengthPref('short')}>Short</button>
                    <button type="button" className={`${lengthPref === 'medium' ? 'bg-white text-black' : 'bg-transparent text-foreground/80'} px-3 py-1 text-sm border-l border-border`} onClick={() =&gt; setLengthPref('medium')}>Medium</button>
                    <button type="button" className={`${lengthPref === 'long' ? 'bg-white text-black' : 'bg-transparent text-foreground/80'} px-3 py-1 text-sm border-l border-border`} onClick={() =&gt; setLengthPref('long')}>Long</button>
                  </div>
                </div>
                <Button disabled={!file || loading} onClick={handleSummarise} className="w-full">
                  {loading ? &lt;&gt;&lt;Loader2 className="mr-2 h-4 w-4 animate-spin"/&gt; Summarising...&lt;/&gt; : &lt;&gt;&lt;Upload className="mr-2 h-4 w-4"/&gt; Summarise PDF&lt;/&gt;}
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
                  &lt;ul className="list-disc pl-5 text-sm space-y-2"&gt;
                    {summary.map((s, i) =&gt; &lt;li key={i}&gt;{s}&lt;/li&gt;)}
                  &lt;/ul&gt;
                ) : (
                  &lt;div className="text-sm text-foreground/70"&gt;Your summary will appear here once generated.&lt;/div&gt;
                )}
                <Button onClick={downloadSummaryPDF} disabled={!summary.length || loading} variant="outline">
                  {loading ? &lt;&gt;&lt;Loader2 className="mr-2 h-4 w-4 animate-spin"/&gt; Preparing PDF...&lt;/&gt; : &lt;&gt;&lt;Download className="mr-2 h-4 w-4"/&gt; Download Summary PDF&lt;/&gt;}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}