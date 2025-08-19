import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { Upload, ChevronDown, Copy } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Textarea } from "../components/ui/textarea";
import ThemeToggle from "../components/ThemeToggle";
import StudioNav from "../components/StudioNav";
import FloatingMenu from "../components/FloatingMenu";
import { Helmet } from "react-helmet-async";
import { prewarmAI, summarisePointwise } from "../utils/ai";
import { extractTextFromPDF, extractTextFromPDFHighAcc, normalizeText, looksLikeHeadingStrong, isAuthorish, splitSentences } from "../utils/textProcessor";
import { getJsPDF } from "../utils/pdf";

export default function StudioSummariser() {
  const fileRef = useRef(null);
  const textRef = useRef(null);
  const [hasFile, setHasFile] = React.useState(false);
  const [length, setLength] = React.useState("short");
  const [loading, setLoading] = React.useState(false);
  const [bullets, setBullets] = React.useState([]);
  const [error, setError] = React.useState("");
  const [fileMeta, setFileMeta] = React.useState(null);

  React.useEffect(() => { prewarmAI(); }, []);

  async function onFileChange(e) {
    try {
      const file = e.target.files && e.target.files[0];
      setHasFile(!!file);
      if (!file) { setFileMeta(null); return; }
      // Read basic PDF meta (pages) without rendering (prevents TT undefined font warnings)
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setFileMeta({ name: file.name, size: file.size, pages: pdf.numPages || 0 });
    } catch {
      setFileMeta(null);
    }
  }

  function hasAnyInput() {
    const t = textRef.current?.value?.trim();
    const f = fileRef.current?.files && fileRef.current.files.length > 0;
    return !!(t || f);
  }

  function cleanInputText(raw) {
    // Normalize and strip headings/authorish boilerplate
    const lines = normalizeText(raw).split(/\n+/);
    // Be conservative: only drop author-ish lines; keep most content (even bullets without punctuation)
    const filtered = lines.filter(l => l && !isAuthorish(l));
    // Remove obvious gibberish like single characters or repeated punctuation
    return filtered.filter(l => l.length > 3 && /[a-zA-Z]/.test(l)).join(' ');
  }

  async function onSummarise() {
    setError("");
    setBullets([]);
    try {
      if (!hasAnyInput()) { setError('Please add text or upload a PDF.'); return; }
      setLoading(true);
      // Build combined text from textarea + (optional) PDF
      let combined = '';
      const txt = textRef.current?.value || '';
      if (txt) combined += txt + '\n';
      const file = fileRef.current?.files && fileRef.current.files[0];
      if (file) {
        const pdfText = await extractTextFromPDF(file, { maxPages: 60 });
        combined += '\n' + pdfText;
      }
      const cleaned = cleanInputText(combined);
      if (!cleaned) { setError('No readable content found in the input.'); return; }
      const points = await summarisePointwise(cleaned, length);
      setBullets(points || []);
    } catch (e) {
      console.error(e);
      setError('Something went wrong while summarising. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function onCopy() {
    try {
      const text = (bullets || []).map(b => `• ${b}`).join('\n');
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Skriptio — PDF & Text Summariser</title>
      </Helmet>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">Skriptio</Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <StudioNav />

        {/* Two-column layout: Inputs left, Summary right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border border-black/70 dark:border-white/60">
              <CardHeader>
                <CardTitle>Summarise Content</CardTitle>
                <CardDescription>Paste text or upload a PDF. Runs fully in your browser.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="select-wrap">
                  <select className="select-control rounded-md px-3 pr-7 py-2" value={length} onChange={(e) => setLength(e.target.value)}>
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                  <span className="select-arrow"><ChevronDown size={16} /></span>
                </div>

                <Textarea ref={textRef} rows={8} placeholder="Paste text here (optional)" />
                <div className="text-xs text-foreground/70">Tip: You can combine both pasted text and a PDF.</div>

                <input ref={fileRef} type="file" accept="application/pdf" className="file-input-reset" onChange={onFileChange} />
                <Button onClick={() => fileRef.current?.click()} variant="outline" className="button-upload w-full">
                  <Upload size={16} className="mr-2" /> Choose PDF
                </Button>
                {fileMeta ? (
                  <div className="text-xs text-foreground/80">
                    Selected: <span className="font-medium">{fileMeta.name}</span> · {Math.round(fileMeta.size/1024)} KB · {fileMeta.pages} page{fileMeta.pages===1?'':'s'}
                  </div>
                ) : null}

                {error ? <div className="text-xs text-red-600">{error}</div> : null}

                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={loading || !hasAnyInput()} onClick={onSummarise}>
                  {loading ? 'Summarising…' : 'Summarise PDF'}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card className="kit-surface">
              <div className="kit-toolbar flex items-center justify-between">
                <div>Summary</div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={!bullets.length} onClick={onCopy}>
                    <Copy size={14} className="mr-1" /> Copy
                  </Button>
                  <Button size="sm" onClick={async () => {
                    const jsPDF = await getJsPDF(1500);
                    if (!jsPDF || !bullets.length) return;
                    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
                    const margin = 56; // 0.78in
                    const maxWidth = 482; // 595pt - 2*56 - approx bullet space
                    doc.setFont('Helvetica','');
                    doc.setFontSize(14);
                    doc.text('Summary', margin, margin);
                    doc.setFontSize(11);
                    let y = margin + 18;
                    const leading = 16;
                    for (let i=0; i<bullets.length; i++) {
                      const lines = doc.splitTextToSize(`• ${bullets[i]}`, maxWidth);
                      if (y + leading * lines.length > 812) { doc.addPage(); y = margin; }
                      doc.text(lines, margin, y);
                      y += leading * (lines.length + 0.5);
                    }
                    doc.save('summary.pdf');
                  }} disabled={!bullets.length}>Download Summary PDF</Button>
                </div>
              </div>
              <CardContent>
                {loading ? (
                  <div className="text-sm text-foreground/70 border border-dashed border-border rounded-md p-8 text-center">Generating pointwise summary…</div>
                ) : bullets.length ? (
                  <ul className="list-disc pl-5 space-y-2 text-sm">
                    {bullets.map((b, i) => (<li key={i}>{b}</li>))}
                  </ul>
                ) : (
                  <div className="text-sm text-foreground/70 border border-dashed border-border rounded-md p-8 text-center">Your summary will appear here once generated.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <FloatingMenu />
    </div>
  );
}