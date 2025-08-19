import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { Upload, ChevronDown } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import ThemeToggle from "../components/ThemeToggle";
import FloatingMenu from "../components/FloatingMenu";
import StudioNav from "../components/StudioNav";
import { Helmet } from "react-helmet-async";

export default function StudioSummariser() {
  const fileRef = useRef(null);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Skriptio — PDF Summariser</title>
      </Helmet>
      <FloatingMenu />
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">Skriptio</Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <StudioNav />

        <Card className="bg-card border border-black/70 dark:border-white/60">
          <CardHeader>
            <CardTitle>AI PDF Summariser</CardTitle>
            <CardDescription>Upload a PDF and get Short / Medium / Long bullet summaries. Runs fully in your browser.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <div className="select-wrap">
                <select className="select-control rounded-md px-3 pr-7 py-2" defaultValue="short">
                  <option value="short">Short</option>
                  <option value="medium">Medium</option>
                  <option value="long">Long</option>
                </select>
                <span className="select-arrow"><ChevronDown size={16} /></span>
              </div>
              <input ref={fileRef} type="file" accept="application/pdf" className="file-input-reset" />
              <Button onClick={() => fileRef.current?.click()} variant="outline" className="button-upload">
                <Upload size={16} className="mr-2" /> Upload PDF
              </Button>
            </div>
            <div className="flex items-center gap-3">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Summarise
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-sm text-foreground/70">Upload a PDF and click Summarise to see results here.</div>
      </main>
    </div>
  );
}