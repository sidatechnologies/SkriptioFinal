import React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import ThemeToggle from "../components/ThemeToggle";
import StudioNav from "../components/StudioNav";
import FloatingMenu from "../components/FloatingMenu";
import jsPDF from "jspdf";

export default function ResumeBuilder() {
  const [template, setTemplate] = React.useState("minimal");
  const [form, setForm] = React.useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    summary: "",
    exp1: "",
    exp2: "",
    edu: "",
  });

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const downloadPDF = () => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    let y = margin;

    const H1 = (text) => { doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.text(text, margin, y); y += 10; };
    const H2 = (text) => { y += 22; doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text(text.toUpperCase(), margin, y); y += 8; };
    const P = (text, width = 500, size = 11) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text || "", width);
      doc.text(lines, margin, y);
      y += 14 * (lines.length || 1);
    };

    // Header (varies slightly by template)
    if (template === "minimal") {
      doc.setFont("helvetica", "bold"); doc.setFontSize(26);
      doc.text(form.name || "Your Name", margin, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(12);
      doc.text(form.title || "Role / Title", margin, y + 18);
      y += 36;
      doc.setDrawColor(0); doc.line(margin, y, 595 - margin, y); y += 18;
      P([`${form.email || "email@example.com"}  |  ${form.phone || "(000) 000-0000"}  |  ${form.location || "City, Country"}`].join(""));
    } else if (template === "professional") {
      doc.setFillColor(0); doc.rect(margin, y - 10, 6, 28, "F");
      H1(form.name || "Your Name");
      doc.setFont("helvetica", "normal"); doc.setFontSize(12);
      doc.text(form.title || "Role / Title", margin + 14, y); y += 6;
      P([`${form.email || "email@example.com"}  |  ${form.phone || "(000) 000-0000"}  |  ${form.location || "City, Country"}`].join(""));
    } else { // compact
      doc.setFont("helvetica", "bold"); doc.setFontSize(20);
      doc.text(form.name || "Your Name", margin, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(11);
      doc.text((form.title || "Role / Title") + "  —  " + (form.location || "City, Country"), margin, y + 16);
      y += 36;
    }

    // Sections
    H2("Summary");
    P(form.summary || "Concise 2–3 line profile statement highlighting strengths and interests relevant to the role.");

    H2("Experience");
    P(form.exp1 || "Company — Role — YYYY–YYYY — 2–3 bullet highlights.");
    if (form.exp2) P(form.exp2);

    H2("Education / Skills");
    P(form.edu || "Schools, certifications, core tools and skills.");

    // No watermark or footer for resume per requirements
    doc.save("resume.pdf");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">Skriptio</Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <StudioNav />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: options and form */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border border-black/70 dark:border-white/60">
              <CardHeader>
                <CardTitle>Resume options</CardTitle>
                <CardDescription>Select a template and fill your details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm">Template</div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "minimal", label: "Minimal" },
                      { id: "professional", label: "Professional" },
                      { id: "compact", label: "Compact" },
                    ].map(t => (
                      <button key={t.id} onClick={() => setTemplate(t.id)} className={`border rounded-md p-2 text-xs ${template===t.id? 'bg-foreground text-background':'bg-background text-foreground'}`}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm">Basics</div>
                  <input className="studio-input-title w-full rounded-md px-3 py-2" placeholder="Full name" value={form.name} onChange={set('name')} />
                  <input className="studio-input-title w-full rounded-md px-3 py-2" placeholder="Role / Title" value={form.title} onChange={set('title')} />
                  <input className="studio-input-title w-full rounded-md px-3 py-2" placeholder="Email" value={form.email} onChange={set('email')} />
                  <input className="studio-input-title w-full rounded-md px-3 py-2" placeholder="Phone" value={form.phone} onChange={set('phone')} />
                  <input className="studio-input-title w-full rounded-md px-3 py-2" placeholder="Location" value={form.location} onChange={set('location')} />
                  <textarea className="studio-textarea-notes w-full rounded-md px-3 py-2" rows="4" placeholder="Summary" value={form.summary} onChange={set('summary')} />
                </div>

                <div className="space-y-2">
                  <div className="text-sm">Experience (brief)</div>
                  <textarea className="studio-textarea-notes w-full rounded-md px-3 py-2" rows="4" placeholder="e.g., Company — Role — YYYY–YYYY — highlights" value={form.exp1} onChange={set('exp1')} />
                  <textarea className="studio-textarea-notes w-full rounded-md px-3 py-2" rows="4" placeholder="Add another (optional)" value={form.exp2} onChange={set('exp2')} />
                </div>

                <div className="space-y-2">
                  <div className="text-sm">Education / Skills</div>
                  <textarea className="studio-textarea-notes w-full rounded-md px-3 py-2" rows="4" placeholder="Schools, certifications, core skills" value={form.edu} onChange={set('edu')} />
                </div>

                <Button onClick={downloadPDF} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Download Resume PDF</Button>
                <div className="text-xs text-foreground/70">Note: Resume exports have no logo or footer text.</div>
              </CardContent>
            </Card>
          </div>

          {/* Right: preview */}
          <div className="lg:col-span-2">
            <Card className="bg-card border border-black/80 dark:border-white/70">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border border-dashed border-border rounded-md p-10 text-center text-sm text-foreground/70">Your resume preview will appear here based on the selected template.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <FloatingMenu />
    </div>
  );
}