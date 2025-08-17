/* High-accuracy OCR using Transformers.js (TrOCR) running fully in-browser.
   - Lazy-loads @xenova/transformers and caches the pipeline
   - Uses Xenova/trocr-small-handwritten (quantized ONNX) for speed/accuracy balance
   - Accepts Canvas/ImageData/Blob/DataURL inputs
   - No backend, no API calls; model weights fetched from HF CDN on first use and cached by browser
*/

let trocrPipeline = null;
let transformers = null;

async function loadTransformers() {
  if (transformers) return transformers;
  // Dynamic import to avoid increasing initial bundle size
  const mod = await import(/* webpackChunkName: "transformers-tr" */ '@xenova/transformers');
  transformers = mod;
  return transformers;
}

async function getTrocrPipeline() {
  if (trocrPipeline) return trocrPipeline;
  const { pipeline, env } = await loadTransformers();
  // Ensure we never try to fetch local "/models/..." paths in the browser
  env.allowLocalModels = false;
  // Cache weights in IndexedDB for faster subsequent runs
  env.useBrowserCache = true;
  // Ensure onnxruntime-web assets resolve from CDN reliably
  if (env.backends && env.backends.onnx && env.backends.onnx.wasm) {
    env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/';
  }
  // Prefer Xenova quantized small handwritten model for faster load, good accuracy
  // Try image-to-text first; fall back to text-recognition for older task names
  try {
    trocrPipeline = await pipeline('image-to-text', 'Xenova/trocr-small-handwritten', { quantized: true });
  } catch (e) {
    trocrPipeline = await pipeline('text-recognition', 'Xenova/trocr-small-handwritten', { quantized: true });
  }
  return trocrPipeline;
}

function ctx2d(c) { return c.getContext('2d', { willReadFrequently: true }); }

// Lightweight preprocessing: deskew (by trying few angles), contrast stretch, optional inversion for dark scans
function rotateCanvas(srcCanvas, deg) {
  if (!deg) return srcCanvas;
  const rad = (deg * Math.PI) / 180;
  const s = Math.sin(rad), c = Math.cos(rad);
  const w = srcCanvas.width, h = srcCanvas.height;
  const w2 = Math.abs(Math.round(w * c)) + Math.abs(Math.round(h * s));
  const h2 = Math.abs(Math.round(w * s)) + Math.abs(Math.round(h * c));
  const out = document.createElement('canvas');
  out.width = w2; out.height = h2;
  const ctx = ctx2d(out);
  ctx.translate(w2 / 2, h2 / 2);
  ctx.rotate(rad);
  ctx.drawImage(srcCanvas, -w / 2, -h / 2);
  return out;
}

function estimateBackgroundBrightness(canvas) {
  try {
    const ctx = ctx2d(canvas);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = img.data; let sum = 0; let n = 0;
    const step = Math.max(4, Math.floor((data.length / 4) / 50000));
    for (let i = 0; i < data.length; i += 4 * step) {
      const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += v; n++;
    }
    return sum / Math.max(1, n);
  } catch { return 180; }
}

function contrastStretch(canvas, lowPct = 0.03, highPct = 0.97) {
  const ctx = ctx2d(canvas);
  const { width: W, height: H } = canvas;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const hist = new Array(256).fill(0);
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    hist[v]++;
  }
  const total = W * H;
  const lowCount = total * lowPct;
  const highCount = total * (1 - highPct);
  let lo = 0, hi = 255, sum = 0;
  for (let i = 0; i < 256; i++) { sum += hist[i]; if (sum >= lowCount) { lo = i; break; } }
  sum = 0;
  for (let i = 255; i >= 0; i--) { sum += hist[i]; if (sum >= highCount) { hi = i; break; } }
  const scale = hi > lo ? 255 / (hi - lo) : 1;
  for (let i = 0; i < d.length; i += 4) {
    let v = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    v = Math.max(0, Math.min(255, Math.round((v - lo) * scale)));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
}

function invertCanvasIfNeeded(canvas) {
  try {
    const bg = estimateBackgroundBrightness(canvas);
    if (bg < 110) {
      const ctx = ctx2d(canvas);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = 255 - d[i]; d[i + 1] = 255 - d[i + 1]; d[i + 2] = 255 - d[i + 2];
      }
      ctx.putImageData(img, 0, 0);
    }
  } catch {}
  return canvas;
}

