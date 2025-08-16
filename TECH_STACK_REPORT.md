# Skriptio Tech Stack Report (July 2025)

This document outlines the complete front-end–only architecture currently running, all major libraries in use, how Machine Learning (ML), OCR, and PDF processing work locally, and notable design/UX patterns.

## 1) High-level Architecture
- App type: Single-Page Application (SPA)
- Framework: React 19 + React Router 7 (client-side routing)
- Build tooling: create-react-app (react-scripts 5) with CRACO for config overrides
- Styling: Tailwind CSS 3 + shadcn/ui primitives (Radix UI under the hood) + custom CSS
- State: React local state/hooks (no global store)
- Theming: next-themes (ThemeProvider) with a custom ThemeToggle component
- PDF & assets: Served from /public (including pdf.worker.min.mjs, images, fonts)
- Backend/database: None. The app is frontend-only; all processing is in the browser

## 2) Routing & Layout
- React Router: / (Landing), /studio (Studio), /merch (Merch)
- Scroll reset on route change: src/components/ScrollToTop.jsx
- Sticky headers on each page; mobile menus use fixed overlays beneath the header

## 3) Key UI Libraries
- @radix-ui/react-* (Accordion, Dialog, Popover, Tabs, etc.)
- shadcn/ui style primitives (e.g., Button, Card, Input, Tabs wrappers under src/components/ui)
- lucide-react for icons
- sonner for toasts
- clsx & class-variance-authority for class composition

## 4) PDF, Export & Assets
- PDF Reading: pdfjs-dist 5 (legacy build) loaded with worker from /public/pdf.worker.min.mjs
- PDF Generation: jsPDF 2.5.2 (headers/footers, wordmark rendering into canvas)
- Fonts/Images: /public/assets (Aceel logo, Skriptio poster), /public/fonts

## 5) Compression & Sharing
- pako for gzip/deflate + base64url
- Share payload is compacted (dictionary form). Copy Link & Web Share supported

## 6) Frontend ML & NLP (in-browser)
- @tensorflow/tfjs (forced CPU backend) and @tensorflow-models/universal-sentence-encoder (USE)
  - Lazy loaded in src/utils/ml.js with requestIdleCallback or setTimeout to avoid blocking UI
  - Used for:
    - Option dedup/diversity by cosine similarity
    - Global de-duplication and MMR-like selection (minimal) for distractors
    - Light clustering/ranking utilities (kmeans, centralityRank)
- No server-side ML; everything occurs client-side with time-budget safeguards

## 7) OCR & Image-PDF Handling
- tesseract.js (lazy loaded only when necessary)
  - Heuristic triggers limited OCR on sparse/diagram pages (cap pages and time budget)
  - Merges OCR output with any extracted text

## 8) Core Code Map
- src/App.js
  - Landing page (hero, features, FAQ, CTA, sticky header)
  - Studio page (content input, generation, evaluation, downloads, sharing)
  - Installs FloatingMenu (feedback/merch) globally on Landing & Studio
- src/pages/Merch.jsx
  - Full header with desktop links (Home, Studio) and mobile menu (Home, Studio)
  - Freebies grid (Aceel AI Logo + Skriptio Poster with blob-download)
  - FloatingMenu present here as well
- src/components
  - FloatingMenu.jsx: upward-opening icon-only menu with text chips; click-outside & ESC to close
  - ThemeToggle.jsx: theme switcher
  - ScrollToTop.jsx: resets scroll on route change
  - ui/*: shadcn-style components generated over Radix primitives
- src/utils
  - textProcessor.js: PDF text extraction (PDF.js + OCR fallback), formula preservation, MCQ generation helpers, cleaning & normalization
  - ml.js: TFJS+USE helpers (prewarm, embeddings, cosine, kmeans, dedupe/select utilities)
  - pdf.js: jsPDF integration (headers/footers, line wrapping)
  - b64url.js: URL-safe base64 utilities with compression

## 9) Frontend-only Data Flow (Studio)
1. User inputs text and/or uploads a PDF
2. extractTextFromPDF uses pdfjs-dist (legacy) to parse; OCR kicks in for image pages if needed
3. textProcessor generates artifacts: quiz (10 Qs), flashcards, plan, and theory questions
4. ML helpers (ml.js) may lightly refine distractors, enforce diversity, and deduplicate
5. UI renders quiz; evaluation is local; PDFs are downloadable via jsPDF
6. Share link packs data with pako and embeds in URL (hash-based)

## 10) Machine Learning & AI Summary
- In-browser ML only; no remote model calls
- Models: Universal Sentence Encoder (USE) via @tensorflow-models/universal-sentence-encoder
- Backend: none
- Capabilities used:
  - Embeddings for text similarity (cosine) to avoid repetitive options/questions
  - Simple clustering (kmeans) and centrality ranking for selecting representative items
  - MMR-like selection for diverse distractor choices
- OCR: tesseract.js used selectively for better text extraction from scanned PDFs

## 11) Security & Privacy
- 100% client-side processing after load
- No network calls for user data (except fetching local assets and, when necessary, public poster image if used)
- No analytics scripts included

## 12) Performance Considerations
- Lazy-load TFJS/USE and Tesseract only when needed
- Use of legacy pdf.js worker shipped from /public avoids ESM chain issues
- Batch UI updates, yield during heavy loops (tick) to keep UI responsive
- Mobile tabs wrap to new lines; floating menu uses light DOM

## 13) Notable Dependencies (package.json)
- React 19, react-router-dom 7
- @radix-ui/react-* (Accordion, Dialog, Popover, Tabs, etc.)
- tailwindcss, tailwindcss-animate, tailwind-merge
- lucide-react, sonner, clsx, cva
- jspdf, pdfjs-dist, pako
- @tensorflow/tfjs, @tensorflow-models/universal-sentence-encoder
- tesseract.js

## 14) What’s NOT Here
- Backend/API, database, authentication — intentionally absent
- No LLM calls (OpenAI/Anthropic/Gemini). If needed, Emergent Integrations can be added later with the universal key

## 15) How to Extend
- Add new freebies: drop assets in /public/assets and mirror the card pattern in src/pages/Merch.jsx
- Add pages/routes: declare in src/App.js with <Route>
- Add new question types: extend textProcessor.js to produce more variants and update UI rendering
- Switch to server-backed mode later: introduce a FastAPI service that mirrors these utilities using the same artifact shapes