// Frontend-only text processing utilities (converted from Python backend) with ML-enhanced refinement.

import { prewarmML, tryEnhanceArtifacts } from './ml';

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
      formulas.add(t);
    }
  }
  return Array.from(formulas).slice(0, 64);
}

function containsFormula(s) {
  if (!s) return false;
  if (FORMULA_LINE_REGEX.test(s)) return true;
  for (const rx of LATEX_PATTERNS) { rx.lastIndex = 0; if (rx.test(s)) return true; }
  return false;
}

// Canvas helpers
function rotateCanvas(srcCanvas, deg) {
  if (!deg) return srcCanvas;
  const rad = (deg * Math.PI) / 180;
  const s = Math.sin(rad), c = Math.cos(rad);
  const w = srcCanvas.width, h = srcCanvas.height;
  const w2 = Math.abs(Math.round(w * c)) + Math.abs(Math.round(h * s));
  const h2 = Math.abs(Math.round(w * s)) + Math.abs(Math.round(h * c));
  const out = document.createElement('canvas');
  out.width = w2; out.height = h2;
  const ctx = out.getContext('2d');
  ctx.translate(w2 / 2, h2 / 2);
  ctx.rotate(rad);
  ctx.drawImage(srcCanvas, -w / 2, -h / 2);
  return out;
}

function estimateBackgroundBrightness(canvas) {
  try {
    const ctx = canvas.getContext('2d');
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
    if (bg < 110) {
      const ctx = canvas.getContext('2d');
      const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const d = img.data;
      for (let i = 0; i < d.length; i += 4) {
        d[i] = 255 - d[i];
        d[i + 1] = 255 - d[i + 1];
        d[i + 2] = 255 - d[i + 2];
      }
      ctx.putImageData(img, 0, 0);
    }
  } catch {}
  return canvas;
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
  const letterFrac = letters / total; // prefer >= 0.5
  const vowels = (t.match(/[aeiouy]/gi) || []).length;
  const vowelFrac = letters ? (vowels / letters) : 0; // prefer >= 0.25
  const avgLen = tokens.reduce((a, b) => a + b.length, 0) / tokens.length; // prefer >= 3.2
  const penaltyNoise = (text.match(/[^A-Za-z0-9\s]/g) || []).length / total; // prefer small
  const score = 0.55 * Math.min(1, letterFrac) + 0.25 * Math.min(1, vowelFrac / 0.3) + 0.2 * Math.min(1, avgLen / 4) - 0.25 * penaltyNoise;
  return Math.max(0, Math.min(1, score));
}

// OCR post-processing corrections
function fixOCRConfusions(text) {
  let t = text;
  // character-level
  t = t.replace(/(?<=[A-Za-z])0(?=[A-Za-z])/g, 'o');
  t = t.replace(/(?<=[A-Za-z])[1I](?=[A-Za-z])/g, 'l');
  t = t.replace(/(?<=[A-Za-z])vv(?=[A-Za-z])/g, 'w');
  t = t.replace(/(?<=[A-Za-z])rn(?=[A-Za-z])/g, 'm');
  t = t.replace(/(?<=[A-Za-z])cl(?=[A-Za-z])/g, 'd');
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
  [/\bmp[- ]?[ch]\b/g, 'NP-complete'],
  [/\bmp[- ]?h\b/g, 'NP-hard'],
];

function correctWithRules(text) {
  let t = text;
  for (const [rx, rep] of OCR_RULES) t = t.replace(rx, rep);
  return t;
}

function sentenceShape(text) {
  // Join lines and re-split into sentences for readability
  const merged = text.replace(/\s+\n/g, '\n').replace(/\n{2,}/g, '\n\n');
  const paras = merged.split(/\n\n+/).map(p => p.replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim()).filter(Boolean);
  const out = [];
  for (const p of paras) {
    const parts = p.split(/(?<=[\.!?])\s+/); // simple splitter
    for (let s of parts) {
      s = s.trim();
      if (s.length < 20) continue;
      // drop sentences with suspiciously few vowels
      const letters = s.replace(/[^A-Za-z]/g, '');
      const vowels = (letters.match(/[aeiouy]/gi) || []).length;
      if (letters.length >= 10 && vowels / Math.max(1, letters.length) < 0.2) continue;
      out.push(s.replace(/\s{2,}/g, ' '));
    }
  }
  return out.join('\n');
}

