import React from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import ThemeToggle from "../components/ThemeToggle";
import StudioNav from "../components/StudioNav";
import FloatingMenu from "../components/FloatingMenu";

export default function ResumeBuilder() {
  const [template, setTemplate] = React.useState("minimal");
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
                  <input className="studio-input-title w-full rounded-md px-3 py-2" placeholder="Full name" />
                  <input className="studio-input-title w-full rounded-md px-3 py-2" placeholder="Role / Title" />
                  <input className="studio-input-title w-full rounded-md px-3 py-2" placeholder="Email" />
                  <input className="studio-input-title w-full rounded-md px-3 py-2" placeholder="Phone" />
                  <input className="studio-input-title w-full rounded-md px-3 py-2" placeholder="Location" />
                  <textarea className="studio-textarea-notes w-full rounded-md px-3 py-2" rows="4" placeholder="Summary" />
                </div>

                <div className="space-y-2">
                  <div className="text-sm">Experience (brief)</div>
                  <textarea className="studio-textarea-notes w-full rounded-md px-3 py-2" rows="4" placeholder="e.g., Company — Role — YYYY–YYYY — highlights" />
                  <textarea className="studio-textarea-notes w-full rounded-md px-3 py-2" rows="4" placeholder="Add another (optional)" />
                </div>

                <div className="space-y-2">
                  <div className="text-sm">Education / Skills</div>
                  <textarea className="studio-textarea-notes w-full rounded-md px-3 py-2" rows="4" placeholder="Schools, certifications, core skills" />
                </div>

                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">Download Resume PDF</Button>
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