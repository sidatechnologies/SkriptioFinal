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

const FORMULA_LINE_REGEX = /([A-Za-zα-ωΑ-Ω0-9\)\(\[\]\\{\\]+\s*)[=≈≃≅≡≤≥±∓×÷∝∑∏√∫∂∞\^].+/;

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
      // keep exact as given
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

// Extract text from PDF using pdf.js with optional OCR for image/diagram pages
export async function extractTextFromPDF(file, options = {}) {
  const { forceOCR = false, ocrScale = 1.6, maxPages = 60, charLimit = 90000 } = options;
  try {
    // Use legacy bundle to avoid nested ESM imports in worker
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    // Serve worker as a static asset to avoid bundler/module resolution issues
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    // Lazy-load OCR only if needed
    let Tesseract = null;

    const startTs = Date.now();
    let ocrCount = 0;
    // Defaults for summariser; handwriting tool will pass forceOCR to override
    const OCR_MAX_PAGES = forceOCR ? 8 : 2;
    const OCR_TIME_BUDGET_MS = forceOCR ? 20000 : 6000;

    // simple binarization preprocessor for better OCR on handwriting
    const preprocessCanvasForOCR = (canvas) => {
      try {
        const ctx = canvas.getContext('2d');
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = img.data;
        // compute global threshold (fast approximation)
        let sum = 0; let n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          sum += v; n++;
        }
        const avg = sum / Math.max(1, n);
        const thr = Math.min(200, Math.max(110, avg));
        for (let i = 0; i < data.length; i += 4) {
          const v = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          const b = v > thr ? 255 : 0;
          data[i] = data[i + 1] = data[i + 2] = b;
        }
        ctx.putImageData(img, 0, 0);
      } catch {}
      return canvas;
    };

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);

      let collected = '';
      let usedOCR = false;

      if (!forceOCR) {
        const textContent = await page.getTextContent().catch(() => null);
        const items = Array.isArray(textContent?.items) ? textContent.items : [];
        const pageText = items.map(item => String(item?.str || '')).join(' ');
        collected = pageText.trim();
      }

      // Heuristic: if page has too little selectable text or looks like images/formula-heavy, try limited OCR
      const shouldTryOCR = forceOCR || ((collected.length < 80 || /Figure|Diagram|Table/i.test(collected)) && ocrCount < OCR_MAX_PAGES && (Date.now() - startTs) < OCR_TIME_BUDGET_MS);
      if (shouldTryOCR) {
        try {
          const viewport = page.getViewport({ scale: ocrScale });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            await page.render({ canvasContext: ctx, viewport }).promise;

            preprocessCanvasForOCR(canvas);

            if (!Tesseract) {
              const mod = await import('tesseract.js');
              Tesseract = mod.default || mod;
            }
            const ocr = await Tesseract.recognize(canvas, 'eng', {
              // configs that help with handwriting-ish docs
              tessedit_pageseg_mode: 1, // automatic page segmentation
              preserve_interword_spaces: '1',
              // whitelist commons to reduce gibberish
              tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:;()-%' 
            });
            if (ocr?.data?.text) {
              const otext = ocr.data.text.replace(/\s+\n/g, '\n').trim();
              if (otext.length > collected.length) {
                collected = collected ? collected + '\n' + otext : otext; // prefer OCR when stronger
              }
              usedOCR = true;
            }
            ocrCount++;
          }
        } catch (e) {
          // OCR is best-effort; continue without failing
        }
      }

      fullText += (collected || '') + '\n';
      if (i % 2 === 0) await tick(); // yield periodically on large PDFs
    }

    return fullText;
  } catch (error) {
    throw new Error(`Failed to read PDF: ${error.message}`);
  }
}

