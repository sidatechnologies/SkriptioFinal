import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Upload, Download, Type } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import ThemeToggle from "../components/ThemeToggle";
import FloatingMenu from "../components/FloatingMenu";
import StudioNav from "../components/StudioNav";
import { extractTextFromPDF } from "../utils/textProcessor";
import { extractTextFromPDFHighAcc, prefetchTrocr } from "../utils/ocr_tr";
import { getJsPDF } from "../utils/pdf";
import { Switch } from "../components/ui/switch";
import { Helmet } from "react-helmet-async";
import { toast } from "../components/ui/use-toast";

export default function StudioHandwriting() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [highAcc, setHighAcc] = useState(false);
  const [highAccAvailable, setHighAccAvailable] = useState(true);
  const fileRef = useRef();

  useEffect(() => {
    const t = setTimeout(async () => {
      try { await prefetchTrocr(); setHighAccAvailable(true); }
      catch { setHighAccAvailable(false); }
    }, 600);
    return () => clearTimeout(t);
  }, []);

  const LOGO_URL = "/assets/aceel-logo.png";
  const logoDataRef = useRef(null);

  const fetchAsDataURL = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch { return null; }
  };
  const ensureAssetsLoaded = async () => { if (!logoDataRef.current) logoDataRef.current = await fetchAsDataURL(LOGO_URL); };
  const addHeader = (doc) => {
    const pw = doc.internal.pageSize.getWidth();
    const topY = 12;
    try { if (logoDataRef.current) doc.addImage(logoDataRef.current, 'PNG', (pw - 18) / 2, topY - 6, 18, 18, undefined, 'FAST'); } catch {}
    try { doc.setFont('helvetica', 'normal'); } catch {}
  };
  const addFooter = (doc) => {
    const ph = doc.internal.pageSize.getHeight();
    const pw = doc.internal.pageSize.getWidth();
    doc.setFontSize(10);
    doc.text("skriptio.sidahq.com | aceel@sidahq.com", pw / 2, ph - 10, { align: "center" });
  };
  const lineWrap = (doc, text, x, y, maxWidth) => {
    const lines = doc.splitTextToSize(text, maxWidth);
    lines.forEach((ln) => {
      const ph = doc.internal.pageSize.getHeight();
      if (y > ph - 20) { addFooter(doc); doc.addPage(); addHeader(doc); y = 32; }
      doc.text(ln, x, y); y += 7;
    });
    return y;
  };

  const handleConvert = async () => {
    if (!file) return;
    setLoading(true);
    try {
      if (highAcc) {
        // Try high-accuracy mode with a hard timeout via the helper in ocr_tr
        const extracted = await extractTextFromPDFHighAcc(file, { maxPages: 5 });
        setText(extracted || "");
      } else {
        const extracted = await extractTextFromPDF(file, { forceOCR: true, betterAccuracy: true, ocrScale: 2.0 });
        setText(extracted || "");
      }
    } catch (e) {
      console.error(e);
      // Fallback to fast OCR automatically if high-accuracy fails or times out
      try {
        toast({ title: 'High‑accuracy OCR unavailable', description: 'Falling back to fast OCR (on‑device).' });
        const extracted = await extractTextFromPDF(file, { forceOCR: true, betterAccuracy: true, ocrScale: 2.0 });
        setText(extracted || "");
      } catch (e2) {
        console.error(e2);
        toast({ title: 'OCR failed', description: 'Please try another PDF or disable High‑accuracy.' });
      }
    } finally { setLoading(false); }
  };

  const downloadTypedPDF = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const jsPDF = await getJsPDF(1200);
      const doc = new jsPDF();
      await ensureAssetsLoaded();
      addHeader(doc);
      let y = 32;
      doc.setFontSize(13);
      y = lineWrap(doc, `Typed transcription`, 15, y, 180);
      doc.setFontSize(12);
      y = lineWrap(doc, text, 15, y + 2, 180);
      addFooter(doc);
      doc.save("typed-transcript.pdf");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Skriptio — Handwriting to Typed Text (On-device OCR)</title>
        <meta name="description" content="Convert handwritten PDFs into clean typed text using on-device OCR. Optional high-accuracy neural TrOCR. Private — everything runs in your browser." />
        <link rel="canonical" href="https://skriptio.sidahq.com/studio/handwriting" />
        <meta property="og:title" content="Skriptio — Handwriting to Typed Text" />
        <meta property="og:description" content="Upload a handwritten PDF and get a neat typed transcript. Optional high-accuracy TrOCR." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://skriptio.sidahq.com/studio/handwriting" />
        <meta property="og:image" content="/assets/aceel-logo.png" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
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
                <CardDescription>Handwritten text PDFs work best. Processing happens in your browser.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input type="file" accept="application/pdf" ref={fileRef} onChange={e => setFile(e.target.files?.[0] || null)} disabled={loading} className="hidden" />
                <Button type="button" variant="secondary" className="button-upload bg-white hover:bg-white/90 text-black border border-black/60" onClick={() => fileRef.current?.click()} disabled={loading}>
                  <Upload className="mr-2 h-4 w-4"/> Choose PDF
                </Button>
                {file && <div className="text-xs text-foreground/80 truncate" title={file.name}>{file.name}</div>}

                <div className="flex items-center justify-between py-2 px-3 rounded-md border border-border/70 bg-background/40">
                  <div className="text-sm">
                    <div className="font-medium">Experimental: High‑accuracy OCR</div>
                    <div className="text-xs text-foreground/70">TrOCR on-device. First run downloads model in background; faster next time.</div>
                  </div>
                  <Switch checked={highAcc} onCheckedChange={setHighAcc} disabled={loading || !highAccAvailable} />
                </div>
                {!highAccAvailable && (
                  <div className="text-xs text-foreground/60">High‑accuracy model not available right now. Please check your connection or try again later.</div>
                )}

                <Button disabled={!file || loading} onClick={handleConvert} className="w-full">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Converting...</> : <><Type className="mr-2 h-4 w-4"/> Convert to typed text</>}
                </Button>
                <div className="text-xs text-foreground/70">
                  Notes:
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li>Default path is fast OCR with advanced preprocessing.</li>
                    <li>High‑accuracy mode uses a neural model (on‑device, private) for tougher handwriting.</li>
                    <li>No uploads. Everything runs in your browser.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle>Typed text</CardTitle>
                <CardDescription>Edit if needed, then download as PDF.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Textarea rows={18} value={text} onChange={e => setText(e.target.value)} placeholder="Your typed text will appear here..." className="bg-white/10 border-white/10 placeholder:text-foreground/60" />
                <Button onClick={downloadTypedPDF} disabled={!text.trim() || loading} variant="outline">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Preparing PDF...</> : <><Download className="mr-2 h-4 w-4"/> Download PDF</>}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}