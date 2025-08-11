# Skriptio - Frontend-Only Study Kit Generator

## 🎉 Successfully Converted to Frontend-Only Application

This application has been successfully converted from a full-stack (FastAPI + MongoDB) application to a **pure frontend-only** application that runs entirely in the browser.

## ✅ What's Working

### Core Functionality
- **Text Processing**: All NLP algorithms converted from Python to JavaScript
- **PDF Upload**: PDF text extraction using PDF.js library
- **Quiz Generation**: 10-question multiple-choice quizzes (MCQ-only), ML-enhanced
- **Flashcard Creation**: Smart flashcards from key concepts (ML-enhanced)
- **7-Day Study Plans**: Daily objectives and structured learning paths (topic grouping)
- **PDF Downloads**: Generate and download study materials as PDFs

### UI/UX Features
- **Beautiful Design**: All original Tailwind CSS styling preserved
- **Dark/Light Theme**: Theme toggle with localStorage persistence
- **Responsive Design**: Works perfectly on desktop and mobile
- **Interactive Components**: Quiz answering, flashcard flipping, navigation

### Technical Features
- **No Backend Required**: Everything runs in the browser
- **No Database**: Session-only storage (no persistence needed)
- **No API Calls**: All processing happens client-side
- **Fast Generation**: Immediate processing without server delays
- **ML-Enhanced Parsing**: Lightweight, fully local embeddings model refines selection and grouping

## 🛠️ Technical Implementation

### End-to-End Workflow (Data Flow)
1. Input
   - User pastes text and/or uploads a PDF.
2. PDF Parsing (pdf.js)
   - We load the legacy pdf.js build and a static worker from /public to avoid dynamic ESM issues.
   - Extract textContent.items and join into page text.
3. Heuristic Cleaning & Segmentation
   - Line-level cleanup: remove headings (short lines without punctuation, ALL‑CAPS, Title‑Case headings, known boilerplate like Table of Contents/References, page labels).
   - Merge bullets/continuations; strip list markers (•, -, 1., etc.).
   - Sentence split: keep sentences ending with . ! ? and length ≥ 50; drop ALL‑CAPS; dedupe near-identical.
4. Keyphrase Extraction
   - Unigrams + bigrams + trigrams frequencies (stopword-aware); prefer multi-word phrases.
5. Baseline Generation (fast path)
   - Quiz: MCQ-only; deterministic question stems from context; co-occurrence-based distractors with textual de-duplication; options always 4.
   - Flashcards: front = keyphrase; back = highest-quality supporting sentence; dedupe and minimum length checks.
   - Study Plan: group sentences by matching top phrases; 7 days with objectives from grouped sentences; backfill with “Review concept: …” when sparse.
6. ML Refinement (non-blocking)
   - Lazy-load TensorFlow.js + Universal Sentence Encoder during idle time or on Studio load (prewarmML()).
   - If the model is ready within ~120ms at generation time, we:
     - Compute sentence embeddings
     - Rank by centrality (average cosine similarity)
     - Dedupe by cosine (> 0.86)
     - Cluster sentences (k-means, k=7) to produce topical day titles/objectives
     - Rebuild quiz from high-centrality sentences with phrase masking
     - NEW: Embedding-based distractors via MMR (semantic but mutually diverse)
     - NEW: Topic coverage — select question seeds round‑robin across clusters to maximize spread across the 10 questions
   - If the model is not ready yet, we return the baseline immediately and keep loading in the background for subsequent generations.

### Key Files
- /src/App.js — Main application and UI; triggers prewarm of ML on Landing and Studio.
- /src/utils/textProcessor.js — Cleaning, segmentation, phrase extraction, heuristic generation; orchestrates optional ML refinement.
- /src/utils/ml.js — Lazy-loading ML helpers (USE embeddings, centrality, dedupe, k-means clustering, MMR distractors).
- /public/pdf.worker.min.mjs — pdf.js worker served statically.

### Performance Strategy (No Slowing Down)
- Lazy loading: @tensorflow/tfjs and @tensorflow-models/universal-sentence-encoder are dynamically imported only after initial UI render, using requestIdleCallback where available.
- Time-bounded enhancement: Generation never blocks on ML. A short deadline (~120ms) is used to attempt ML refinement; otherwise baseline results are returned immediately.
- Prefetching: prewarmML() is called on Landing and Studio mount to download weights in the background before the user generates a kit.
- Memory: embeddings tensors are converted to arrays and disposed to avoid leaks.

### Known Trade-offs
- First-time model download (~7–10 MB) occurs in the background. Subsequent use is instant due to browser cache.
- On very long documents, embedding all sentences can be heavy. We mitigate by:
  - Truncating to first 2000 sentences
  - Ranking and deduping before clustering

### Edge Cases
- Scanned PDFs (images only) are not supported (no OCR).
- Password-protected PDFs will fail.
- Headings that end with punctuation can still slip through; our ML ranking reduces their impact.

## 🚀 Deployment

### Vercel Deployment
{
  "buildCommand": "yarn install && yarn build",
  "outputDirectory": "build"
}

### Local Development
- yarn install
- yarn start

## 📦 Dependencies
- React 19
- pdfjs-dist 5
- jsPDF 2
- Tailwind + Radix UI
- Lucide React icons
- @tensorflow/tfjs, @tensorflow-models/universal-sentence-encoder (lazy-loaded)

## 🎯 Benefits of Frontend-Only Architecture
1. Privacy: No data sent to servers - everything processed locally
2. Speed: Instant generation without network delays
3. Scalability: No server infrastructure needed
4. Cost: Zero backend hosting costs
5. Reliability: Works offline after initial load
6. Security: No API vulnerabilities

## 🔄 Removed Features
- Recent content history (was database-dependent)
- User accounts/persistence (session-only now)
- Backend API endpoints
- MongoDB storage

All core study generation functionality remains identical in UX — now with higher quality content via local ML (MMR distractors + topic coverage across 10 MCQs).