// Heuristic cleaners
function isAllCaps(s) {
  const letters = s.replace(/[^A-Za-z]/g, '');
  if (!letters) return false;
  const caps = letters.replace(/[^A-Z]/g, '').length;
  return caps / letters.length > 0.7;
}
function isTitleCaseLine(s) {
  const words = s.trim().split(/\s+/);
  if (words.length > 10) return false;
  let caps = 0;
  for (const w of words) if (w[0] && w[0] === w[0].toUpperCase()) caps++;
  return caps / Math.max(1, words.length) > 0.6;
}
function hasVerb(s) {
  return /\b(is|are|was|were|has|have|represents|means|refers|consists|contains|denotes|uses|used|measures|shows|indicates|describes|defines|computes|estimates)\b/i.test(s);
}
export function looksLikeHeading(s) {
  const t = s.trim();
  if (t.length <= 2) return true;
  if (containsFormula(t)) return false; // never drop math/formula lines
  if (/^(table of contents|references|bibliography|index|appendix|chapter|section|contents)\b/i.test(t)) return true;
  if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(t)) return true;
  if (/^fig(ure)?\s*\d+[:.]/i.test(t)) return true;
  if (isAllCaps(t)) return true;
  if (isTitleCaseLine(t)) return true;
  if (!/[.!?]$/.test(t) && t.split(/\s+/).length <= 8) return true;
  // Masked numeric headings like "X.X" or "X." should be treated as headings
  if (/^(x\.|x\.x\.|x\s*x\.)/i.test(t)) return true;
  // Also treat explicit numeric headings as headings: 1. , 1.1 , 2.3.4
  if (/^\d+(\.\d+)*\.?\s*([A-Z][A-Za-z]+\b)?(\s+.*)?$/.test(t) && !/[.!?]$/.test(t)) return true;
  // Treat lines that start with a numeric chapter label then a title as headings
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

function jaccardText(a, b) {
  const A = new Set((a || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean));
  const B = new Set((b || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean));
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const uni = A.size + B.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

export function normalizeText(raw) {
  // Remove excessive whitespace and join hyphenated line breaks
  const lines = raw.replace(/\r/g, '').split(/\n+/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];
    // Strip bullet/number markers
    l = l.replace(/^\s*([•\-*–\u2013]|\d+\.?)\s+/, '');
    // Merge lines that look like continuation (no terminal punctuation), but avoid merging formula-like lines
    if (kept.length > 0 && !/[.!?]$/.test(kept[kept.length - 1]) && !containsFormula(kept[kept.length - 1]) && !containsFormula(l)) {
      kept[kept.length - 1] = (kept[kept.length - 1] + ' ' + l).trim();
      continue;
    }
    if (!looksLikeHeading(l) || containsFormula(l)) kept.push(l);
  }
  return kept.join('\n');
}

function fixSpacing(s) {
  let t = s.replace(/\s{2,}/g, ' ').trim();
  // ensure space after period if followed by capital letter
  t = t.replace(/([a-z0-9])\.([A-Z])/g, '$1. $2');
  // replace accidental double periods
  t = t.replace(/\.\./g, '.');
  return t;
}
function repairDanglingEnd(s) {
  let t = fixSpacing(s);
  if (/(\b(a|an|the)\s*[\.:])$/i.test(t)) t = t.replace(/\b(a|an|the)\s*[\.:]$/i, '.');
  if (!/[.!?]$/.test(t)) t += '.';
  return t;
}

function isIncompleteTail(s) {
  const t = (s || '').trim();
  if (!t) return true;
  const bads = [
    /(of|to|into|onto|under|over|for|with|from)\s*(a|an|the)?\s*[\.]?$/i,
    /(such as|including|like)\s*(\.|,|;)?\s*$/i,
    /\b(is|are|was|were)\s+(a|an|the)\s*(\.|,|;)?\s*$/i,
    /:\s*$/,
    /\be\.g\.|\bi\.e\.$/i,
    /\bof\s*\.$/i
  ];
  return bads.some(rx => rx.test(t));
}

function summarizeSentence(s, targetLen = 180) {

  if (!s) return s;
  let t = s.replace(/\([^)]*\)/g, ''); // drop parentheticals
  t = t.replace(/\[[^\]]*\]/g, '');    // drop bracketed
  // remove tails after "such as/including/like ..."
  t = t.replace(/\b(such as|including|like)\b.*?([\.!?]|$)/i, '.');
  // if colon creates long clause, keep before colon
  if (t.length > targetLen * 0.9 && t.includes(':')) {
    const before = t.split(':')[0];
    if (before.length > 40) t = before + '.';
  }
  // if still too long, keep up to first two clauses
  if (t.length > targetLen * 1.1) {
    const parts = t.split(/[,;](?=\s)/);
    if (parts[0].length > 40) t = parts.slice(0, 2).join(',');
  }
  if (t.length > targetLen) t = cutToWordBoundary(t, targetLen);
  return repairDanglingEnd(t);
}

function wordsSet(s) {
  try {
    return new Set(tokenize(String(s || '')).filter(t => !STOPWORDS.has(t)));
  } catch { return new Set(); }
}
function lexicalJaccard(a, b) {
  const A = wordsSet(a); const B = wordsSet(b);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  const uni = A.size + B.size - inter; return uni === 0 ? 0 : inter / uni;
}