// Extract text from PDF with optional aggressive OCR
export async function extractTextFromPDF(file, options = {}) {
  const { forceOCR = false, betterAccuracy = false, ocrScale = 1.8, maxPages = 60 } = options;
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    let Tesseract = null;

    const tStart = Date.now();
    const OCR_TIME_BUDGET_MS = forceOCR ? (betterAccuracy ? 35000 : 22000) : (betterAccuracy ? 12000 : 7000);

    const limitPages = Math.min(pdf.numPages || 1, Math.max(1, maxPages || pdf.numPages));

    const preprocessCanvasForOCR = (canvas) => {
      try {
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = img.data;
        let sum = 0; let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          sum += v; n++;
        }
        const avg = sum / Math.max(1, n);
        const thr = Math.min(208, Math.max(108, avg));
        for (let i = 0; i < data.length; i += 4) {
          const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const b = v > thr ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = b;
        }
        ctx.putImageData(img, 0, 0);
      } catch {}
      invertCanvasIfNeeded(canvas);
      return canvas;
    };

    const withTimeout = async (promise, ms) => {
      let timeoutId; const timeout = new Promise((resolve) => { timeoutId = setTimeout(() => resolve(null), ms); });
      const result = await Promise.race([promise, timeout]).catch(() => null);
      clearTimeout(timeoutId); return result;
    };

    const recognizeWithConfigs = async (baseCanvas, isHandwriting) => {
      if (!Tesseract) { const mod = await import('tesseract.js'); Tesseract = mod.default || mod; }
      const configs = betterAccuracy ? [
        { psm: 11, scale: 2.2, whitelist: null },
        { psm: 6,  scale: 2.4, whitelist: null },
        { psm: 4,  scale: 2.0, whitelist: null },
        { psm: 3,  scale: 2.8, whitelist: null },
      ] : [
        { psm: 11, scale: isHandwriting ? Math.max(ocrScale, 1.9) : ocrScale, whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:;()-%' },
        { psm: 6,  scale: isHandwriting ? 2.1 : ocrScale + 0.2, whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:;()-%' },
        { psm: 4,  scale: isHandwriting ? 2.0 : ocrScale, whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:;()-%' },
      ];
      const rotations = betterAccuracy ? [0, 270, 90] : (isHandwriting ? [0, 270] : [0]);

      let best = { text: '', score: 0 };
      for (const rot of rotations) {
        for (const cfg of configs) {
          const msLeft = OCR_TIME_BUDGET_MS - (Date.now() - tStart);
          if (msLeft <= 400) return best.text;

          const pageCanvas = document.createElement('canvas');
          const ctx = pageCanvas.getContext('2d');
          const src = rotateCanvas(baseCanvas, rot);
          pageCanvas.width = Math.ceil(src.width * (cfg.scale || 1));
          pageCanvas.height = Math.ceil(src.height * (cfg.scale || 1));
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(src, 0, 0, pageCanvas.width, pageCanvas.height);

          preprocessCanvasForOCR(pageCanvas);

          const ocrOpts = {
            tessedit_pageseg_mode: cfg.psm,
            tessedit_ocr_engine_mode: '1', // LSTM only
            preserve_interword_spaces: '1'
          };
          if (cfg.whitelist) ocrOpts.tessedit_char_whitelist = cfg.whitelist;

          const perPass = Math.min(msLeft, betterAccuracy ? 10000 : (isHandwriting ? 8000 : 5000));
          const rec = await withTimeout(Tesseract.recognize(pageCanvas, 'eng', ocrOpts), perPass);
          if (rec && rec.data && rec.data.text) {
            let candidate = rec.data.text;
            candidate = cleanOCROutput(candidate);
            candidate = fixOCRConfusions(candidate);
            candidate = correctWithRules(candidate);
            const score = measureOcrQuality(candidate);
            if (score > best.score) best = { text: candidate, score };
            if (score >= (betterAccuracy ? 0.52 : 0.45)) return best.text; // early stop if good enough
          }
          if ((Date.now() - tStart) > OCR_TIME_BUDGET_MS) return best.text;
        }
      }
      return best.text;
    };

    for (let i = 1; i <= limitPages; i++) {
      const page = await pdf.getPage(i);

      let collected = '';
      if (!forceOCR) {
        const textContent = await page.getTextContent().catch(() => null);
        const items = Array.isArray(textContent?.items) ? textContent.items : [];
        const pageText = items.map(item => String(item?.str || '')).join(' ');
        collected = pageText.trim();
      }

      const needOCR = forceOCR || collected.length < 80;
      if (needOCR) {
        const viewport = page.getViewport({ scale: ocrScale });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: ctx, viewport }).promise;

        const textOcr = await recognizeWithConfigs(canvas, !!forceOCR);
        if (textOcr && textOcr.length > collected.length) {
          collected = collected ? collected + '\n' + textOcr : textOcr;
        }
      }

      fullText += (collected || '') + '\n';
      if (i % 2 === 0) await tick();
      if ((Date.now() - tStart) > (forceOCR ? OCR_TIME_BUDGET_MS + 2500 : 30000)) break; // hard cap for very large PDFs
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
  t = t.replace(/\b([A-Za-z]{3,})\s+([a-z]{2,})\b/g, (m, a, b) => { if ((a + b).length <= 12) return a + b; return m; });
  const lines = t.split(/\n+/).map(l => l.trim());
  const kept = [];
  for (const l of lines) {
    if (!l) continue;
    const letters = l.replace(/[^A-Za-z]/g, "");
    const vowels = (letters.match(/[aeiouy]/gi) || []).length;
    const punct = (l.match(/[^A-Za-z0-9\s]/g) || []).length;
    if (letters.length >= 4 && vowels === 0) continue;
    if (punct > Math.max(14, Math.floor(l.length * 0.5))) continue;
    kept.push(l);
  }
  t = kept.join("\n");
  t = t.replace(/[ \t]{2,}/g, ' ');
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

// Heuristic cleaners and NLP helpers
function isAllCaps(s) { const letters = s.replace(/[^A-Za-z]/g, ''); if (!letters) return false; const caps = letters.replace(/[^A-Z]/g, '').length; return caps / letters.length > 0.7; }
function isTitleCaseLine(s) { const words = s.trim().split(/\s+/); if (words.length > 10) return false; let caps = 0; for (const w of words) if (w[0] && w[0] === w[0].toUpperCase()) caps++; return caps / Math.max(1, words.length) > 0.6; }
function hasVerb(s) { return /\b(is|are|was|were|has|have|represents|means|refers|consists|contains|denotes|uses|used|measures|shows|indicates|describes|defines|computes|estimates)\b/i.test(s); }
export function looksLikeHeading(s) {
  const t = s.trim();
  if (t.length <= 2) return true;
  if (containsFormula(t)) return false;
  if (/^(table of contents|references|bibliography|index|appendix|chapter|section|contents)\b/i.test(t)) return true;
  if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(t)) return true;
  if (/^fig(ure)?\s*\d+[:.]/i.test(t)) return true;
  if (isAllCaps(t)) return true;
  if (isTitleCaseLine(t)) return true;
  if (!/[.!?]$/.test(t) && t.split(/\s+/).length <= 8) return true;
  if (/^(x\.|x\.x\.|x\s*x\.)/i.test(t)) return true;
  if (/^\d+(\.\d+)*\.?\s*([A-Z][A-Za-z]+\b)?(\s+.*)?$/.test(t) && !/[.!?]$/.test(t)) return true;
  if (/^\d+(\.\d+)*\s+[A-Za-z].{0,80}$/.test(t) && !/[.!?]$/.test(t)) return true;
  return false;
}
export function looksLikeHeadingStrong(s, docTitle = '') {
  const t = s.trim();
  if (!t) return true;
  if (looksLikeHeading(t)) return true;
  if (docTitle && jaccardText(t, docTitle) >= 0.6) return true;
  if (/\b(introduction|overview|summary|conclusion|acknowledg(e)?ments?)\b/i.test(t)) return true;
  if (t.includes(' - ') && !/[.!?]$/.test(t)) return true;
  if (!hasVerb(t) && t.split(/\s+/).length > 4) return true;
  return false;
}

function jaccardText(a, b) { const A = new Set((a || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)); const B = new Set((b || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean)); if (A.size === 0 && B.size === 0) return 1; let inter = 0; for (const x of A) if (B.has(x)) inter++; const uni = A.size + B.size - inter; return uni === 0 ? 0 : inter / uni; }

export function normalizeText(raw) {
  const lines = raw.replace(/\r/g, '').split(/\n+/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];
    l = l.replace(/^\s*([•\-*–\u2013]|\d+\.?)\s+/, '');
    if (kept.length > 0 && !/[.!?]$/.test(kept[kept.length - 1]) && !containsFormula(kept[kept.length - 1]) && !containsFormula(l)) {
      kept[kept.length - 1] = (kept[kept.length - 1] + ' ' + l).trim();
      continue;
    }
    if (!looksLikeHeading(l) || containsFormula(l)) kept.push(l);
  }
  return kept.join('\n');
}

