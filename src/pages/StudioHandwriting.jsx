import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Upload, Download } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import ThemeToggle from "../components/ThemeToggle";
import FloatingMenu from "../components/FloatingMenu";
import StudioNav from "../components/StudioNav";
import { extractTextFromPDF } from "../utils/textProcessor";
import { getJsPDF } from "../utils/pdf";

export default function StudioHandwriting() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef();

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
    if (!logoDataRef.current) logoDataRef.current = await fetchAsDataURL(LOGO_URL);
  };
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
      const extracted = await extractTextFromPDF(file);
      setText(extracted || "");
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
                <Input type="file" accept="application/pdf" ref={fileRef} onChange={e => setFile(e.target.files?.[0] || null)} disabled={loading} />
                {file && <div className="text-xs text-foreground/80 truncate">{file.name}</div>}
                <Button disabled={!file || loading} onClick={handleConvert} className="w-full">
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Converting...</> : <><Upload className="mr-2 h-4 w-4"/> Convert to typed text</>}
                </Button>
                <div className="text-xs text-foreground/70">
                  Notes:
                  <ul className="list-disc pl-5 space-y-1 mt-1">
                    <li>Scanned pages are OCR’d on‑device (no upload).</li>
                    <li>Complex layouts may reduce accuracy.</li>
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