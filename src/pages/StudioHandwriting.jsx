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
import { extractTextFromPDFHighAcc, prefetchTrocr, isTrocrAvailable } from "../utils/ocr_tr";
import { ocrPdfViaServer } from "../utils/ocr_server";
import { getJsPDF } from "../utils/pdf";
import { Switch } from "../components/ui/switch";
import { Helmet } from "react-helmet-async";
import { toast } from "../components/ui/use-toast";

export default function StudioHandwriting() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [highAcc, setHighAcc] = useState(false);
  const [highAccAvailable, setHighAccAvailable] = useState(true);
  const fileRef = useRef();

  useEffect(() => {
    const t = setTimeout(async () => {
      try { await prefetchTrocr(); setHighAccAvailable(isTrocrAvailable()); }
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
  const ensureAssetsLoaded = async () => {
    if (logoDataRef.current) return;
    try {
      const res = await fetch(LOGO_URL);
      const blob = await res.blob();
      const reader = new FileReader();
      await new Promise((resolve) => {
        reader.onload = () => resolve();
        reader.readAsDataURL(blob);
      });
      const dataUrl = reader.result;
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = () => resolve();
        img.src = URL.createObjectURL(blob);
      });
      logoDataRef.current = { dataUrl, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height };
      try { URL.revokeObjectURL(img.src); } catch {}
    } catch {}
  };
  const addHeader = (doc) => {
    const margin = 15;
    const headerH = 12; // mm
    try {
      if (logoDataRef.current && logoDataRef.current.dataUrl) {
        const { dataUrl, width, height } = logoDataRef.current;
        const ratio = (width && height) ? (width / height) : 1.0;
        const logoW = headerH * ratio;
        doc.addImage(dataUrl, 'PNG', margin, 12, logoW, headerH, undefined, 'FAST');
      }
    } catch {}
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
    setStatus("");
    try {
      // 1) Prefer backend OCR for speed/accuracy (no keys, no extra hosting)
      try {
        setStatus('Using backend OCR...');
        console.time('backend-ocr');
        const backendText = await ocrPdfViaServer(file, { maxPages: 8, scale: 1.7 });
        console.timeEnd('backend-ocr');
        if (backendText && backendText.length >= 8) {
          setText(backendText);
          setStatus('');
          return;
        } else {
          toast({ title: 'Backend OCR returned no text', description: 'Falling back to local OCR.' });
        }
      } catch (be) {
        console.debug('Backend OCR unavailable', be);
        toast({ title: 'Backend OCR unavailable', description: be?.message || 'Backend error' });
      }

      // 2) If High‑accuracy is toggled and available, try TrOCR
      if (highAcc && isTrocrAvailable()) {
        try {
          setStatus('Using high‑accuracy OCR...');
          console.time('trocr-ocr');
          const extracted = await extractTextFromPDFHighAcc(file, { maxPages: 5 });
          console.timeEnd('trocr-ocr');
          if (extracted && extracted.length) { setText(extracted); setStatus(''); return; }
        } catch (e) {
          console.debug('High-accuracy failed', e);
        }
      }

      // 3) Fallback to fast client-side OCR
      setStatus('Using fast local OCR...');
      console.time('fast-ocr');
      const extracted = await extractTextFromPDF(file, { forceOCR: true, betterAccuracy: true, ocrScale: 1.6, maxPages: 10 });
      console.timeEnd('fast-ocr');
      setText(extracted || "");
      setStatus('');
    } catch (e) {
      console.error(e);
      setStatus('');
      toast({ title: 'OCR failed', description: 'Please try another PDF.' });
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
        <meta name="description" content="Convert handwritten PDFs into clean typed text using on-device OCR or server-accelerated OCR. Optional high-accuracy neural TrOCR." />
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
                <CardDescription>Handwritten text PDFs work best. Processing is local or server-accelerated (no keys, no DB).</CardDescription>
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
                    <div className="text-xs text-foreground/70">Neural TrOCR (on-device) used only if available; backend OCR is default.</div>
                  </div>
                  <Switch checked={highAcc} onCheckedChange={setHighAcc} disabled={loading || !highAccAvailable} />
                </div>
                {!highAccAvailable && (
                  <div className="text-xs text-foreground/60">High‑accuracy model not available right now. Backend or fast OCR will be used.</div>
                )}

                <Button disabled={!file || loading} onClick={handleConvert} className="w-full">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Converting...</> : <><Type className="mr-2 h-4 w-4"/> Convert to typed text</>}
                </Button>
                {status && <div className="text-xs text-foreground/70">{status}</div>}
                <div className="text-xs text-foreground/70">
                  Notes:
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li>Default path is server‑accelerated OCR (free, no DB/keys).</li>
                    <li>Fallbacks: on-device High‑accuracy TrOCR (if available), then fast OCR.</li>
                    <li>No uploads outside your deployment. Everything stays within your environment.</li>
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