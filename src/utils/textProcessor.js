// Frontend-only text processing utilities (converted from Python backend) with ML-enhanced refinement.

import { prewarmML, tryEnhanceArtifacts, selectTopSentences, bestSentenceForPhrase } from './ml';

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'if', 'in', 'into', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with', 'this', 'those', 'these', 'your', 'you', 'i', 'we', 'our', 'us', 'their', 'they', 'them', 'he', 'she', 'his', 'her', 'or', 'nor', 'not', 'but', 'than', 'then', 'so', 'too', 'very', 'can', 'just', 'should', 'would', 'could', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'any', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'further', 'here', 'how', 'more', 'most', 'other', 'over', 'own', 'same', 'some', 'such', 'under', 'until', 'up', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'yourself', 'themselves', 'itself', 'ourselves', 'myself', "don't", "can't", "won't", "shouldn't", "couldn't", "isn't", "aren't", "wasn't", "weren't", "i'm", "you're", "we're", "they're", "it's", "that's", "there's", "here's", "what's", "who's", "didn't", "haven't", "hasn't", "hadn't", "doesn't", "shouldn't", "wouldn't", "mustn't", "mightn't", "needn't"
]);

// Generate UUID
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Tiny yielding helper to keep UI responsive during heavy work
async function tick() { return new Promise(resolve => setTimeout(resolve, 0)); }

// Math/formula extraction helpers
const LATEX_PATTERNS = [
  /\$\$(.+?)\$\$/gs,
  /\$(.+?)\$/gs,
  /\\\[(.+?)\\\]/gs,
  /\\\((.+?)\\\)/gs
];