function fixSpacing(s) { let t = s.replace(/\s{2,}/g, ' ').trim(); t = t.replace(/([a-z0-9])\.([A-Z])/g, '$1. $2'); t = t.replace(/\.\./g, '.'); return t; }
function repairDanglingEnd(s) { let t = fixSpacing(s); if (/(\b(a|an|the)\s*[\.:])$/i.test(t)) t = t.replace(/\b(a|an|the)\s*[\.:]$/i, '.'); if (!/[.!?]$/.test(t)) t += '.'; return t; }
function isIncompleteTail(s) { const t = (s || '').trim(); if (!t) return true; const bads = [/(of|to|into|onto|under|over|for|with|from)\s*(a|an|the)?\s*[\.]?$/i, /(such as|including|like)\s*(\.|,|;)?\s*$/i, /\b(is|are|was|were)\s+(a|an|the)\s*(\.|,|;)?\s*$/i, /:\s*$/, /\be\.g\.|\bi\.e\.$/i, /\bof\s*\.$/i ]; return bads.some(rx => rx.test(t)); }

function summarizeSentence(s, targetLen = 180) {
  if (!s) return s;
  let t = s.replace(/\([^)]*\)/g, '');
  t = t.replace(/\[[^\]]*\]/g, '');
  t = t.replace(/\b(such as|including|like)\b.*?([\.!?]|$)/i, '.');
  if (t.length > targetLen * 0.9 && t.includes(':')) { const before = t.split(':')[0]; if (before.length > 40) t = before + '.'; }
  if (t.length > targetLen * 1.1) { const parts = t.split(/[,;](?=\s)/); if (parts[0].length > 40) t = parts.slice(0, 2).join(','); }
  if (t.length > targetLen) t = cutToWordBoundary(t, targetLen);
  return repairDanglingEnd(t);
}