// Split text into sentences
export function splitSentences(text) {
  const clean = normalizeText(text);
  const merged = clean.replace(/\s+/g, ' ').trim();
  if (!merged) return [];
  // Safari-safe splitter: do not use lookbehind
  const parts = merged.split(/([.!?])\s+/).reduce((acc, cur, idx, arr) => {
    if (idx % 2 === 1) {
      // punctuation token
      const prev = acc.pop() || '';
      acc.push((prev + cur).trim());
    } else {
      // sentence chunk
      if (cur) acc.push(cur);
    }
    return acc;
  }, []);
  const res = parts
    .map(s => s.trim())
    .filter(s => s.length >= 50 && /[.!?]$/.test(s) && !isAllCaps(s))
    .slice(0, 2000);
  // Deduplicate near exact
  const seen = new Set();
  const uniq = [];
  for (const s of res) {
    const key = s.toLowerCase();
    if (!seen.has(key)) { seen.add(key); uniq.push(s); }
  }
  return uniq;
}

// Tokenize text
export function tokenize(text) {
  const tokenRegex = /[A-Za-z][A-Za-z\-']+/g;
  const matches = text.match(tokenRegex) || [];
  return matches.map(token => token.toLowerCase());
}

function refineKeyPhrases(candidates, sentences, docTitle) {
  const BAN = new Set(['used', 'reduce', 'model', 'models', 'like', 'models like', 'used reduce', 'work', 'process', 'one process', 'ongoing process']);
  const ok = [];
  const seen = new Set();
  for (const p of candidates) {
    const key = p.toLowerCase().trim();
    const tokens = key.split(' ');
    if (tokens.some(t => t.length < 3)) continue;
    if (BAN.has(key)) continue;
    if (key === 'data') continue; // too generic
    if (key.includes(' like')) continue; // skip patterns like "models like"
    if (key.startsWith('used')) continue; // skip weird "used" stems
    // must appear in at least one good sentence
    const s = sentences.find(sen => new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(sen));
    if (!s) continue;
    if (looksLikeHeadingStrong(s, docTitle)) continue;
    // prefer longer phrase over its substring
    if ([...seen].some(k => k.includes(key) || key.includes(k))) continue;
    ok.push(p);
    seen.add(key);
  }
  return ok;
}

// Extract keyPhrases: unigrams + bigrams + trigrams
export function extractKeyPhrases(text, k = 18) {
  const tokens = tokenize(text).filter(t => !STOPWORDS.has(t));
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  const addNgrams = (n) => {
    for (let i = 0; i + n <= tokens.length; i++) {
      const gram = tokens.slice(i, i + n);
      if (STOPWORDS.has(gram[0]) || STOPWORDS.has(gram[gram.length - 1])) continue;
      const phrase = gram.join(' ');
      counts.set(phrase, (counts.get(phrase) || 0) + 1);
    }
  };
  addNgrams(2); addNgrams(3);
  const scored = Array.from(counts.entries())
    .filter(([w]) => /[a-z]/.test(w) && w.length >= 4)
    .map(([w, c]) => [w, c * Math.log(1 + c)])
    .sort((a, b) => b[1] - a[1])
    .map(([w]) => w);
  // Prefer multi-word phrases first, then unigrams
  const multi = scored.filter(w => w.includes(' '));
  const uni = scored.filter(w => !w.includes(' '));
  return [...multi.slice(0, Math.min(k - 4, multi.length)), ...uni].slice(0, k);
}

// Option similarity helpers
function optionTokens(str) {
  const raw = (str || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
  const map = {
    v: 'variable', var: 'variable', vars: 'variables',
    feat: 'feature', feats: 'features',
    cls: 'class', prob: 'probability', pred: 'prediction',
    reg: 'regression', rnd: 'random'
  };
  return raw.map(w => map[w] || w);
}
function jaccard(a, b) {
  const A = new Set(optionTokens(a));
  const B = new Set(optionTokens(b));
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const uni = A.size + B.size - inter;
  return uni === 0 ? 0 : inter / uni;
}
function singularizeWord(w) {
  if (!w) return w;
  // Common exceptions and quick outs
  const exceptions = new Set(['is','this','his','was','gas','class','pass','analysis','basis','crisis','thesis']);
  if (exceptions.has(w)) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y'; // policies -> policy
  if (w.endsWith('sses')) return w.slice(0, -2); // classes -> class
  if (w.endsWith('ses') && w.length > 4) return w.slice(0, -1); // cases -> case
  if (w.endsWith('ves') && w.length > 4) return w.slice(0, -3) + 'f'; // shelves -> shelf (approx)
  if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us') && !w.endsWith('is')) return w.slice(0, -1);
  return w;
}
function normalizeMorphology(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map(singularizeWord)
    .join(' ')
    .trim();
}
function normalizeEquivalents(s) {
  if (!s) return '';
  let t = s.toLowerCase();
  t = t
    .replace(/\bnumerical\s*v\b/g, 'numerical variable')
    .replace(/\bnumerical\s*var(iable)?s?\b/g, 'numerical variable')
    .replace(/\bclass\s*lbl\b/g, 'class label')
    .replace(/\bpca\b/g, 'principal component analysis');
  // Morphological normalization (singularize basics)
  t = normalizeMorphology(t);
  return t.trim();
}
function tooSimilar(a, b) {
  if (!a || !b) return false;
  const A = normalizeEquivalents(a);
  const B = normalizeEquivalents(b);
  if (A === B) return true;
  return jaccard(A, B) >= 0.7;
}

function removePhraseOnce(sentence, phrase) {
  const rx = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i');
  // Replace the phrase with an explicit blank to avoid malformed grammar like "is a  that..."
  return sentence.replace(rx, '_____').replace(/\s{2,}/g, ' ').trim();
}

function cutToWordBoundary(text, maxLen) {
  if (!text) return text;
  // Avoid over-ellipsizing very short strings
  if (maxLen < 20) maxLen = 20;
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, Math.max(0, maxLen - 1));
  const idx = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf(','), cut.lastIndexOf(';'), cut.lastIndexOf(':'));
  const base = idx > 20 ? cut.slice(0, idx).trim() : cut.trim();
  // Prefer a clean period instead of ellipsis
  return base.replace(/[,.-:;]+$/, '') + '.';
}
function fixMidwordSpaces(s) {
  if (!s) return s;
  // Join common broken suffixes (responsibility, advantages, control, bottleneck, etc.)
  const patterns = [
    /([A-Za-z]{3,})\s+(ability|ibility|sibility|ality|ments?|ness|ship|hood|ation|ization|cation|fully|ically|ances?|tages?|gories|curity|label|linear|regression|control|bottleneck|responsibility)/gi
  ];
  let t = s;
  for (const rx of patterns) t = t.replace(rx, '$1$2');
  // Fix leading-letter splits like "I nventory" -> "Inventory"
  t = t.replace(/\b([A-Z])\s+([a-z]{5,})\b/g, '$1$2');
  // Fix intra-word hyphenation artifacts that became spaces, e.g., "require ments" -> "requirements"
  t = t.replace(/\b([A-Za-z]{3,})\s+(ment|ments|tion|tions|sion|sions|ness|ship|hood|able|ible|ally|ically)\b/gi, '$1$2');
  // Insert missing spaces for common glued terms from OCR/PDF
  t = t.replace(/\bthebottleneck\b/gi, 'the bottleneck');
  t = t.replace(/\bprocessbottleneck\b/gi, 'process bottleneck');
  t = t.replace(/\bcontinuousbottleneck\b/gi, 'continuous bottleneck');
  t = t.replace(/\bworkin\s+progress\b/gi, 'work in progress');
  // Generic: split longword+bottleneck -> longword bottleneck
  t = t.replace(/\b([a-z]{5,})(bottleneck)\b/gi, '$1 $2');
  return t;
}