const FORMULA_LINE_REGEX = /([A-Za-zα-ωΑ-Ω0-9\)\(\[\\{\\]+\s*)[=≈≃≅≡≤≥±∓×÷∝∑∏√∫∂∞\^].+/;

function extractFormulasFromText(text) {
  const formulas = new Set();
  // LaTeX blocks
  for (const rx of LATEX_PATTERNS) {
    let m;
    while ((m = rx.exec(text)) !== null) {
      const f = (m[1] || '').trim();
      if (f.length > 0) formulas.add(`$${f}$`);
    }
  }
  // Inline equation-like lines
  const lines = text.split(/\n+/);
  for (const line of lines) {
    const t = line.trim();
    if (FORMULA_LINE_REGEX.test(t)) {
      // filter obvious non-formula gibberish or headings
      const letters = (t.match(/[A-Za-z]/g) || []).length;
      const digits = (t.match(/[0-9]/g) || []).length;
      const ops = (t.match(/[=≈≃≅≡≤≥±∓×÷∝∑∏√∫∂∞\^]/g) || []).length;
      const nonAscii = (t.match(/[^\x20-\x7E]/g) || []).length;
      if (ops === 0) continue;
      if (nonAscii > Math.max(5, Math.floor(t.length * 0.15))) continue;
      // keep lines that actually look like a numeric/computational relation
      if (digits + ops >= 2) formulas.add(t);
    }
  }
  // normalize and cap
  return Array.from(formulas).map(s => s.replace(/\s+/g, ' ').trim()).filter(s => s.length >= 3 && s.length <= 140).slice(0, 32);
}

function containsFormula(s) {
  if (!s) return false;
  if (FORMULA_LINE_REGEX.test(s)) return true;
  for (const rx of LATEX_PATTERNS) { rx.lastIndex = 0; if (rx.test(s)) return true; }
  return false;
}

// Canvas helpers
function ctx2d(c) { return c.getContext('2d', { willReadFrequently: true }); }
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

// Estimate background brightness and invert if needed (for dark scans)
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

function invertCanvasIfNeeded(canvas) {
  try {
    const bg = estimateBackgroundBrightness(canvas);
    if (bg &lt; 110) {
      const ctx = ctx2d(canvas);
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = img.data;
      for (let i = 0; i &lt; d.length; i += 4) {
        d[i] = 255 - d[i];
        d[i + 1] = 255 - d[i + 1];
        d[i + 2] = 255 - d[i + 2];
      }
      ctx.putImageData(img, 0, 0);
    }
  } catch {}
  return canvas;
}

// Contrast stretch grayscale to [low, high] percentiles
function contrastStretch(canvas, lowPct = 0.03, highPct = 0.97) {
  const ctx = ctx2d(canvas);
  const { width: W, height: H } = canvas;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const hist = new Array(256).fill(0);
  for (let i = 0; i &lt; d.length; i += 4) {
    const v = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    hist[v]++;
  }
  const total = W * H;
  const lowCount = total * lowPct;
  const highCount = total * (1 - highPct);
  let lo = 0, hi = 255, sum = 0;
  for (let i = 0; i &lt; 256; i++) { sum += hist[i]; if (sum &gt;= lowCount) { lo = i; break; } }
  sum = 0;
  for (let i = 255; i &gt;= 0; i--) { sum += hist[i]; if (sum &gt;= highCount) { hi = i; break; } }
  const scale = hi &gt; lo ? 255 / (hi - lo) : 1;
  for (let i = 0; i &lt; d.length; i += 4) {
    let v = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]);
    v = Math.max(0, Math.min(255, Math.round((v - lo) * scale)));
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  ctx.putImageData(img, 0, 0);
}

// Basic grayscale conversion
function toGray(data) {
  const out = new Uint8ClampedArray(data.length / 4);
  for (let i = 0, j = 0; i &lt; data.length; i += 4, j++) {
    out[j] = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
  }
  return out;
}

// Adaptive (tile-based) binarization with soft blending across tiles
function adaptiveBinarize(canvas, tile = 24, C = 8) {
  const ctx = ctx2d(canvas);
  const { width: W, height: H } = canvas;
  const img = ctx.getImageData(0, 0, W, H);
  const data = img.data;
  const gray = toGray(data);
  const tw = Math.max(1, Math.floor(W / tile));
  const th = Math.max(1, Math.floor(H / tile));
  const means = new Array(tw * th).fill(0);
  const counts = new Array(tw * th).fill(0);

  // Compute mean per tile
  for (let y = 0; y &lt; H; y++) {
    const ty = Math.min(th - 1, Math.floor(y / tile));
    for (let x = 0; x &lt; W; x++) {
      const tx = Math.min(tw - 1, Math.floor(x / tile));
      const tIdx = ty * tw + tx;
      means[tIdx] += gray[y * W + x];
      counts[tIdx]++;
    }
  }
  for (let i = 0; i &lt; means.length; i++) means[i] = means[i] / Math.max(1, counts[i]);

  // Apply local threshold with soft blend to neighbors
  const getMean = (tx, ty) =&gt; means[Math.min(th - 1, Math.max(0, ty)) * tw + Math.min(tw - 1, Math.max(0, tx))] || 127;
  for (let y = 0; y &lt; H; y++) {
    const ty = Math.floor(y / tile);
    for (let x = 0; x &lt; W; x++) {
      const tx = Math.floor(x / tile);
      // Bilinear blend of surrounding tile means
      const fx = (x % tile) / tile;
      const fy = (y % tile) / tile;
      const m00 = getMean(tx, ty);
      const m10 = getMean(tx + 1, ty);
      const m01 = getMean(tx, ty + 1);
      const m11 = getMean(tx + 1, ty + 1);
      const m0 = m00 * (1 - fx) + m10 * fx;
      const m1 = m01 * (1 - fx) + m11 * fx;
      const m = m0 * (1 - fy) + m1 * fy;
      const thr = m - C; // small bias
      const idx = (y * W + x) * 4;
      const v = gray[y * W + x] &gt; thr ? 255 : 0;
      data[idx] = data[idx + 1] = data[idx + 2] = v;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Morphological operations: 3x3 dilation then erosion (closing) to connect strokes
function close3x3(canvas) {
  const ctx = ctx2d(canvas);
  const { width: W, height: H } = canvas;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const get = (x, y) =&gt; d[(y * W + x) * 4];
  const set = (arr, x, y, v) =&gt; { const i = (y * W + x) * 4; arr[i] = arr[i + 1] = arr[i + 2] = v; };
  // Dilation
  const dil = new Uint8ClampedArray(d.length);
  for (let y = 1; y &lt; H - 1; y++) {
    for (let x = 1; x &lt; W - 1; x++) {
      let minv = 255;
      for (let yy = -1; yy &lt;= 1; yy++)
        for (let xx = -1; xx &lt;= 1; xx++)
          minv = Math.min(minv, get(x + xx, y + yy));
      set(dil, x, y, minv);
    }
  }
  // Erosion
  const ero = new Uint8ClampedArray(d.length);
  const getDil = (x, y) =&gt; dil[(y * W + x) * 4];
  for (let y = 1; y &lt; H - 1; y++) {
    for (let x = 1; x &lt; W - 1; x++) {
      let maxv = 0;
      for (let yy = -1; yy &lt;= 1; yy++)
        for (let xx = -1; xx &lt;= 1; xx++)
          maxv = Math.max(maxv, getDil(x + xx, y + yy));
      set(ero, x, y, maxv);
    }
  }
  for (let i = 0; i &lt; d.length; i++) d[i] = ero[i] || d[i];
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Light despeckle for binary image (removes tiny isolated dots)
function despeckle(canvas) {
  const ctx = ctx2d(canvas);
  const { width: W, height: H } = canvas;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const get = (x, y) =&gt; d[(y * W + x) * 4];
  const set = (x, y, v) =&gt; { const i = (y * W + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; };
  for (let y = 1; y &lt; H - 1; y++) {
    for (let x = 1; x &lt; W - 1; x++) {
      const v = get(x, y);
      if (v === 0) continue; // white pixel
      // Count black neighbors in 3x3
      let blacks = 0;
      for (let yy = -1; yy &lt;= 1; yy++)
        for (let xx = -1; xx &lt;= 1; xx++)
          if (!(xx === 0 &amp;&amp; yy === 0) &amp;&amp; get(x + xx, y + yy) === 0) blacks++;
      if (blacks &lt;= 1) set(x, y, 255); // remove lonely black
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

// Detect a conservative two-column layout using vertical projection on a preprocessed image
function detectColumnSplit(canvas) {
  try {
    const { width: W, height: H } = canvas;
    if (W &lt; 500 || H &lt; 400) return null; // unlikely to be 2-column
    const ctx = ctx2d(canvas);
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const colSum = new Array(W).fill(0);
    const y0 = Math.floor(H * 0.12);
    const y1 = Math.floor(H * 0.88);
    for (let x = 0; x &lt; W; x++) {
      let s = 0;
      for (let y = y0; y &lt; y1; y++) {
        const i = (y * W + x) * 4;
        if (d[i] &lt; 128) s++; // black
      }
      colSum[x] = s;
    }
    const midL = Math.floor(W * 0.32);
    const midR = Math.floor(W * 0.68);
    let bestX = -1, bestVal = Infinity;
    for (let x = midL; x &lt;= midR; x++) {
      if (colSum[x] &lt; bestVal) { bestVal = colSum[x]; bestX = x; }
    }
    if (bestX &lt;= 0) return null;
    const leftDensity = colSum.slice(0, bestX).reduce((a, b) =&gt; a + b, 0) / Math.max(1, bestX);
    const rightDensity = colSum.slice(bestX).reduce((a, b) =&gt; a + b, 0) / Math.max(1, W - bestX);
    const valley = bestVal;
    const minDensity = 3;
    if (leftDensity &gt; minDensity &amp;&amp; rightDensity &gt; minDensity &amp;&amp; valley &lt; Math.min(leftDensity, rightDensity) * 0.20) {
      return bestX;
    }
    return null;
  } catch { return null; }
}

// Utility for quick binary projection on downscaled candidates
function quickBinarizeForMetric(canvas) {
  const ctx = ctx2d(canvas);
  const { width: W, height: H } = canvas;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  // global Otsu-ish threshold (very rough)
  let sum = 0, cnt = 0;
  for (let i = 0; i &lt; d.length; i += 4) { const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]; sum += v; cnt++; }
  const mean = sum / Math.max(1, cnt);
  for (let i = 0; i &lt; d.length; i += 4) {
    const v = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const b = v &gt; mean ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = b;
  }
  ctx.putImageData(img, 0, 0);
}

function rowProjectionVariance(canvas) {
  const ctx = ctx2d(canvas);
  const { width: W, height: H } = canvas;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  const rows = new Array(H).fill(0);
  for (let y = 0; y &lt; H; y++) {
    let s = 0;
    for (let x = 0; x &lt; W; x++) {
      const i = (y * W + x) * 4;
      if (d[i] === 0) s++; // black pixels
    }
    rows[y] = s;
  }
  // variance
  const m = rows.reduce((a, b) =&gt; a + b, 0) / Math.max(1, rows.length);
  const v = rows.reduce((a, b) =&gt; a + (b - m) * (b - m), 0) / Math.max(1, rows.length);
  return v;
}

function downscaleCanvas(src, maxW = 1000) {
  const scale = Math.min(1, maxW / Math.max(1, src.width));
  if (scale &gt;= 0.999) return src;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(src.width * scale));
  c.height = Math.max(1, Math.round(src.height * scale));
  const ctx = ctx2d(c);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

function autoDeskew(srcCanvas) {
  try {
    const testBase = downscaleCanvas(srcCanvas, 900);
    const test = document.createElement('canvas');
    test.width = testBase.width; test.height = testBase.height;
    const tctx = ctx2d(test); tctx.drawImage(testBase, 0, 0);
    contrastStretch(test, 0.02, 0.98);
    quickBinarizeForMetric(test);

    const angles = [-5, -3, -1.5, -0.8, 0, 0.8, 1.5, 3, 5];
    let bestAngle = 0; let bestScore = -Infinity;
    for (const a of angles) {
      const rot = rotateCanvas(test, a);
      const score = rowProjectionVariance(rot);
      if (score &gt; bestScore) { bestScore = score; bestAngle = a; }
    }
    if (Math.abs(bestAngle) &lt; 0.5) return srcCanvas; // negligible skew
    return rotateCanvas(srcCanvas, bestAngle);
  } catch { return srcCanvas; }
}

function charCleanupLight(t) {
  return t
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/—/g, '-')
    .replace(/[·•]/g, '-')
    .replace(/[|¦]/g, 'I');
}

function measureOcrQuality(text) {
  if (!text) return 0;
  const t = text.replace(/[^A-Za-z0-9\s]/g, ' ');
  const tokens = t.split(/\s+/).filter(Boolean);
  if (!tokens.length) return 0;
  const letters = (t.match(/[A-Za-z]/g) || []).length;
  const total = t.length || 1;
  const letterFrac = letters / total; // prefer &gt;= 0.5
  const vowels = (t.match(/[aeiouy]/gi) || []).length;
  const vowelFrac = letters ? (vowels / letters) : 0; // prefer &gt;= 0.25
  const avgLen = tokens.reduce((a, b) =&gt; a + b.length, 0) / tokens.length; // prefer &gt;= 3.2
  const penaltyNoise = (text.match(/[^A-Za-z0-9\s]/g) || []).length / total; // prefer small
  const score = 0.55 * Math.min(1, letterFrac) + 0.25 * Math.min(1, vowelFrac / 0.3) + 0.2 * Math.min(1, avgLen / 4) - 0.25 * penaltyNoise;
  return Math.max(0, Math.min(1, score));
}

// OCR post-processing corrections
function fixOCRConfusions(text) {
  let t = text;
  // character-level (inside words only)
  t = t.replace(/(?&lt;=\p{L})0(?=\p{L})/gu, 'o');
  t = t.replace(/(?&lt;=\p{L})[1I](?=\p{L})/gu, 'l');
  t = t.replace(/(?&lt;=\p{L})vv(?=\p{L})/gu, 'w');
  t = t.replace(/(?&lt;=\p{L})rn(?=\p{L})/gu, 'm');
  t = t.replace(/(?&lt;=\p{L})cl(?=\p{L})/gu, 'd');
  t = t.replace(/\b[GgFf]e\b/g, 'the');
  t = t.replace(/\bwi[ln]e?ry\b/gi, 'while');
  t = t.replace(/\bprobl[e]?m\b/gi, 'problem');
  return t;
}

const OCR_RULES = [
  [/\balg[0o]r[i1]t[e3]m\b/gi, 'algorithm'],
  [/\balgo[ri][rt][it][hmn]\b/gi, 'algorithm'],
  [/\balg[eo]r[ti][tf]m(s)?\b/gi, 'algorithm$1'],
  [/\bdetermin[1i]stic\b/gi, 'deterministic'],
  [/\bnon[- ]?determin[1i]stic\b/gi, 'non-deterministic'],
  [/\bgro?ph\b/gi, 'graph'],
  [/\bcl[gq]u[e3]\b/gi, 'clique'],
  [/\bham[1i]lton[i1]an\b/gi, 'hamiltonian'],
  [/\bver[rt]ex\b/gi, 'vertex'],
  [/\bsat[1i]sfiab[1i]l[1i]ty\b/gi, 'satisfiability'],
  [/\bpol[ygh]nom[1i]al\b/gi, 'polynomial'],
  [/\bdec[1l]s[1i]on\b/gi, 'decision'],
  [/\bboo[1l]ean\b/gi, 'boolean'],
  [/\bcomp[1l][e3]t[e3]\b/gi, 'complete'],
  [/\bnp[- ]?[ch]\b/gi, 'NP-complete'],
  [/\bnp[- ]?h\b/gi, 'NP-hard'],
  [/\bpolynomial\s*time\b/gi, 'polynomial time'],
  [/\breduction\b/gi, 'reduction'],
  [/\bhamiltonian\s*cycle\b/gi, 'Hamiltonian cycle'],
];

function correctWithRules(text) {
  let t = text;
  for (const [rx, rep] of OCR_RULES) t = t.replace(rx, rep);
  return t;
}

function sentenceShape(text) {
  // Join lines and re-split into sentences for readability
  const merged = text.replace(/\s+\n/g, '\n').replace(/\n{2,}/g, '\n\n');
  const paras = merged.split(/\n\n+/).map(p =&gt; p.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim()).filter(Boolean);
  const out = [];
  for (const p of paras) {
    const parts = p.split(/(?&lt;=[\.!?])\s+/); // simple splitter
    for (let s of parts) {
      s = s.trim();
      if (s.length &lt; 20) continue;
      // drop sentences with suspiciously few vowels
      const letters = s.replace(/[^A-Za-z]/g, '');
      const vowels = (letters.match(/[aeiouy]/gi) || []).length;
      if (letters.length &gt;= 10 &amp;&amp; vowels / Math.max(1, letters.length) &lt; 0.2) continue;
      out.push(s.replace(/\s{2,}/g, ' '));
    }
  }
  return out.join('\n');
}

// Extract text from PDF with automatic aggressive OCR + layout handling
export async function extractTextFromPDF(file, options = {}) {
  const { forceOCR = false, betterAccuracy = true, ocrScale = 2.0, maxPages = 60 } = options;
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    let Tesseract = null;

    const tStart = Date.now();
    const OCR_TIME_BUDGET_MS = forceOCR ? 35000 : 22000; // default to aggressive

    const limitPages = Math.min(pdf.numPages || 1, Math.max(1, maxPages || pdf.numPages));

    const preprocessCanvasForOCR = (canvas) =&gt; {
      try {
        // Deskew first on original
        const deskewed = autoDeskew(canvas);
        const ctx = ctx2d(deskewed);
        ctx.imageSmoothingEnabled = false;
        // Contrast stretch first to normalize exposure
        contrastStretch(deskewed, 0.02, 0.98);
        // Adaptive binarization parameters tuned by lightness
        const bg = estimateBackgroundBrightness(deskewed);
        const C = bg &gt; 180 ? 6 : 8;
        adaptiveBinarize(deskewed, 24, C);
        close3x3(deskewed);
        despeckle(deskewed);
        invertCanvasIfNeeded(deskewed);
        return deskewed;
      } catch {
        invertCanvasIfNeeded(canvas);
        return canvas;
      }
    };

    const withTimeout = async (promise, ms) =&gt; {
      let timeoutId; const timeout = new Promise((resolve) =&gt; { timeoutId = setTimeout(() =&gt; resolve(null), ms); });
      const result = await Promise.race([promise, timeout]).catch(() =&gt; null);
      clearTimeout(timeoutId); return result;
    };

    const ocrCanvasBlock = async (c, perPass, psm = 6) =&gt; {
      if (!Tesseract) { const mod = await import('tesseract.js'); Tesseract = mod.default || mod; }
      const ocrOpts = {
        tessedit_pageseg_mode: String(psm),
        tessedit_ocr_engine_mode: '1',
        preserve_interword_spaces: '1',
        user_defined_dpi: '350',
        tessjs_create_hocr: '0',
        tessjs_create_tsv: '0',
        tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:;()[]-+\'"/%'
      };
      const rec = await withTimeout(Tesseract.recognize(c, 'eng', ocrOpts), perPass);
      if (rec &amp;&amp; rec.data &amp;&amp; rec.data.text) {
        let t = rec.data.text;
        t = cleanOCROutput(t);
        t = fixOCRConfusions(t);
        t = correctWithRules(t);
        return { text: t, score: measureOcrQuality(t) };
      }
      return { text: '', score: 0 };
    };

    const recognizeWithConfigs = async (baseCanvas, isHandwriting) =&gt; {
      // Dynamically choose scale to target ~2200px width
      const baseViewportW = baseCanvas.width || 1200;
      const targetW = 2200;
      const scaleDyn = Math.max(ocrScale, Math.min(3.0, targetW / Math.max(1, baseViewportW)));

      const pageCanvas = document.createElement('canvas');
      const srcW = Math.max(60, Math.ceil(baseCanvas.width * scaleDyn));
      const srcH = Math.max(60, Math.ceil(baseCanvas.height * scaleDyn));
      pageCanvas.width = srcW; pageCanvas.height = srcH;
      const pctx = ctx2d(pageCanvas);
      pctx.imageSmoothingEnabled = false;
      pctx.drawImage(baseCanvas, 0, 0, srcW, srcH);

      // Preprocess
      const pre = preprocessCanvasForOCR(pageCanvas);

      // Optionally split into columns
      const splitX = (typeof detectColumnSplit === 'function') ? detectColumnSplit(pre) : null;

      const tBudget = Math.min(14000, OCR_TIME_BUDGET_MS - (Date.now() - tStart));
      if (tBudget &lt;= 600) return '';

      const tryBlocks = [];
      const pushBlock = (sx, sy, sw, sh) =&gt; {
        if (sw &lt; 80 || sh &lt; 80) return; // avoid tiny blocks that trigger tesseract warnings
        const c = document.createElement('canvas');
        c.width = sw; c.height = sh;
        const ctx = ctx2d(c);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(pre, sx, sy, sw, sh, 0, 0, sw, sh);
        tryBlocks.push(c);
      };

      if (splitX) {
        pushBlock(0, 0, splitX, pre.height);
        pushBlock(splitX, 0, pre.width - splitX, pre.height);
      } else {
        pushBlock(0, 0, pre.width, pre.height);
      }

      // OCR each block within budget, try psm 6 -&gt; 4 -&gt; 11 and keep best
      const perPass = Math.max(1200, Math.floor(tBudget / (tryBlocks.length * 3)));
      let best = { text: '', score: 0 };
      for (const blk of tryBlocks) {
        const r6 = await ocrCanvasBlock(blk, perPass, 6);
        const r4 = await ocrCanvasBlock(blk, perPass, 4);
        const r11 = await ocrCanvasBlock(blk, perPass, 11);
        const r = [r6, r4, r11].sort((a, b) =&gt; b.score - a.score)[0];
        if (r.score &gt; best.score) best = r;
      }

      // If still weak, stripe fallback
      if (best.score &lt; 0.5) {
        const fb = await recognizeByStripes(pre, isHandwriting, Math.min(6000, OCR_TIME_BUDGET_MS - (Date.now() - tStart)));
        if (fb &amp;&amp; fb.score &gt; best.score) best = fb;
      }
      return best.text;
    };

    const recognizeByStripes = async (baseCanvas, isHandwriting, budgetMs = 4000) =&gt; {
      if (!Tesseract) { const mod = await import('tesseract.js'); Tesseract = mod.default || mod; }
      const start = Date.now();
      const stripes = Math.max(5, Math.min(14, Math.floor(baseCanvas.height / 220)));
      const stripeH = Math.max(70, Math.floor(baseCanvas.height / stripes));
      let out = '';
      for (let i = 0; i &lt; stripes; i++) {
        if ((Date.now() - start) &gt; budgetMs) break;
        const y0 = i * stripeH;
        const h = Math.min(stripeH + 8, baseCanvas.height - y0);
        if (h &lt; 60) continue;
        const c = document.createElement('canvas');
        const ctx = ctx2d(c);
        c.width = Math.ceil(baseCanvas.width);
        c.height = Math.ceil(h);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(baseCanvas, 0, y0, baseCanvas.width, h, 0, 0, c.width, c.height);
        const perStripe = Math.min(1600, Math.max(700, budgetMs - (Date.now() - start)));
        const r1 = await ocrCanvasBlock(c, perStripe, 11); // sparse
        out += (out &amp;&amp; r1.text ? '\n' : '') + (r1.text || '');
      }
      let t = cleanOCROutput(out);
      t = fixOCRConfusions(t);
      t = correctWithRules(t);
      return { text: t, score: measureOcrQuality(t) };
    };

    for (let i = 1; i &lt;= limitPages; i++) {
      const page = await pdf.getPage(i);

      let collected = '';
      if (!forceOCR) {
        const textContent = await page.getTextContent().catch(() =&gt; null);
        const items = Array.isArray(textContent?.items) ? textContent.items : [];
        const pageText = items.map(item =&gt; String(item?.str || '')).join(' ');
        collected = pageText.trim();
      }

      const needOCR = forceOCR || collected.length &lt; 80;
      if (needOCR) {
        // Compute a viewport scale that leads to target width around 1100 px before upscaling
        const preview = page.getViewport({ scale: 1.0 });
        const baseScale = Math.max(1.2, Math.min(2.0, 1100 / Math.max(1, preview.width)));
        const viewport = page.getViewport({ scale: baseScale });
        const canvas = document.createElement('canvas');
        const ctx = ctx2d(canvas);
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        const textOcr = await recognizeWithConfigs(canvas, true);
        if (textOcr &amp;&amp; textOcr.length &gt; collected.length) {
          collected = collected ? collected + '\n' + textOcr : textOcr;
        }
      }

      fullText += (collected || '') + '\n';
      if (i % 2 === 0) await tick();
      if ((Date.now() - tStart) &gt; (OCR_TIME_BUDGET_MS + 2500)) break; // cap for very large PDFs
    }

    // Final polish for readability
    let out = cleanOCROutput(fullText);
    out = fixOCRConfusions(out);
    out = correctWithRules(out);
    out = sentenceShape(out);
    return out;
  } catch (error) {
    throw new Error(`Failed to read PDF: ${error.message}`);
  }
}

// Basic cleanup (watermarks, hyphen breaks, noise lines)
function cleanOCROutput(text) {
  if (!text) return text;
  let t = String(text);
  t = t.replace(/\bScanned with CamScanner\b/gi, "");
  t = t.replace(/\bCamScanner\b/gi, "");
  t = t.replace(/\bScanned with Adobe Scan\b/gi, "");
  t = t.replace(/\n?\s*-+\s*\d+\s*-+\s*\n?/g, "\n");
  t = charCleanupLight(t);
  t = t.replace(/([A-Za-z]{2,})-\n([A-Za-z]{2,})/g, "$1$2");
  t = t.replace(/\b([A-Za-z]{3,})\s+([a-z]{2,})\b/g, (m, a, b) =&gt; { if ((a + b).length &lt;= 12) return a + b; return m; });
  // Remove stray currency/symbol runs
  t = t.replace(/[£€¥₹]+/g, '');
  const lines = t.split(/\n+/).map(l =&gt; l.trim());
  const kept = [];
  for (const l of lines) {
    if (!l) continue;
    const letters = l.replace(/[^A-Za-z]/g, "");
    const vowels = (letters.match(/[aeiouy]/gi) || []).length;
    const punct = (l.match(/[^A-Za-z0-9\s]/g) || []).length;
    if (letters.length &gt;= 4 &amp;&amp; vowels === 0) continue;
    if (punct &gt; Math.max(14, Math.floor(l.length * 0.5))) continue;
    kept.push(l);
  }
  t = kept.join("\n");
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

// Heuristic cleaners and NLP helpers
function isAllCaps(s) { const letters = s.replace(/[^A-Za-z]/g, ''); if (!letters) return false; const caps = letters.replace(/[^A-Z]/g, '').length; return caps / letters.length &gt; 0.7; }
function isTitleCaseLine(s) { const words = s.trim().split(/\s+/); if (words.length &gt; 10) return false; let caps = 0; for (const w of words) if (w[0] &amp;&amp; w[0] === w[0].toUpperCase()) caps++; return caps / Math.max(1, words.length) &gt; 0.6; }
function hasVerb(s) { return /\b(is|are|was|were|has|have|represents|means|refers|consists|contains|denotes|uses|used|measures|shows|indicates|describes|defines|computes|estimates)\b/i.test(s); }
export function looksLikeHeading(s) {
  const t = s.trim();
  if (t.length &lt;= 2) return true;
  if (containsFormula(t)) return false;
  if (/^(table of contents|references|bibliography|index|appendix|chapter|section|contents)\b/i.test(t)) return true;
  if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(t)) return true;
  if (/^fig(ure)?\s*\d+[:.]/i.test(t)) return true;
  if (isAllCaps(t)) return true;
  if (isTitleCaseLine(t)) return true;
  if (!/[.!?]$/.test(t) &amp;&amp; t.split(/\s+/).length &lt;= 8) return true;
  if (/^(x\.|x\.x\.|x\s*x\.)/i.test(t)) return true;
  if (/^\d+(\.\d+)*\.?\s*([A-Z][A-Za-z]+\b)?(\s+.*)?$/.test(t) &amp;&amp; !/[.!?]$/.test(t)) return true;
  if (/^\d+(\.\d+)*\s+[A-Za-z].{0,80}$/.test(t) &amp;&amp; !/[.!?]$/.test(t)) return true;
  return false;
}
export function looksLikeHeadingStrong(s, docTitle = '') {
  const t = s.trim();
  if (!t) return true;
  if (looksLikeHeading(t)) return true;
  if (docTitle &amp;&amp; jaccardText(t, docTitle) &gt;= 0.6) return true;
  if (/\b(introduction|overview|summary|conclusion|acknowledg(e)?ments?)\b/i.test(t)) return true;
  if (t.includes(' - ') &amp;&amp; !/[.!?]$/.test(t)) return true;
  if (!hasVerb(t) &amp;&amp; t.split(/\s+/).length &gt; 4) return true;
  return false;
}

function jaccardText(a, b) { const A = new Set((a || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)); const B = new Set((b || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)); if (A.size === 0 &amp;&amp; B.size === 0) return 1; let inter = 0; for (const x of A) if (B.has(x)) inter++; const uni = A.size + B.size - inter; return uni === 0 ? 0 : inter / uni; }

export function normalizeText(raw) {
  const lines = raw.replace(/\r/g, '').split(/\n+/).map(l =&gt; l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const kept = [];
  for (let i = 0; i &lt; lines.length; i++) {
    let l = lines[i];
    l = l.replace(/^\s*([•\-*–\u2013]|\d+\.?)\s+/, '');
    if (kept.length &gt; 0 &amp;&amp; !/[.!?]$/.test(kept[kept.length - 1]) &amp;&amp; !containsFormula(kept[kept.length - 1]) &amp;&amp; !containsFormula(l)) {
      kept[kept.length - 1] = (kept[kept.length - 1] + ' ' + l).trim();
      continue;
    }
    if (!looksLikeHeading(l) || containsFormula(l)) kept.push(l);
  }
  return kept.join('\n');
}

function fixSpacing(s) { let t = s.replace(/\s{2,}/g, ' ').trim(); t = t.replace(/([a-z0-9])\.([A-Z])/g, '$1. $2'); t = t.replace(/\.\./g, '.'); return t; }
function repairDanglingEnd(s) { let t = fixSpacing(s); if (/(\b(a|an|the)\s*[\.:])$/i.test(t)) t = t.replace(/\b(a|an|the)\s*[\.:]$/i, '.'); if (!/[.!?]$/.test(t)) t += '.'; return t; }
function isIncompleteTail(s) { const t = (s || '').trim(); if (!t) return true; const bads = [/(of|to|into|onto|under|over|for|with|from)\s*(a|an|the)?\s*[\.]?$/i, /(such as|including|like)\s*(\.|,|;)?\s*$/i, /\b(is|are|was|were)\s+(a|an|the)\s*(\.|,|;)?\s*$/i, /:\s*$/, /\be\.g\.|\bi\.e\.$/i, /\bof\s*\.$/i ]; return bads.some(rx =&gt; rx.test(t)); }

function summarizeSentence(s, targetLen = 180) {
  if (!s) return s;
  let t = s.replace(/\([^)]*\)/g, '');
  t = t.replace(/\[[^\]]*\]/g, '');
  t = t.replace(/\b(such as|including|like)\b.*?([\.!?]|$)/i, '.');
  if (t.length &gt; targetLen * 0.9 &amp;&amp; t.includes(':')) { const before = t.split(':')[0]; if (before.length &gt; 40) t = before + '.'; }
  if (t.length &gt; targetLen * 1.1) { const parts = t.split(/[;,](?=\s)/); if (parts[0].length &gt; 40) t = parts.slice(0, 2).join(','); }
  if (t.length &gt; targetLen) t = cutToWordBoundary(t, targetLen);
  return repairDanglingEnd(t);
}

function wordsSet(s) { try { return new Set(tokenize(String(s || '')).filter(t =&gt; !STOPWORDS.has(t))); } catch { return new Set(); } }
function lexicalJaccard(a, b) { const A = wordsSet(a); const B = wordsSet(b); if (A.size === 0 &amp;&amp; B.size === 0) return 0; let inter = 0; for (const x of A) if (B.has(x)) inter++; const uni = A.size + B.size - inter; return uni === 0 ? 0 : inter / uni; }

export function splitSentences(text) {
  const clean = normalizeText(text);
  const merged = clean.replace(/\s+/g, ' ').trim();
  if (!merged) return [];
  const parts = merged.split(/([\.!?])\s+/).reduce((acc, cur, idx) =&gt; { if (idx % 2 === 1) { const prev = acc.pop() || ''; acc.push((prev + cur).trim()); } else { if (cur) acc.push(cur); } return acc; }, []);
  const res = parts.map(s =&gt; s.trim()).filter(s =&gt; s.length &gt;= 50 &amp;&amp; /[\.!?]$/.test(s) &amp;&amp; !isAllCaps(s)).slice(0, 2000);
  const seen = new Set(); const uniq = []; for (const s of res) { const key = s.toLowerCase(); if (!seen.has(key)) { seen.add(key); uniq.push(s); } } return uniq;
}

export function tokenize(text) { const tokenRegex = /[A-Za-z][A-Za-z\-']+/g; const matches = text.match(tokenRegex) || []; return matches.map(token =&gt; token.toLowerCase()); }

function refineKeyPhrases(candidates, sentences, docTitle) { const BAN = new Set(['used', 'reduce', 'model', 'models', 'like', 'models like', 'used reduce', 'work', 'process', 'one process', 'ongoing process']); const ok = []; const seen = new Set(); for (const p of candidates) { const key = p.toLowerCase().trim(); const tokens = key.split(' '); if (tokens.some(t =&gt; t.length &lt; 3)) continue; if (BAN.has(key)) continue; if (key === 'data') continue; if (key.includes(' like')) continue; if (key.startsWith('used')) continue; const s = sentences.find(sen =&gt; new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(sen)); if (!s) continue; if (looksLikeHeadingStrong(s, docTitle)) continue; if ([...seen].some(k =&gt; k.includes(key) || key.includes(k))) continue; ok.push(p); seen.add(key); } return ok; }

export function extractKeyPhrases(text, k = 18) { const tokens = tokenize(text).filter(t =&gt; !STOPWORDS.has(t)); const counts = new Map(); for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1); const addNgrams = (n) =&gt; { for (let i = 0; i + n &lt;= tokens.length; i++) { const gram = tokens.slice(i, i + n); if (STOPWORDS.has(gram[0]) || STOPWORDS.has(gram[gram.length - 1])) continue; const phrase = gram.join(' '); counts.set(phrase, (counts.get(phrase) || 0) + 1); } }; addNgrams(2); addNgrams(3); const scored = Array.from(counts.entries()).filter(([w]) =&gt; /[a-z]/.test(w) &amp;&amp; w.length &gt;= 4).map(([w, c]) =&gt; [w, c * Math.log(1 + c)]).sort((a, b) =&gt; b[1] - a[1]).map(([w]) =&gt; w); const multi = scored.filter(w =&gt; w.includes(' ')); const uni = scored.filter(w =&gt; !w.includes(' ')); return [...multi.slice(0, Math.min(k - 4, multi.length)), ...uni].slice(0, k); }

function optionTokens(str) { const raw = (str || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean); const map = { v: 'variable', var: 'variable', vars: 'variables', feat: 'feature', feats: 'features', cls: 'class', prob: 'probability', pred: 'prediction', reg: 'regression', rnd: 'random' }; return raw.map(w =&gt; map[w] || w); }
function jaccard(a, b) { const A = new Set(optionTokens(a)); const B = new Set(optionTokens(b)); if (A.size === 0 &amp;&amp; B.size === 0) return 1; let inter = 0; for (const x of A) if (B.has(x)) inter++; const uni = A.size + B.size - inter; return uni === 0 ? 0 : inter / uni; }
function singularizeWord(w) { if (!w) return w; const exceptions = new Set(['is','this','his','was','gas','class','pass','analysis','basis','crisis','thesis']); if (exceptions.has(w)) return w; if (w.endsWith('ies') &amp;&amp; w.length &gt; 4) return w.slice(0, -3) + 'y'; if (w.endsWith('sses')) return w.slice(0, -2); if (w.endsWith('ses') &amp;&amp; w.length &gt; 4) return w.slice(0, -1); if (w.endsWith('ves') &amp;&amp; w.length &gt; 4) return w.slice(0, -3) + 'f'; if (w.endsWith('s') &amp;&amp; !w.endsWith('ss') &amp;&amp; !w.endsWith('us') &amp;&amp; !w.endsWith('is')) return w.slice(0, -1); return w; }
function normalizeMorphology(s) { return (s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean).map(singularizeWord).join(' ').trim(); }
function normalizeEquivalents(s) { if (!s) return ''; let t = s.toLowerCase(); t = t.replace(/\bnumerical\s*v\b/g, 'numerical variable').replace(/\bnumerical\s*var(iable)?s?\b/g, 'numerical variable').replace(/\bclass\s*lbl\b/g, 'class label').replace(/\bpca\b/g, 'principal component analysis'); t = normalizeMorphology(t); return t.trim(); }
function tooSimilar(a, b) { if (!a || !b) return false; const A = normalizeEquivalents(a); const B = normalizeEquivalents(b); if (A === B) return true; return jaccard(A, B) &gt;= 0.7; }

function removePhraseOnce(sentence, phrase) { const rx = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i'); return sentence.replace(rx, '_____').replace(/\s{2,}/g, ' ').trim(); }

function cutToWordBoundary(text, maxLen) { if (!text) return text; if (maxLen &lt; 20) maxLen = 20; if (text.length &lt;= maxLen) return text; const cut = text.slice(0, Math.max(0, maxLen - 1)); const idx = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf(','), cut.lastIndexOf(';'), cut.lastIndexOf(':')); const base = idx &gt; 20 ? cut.slice(0, idx).trim() : cut.trim(); return base.replace(/[,.-:;]+$/, '') + '.'; }
function fixMidwordSpaces(s) { if (!s) return s; const patterns = [/([A-Za-z]{3,})\s+(ability|ibility|sibility|ality|ments?|ness|ship|hood|ation|ization|cation|fully|ically|ances?|tages?|gories|curity|label|linear|regression|control|bottleneck|responsibility)/gi]; let t = s; for (const rx of patterns) t = t.replace(rx, '$1$2'); t = t.replace(/\b([A-Z])\s+([a-z]{5,})\b/g, '$1$2'); t = t.replace(/\b([A-Za-z]{3,})\s+(ment|ments|tion|tions|sion|sions|ness|ship|hood|able|ible|ally|ically)\b/gi, '$1$2'); t = t.replace(/\bthebottleneck\b/gi, 'the bottleneck'); t = t.replace(/\bprocessbottleneck\b/gi, 'process bottleneck'); t = t.replace(/\bcontinuousbottleneck\b/gi, 'continuous bottleneck'); t = t.replace(/\bworkin\s+progress\b/gi, 'work in progress'); t = t.replace(/\b([a-z]{5,})(bottleneck)\b/gi, '$1 $2'); return t; }

export function isAuthorish(s) { return /\b(About the Author|author|edited by|editor|biography|Professor|Prof\.|Dr\.|Assistant Professor|Associate Professor|Lecturer|Head of|Department|Institute|University|College|UGC|Scholarship|Study Centre|Affiliation|Advisor|Mentor)\b/i.test(String(s || '')); }

function escapeRegExp(s) { return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
export function buildTheoryQuestions(rawText, phrases, total = 10, opts = {}) {
  const sents = splitSentences(rawText || '');
  const { difficulty = 'balanced', docTitle = '' } = opts;
  const BAN = new Set(['work','process','one process','ongoing process','analysis tools']);
  const multi = phrases.filter(p =&gt; p &amp;&amp; p.includes(' ') &amp;&amp; !BAN.has(p.toLowerCase()));
  const uni = phrases.filter(p =&gt; p &amp;&amp; !p.includes(' ') &amp;&amp; !BAN.has(p.toLowerCase()));
  const pool = [...multi, ...uni];
  const hasPhrase = (p, s) =&gt; new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(s);
  const pickSentence = (p) =&gt; { const s = sents.find(ss =&gt; hasPhrase(p, ss) &amp;&amp; ss.length &gt;= 50) || sents[qi % Math.max(1, sents.length)] || ''; return s || sents.find(ss =&gt; !looksLikeHeadingStrong(ss, docTitle) &amp;&amp; ss.length &gt;= 50) || sents[0] || ''; };
  const templates = { balanced: [ (p, s) =&gt; `Explain the concept of "${p}" in your own words. Include what it is, why it matters, and one example from the material.`, (p, s) =&gt; `Describe how "${p}" affects workflow efficiency. Refer to the material and outline at least two concrete impacts.`, (p, s) =&gt; `Summarize the key ideas behind "${p}" using 5–8 sentences, citing evidence from the material.`, (p, s) =&gt; `Explain the concept of "${p}" in your own words. Include what it is, why it matters, and one example from the material.` ], harder: [ (p, s) =&gt; `Analyze "${p}" in context. Using the material, identify root causes, consequences, and two mitigation strategies.`, (p, s) =&gt; `Compare and contrast "${p}" with a related concept from the material. Discuss similarities, differences, and when each applies.`, (p, s) =&gt; `Given the following context, explain how it illustrates "${p}": ${summarizeSentence(s || pickSentence(p), 140)}` ], expert: [ (p, s) =&gt; `Synthesize a detailed explanation of "${p}" that connects principles, trade‑offs, and constraints. Support your answer with material‑based examples.`, (p, s) =&gt; `Develop a step‑by‑step approach or checklist to diagnose and address issues related to "${p}" in practice, grounded in the material.`, (p, s) =&gt; `Critically evaluate the role of "${p}" within a broader system. Discuss metrics, failure modes, and improvement levers with evidence from the text.` ] };
  const list = templates[difficulty] || templates.balanced;
  const out = []; const used = new Set(); let i = 0; let qi = 0;
  while (out.length &lt; total &amp;&amp; i &lt; pool.length + 20) {
    const p = pool[i % Math.max(1, pool.length)] || phrases[i % Math.max(1, phrases.length)] || 'the topic';
    i++; const key = normalizeEquivalents(p); if (used.has(key)) continue; used.add(key);
    const s = pickSentence(p); const tpl = list[out.length % list.length]; const q = tpl(p, s); if (!q || q.length &lt; 60) continue; out.push(q); qi++;
  }
  while (out.length &lt; total) {
    const fallbackP = pool[(out.length) % Math.max(1, pool.length)] || (phrases[(out.length) % Math.max(1, phrases.length)] || 'the topic');
    const fb = list[out.length % list.length](fallbackP, pickSentence(fallbackP));
    out.push(fb &amp;&amp; fb.length &gt;= 60 ? fb : `Explain "${fallbackP}" in your own words, including a definition, context from the material, and one concrete example.`);
  }
  return out.slice(0, total);
}

export function buildFlashcards(sentences, phrases, total = 12, docTitle = '') {
  const cards = []; const used = new Set();
  const hasPhrase = (p, s) =&gt; new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(s);
  const validateFlash = (s) =&gt; { if (!s) return null; if (isAuthorish(s)) return null; if (looksLikeHeadingStrong(s, docTitle)) return null; const t = repairDanglingEnd(s); if (t.length &lt; 60 || t.length &gt; 400) return null; if (!hasVerb(t)) return null; if (/(which\s+(has|is))\s*\.$/i.test(t)) return null; if (/(using\s+only|for)\s*\.$/i.test(t)) return null; if (/end\s+carry|\br\s*m\b/i.test(t)) return null; return t; };
  // Prefer Define: &lt;term&gt; cards using best matching sentence per term
  let termIdx = 0;
  while (cards.length &lt; Math.min(total, 8) &amp;&amp; termIdx &lt; phrases.length) {
    const term = phrases[termIdx++];
    if (!term || used.has(term)) continue;
    used.add(term);
    // best sentence will be fetched later in generateArtifacts via ML
    // placeholder to keep structure; we will pass enriched sentences from caller
  }
  // Fallback to sentence-based flashcards if needed
  const pool = sentences.map(validateFlash).filter(Boolean);
  let i = 0;
  while (cards.length &lt; total &amp;&amp; i &lt; pool.length) {
    const v = pool[i++];
    const back = ensureCaseAndPeriod('A.', v.length &lt;= 280 ? v : v.slice(0, 277) + '.');
    cards.push({ front: 'Key idea?', back });
  }
  return cards.slice(0, total);
}

function ensureCaseAndPeriod(prefix = 'A.', text = '') { let t = String(text || '').trim(); if (!t) return `${prefix}`.trim(); t = fixMidwordSpaces(fixSpacing(t)); if (!/[\.!?]$/.test(t)) t += '.'; t = t.charAt(0).toUpperCase() + t.slice(1); return `${prefix} ${t}`.trim(); }
function detIndex(str, n) { let h = 0; const s = String(str || ''); for (let i = 0; i &lt; s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; } return n ? (h % n) : h; }
function placeDeterministically(choices, correct, seed = 0) { const n = choices.length; const idx = Math.min(n - 1, (detIndex(String(correct), n) + seed) % n); const others = choices.filter(c =&gt; c !== correct); const arranged = new Array(n); arranged[idx] = correct; let oi = 0; for (let i = 0; i &lt; n; i++) { if (arranged[i]) continue; arranged[i] = others[oi++] || ''; } return { arranged, idx }; }
function distinctFillOptions(correct, pool, fallbackPool, allPhrases, needed = 4) { const selected = [String(correct || '').trim()]; const seen = new Set([selected[0].toLowerCase()]); const addIf = (opt) =&gt; { if (!opt) return false; const norm = String(opt).trim(); if (!norm) return false; if (seen.has(norm.toLowerCase())) return false; for (const s of selected) { if (tooSimilar(s, norm) || lexicalJaccard(s, norm) &gt;= 0.7) return false; } selected.push(norm); seen.add(norm.toLowerCase()); return true; }; for (const c of (pool || [])) { if (selected.length &gt;= needed) break; addIf(c); } if (selected.length &lt; needed) { for (const c of (fallbackPool || [])) { if (selected.length &gt;= needed) break; addIf(c); } } if (selected.length &lt; needed) { for (const c of (allPhrases || [])) { if (selected.length &gt;= needed) break; if (String(c).trim().toLowerCase() === selected[0].toLowerCase()) continue; addIf(c); } } const generics = ['General concepts', 'Background theory', 'Implementation details', 'Best practices']; let gi = 0; while (selected.length &lt; needed &amp;&amp; gi &lt; generics.length) { addIf(generics[gi++]); } return selected.slice(0, needed); }

function inferDocTitle(text, fallback = 'Study Kit') { const lines = normalizeText(text).split(/\n+/).map(l =&gt; l.trim()); const first = lines.find(Boolean) || ''; return first.slice(0, 80) || fallback; }

function buildConceptQuestion(phrase, sentences, phrases, qi = 0, explain = false) { const hasPhrase = (p, s) =&gt; new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(s); const s = sentences.find(ss =&gt; hasPhrase(phrase, ss) &amp;&amp; ss.length &gt;= 50) || sentences[qi % Math.max(1, sentences.length)] || ''; const correct = summarizeSentence(s, 180); const distractPool = sentences.filter(x =&gt; x !== s).slice(0, 40).map(z =&gt; summarizeSentence(z, 160)); const opts = distinctFillOptions(correct, distractPool, [], [], 4); const placed = placeDeterministically(opts, correct, qi % 4); return { id: `c-${qi}-${detIndex(phrase)}`, type: 'concept', question: `Which statement best describes "${phrase}"?`, options: placed.arranged, answer_index: placed.idx, explanation: explain ? `The correct statement mentions "${phrase}" in context.` : '' }; }

function buildFormulaQuestion(formula, formulas, qi = 0, explain = false) { const others = (formulas || []).filter(f =&gt; f !== formula).slice(0, 6); const opts = distinctFillOptions(formula, others, [], [], 4); const placed = placeDeterministically(opts, formula, (qi + 1) % 4); return { id: `f-${qi}-${detIndex(formula)}`, type: 'formula', question: `Which formula appears in the material?`, options: placed.arranged, answer_index: placed.idx, explanation: explain ? 'This exact formula string was detected in the text/PDF.' : '' }; }

function buildClozeQuestion(phrase, sentences, phrases, qi = 0, explain = false) { const hasPhrase = (p, s) =&gt; new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(s); const s = sentences.find(ss =&gt; hasPhrase(phrase, ss) &amp;&amp; ss.length &gt;= 50) || sentences[qi % Math.max(1, sentences.length)] || ''; const stem = removePhraseOnce(s, phrase); const question = `Fill in the blank: ${summarizeSentence(stem, 150)}`; const correct = phrase; const distractPool = sentences.filter(x =&gt; !hasPhrase(phrase, x)).slice(0, 12).map(z =&gt; summarizeSentence(z, 140)); const opts = distinctFillOptions(correct, distractPool, [], [], 4); const placed = placeDeterministically(opts, correct, (qi + 2) % 4); return { id: `z-${qi}-${detIndex(phrase)}`, type: 'cloze', question, options: placed.arranged, answer_index: placed.idx, explanation: explain ? `The blank corresponds to the key term "${phrase}" from the material.` : '' }; }

function buildQuiz(text, phrases, formulas, opts = {}) {
  const rawSentences = splitSentences(text || '');
  const { difficulty = 'balanced', includeFormulas = true, explain = false } = opts;
  const out = []; const uniquePhrases = []; const seen = new Set(); for (const p of phrases) { const key = normalizeEquivalents(p); if (seen.has(key)) continue; seen.add(key); uniquePhrases.push(p); }
  let goodSentences = rawSentences;
  try { // ML-assisted ranking with fast deadline
    // eslint-disable-next-line no-undef
    goodSentences = (typeof window !== 'undefined') ? goodSentences : rawSentences;
  } catch {}
  // If ML is available, select top central sentences quickly
  // We will resolve best sentences in generateArtifacts and pass down, but keep a fallback here
  const total = 10; let wantFormula = includeFormulas ? (difficulty === 'balanced' ? 1 : 2) : 0; wantFormula = Math.min(wantFormula, (formulas || []).length, 2);
  const usedQuestionTexts = new Set();
  for (let i = 0; i &lt; wantFormula &amp;&amp; out.length &lt; total; i++) {
    const q = buildFormulaQuestion(formulas[i], formulas, i, explain);
    if (!usedQuestionTexts.has(q.question)) { out.push(q); usedQuestionTexts.add(q.question); }
  }
  let qi = 0; for (const p of uniquePhrases) { if (out.length &gt;= total) break; const builder = (qi % 2 === 0) ? buildConceptQuestion : buildClozeQuestion; const q = builder(p, goodSentences, uniquePhrases, qi, explain); if (q &amp;&amp; !usedQuestionTexts.has(q.question)) { out.push(q); usedQuestionTexts.add(q.question); } qi++; }
  let si = 0; while (out.length &lt; total &amp;&amp; si &lt; goodSentences.length) { const s = goodSentences[si++]; const correct = summarizeSentence(s, 160); const distract = goodSentences.filter(x =&gt; x !== s).slice(0, 6).map(z =&gt; summarizeSentence(z, 150)); const opts2 = distinctFillOptions(correct, distract, [], [], 4); const placed = placeDeterministically(opts2, correct, (out.length + 1) % 4); const q = { id: `s-${out.length}-${detIndex(s)}`, type: 'statement', question: `Which statement is supported by the material?`, options: placed.arranged, answer_index: placed.idx, explanation: explain ? 'This statement is derived from the provided content.' : '' }; if (!usedQuestionTexts.has(q.question)) { out.push(q); usedQuestionTexts.add(q.question); } }
  return out.slice(0, 10);
}

function buildStudyPlan(phrases, sentences, k = 7) {
  const days = [];
  const topics = phrases.slice(0, Math.max(k, 7));
  const tasks = [
    (p, s) =&gt; `Review the core idea behind ${p}.`,
    (p, s) =&gt; summarizeSentence(s || `Write a concise explanation of ${p} in 3–4 sentences.`, 140),
    (p, s) =&gt; `Create 3 flashcards for ${p} (definition, example, pitfall).`,
    (p, s) =&gt; `Solve 2 practice questions related to ${p} from the material.`,
    (p, s) =&gt; `Teach ${p} to a peer (or rubber duck) and note gaps.`,
    (p, s) =&gt; `Make a quick mind‑map linking ${p} to 2 related ideas.`,
    (p, s) =&gt; `Take the quiz again and track score for ${p}.`
  ];
  for (let i = 0; i &lt; Math.min(k, topics.length || k); i++) {
    const p = topics[i] || `Focus ${i + 1}`;
    const sen = sentences.find(s =&gt; new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(s)) || '';
    const dTasks = [tasks[0](p, sen), tasks[(i % (tasks.length - 1)) + 1](p, sen), tasks[(i + 2) % tasks.length](p, sen)];
    days.push({ title: `Day ${i + 1}: ${p}`, objectives: dTasks });
  }
  while (days.length &lt; 7) { const n = days.length + 1; days.push({ title: `Day ${n}: Synthesis`, objectives: [ 'Revisit tough flashcards', 'Write a 5‑sentence summary connecting the main ideas', 'Do a timed self‑test (10 mins) and review mistakes' ] }); }
  return days.slice(0, 7);
}

export async function generateArtifacts(rawText, providedTitle = null, opts = {}) {
  try { prewarmML(); } catch {}
  const text = String(rawText || '');
  const sentencesAll = splitSentences(text);
  // ML-assisted selection of better sentences
  let sentences = sentencesAll;
  try {
    const top = await selectTopSentences(sentencesAll, 160, 160);
    if (top &amp;&amp; top.length &gt;= 8) sentences = top;
  } catch {}
  const draftPhrases = extractKeyPhrases(text, 24);
  const phrases = refineKeyPhrases(draftPhrases, sentencesAll, providedTitle || '');
  const formulas = extractFormulasFromText(text);

  // Build quiz using curated sentences only
  const quiz = buildQuiz(text, phrases, formulas, opts);

  // Build flashcards: prioritize Define:&lt;term&gt; with best matching sentence
  const defineCards = [];
  for (const term of phrases.slice(0, 16)) {
    try {
      const s = await bestSentenceForPhrase(term, sentences, 160);
      if (!s) continue;
      const back = ensureCaseAndPeriod('A.', s.length &lt;= 280 ? s : s.slice(0, 277) + '.');
      defineCards.push({ front: `Define: ${term}`, back });
      if (defineCards.length &gt;= 8) break;
    } catch {}
  }
  const extraPool = sentences.map(s =&gt; ensureCaseAndPeriod('A.', summarizeSentence(s, 200))).slice(0, 50);
  while (defineCards.length &lt; 12 &amp;&amp; extraPool.length) {
    const back = extraPool.shift();
    defineCards.push({ front: 'Key idea?', back });
  }
  const flashcards = defineCards.slice(0, 12);

  const plan = buildStudyPlan(phrases, sentences, 7);
  const title = (providedTitle &amp;&amp; providedTitle.trim()) || inferDocTitle(text, 'Study Kit');
  const kit = { title, quiz, flashcards, plan };
  try { const enhanced = await tryEnhanceArtifacts(kit, sentences, phrases, 140, opts); return enhanced || kit; } catch { return kit; }
}