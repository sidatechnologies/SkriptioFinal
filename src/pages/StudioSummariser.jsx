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
  const [hasFile, setHasFile] = React.useState(false);
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
                <CardTitle>Upload PDF</CardTitle>
                <CardDescription>Extract a concise, readable summary — all in your browser.</CardDescription>
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
                <input ref={fileRef} type="file" accept="application/pdf" className="file-input-reset" onChange={(e)=> setHasFile(e.target.files && e.target.files.length>0)} />
                <Button onClick={() => fileRef.current?.click()} variant="outline" className="button-upload w-full">
                  <Upload size={16} className="mr-2" /> Choose PDF
                </Button>
                <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" disabled={!hasFile}>Summarise PDF</Button>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <Card className="kit-surface">
              <div className="kit-toolbar">Summary</div>
              <CardContent>
                <div className="text-sm text-foreground/70 border border-dashed border-border rounded-md p-8 text-center">Your summary will appear here once generated.</div>
                <div className="mt-3"><Button disabled className="w-max">Download Summary PDF</Button></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <FloatingMenu />
    </div>
  );
}