function quickDeskew(srcCanvas) {
  try {
    const angles = [-3, -1.2, 0, 1.2, 3];
    let best = srcCanvas; let bestVar = -Infinity;
    const test = document.createElement('canvas');
    test.width = srcCanvas.width; test.height = srcCanvas.height;
    const tctx = ctx2d(test); tctx.drawImage(srcCanvas, 0, 0);
    contrastStretch(test, 0.02, 0.98);
    // Fast binary projection metric
    const projVar = (c) => {
      const ctx = ctx2d(c);
      const { width: W, height: H } = c;
      const img = ctx.getImageData(0, 0, W, H);
      const d = img.data; const rows = new Array(H).fill(0);
      // mean threshold
      let sum = 0, cnt = 0;
      for (let i = 0; i < d.length; i += 4) { const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; sum += v; cnt++; }
      const mean = sum / Math.max(1, cnt);
      for (let y = 0; y < H; y++) {
        let s = 0; for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; if (d[i] < mean) s++; }
        rows[y] = s;
      }
      const m = rows.reduce((a,b)=>a+b,0) / Math.max(1, rows.length);
      const v = rows.reduce((a,b)=>a+(b-m)*(b-m),0) / Math.max(1, rows.length);
      return v;
    };
    for (const a of angles) {
      const rot = a === 0 ? test : rotateCanvas(test, a);
      const v = projVar(rot);
      if (v > bestVar) { bestVar = v; best = a === 0 ? srcCanvas : rotateCanvas(srcCanvas, a); }
    }
    return best;
  } catch { return srcCanvas; }
}

export async function recognizeCanvasTrocr(canvas) {
  const pipe = await getTrocrPipeline();
  // TrOCR works better on decent contrast grayscale
  const work = document.createElement('canvas');
  work.width = canvas.width; work.height = canvas.height;
  const wctx = ctx2d(work);
  wctx.drawImage(canvas, 0, 0);
  contrastStretch(work, 0.02, 0.98);
  invertCanvasIfNeeded(work);
  // Resize toward 1100px width for speed/accuracy balance
  const targetW = 1100;
  if (work.width > targetW) {
    const scale = targetW / work.width;
    const s = document.createElement('canvas');
    s.width = Math.max(1, Math.round(work.width * scale));
    s.height = Math.max(1, Math.round(work.height * scale));
    const sctx = ctx2d(s);
    sctx.imageSmoothingEnabled = true;
    sctx.drawImage(work, 0, 0, s.width, s.height);
    work.width = s.width; work.height = s.height;
    wctx.clearRect(0,0,work.width,work.height);
    wctx.drawImage(s,0,0);
  }
  const out = await pipe(work);
  const text = Array.isArray(out) ? (out[0]?.generated_text || out[0]?.text || '') : (out?.generated_text || out?.text || '');
  return postClean(text || '');
}

function postClean(text) {
  let t = String(text || '');
  t = t.replace(/\bScanned with CamScanner\b/gi, '');
  t = t.replace(/\bCamScanner\b/gi, '');
  t = t.replace(/\bScanned with Adobe Scan\b/gi, '');
  t = t.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/—/g, '-');
  t = t.replace(/([A-Za-z]{2,})-\n([A-Za-z]{2,})/g, '$1$2');
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/\n{3,}/g, '\n\n');
  t = t.trim();
  return t;
}

export async function extractTextFromPDFHighAcc(file, options = {}) {
  const { maxPages = 40 } = options;
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const limitPages = Math.min(pdf.numPages || 1, Math.max(1, maxPages || pdf.numPages));
  let full = '';
  for (let i = 1; i <= limitPages; i++) {
    const page = await pdf.getPage(i);
    const preview = page.getViewport({ scale: 1.0 });
    const scale = Math.max(1.0, Math.min(2.0, 1000 / Math.max(1, preview.width)));
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const ctx = ctx2d(canvas);
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    await page.render({ canvasContext: ctx, viewport }).promise;

    // Light preprocessing for handwriting
    const deskewed = quickDeskew(canvas);
    contrastStretch(deskewed, 0.02, 0.98);
    invertCanvasIfNeeded(deskewed);

    const text = await recognizeCanvasTrocr(deskewed);
    full += (full && text ? '\n' : '') + (text || '');
  }
  return postClean(full);
}