// Public helper to detect author/institution lines for filtering in summariser & flashcards
export function isAuthorish(s) {
  return /\b(About the Author|author|edited by|editor|biography|Professor|Prof\.|Dr\.|Assistant Professor|Associate Professor|Lecturer|Head of|Department|Institute|University|College|UGC|Scholarship|Study Centre|Affiliation|Advisor|Mentor)\b/i.test(String(s || ''));
}

// ... rest of the large file remains unchanged

// Build theory questions (descriptive, open-ended) from sentences and phrases
function escapeRegExp(s) {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
export function buildTheoryQuestions(rawText, phrases, total = 10, opts = {}) {
  const sents = splitSentences(rawText || '');
  const { difficulty = 'balanced', docTitle = '' } = opts;
  // Prefer multi-word phrases and de-genericize
  const BAN = new Set(['work','process','one process','ongoing process','analysis tools']);
  const multi = phrases.filter(p => p && p.includes(' ') && !BAN.has(p.toLowerCase()));
  const uni = phrases.filter(p => p && !p.includes(' ') && !BAN.has(p.toLowerCase()));
  const pool = [...multi, ...uni];
  const hasPhrase = (p, s) => new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(s);
  const pickSentence = (p) => {
    const s = sents.find(ss => hasPhrase(p, ss) && !looksLikeHeadingStrong(ss, docTitle) && ss.length >= 50);
    return s || sents.find(ss => !looksLikeHeadingStrong(ss, docTitle) && ss.length >= 50) || sents[0] || '';
  };
  const templates = {
    balanced: [
      (p, s) => `Explain the concept of "${p}" in your own words. Include what it is, why it matters, and one example from the material.`,
      (p, s) => `Describe how "${p}" affects workflow efficiency. Refer to the material and outline at least two concrete impacts.`,
      (p, s) => `Summarize the key ideas behind "${p}" using 5–8 sentences, citing evidence from the material.`,
      // Q10 intentionally mirrors Q7 per spec
      (p, s) => `Explain the concept of "${p}" in your own words. Include what it is, why it matters, and one example from the material.`
    ],
    harder: [
      (p, s) => `Analyze "${p}" in context. Using the material, identify root causes, consequences, and two mitigation strategies.`,
      (p, s) => `Compare and contrast "${p}" with a related concept from the material. Discuss similarities, differences, and when each applies.`,
      (p, s) => `Given the following context, explain how it illustrates "${p}": ${summarizeSentence(s || pickSentence(p), 140)}`
    ],
    expert: [
      (p, s) => `Synthesize a detailed explanation of "${p}" that connects principles, trade‑offs, and constraints. Support your answer with material‑based examples.`,
      (p, s) => `Develop a step‑by‑step approach or checklist to diagnose and address issues related to "${p}" in practice, grounded in the material.`,
      (p, s) => `Critically evaluate the role of "${p}" within a broader system. Discuss metrics, failure modes, and improvement levers with evidence from the text.`
    ]
  };
  const list = templates[difficulty] || templates.balanced;
  const out = [];
  const used = new Set();
  let i = 0;
  while (out.length < total && i < pool.length + 20) {
    const p = pool[i % Math.max(1, pool.length)] || phrases[i % Math.max(1, phrases.length)] || 'the topic';
    i++;
    const key = normalizeEquivalents(p);
    if (used.has(key)) continue;
    used.add(key);
    const s = pickSentence(p);
    // rotate templates
    const tpl = list[out.length % list.length];
    const q = tpl(p, s);
    // Ensure descriptive prompt length
    if (!q || q.length < 60) continue;
    out.push(q);
  }
  // Backfill if we couldn't reach total
  while (out.length < total) {
    // diversify fallbacks with simple templating and phrase rotation
    const fallbackP = pool[(out.length) % Math.max(1, pool.length)] || (phrases[(out.length) % Math.max(1, phrases.length)] || 'the topic');
    const fb = list[out.length % list.length](fallbackP, pickSentence(fallbackP));
    out.push(fb && fb.length >= 60 ? fb : `Explain "${fallbackP}" in your own words, including a definition, context from the material, and one concrete example.`);
  }
  return out.slice(0, total);
}

// Build flashcards from sentences and phrases
export function buildFlashcards(sentences, phrases, total = 12, docTitle = '') {
  const cards = [];
  const used = new Set();
  const hasPhrase = (p, s) => new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(s);
  const validateFlash = (s) => {
    if (!s) return null;
    if (isAuthorish(s)) return null;
    if (looksLikeHeadingStrong(s, docTitle)) return null;
    const t = repairDanglingEnd(s);
    if (t.length < 60 || t.length > 400) return null;
    if (!hasVerb(t)) return null;
    // Drop common broken tails
    if (/(which\s+(has|is))\s*\.$/i.test(t)) return null;
    if (/(using\s+only|for)\s*\.$/i.test(t)) return null;
    if (/end\s+carry|\br\s*m\b/i.test(t)) return null;
    return t;
  };

  // Primary pass: definition-style cards per phrase
  for (const p of phrases) {
    if (cards.length >= total) break;
    const sen = sentences.find(sen => hasPhrase(p, sen) && validateFlash(sen));
    const v = validateFlash(sen);
    if (!v || used.has(p)) continue;
    used.add(p);
    const front = `Define: ${p}`;
    const back = ensureCaseAndPeriod('A.', v.length <= 280 ? v : v.slice(0, 277) + '.');
    cards.push({ front, back });
  }

  // Fallback: pick validated, non-author sentences as key ideas
  if (cards.length < total) {
    const pool = sentences.map(validateFlash).filter(Boolean);
    let i = 0;
    while (cards.length < total && i < pool.length) {
      const v = pool[i++];
      const back = ensureCaseAndPeriod('A.', v.length <= 280 ? v : v.slice(0, 277) + '.');
      cards.push({ front: 'Key idea?', back });
    }
  }

  return cards.slice(0, total);
}

// ... rest of file remains unchanged (buildStudyPlan, generateArtifacts, etc.)