import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { Upload, ChevronDown } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import ThemeToggle from "../components/ThemeToggle";
import StudioNav from "../components/StudioNav";
import FloatingMenu from "../components/FloatingMenu";
import { Helmet } from "react-helmet-async";

export default function StudioSummariser() {
  const fileRef = useRef(null);
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Skriptio — PDF Summariser</title>
      </Helmet>
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight">Skriptio</Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <StudioNav />

        {/* Two-column layout: Upload left, Summary right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border border-black/70 dark:border-white/60">
              <CardHeader>
                <CardTitle>Upload &amp; Options</CardTitle>
                <CardDescription>Choose a PDF and length preference.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="select-wrap">
                  <select className="select-control rounded-md px-3 pr-7 py-2" defaultValue="short">
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                  <span className="select-arrow"><ChevronDown size={16} /></span>
                </div>
                <input ref={fileRef} type="file" accept="application/pdf" className="file-input-reset" />
                <div className="flex items-center gap-3">
                  <Button onClick={() => fileRef.current?.click()} variant="outline" className="button-upload">
                    <Upload size={16} className="mr-2" /> Upload PDF
                  </Button>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">Summarise</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card className="bg-card border border-black/70 dark:border-white/60">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-foreground/70">Upload a PDF and click Summarise to see results here.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <FloatingMenu />
    </div>
  );
}