function wordsSet(s) { try { return new Set(tokenize(String(s || '')).filter(t => !STOPWORDS.has(t))); } catch { return new Set(); } }
function lexicalJaccard(a, b) { const A = wordsSet(a); const B = wordsSet(b); if (A.size === 0 && B.size === 0) return 0; let inter = 0; for (const x of A) if (B.has(x)) inter++; const uni = A.size + B.size - inter; return uni === 0 ? 0 : inter / uni; }

export function splitSentences(text) {
  const clean = normalizeText(text);
  const merged = clean.replace(/\s+/g, ' ').trim();
  if (!merged) return [];
  const parts = merged.split(/([\.!?])\s+/).reduce((acc, cur, idx) => { if (idx % 2 === 1) { const prev = acc.pop() || ''; acc.push((prev + cur).trim()); } else { if (cur) acc.push(cur); } return acc; }, []);
  const res = parts.map(s => s.trim()).filter(s => s.length >= 50 && /[\.!?]$/.test(s) && !isAllCaps(s)).slice(0, 2000);
  const seen = new Set(); const uniq = []; for (const s of res) { const key = s.toLowerCase(); if (!seen.has(key)) { seen.add(key); uniq.push(s); } } return uniq;
}

export function tokenize(text) { const tokenRegex = /[A-Za-z][A-Za-z\-']+/g; const matches = text.match(tokenRegex) || []; return matches.map(token => token.toLowerCase()); }

function refineKeyPhrases(candidates, sentences, docTitle) { const BAN = new Set(['used', 'reduce', 'model', 'models', 'like', 'models like', 'used reduce', 'work', 'process', 'one process', 'ongoing process']); const ok = []; const seen = new Set(); for (const p of candidates) { const key = p.toLowerCase().trim(); const tokens = key.split(' '); if (tokens.some(t => t.length < 3)) continue; if (BAN.has(key)) continue; if (key === 'data') continue; if (key.includes(' like')) continue; if (key.startsWith('used')) continue; const s = sentences.find(sen => new RegExp(`\b${escapeRegExp(p)}\b`, 'i').test(sen)); if (!s) continue; if (looksLikeHeadingStrong(s, docTitle)) continue; if ([...seen].some(k => k.includes(key) || key.includes(k))) continue; ok.push(p); seen.add(key); } return ok; }

export function extractKeyPhrases(text, k = 18) { const tokens = tokenize(text).filter(t => !STOPWORDS.has(t)); const counts = new Map(); for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1); const addNgrams = (n) => { for (let i = 0; i + n <= tokens.length; i++) { const gram = tokens.slice(i, i + n); if (STOPWORDS.has(gram[0]) || STOPWORDS.has(gram[gram.length - 1])) continue; const phrase = gram.join(' '); counts.set(phrase, (counts.get(phrase) || 0) + 1); } }; addNgrams(2); addNgrams(3); const scored = Array.from(counts.entries()).filter(([w]) => /[a-z]/.test(w) && w.length >= 4).map(([w, c]) => [w, c * Math.log(1 + c)]).sort((a, b) => b[1] - a[1]).map(([w]) => w); const multi = scored.filter(w => w.includes(' ')); const uni = scored.filter(w => !w.includes(' ')); return [...multi.slice(0, Math.min(k - 4, multi.length)), ...uni].slice(0, k); }

function optionTokens(str) { const raw = (str || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean); const map = { v: 'variable', var: 'variable', vars: 'variables', feat: 'feature', feats: 'features', cls: 'class', prob: 'probability', pred: 'prediction', reg: 'regression', rnd: 'random' }; return raw.map(w => map[w] || w); }
function jaccard(a, b) { const A = new Set(optionTokens(a)); const B = new Set(optionTokens(b)); if (A.size === 0 && B.size === 0) return 1; let inter = 0; for (const x of A) if (B.has(x)) inter++; const uni = A.size + B.size - inter; return uni === 0 ? 0 : inter / uni; }
function singularizeWord(w) { if (!w) return w; const exceptions = new Set(['is','this','his','was','gas','class','pass','analysis','basis','crisis','thesis']); if (exceptions.has(w)) return w; if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y'; if (w.endsWith('sses')) return w.slice(0, -2); if (w.endsWith('ses') && w.length > 4) return w.slice(0, -1); if (w.endsWith('ves') && w.length > 4) return w.slice(0, -3) + 'f'; if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return w.slice(0, -1); return w; }
function normalizeMorphology(s) { return (s || '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean).map(singularizeWord).join(' ').trim(); }
function normalizeEquivalents(s) { if (!s) return ''; let t = s.toLowerCase(); t = t.replace(/\bnumerical\s*v\b/g, 'numerical variable').replace(/\bnumerical\s*var(iable)?s?\b/g, 'numerical variable').replace(/\bclass\s*lbl\b/g, 'class label').replace(/\bpca\b/g, 'principal component analysis'); t = normalizeMorphology(t); return t.trim(); }
function tooSimilar(a, b) { if (!a || !b) return false; const A = normalizeEquivalents(a); const B = normalizeEquivalents(b); if (A === B) return true; return jaccard(A, B) >= 0.7; }

function removePhraseOnce(sentence, phrase) { const rx = new RegExp(`\b${escapeRegExp(phrase)}\b`, 'i'); return sentence.replace(rx, '_____').replace(/\s{2,}/g, ' ').trim(); }

function cutToWordBoundary(text, maxLen) { if (!text) return text; if (maxLen < 20) maxLen = 20; if (text.length <= maxLen) return text; const cut = text.slice(0, Math.max(0, maxLen - 1)); const idx = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf(','), cut.lastIndexOf(';'), cut.lastIndexOf(':')); const base = idx > 20 ? cut.slice(0, idx).trim() : cut.trim(); return base.replace(/[,.-:;]+$/, '') + '.'; }
function fixMidwordSpaces(s) { if (!s) return s; const patterns = [/([A-Za-z]{3,})\s+(ability|ibility|sibility|ality|ments?|ness|ship|hood|ation|ization|cation|fully|ically|ances?|tages?|gories|curity|label|linear|regression|control|bottleneck|responsibility)/gi]; let t = s; for (const rx of patterns) t = t.replace(rx, '$1$2'); t = t.replace(/\b([A-Z])\s+([a-z]{5,})\b/g, '$1$2'); t = t.replace(/\b([A-Za-z]{3,})\s+(ment|ments|tion|tions|sion|sions|ness|ship|hood|able|ible|ally|ically)\b/gi, '$1$2'); t = t.replace(/\bthebottleneck\b/gi, 'the bottleneck'); t = t.replace(/\bprocessbottleneck\b/gi, 'process bottleneck'); t = t.replace(/\bcontinuousbottleneck\b/gi, 'continuous bottleneck'); t = t.replace(/\bworkin\s+progress\b/gi, 'work in progress'); t = t.replace(/\b([a-z]{5,})(bottleneck)\b/gi, '$1 $2'); return t; }

export function isAuthorish(s) { return /\b(About the Author|author|edited by|editor|biography|Professor|Prof\.|Dr\.|Assistant Professor|Associate Professor|Lecturer|Head of|Department|Institute|University|College|UGC|Scholarship|Study Centre|Affiliation|Advisor|Mentor)\b/i.test(String(s || '')); }

function escapeRegExp(s) { return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
export function buildTheoryQuestions(rawText, phrases, total = 10, opts = {}) {
  const sents = splitSentences(rawText || '');
  const { difficulty = 'balanced', docTitle = '' } = opts;
  const BAN = new Set(['work','process','one process','ongoing process','analysis tools']);
  const multi = phrases.filter(p => p && p.includes(' ') && !BAN.has(p.toLowerCase()));
  const uni = phrases.filter(p => p && !p.includes(' ') && !BAN.has(p.toLowerCase()));
  const pool = [...multi, ...uni];
  const hasPhrase = (p, s) => new RegExp(`\b${escapeRegExp(p)}\b`, 'i').test(s);
  const pickSentence = (p) => { const s = sents.find(ss => hasPhrase(p, ss) && !looksLikeHeadingStrong(ss, docTitle) && ss.length >= 50); return s || sents.find(ss => !looksLikeHeadingStrong(ss, docTitle) && ss.length >= 50) || sents[0] || ''; };
  const templates = { balanced: [ (p, s) => `Explain the concept of "${p}" in your own words. Include what it is, why it matters, and one example from the material.`, (p, s) => `Describe how "${p}" affects workflow efficiency. Refer to the material and outline at least two concrete impacts.`, (p, s) => `Summarize the key ideas behind "${p}" using 5–8 sentences, citing evidence from the material.`, (p, s) => `Explain the concept of "${p}" in your own words. Include what it is, why it matters, and one example from the material.` ], harder: [ (p, s) => `Analyze "${p}" in context. Using the material, identify root causes, consequences, and two mitigation strategies.`, (p, s) => `Compare and contrast "${p}" with a related concept from the material. Discuss similarities, differences, and when each applies.`, (p, s) => `Given the following context, explain how it illustrates "${p}": ${summarizeSentence(s || pickSentence(p), 140)}` ], expert: [ (p, s) => `Synthesize a detailed explanation of "${p}" that connects principles, trade‑offs, and constraints. Support your answer with material‑based examples.`, (p, s) => `Develop a step‑by‑step approach or checklist to diagnose and address issues related to "${p}" in practice, grounded in the material.`, (p, s) => `Critically evaluate the role of "${p}" within a broader system. Discuss metrics, failure modes, and improvement levers with evidence from the text.` ] };
  const list = templates[difficulty] || templates.balanced;
  const out = []; const used = new Set(); let i = 0;
  while (out.length < total && i < pool.length + 20) {
    const p = pool[i % Math.max(1, pool.length)] || phrases[i % Math.max(1, phrases.length)] || 'the topic';
    i++; const key = normalizeEquivalents(p); if (used.has(key)) continue; used.add(key);
    const s = pickSentence(p); const tpl = list[out.length % list.length]; const q = tpl(p, s); if (!q || q.length < 60) continue; out.push(q);
  }
  while (out.length < total) {
    const fallbackP = pool[(out.length) % Math.max(1, pool.length)] || (phrases[(out.length) % Math.max(1, phrases.length)] || 'the topic');
    const fb = list[out.length % list.length](fallbackP, pickSentence(fallbackP));
    out.push(fb && fb.length >= 60 ? fb : `Explain "${fallbackP}" in your own words, including a definition, context from the material, and one concrete example.`);
  }
  return out.slice(0, total);
}

export function buildFlashcards(sentences, phrases, total = 12, docTitle = '') {
  const cards = []; const used = new Set();
  const hasPhrase = (p, s) => new RegExp(`\b${escapeRegExp(p)}\b`, 'i').test(s);
  const validateFlash = (s) => { if (!s) return null; if (isAuthorish(s)) return null; if (looksLikeHeadingStrong(s, docTitle)) return null; const t = repairDanglingEnd(s); if (t.length < 60 || t.length > 400) return null; if (!hasVerb(t)) return null; if (/(which\s+(has|is))\s*\.$/i.test(t)) return null; if (/(using\s+only|for)\s*\.$/i.test(t)) return null; if (/end\s+carry|\br\s*m\b/i.test(t)) return null; return t; };
  for (const p of phrases) { if (cards.length >= total) break; const sen = sentences.find(sen => hasPhrase(p, sen) && validateFlash(sen)); const v = validateFlash(sen); if (!v || used.has(p)) continue; used.add(p); const front = `Define: ${p}`; const back = ensureCaseAndPeriod('A.', v.length <= 280 ? v : v.slice(0, 277) + '.'); cards.push({ front, back }); }
  if (cards.length < total) { const pool = sentences.map(validateFlash).filter(Boolean); let i = 0; while (cards.length < total && i < pool.length) { const v = pool[i++]; const back = ensureCaseAndPeriod('A.', v.length <= 280 ? v : v.slice(0, 277) + '.'); cards.push({ front: 'Key idea?', back }); } }
  return cards.slice(0, total);
}

function ensureCaseAndPeriod(prefix = 'A.', text = '') { let t = String(text || '').trim(); if (!t) return `${prefix}`.trim(); t = fixMidwordSpaces(fixSpacing(t)); if (!/[.!?]$/.test(t)) t += '.'; t = t.charAt(0).toUpperCase() + t.slice(1); return `${prefix} ${t}`.trim(); }
function detIndex(str, n) { let h = 0; const s = String(str || ''); for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; } return n ? (h % n) : h; }
function placeDeterministically(choices, correct, seed = 0) { const n = choices.length; const idx = Math.min(n - 1, (detIndex(String(correct), n) + seed) % n); const others = choices.filter(c => c !== correct); const arranged = new Array(n); arranged[idx] = correct; let oi = 0; for (let i = 0; i < n; i++) { if (arranged[i]) continue; arranged[i] = others[oi++] || ''; } return { arranged, idx }; }
function distinctFillOptions(correct, pool, fallbackPool, allPhrases, needed = 4) { const selected = [String(correct || '').trim()]; const seen = new Set([selected[0].toLowerCase()]); const addIf = (opt) => { if (!opt) return false; const norm = String(opt).trim(); if (!norm) return false; if (seen.has(norm.toLowerCase())) return false; for (const s of selected) { if (tooSimilar(s, norm) || lexicalJaccard(s, norm) >= 0.7) return false; } selected.push(norm); seen.add(norm.toLowerCase()); return true; }; for (const c of (pool || [])) { if (selected.length >= needed) break; addIf(c); } if (selected.length < needed) { for (const c of (fallbackPool || [])) { if (selected.length >= needed) break; addIf(c); } } if (selected.length < needed) { for (const c of (allPhrases || [])) { if (selected.length >= needed) break; if (String(c).trim().toLowerCase() === selected[0].toLowerCase()) continue; addIf(c); } } const generics = ['General concepts', 'Background theory', 'Implementation details', 'Best practices']; let gi = 0; while (selected.length < needed && gi < generics.length) { addIf(generics[gi++]); } return selected.slice(0, needed); }

function inferDocTitle(text, fallback = 'Study Kit') { const lines = normalizeText(text).split(/\n+/).map(l => l.trim()); const first = lines.find(Boolean) || ''; return first.slice(0, 80) || fallback; }

function buildConceptQuestion(phrase, sentences, phrases, qi = 0, explain = false) { const hasPhrase = (p, s) => new RegExp(`\b${escapeRegExp(p)}\b`, 'i').test(s); const s = sentences.find(ss => hasPhrase(phrase, ss) && ss.length >= 50) || sentences[qi % Math.max(1, sentences.length)] || ''; const correct = summarizeSentence(s, 180); const distractPool = sentences.filter(x => x !== s && !hasPhrase(phrase, x)).slice(0, 40).map(z => summarizeSentence(z, 160)); const opts = distinctFillOptions(correct, distractPool, [], phrases, 4); const placed = placeDeterministically(opts, correct, qi % 4); return { id: `c-${qi}-${detIndex(phrase)}`, type: 'concept', question: `Which statement best describes "${phrase}"?`, options: placed.arranged, answer_index: placed.idx, explanation: explain ? `The correct statement mentions "${phrase}" in context.` : '' }; }

function buildFormulaQuestion(formula, formulas, qi = 0, explain = false) { const others = (formulas || []).filter(f => f !== formula).slice(0, 6); const opts = distinctFillOptions(formula, others, [], [], 4); const placed = placeDeterministically(opts, formula, (qi + 1) % 4); return { id: `f-${qi}-${detIndex(formula)}`, type: 'formula', question: `Which formula appears in the material?`, options: placed.arranged, answer_index: placed.idx, explanation: explain ? 'This exact formula string was detected in the text/PDF.' : '' }; }

function buildClozeQuestion(phrase, sentences, phrases, qi = 0, explain = false) { const hasPhrase = (p, s) => new RegExp(`\b${escapeRegExp(p)}\b`, 'i').test(s); const s = sentences.find(ss => hasPhrase(phrase, ss) && ss.length >= 50) || sentences[qi % Math.max(1, sentences.length)] || ''; const stem = removePhraseOnce(s, phrase); const question = `Fill in the blank: ${summarizeSentence(stem, 150)}`; const correct = phrase; const distractPool = phrases.filter(p => p !== phrase).slice(0, 12); const opts = distinctFillOptions(correct, distractPool, [], phrases, 4); const placed = placeDeterministically(opts, correct, (qi + 2) % 4); return { id: `z-${qi}-${detIndex(phrase)}`, type: 'cloze', question, options: placed.arranged, answer_index: placed.idx, explanation: explain ? `The blank corresponds to the key term "${phrase}" from the material.` : '' }; }

function buildQuiz(text, phrases, formulas, opts = {}) {
  const sentences = splitSentences(text || '');
  const { difficulty = 'balanced', includeFormulas = true, explain = false } = opts;
  const out = []; const uniquePhrases = []; const seen = new Set(); for (const p of phrases) { const key = normalizeEquivalents(p); if (seen.has(key)) continue; seen.add(key); uniquePhrases.push(p); }
  const total = 10; let wantFormula = includeFormulas ? (difficulty === 'balanced' ? 2 : 3) : 0; wantFormula = Math.min(wantFormula, (formulas || []).length);
  for (let i = 0; i < wantFormula && out.length < total; i++) out.push(buildFormulaQuestion(formulas[i], formulas, i, explain));
  let qi = 0; for (const p of uniquePhrases) { if (out.length >= total) break; const builder = (qi % 2 === 0) ? buildConceptQuestion : buildClozeQuestion; out.push(builder(p, sentences, uniquePhrases, qi, explain)); qi++; }
  let si = 0; while (out.length < total && si < sentences.length) { const s = sentences[si++]; const correct = summarizeSentence(s, 160); const distract = sentences.filter(x => x !== s).slice(0, 6).map(z => summarizeSentence(z, 150)); const opts2 = distinctFillOptions(correct, distract, [], phrases, 4); const placed = placeDeterministically(opts2, correct, (out.length + 1) % 4); out.push({ id: `s-${out.length}-${detIndex(s)}`, type: 'statement', question: `Which statement is supported by the material?`, options: placed.arranged, answer_index: placed.idx, explanation: explain ? 'This statement is derived from the provided content.' : '' }); }
  return out.slice(0, 10);
}

function buildStudyPlan(phrases, sentences, k = 7) {
  const days = []; const topics = phrases.slice(0, Math.max(k, 7));
  for (let i = 0; i < Math.min(k, topics.length || k); i++) {
    const p = topics[i] || `Focus ${i + 1}`;
    const sen = sentences.find(s => new RegExp(`\b${escapeRegExp(p)}\b`, 'i').test(s)) || '';
    const one = summarizeSentence(sen || `Study ${p} with examples from the material.`, 140);
    days.push({ title: `Day ${i + 1}: ${p}`, objectives: [ `Review the core idea behind ${p}.`, one, `Practice: write a 2–3 sentence explanation of ${p}.` ] });
  }
  while (days.length < 7) { const n = days.length + 1; days.push({ title: `Day ${n}: Practice`, objectives: [ 'Review previous mistakes', 'Revisit tough flashcards', 'Take the quiz again and track score' ] }); }
  return days.slice(0, 7);
}

export async function generateArtifacts(rawText, providedTitle = null, opts = {}) {
  try { prewarmML(); } catch {}
  const text = String(rawText || '');
  const sentences = splitSentences(text);
  const draftPhrases = extractKeyPhrases(text, 24);
  const phrases = refineKeyPhrases(draftPhrases, sentences, providedTitle || '');
  const formulas = extractFormulasFromText(text);
  const quiz = buildQuiz(text, phrases, formulas, opts);
  const flashcards = buildFlashcards(sentences, phrases, 12, providedTitle || '');
  const plan = buildStudyPlan(phrases, sentences, 7);
  const title = (providedTitle && providedTitle.trim()) || inferDocTitle(text, 'Study Kit');
  const kit = { title, quiz, flashcards, plan };
  try { const enhanced = await tryEnhanceArtifacts(kit, sentences, phrases, 140, opts); return enhanced || kit; } catch { return kit; }
}