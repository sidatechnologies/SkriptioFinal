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

const FORMULA_LINE_REGEX = /([A-Za-zα-ωΑ-Ω0-9\)\(\[\]\{\\]+\s*)[=≈≃≅≡≤≥±∓×÷∝∑∏√∫∂∞\^].+/;

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
export async function extractTextFromPDF(file) {
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
    const OCR_MAX_PAGES = 2;
    const OCR_TIME_BUDGET_MS = 6000;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent().catch(() => null);
      const items = Array.isArray(textContent?.items) ? textContent.items : [];
      const pageText = items.map(item => String(item?.str || '')).join(' ');
      let collected = pageText.trim();

      // Heuristic: if page has too little selectable text or looks like images/formula-heavy, try limited OCR
      const shouldTryOCR = (collected.length < 80 || /Figure|Diagram|Table/i.test(collected)) && ocrCount < OCR_MAX_PAGES && (Date.now() - startTs) < OCR_TIME_BUDGET_MS;
      if (shouldTryOCR) {
        try {
          const viewport = page.getViewport({ scale: 1.3 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (ctx) {
            canvas.width = Math.ceil(viewport.width);
            canvas.height = Math.ceil(viewport.height);
            await page.render({ canvasContext: ctx, viewport }).promise;
            if (!Tesseract) {
              const mod = await import('tesseract.js');
              Tesseract = mod.default || mod;
            }
            const ocr = await Tesseract.recognize(canvas, 'eng', { logger: () => {} });
            if (ocr?.data?.text) {
              const otext = ocr.data.text.replace(/\s+\n/g, '\n').trim();
              if (otext.length > collected.length) {
                collected = collected + '\n' + otext; // merge to preserve any selectable text
              }
            }
            ocrCount++;
          }
        } catch (e) {
          // OCR is best-effort; continue without failing
        }
      }

      fullText += collected + '\n';
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
function looksLikeHeading(s) {
  const t = s.trim();
  if (t.length <= 2) return true;
  if (containsFormula(t)) return false; // never drop math/formula lines
  if (/^(table of contents|references|bibliography|index|appendix|chapter|section|contents)\b/i.test(t)) return true;
  if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(t)) return true;
  if (/^fig(ure)?\s*\d+[:.]/i.test(t)) return true;
  if (isAllCaps(t)) return true;
  if (isTitleCaseLine(t)) return true;
  if (!/[.!?]$/.test(t) && t.split(/\s+/).length <= 8) return true;
  return false;
}
function looksLikeHeadingStrong(s, docTitle = '') {
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

function normalizeText(raw) {
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
function ensureCaseAndPeriod(pattern, s) {
  let t = String(s || '').trim();
  if (!t) return t;
  // match capitalization of first letter
  const cap = /^[A-Z]/.test(String(pattern || 'A'));
  t = cap ? (t[0].toUpperCase() + t.slice(1)) : (t[0].toLowerCase() + t.slice(1));
  // ensure terminal punctuation similar to pattern (default to period)
  const pend = /[.!?]$/.test(String(pattern || '.')) ? pattern.slice(-1) : '.';
  if (!/[.!?]$/.test(t)) t += pend || '.';
  return t;
}
function adjustToLengthBand(correctLen, s, low = 0.85, high = 1.15) {
  let t = String(s || '').trim();
  if (!t) return t;
  const minL = Math.max(40, Math.floor(correctLen * low));
  // Ensure we don't over-truncate long phrases to tiny fragments
  const maxL = Math.max(60, Math.min(200, Math.ceil(correctLen * high)));
  if (t.length > maxL) t = cutToWordBoundary(t, maxL);
  // do not pad shorter; prefer natural sentences
  return t;
}

// Split text into sentences
export function splitSentences(text) {
  const clean = normalizeText(text);
  const merged = clean.replace(/\s+/g, ' ').trim();
  if (!merged) return [];
  // Split on .?! followed by space
  const parts = merged.split(/(?<=[.!?])\s+/);
  // Keep well-formed sentences only
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
  return base.replace(/[,.\-:;]+$/, '') + '.';
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

function contextFromSentence(sentence, phrase, maxLen = 220, removePhrase = true) {
  let ctx = removePhrase ? removePhraseOnce(sentence, phrase) : sentence;
  if (!ctx || ctx.length < 30) ctx = sentence;
  ctx = fixMidwordSpaces(ctx);
  // de-emphasize raw numbers to avoid giveaways
  ctx = ctx.replace(/\b\d+(\.\d+)?\b/g, 'X');
  if (!/[.!?]$/.test(ctx)) ctx += '.';
  if (ctx.length > maxLen) ctx = cutToWordBoundary(ctx, maxLen);
  ctx = fixMidwordSpaces(ctx);
  return repairDanglingEnd(ctx);
}

function detIndex(str, n) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return n ? h % n : h;
}

function placeDeterministically(choices, correct, seed = 0) {
  const n = choices.length;
  const idx = Math.min(n - 1, (detIndex(correct, n) + seed) % n);
  const others = choices.filter(c => c !== correct);
  const arranged = new Array(n);
  arranged[idx] = correct;
  let oi = 0;
  for (let i = 0; i < n; i++) {
    if (arranged[i]) continue;
    arranged[i] = others[oi++] || '';
  }
  return { arranged, idx };
}

function distinctFillOptions(correct, pool, fallbackPool, allPhrases, needed = 4) {
  // Remove empties early
  pool = (pool || []).filter(x => x && String(x).trim().length > 0);
  fallbackPool = (fallbackPool || []).filter(x => x && String(x).trim().length > 0);
  allPhrases = (allPhrases || []).filter(x => x && String(x).trim().length > 0);
  const selected = [correct];
  const seen = new Set([normalizeEquivalents(String(correct))]);
  const addIf = (opt) => {
    if (opt === undefined || opt === null) return false;
    const raw = String(opt).trim();
    if (!raw) return false;
    const normMorph = normalizeEquivalents(raw);
    if (seen.has(normMorph)) return false;
    for (const s of selected) { if (tooSimilar(String(s), raw)) return false; }
    selected.push(raw);
    seen.add(normMorph);
    return true;
  };
  for (const c of pool || []) {
    if (selected.length >= needed) break;
    addIf(c);
  }
  if (selected.length < needed) {
    for (const c of (fallbackPool || [])) {
      if (selected.length >= needed) break;
      addIf(c);
    }
  }
  if (selected.length < needed) {
    for (const c of (allPhrases || [])) {
      if (selected.length >= needed) break;
      if (c === correct) continue;
      addIf(c);
    }
  }
  // Final hard fallbacks
  const generics = ['General concepts', 'Background theory', 'Implementation details', 'Best practices'];
  let gi = 0;
  while (selected.length < needed && gi < generics.length) {
    addIf(generics[gi++]);
  }
  // Ensure exactly needed count
  return selected.slice(0, needed);
}

// TEMPLATES for variety across question types and modes
const CONCEPT_TEMPLATES = {
  balanced: [
    s => `Which concept is best described by: "${s}"`,
    s => `You observe: "${s}" Which concept best explains this?`,
    s => `Identify the concept that fits this description: "${s}"`
  ],
  harder: [
    (s, s2) => s2 ? `Evidence A: "${s}" Evidence B: "${s2}" Which concept best explains both?` : `You observe: "${s}" Which concept best explains this?`,
    s => `Select the concept that most closely matches: "${s}"`,
    s => `_____ best fits the description: "${s}"`
  ],
  expert: [
    (s, s2) => s2 ? `Consider: "${s}" And also: "${s2}" The most precise concept is:` : `Which precise concept matches: "${s}"`,
    s => `From the context, infer the concept: "${s}"`,
    s => `Choose the concept that best satisfies: "${s}"`
  ]
};
const PROPERTY_TEMPLATES = {
  balanced: [p => `Which statement about "${p}" is most accurate?`, p => `Identify the correct property of "${p}".`],
  harder: [p => `Which statement about "${p}" is most accurate?`, p => `Regarding "${p}", which is correct?`],
  expert: [p => `Select the most precise statement about "${p}".`, p => `Which proposition about "${p}" holds?`]
};
const FORMULA_TEMPLATES = {
  balanced: [c => `Which formula is referenced in this context: "${c}"`],
  harder: [c => `Given the context: "${c}", choose the referenced formula.`],
  expert: [c => `From the context, select the exact formula: "${c}"`]
};

function pickTemplate(templates, mode, seed = 0) {
  const list = templates[mode] || templates['balanced'];
  const idx = seed % list.length;
  return list[idx];
}

function validatePropSentence(s, docTitle) {
  const t = repairDanglingEnd(s);
  if (t.length < 50 || t.length > 220) return null;
  if (!hasVerb(t)) return null;
  if (looksLikeHeadingStrong(t, docTitle)) return null;
  // reject obviously incomplete tails like "... of a ." / "... such as ." / "... including ."
  if (/\b(of\s+(a|an|the)\s*\.)$/i.test(t)) return null;
  if (/(such as|including|like)\s*\.$/i.test(t)) return null;
  // reject sentences ending with dangling adjectives/terms
  const BAD_END_WORDS = ['absolute','minimum','maximum','typical','common','continuous','primary','secondary'];
  const lastWord = t.replace(/[^A-Za-z ]/g, ' ').trim().split(/\s+/).pop() || '';
  if (BAD_END_WORDS.includes(lastWord.toLowerCase())) return null;
  return t;
}

// Build quiz questions from sentences and phrases (deterministic, tougher, varied) – always return exactly `total` MCQs with 4 options each
export function buildQuiz(sentences, phrases, total = 10, opts = {}) {
  const { difficulty = 'balanced', formulas = [], docTitle = '' } = opts;
  const includeFormulas = opts.includeFormulas !== false; // default true
  // Always compute explanations so they can be toggled on after generation
  const wantExplanations = true;

  const mode = difficulty; // alias
  const modeIdx = mode === 'balanced' ? 0 : (mode === 'harder' ? 1 : 2);

  const quiz = [];
  const used = new Set();
  const cooccur = Object.fromEntries(phrases.map(p => [p, new Set()]));
  const hasPhrase = (p, s) => new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(s);
  const looksVisualRef = (s) => /\b(figure|fig\.?\s?\d+|diagram|chart|graph|table|image|see\s+(fig|diagram|table)|as\s+shown|following\s+(figure|diagram)|in\s+the\s+(figure|diagram))\b/i.test(s);
  sentences.forEach((s, idx) => {
    phrases.forEach(p => { if (hasPhrase(p, s)) cooccur[p].add(idx); });
  });

  function distractorsForConcept(p) {
    const base = cooccur[p] || new Set();
    const sims = phrases.filter(q => q !== p).map(q => {
      const inter = new Set([...base].filter(x => cooccur[q]?.has(x))).size;
      const uni = new Set([...base, ...(cooccur[q] || [])]).size || 1;
      return { q, jacc: inter / uni };
    }).sort((a, b) => b.jacc - a.jacc).map(o => o.q);
    return sims.filter(opt => !tooSimilar(opt, p));
  }

  function sentenceFor(p) {
    // Prefer non-visual references and avoid headings
    let s = sentences.find(ss => hasPhrase(p, ss) && !looksVisualRef(ss) && !looksLikeHeadingStrong(ss, docTitle) && ss.length >= 50);
    if (!s) s = sentences.find(ss => hasPhrase(p, ss) && !looksLikeHeadingStrong(ss, docTitle));
    return s || sentences.find(ss => !looksLikeHeadingStrong(ss, docTitle)) || sentences[0] || '';
  }

  function propertyText(p, maxLen = 180) {
    let s = sentenceFor(p);
    let ctx = contextFromSentence(s, p, maxLen, false);
    let t = validatePropSentence(ctx, docTitle);
    if (!t) {
      // try alternative sentence containing p
      const alt = sentences.find(ss => ss !== s && hasPhrase(p, ss) && !looksLikeHeadingStrong(ss, docTitle) && ss.length >= 50);
      if (alt) {
        ctx = contextFromSentence(alt, p, maxLen);
        t = validatePropSentence(ctx, docTitle);
      }
    }
    if (!t) {
      // use a nearby sentence in the same co-occur cluster
      const idxs = [...(cooccur[p] || [])];
      for (const i of idxs) {
        const ss = sentences[i];
        if (!ss) continue;
        const ctx2 = contextFromSentence(ss, p, maxLen);
        const cand = validatePropSentence(ctx2, docTitle);
        if (cand) { t = cand; break; }
      }
    }
    if (!t) t = repairDanglingEnd(ctx);
    return t;
  }

  // Global option usage tracker for this quiz to reduce repetition across questions
  const optionUseCount = new Map();
  const usedPropertyTextKeys = new Set();
  const normOption = (s) => normalizeEquivalents(String(s || '')).replace(/\s+/g, ' ').trim();
  const markUsed = (arr, correct) => {
    for (const o of arr) {
      const k = normOption(o);
      if (!k) continue;
      // Do not count the correct answer toward repetition penalty
      if (normOption(o) === normOption(correct)) continue;
      optionUseCount.set(k, (optionUseCount.get(k) || 0) + 1);
    }
  };

  function pickDistractorsConcept(correctPhrase) {
    // Prefer multi-word and semantically related; avoid over-used options
    const isMulti = (p) => (p || '').trim().includes(' ');
    const related = distractorsForConcept(correctPhrase).filter(p => p && p !== correctPhrase);
    const candidatePool = [
      ...related,
      ...phrases.filter(p => p !== correctPhrase)
    ].filter(p => p && p.trim().length >= 4);

    const uniq = Array.from(new Set(candidatePool));
    const score = (cand) => {
      // lexical similarity between phrases (want mid-high for harder/expert, mid for balanced)
      const sim = lexicalJaccard(correctPhrase, cand);
      const used = optionUseCount.get(normOption(cand)) || 0;
      const multi = isMulti(cand) ? 1 : 0;
      let targetLow = 0.25, targetHigh = 0.65; // balanced
      if (mode === 'harder') { targetLow = 0.4; targetHigh = 0.8; }
      if (mode === 'expert') { targetLow = 0.5; targetHigh = 0.85; }
      const band = (sim >= targetLow && sim <= targetHigh) ? 1 : 0.5;
      // penalize too similar to avoid near-tautology
      const tooClose = sim > 0.92 ? -0.5 : 0;
      return band * (1 + 0.3 * multi) - 0.25 * used + tooClose;
    };
    const ranked = uniq
      .filter(p => !tooSimilar(p, correctPhrase))
      .sort((a, b) => score(b) - score(a));

    const out = [];
    for (const c of ranked) {
      if (out.length >= 3) break;
      const nk = normOption(c);
      if (!nk) continue;
      if (optionUseCount.get(nk) >= 1) continue; // ensure at most once across quiz
      out.push(c);
    }
    // If still short, backfill with less used multi-word phrases
    let i = 0;
    while (out.length < 3 && i < phrases.length) {
      const cand = phrases[i++];
      if (!cand || cand === correctPhrase) continue;
      if (tooSimilar(cand, correctPhrase)) continue;
      if (!isMulti(cand)) continue;
      const nk = normOption(cand);
      if (optionUseCount.get(nk) >= 1) continue;
      out.push(cand);
    }
    return out.slice(0, 3);
  }

  // Precompute property sentence pool for better property distractors
  const propertyPool = [];
  const propertyByPhrase = new Map();
  const propertyTextKey = (t) => normalizeEquivalents(t).replace(/\s+/g, ' ').trim();
  for (const pp of phrases) {
    const pt = propertyText(pp, (mode !== 'balanced') ? 160 : 140);
    if (pt) { propertyPool.push({ phrase: pp, text: pt }); propertyByPhrase.set(pp, pt); }
  }

  function pickDistractorsProperty(correctSentence, correctPhrase) {
    const uniq = Array.from(new Set(propertyPool
      .filter(x => x.phrase !== correctPhrase && !tooSimilar(x.text, correctSentence))
      .map(x => x.text)));

    const score = (cand) => {
      const sim = lexicalJaccard(correctSentence, cand);
      let targetLow = 0.25, targetHigh = 0.6;
      if (mode === 'harder') { targetLow = 0.35; targetHigh = 0.75; }
      if (mode === 'expert') { targetLow = 0.45; targetHigh = 0.85; }
      const inBand = (sim >= targetLow && sim <= targetHigh) ? 1 : 0.7;
      const used = optionUseCount.get(normOption(cand)) || 0;
      const len = cand.length;
      const lenBonus = (len >= correctSentence.length * 0.7 && len <= correctSentence.length * 1.3) ? 0.3 : 0;
      return inBand + lenBonus - 0.3 * used - (sim > 0.93 ? 0.7 : 0);
    };

    const ranked = uniq.sort((a, b) => score(b) - score(a));
    const out = [];
    for (const c of ranked) {
      if (out.length >= 3) break;
      const nk = normOption(c);
      if (!nk) continue;
      if (optionUseCount.get(nk) >= 1) continue;
      out.push(c);
    }
    // Backfill from any property texts if still short
    let i = 0;
    while (out.length < 3 && i < uniq.length) {
      const cand = uniq[i++];
      const nk = normOption(cand);
      if (!nk) continue;
      if (optionUseCount.get(nk) >= 1) continue;
      out.push(cand);
    }
    return out.slice(0, 3);
  }

  function buildConceptQ(s, phrase, seed = 0) {
    // Avoid visual references & headings; fall back to better sentence
    if (looksVisualRef(s) || looksLikeHeadingStrong(s, docTitle)) s = sentenceFor(phrase);
    let primary = contextFromSentence(s, phrase);
    let secondary = '';
    if (mode !== 'balanced') {
      const related = distractorsForConcept(phrase);
      const alt = sentences.find(t => t !== s && (hasPhrase(phrase, t) || related.slice(0, 3).some(rp => hasPhrase(rp, t))) && t.length >= 50 && !looksVisualRef(t) && !looksLikeHeadingStrong(t, docTitle));
      if (alt) secondary = contextFromSentence(alt, phrase, 160);
    }
    const tpl = pickTemplate(CONCEPT_TEMPLATES, mode, seed);
    const qtext = tpl(primary, secondary);

    const distractors = pickDistractorsConcept(phrase).map(fixSpacing);
    const allOpts = [phrase, ...distractors];
    const { arranged, idx } = placeDeterministically(allOpts, phrase, modeIdx);
    const explanation = wantExplanations ? `Context: ${primary}${secondary ? ' | ' + secondary : ''}` : undefined;
    markUsed(arranged, phrase);
    return { question: qtext, options: arranged, answer_index: idx, qtype: 'concept', explanation };
  }

  function buildPropertyQ(phrase, seed = 0) {
    const stem = pickTemplate(PROPERTY_TEMPLATES, mode, seed)(phrase);
    let correct = propertyText(phrase, (mode !== 'balanced') ? 160 : 140);

    // Summarize overly long correct sentence
    if (correct.length > 160) correct = summarizeSentence(correct, 150);
    if (isIncompleteTail(correct)) return null; // skip bad property items entirely

    let distractors = pickDistractorsProperty(correct, phrase);
    // If we couldn't find enough statement-like distractors, synthesize by substituting the phrase
    if (distractors.length < 3) {
      const synth = [];
      const relPhrases = phrases.filter(p => p && p !== phrase);
      for (const r of relPhrases) {
        try {
          const rx = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'ig');
          let v = correct.replace(rx, r);
          v = adjustToLengthBand(correct.length, v, 0.92, 1.08);
          v = ensureCaseAndPeriod(correct, v);
          const vv = validatePropSentence(v, docTitle);
          if (!vv) continue;
          if (tooSimilar(vv, correct)) continue;
          synth.push(vv);
          if (synth.length >= 6) break;
        } catch {}
      }
      const merged = Array.from(new Set([...distractors, ...synth]));
      distractors = merged.slice(0, 3);
    }

    // avoid tautology: don't allow the phrase itself to appear as any option
    const notPhrase = (s) => s && s.trim().toLowerCase() !== phrase.trim().toLowerCase();

    const optsArr = distinctFillOptions(correct, distractors, [], [], 4)
      .filter(notPhrase)
      .map(fixSpacing);

    // As a final guard, if any option equals the phrase, replace it with a safe generic
    const GENERIC = ['Background theory', 'General concept', 'Related idea'];
    for (let i = 0; i < optsArr.length; i++) {
      if (!notPhrase(optsArr[i]) || !optsArr[i]) optsArr[i] = GENERIC[i % GENERIC.length];
    }
    while (optsArr.length < 4) {
      optsArr.push(GENERIC[optsArr.length % GENERIC.length]);
    }

    // Normalize all options (including correct) to match capitalization and punctuation of the correct answer
    const normalized = optsArr.map(o => ensureCaseAndPeriod(correct, adjustToLengthBand(correct.length, o, 0.85, 1.15)));
    const normCorrect = ensureCaseAndPeriod(correct, correct);

    const { arranged, idx } = placeDeterministically(normalized, normCorrect, modeIdx);
    markUsed(arranged, normCorrect);
    const explanation = wantExplanations ? `From text: ${normCorrect}` : undefined;
    return { question: stem, options: arranged, answer_index: idx, qtype: 'property', explanation };
  }

  // Optionally inject formula-based questions using exact formulas from content
  const formulaQs = [];
  const formulaPoolRaw = Array.from(new Set(formulas.filter(f => f && f.trim()).map(f => f.trim())));
  const formulaPool = includeFormulas ? formulaPoolRaw : [];
  function buildFormulaQ(formula, contextSentence, seed = 0) {
    const ctx = contextSentence ? contextFromSentence(contextSentence, formula) : 'Select the formula exactly as presented in the material.';
    const qtext = pickTemplate(FORMULA_TEMPLATES, mode, seed)(ctx);
    const optsArr = distinctFillOptions(formula, formulaPool.filter(f => f !== formula), phrases, formulaPool, 4);
    const placedF = placeDeterministically(optsArr, formula, modeIdx);
    const explanation = wantExplanations ? 'Exact match required from provided material.' : undefined;
    return { question: qtext, options: placedF.arranged, answer_index: placedF.idx, qtype: 'formula', explanation };
  }

  // Build pool of candidates for concept/property questions
  // Increase mode separation: expert favors rare concepts and more properties; harder mid; balanced easy
  const conceptTargets = [];
  for (const s of sentences) {
    if (looksVisualRef(s) || looksLikeHeadingStrong(s, docTitle)) continue;
    const phrase = phrases.find(p => p.includes(' ') && hasPhrase(p, s) && !used.has(p))
      || phrases.find(p => hasPhrase(p, s) && !used.has(p));
    if (!phrase) continue;
    if (detIndex(phrase, 3) !== modeIdx) continue;
    conceptTargets.push({ s, phrase });
  }
  if (conceptTargets.length < Math.ceil(total * 0.6)) {
    for (const s of sentences) {
      if (conceptTargets.length >= Math.ceil(total * 0.6)) break;
      if (looksVisualRef(s) || looksLikeHeadingStrong(s, docTitle)) continue;
      const phrase = phrases.find(p => hasPhrase(p, s) && !used.has(p));
      if (!phrase) continue;
      if (!conceptTargets.some(ct => ct.phrase === phrase)) conceptTargets.push({ s, phrase });
    }
  }

  // Choose composition based on difficulty
  const wantFormula = Math.min(formulaPool.length, mode === 'balanced' ? 1 : 2);
  const wantProperty = mode === 'expert' ? 5 : (mode === 'harder' ? 4 : 2);
  const wantConcept = Math.max(0, total - wantFormula - wantProperty);

  // Build concept questions (prioritize rarer/less frequent phrases for harder/expert)
  const rarity = new Map(phrases.map(p => [p, 0]));
  sentences.forEach(s => phrases.forEach(p => { if (hasPhrase(p, s)) rarity.set(p, (rarity.get(p) || 0) + 1); }));
  const sortedConcepts = conceptTargets.sort((a, b) => {
    const ra = rarity.get(a.phrase) || 0;
    const rb = rarity.get(b.phrase) || 0;
    return (mode !== 'balanced') ? ra - rb : rb - ra;
  });
  for (let i = 0; i < sortedConcepts.length && quiz.length < wantConcept; i++) {
    const { s, phrase } = sortedConcepts[i];
    if (used.has(phrase)) continue;
    const q = buildConceptQ(s, phrase, i + modeIdx);
    if (!q) continue;
    // Length-balance options against the correct answer for concept items too
    const corr = q.options[q.answer_index] || '';
    const banded = q.options.map(o => adjustToLengthBand(corr.length, o, 0.85, 1.15));
    const punct = banded.map(o => ensureCaseAndPeriod(corr, o));
    used.add(phrase);
    quiz.push({ id: generateUUID(), ...q, options: punct });
  }

  // Build property questions
  const propPhrases = phrases.filter(p => !used.has(p));
  let pi = 0;
  const seenPropertyStems = new Set();
  while (quiz.length < wantConcept + wantProperty && pi < propPhrases.length) {
    const p = propPhrases[pi++];
    if (detIndex(p, 3) !== modeIdx && quiz.length < wantConcept) continue;
    const q = buildPropertyQ(p, pi + modeIdx);
    if (!q || !q.question || !Array.isArray(q.options) || q.answer_index == null) continue;
    // Stricter global de-dup: disallow reusing nearly identical property sentences across different phrases
    const pk = normalizeEquivalents((q.options[q.answer_index] || '').toString());
    if (seenPropertyStems.has(pk)) continue;
    seenPropertyStems.add(pk);
    used.add(p);
    quiz.push({ id: generateUUID(), ...q });
  }

  // Inject formula questions
  const formulaToSentence = new Map();
  for (const s of sentences) {
    for (const f of formulaPool) {
      if (!looksVisualRef(s) && !looksLikeHeadingStrong(s, docTitle) && !formulaToSentence.has(f) && s.includes(f.replace(/[$]/g, ''))) {
        formulaToSentence.set(f, s);
      }
    }
  }
  let fi = 0;
  while (formulaQs.length < wantFormula && fi < formulaPool.length) {
    const f = formulaPool[fi++];
    const s = formulaToSentence.get(f) || sentences.find(ss => ss.includes(f.replace(/[$]/g, '')));
    if (!s) continue;
    const fq = buildFormulaQ(f, s, fi + modeIdx);
    formulaQs.push({ id: generateUUID(), ...fq });
  }

  // Merge and pad
  let combined = [...quiz, ...formulaQs];

  // Fallback padding with remaining concept/property ensuring disjointness where possible
  let ci = 0;
  while (combined.length < total && ci < conceptTargets.length) {
    const { s, phrase } = conceptTargets[ci++];
    if (combined.some(q => q && q.qtype === 'concept' && Array.isArray(q.options) && q.options[q.answer_index] === phrase)) continue;
    const q = buildConceptQ(s, phrase, ci + modeIdx);
    if (!q || !q.question || !Array.isArray(q.options) || q.answer_index == null) continue;
    combined.push({ id: generateUUID(), ...q });
  }
  let pj = 0;
  while (combined.length < total && pj < phrases.length) {
    const p = phrases[pj++];
    const q = buildPropertyQ(p, pj + modeIdx);
    if (!q || !q.question || !Array.isArray(q.options) || q.answer_index == null) continue;
    combined.push({ id: generateUUID(), ...q });
  }

  // Final safeguards: deduplicate questions by stem and enforce distinctness where possible
  const seenQ = new Set();
  const final = [];
  // Enforce progressive difficulty: earlier questions easier, later harder
  const reorderForProgression = (arr) => {
    const concept = arr.filter(q => q.qtype === 'concept');
    const property = arr.filter(q => q.qtype === 'property');
    const formula = arr.filter(q => q.qtype === 'formula');
    if (mode === 'balanced') {
      // start with concept, then property, end with 1 formula if any
      return [...concept.slice(0, 6), ...property.slice(0, 3), ...formula.slice(0, 1), ...concept.slice(6), ...property.slice(3), ...formula.slice(1)];
    }
    if (mode === 'harder') {
      // mix: concept -> property -> concept -> formula
      return [...concept.slice(0, 4), ...property.slice(0, 4), ...concept.slice(4, 6), ...formula.slice(0, 2), ...concept.slice(6), ...property.slice(4), ...formula.slice(2)];
    }
    // expert: more properties and formulas later
    return [...concept.slice(0, 3), ...property.slice(0, 5), ...formula.slice(0, 2), ...concept.slice(3), ...property.slice(5), ...formula.slice(2)];
  };
  for (const q of combined) {
    if (!q || !q.question || typeof q.question !== 'string') continue;
    if (!Array.isArray(q.options) || q.answer_index == null) continue;
    const key = q.question.toLowerCase();
    if (seenQ.has(key)) continue;

    // Clean options; keep the correct answer intact
    const filteredOptions = (q.options || [])
      .map(o => (o ?? '').toString().trim())
      .map(fixSpacing)
      .filter(o => o && o.trim().length >= (q.qtype === 'property' ? 20 : 2));
    // If less than 4, pad deterministically using phrases and safe generics
    let padded = filteredOptions.slice();
    if (padded.length < 4) {
      const correct = (q.options[q.answer_index] || '').toString();
      const fallbackPool = phrases.filter(p => p && p !== correct);
      const generics = ['General concepts', 'Background theory', 'Implementation details', 'Best practices'];
      const need = 4 - padded.length;
      for (let i = 0, gi = 0; padded.length < 4 && i < fallbackPool.length; i++) {
        const cand = fallbackPool[i];
        if (!padded.includes(cand)) padded.push(cand);
        if (i === fallbackPool.length - 1 && padded.length < 4 && gi < generics.length) padded.push(generics[gi++]);
      }
      while (padded.length < 4 && generics.length) padded.push(generics[padded.length % generics.length]);
    }
    const correctedIndex = Math.min(q.answer_index, padded.length - 1);

    seenQ.add(key);
    final.push({ ...q, options: padded, answer_index: correctedIndex });
    if (final.length >= total) break;
  }

  // Ensure each question has 4 distinct options, remove broken fragments, and trim to total
  const BAD_TAIL = /(of\s+(a|an|the)\s*\.|such as\s*\.|including\s*\.|\b(a|an|the|multiple|several|various)\s*\.|^\s*(analysis tools|tools|lean management|work stage|one process|ongoing process|work))\.?\s*$/i;
  const globalSeen = new Set();
  const normKey = (s) => normalizeEquivalents(String(s || ''))
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Stricter global de-dup for stems across questions (concept and property):
  const stemSeen = new Set();
  const orderedRaw = reorderForProgression(final);
  const ordered = [];
  for (const q of orderedRaw) {
    const stem = normalizeEquivalents((q.question || '').replace(/".*?"/g, '').replace(/[^a-z0-9 ]/gi, ' ')).trim();
    if (stem && stemSeen.has(stem)) continue;
    stemSeen.add(stem);
    ordered.push(q);
    if (ordered.length >= total) break;
  }
  // If we filtered too aggressively, backfill from remaining
  let oi = 0;
  while (ordered.length < total && oi < orderedRaw.length) {
    const q = orderedRaw[oi++];
    if (!ordered.includes(q)) ordered.push(q);
  }
  const fixed = ordered.map((q, i) => {
    const correct = (q.options[q.answer_index] || '').trim();
    const minLen = q.qtype === 'property' ? 30 : 3;
    // Within-question normalized dedupe to avoid same option twice
    const normOpt = (s) => normalizeEquivalents(String(s || '')).replace(/\s+/g, ' ').trim();
    const seenLocal = new Set();
    const cleanedOpts = q.options
      .map(o => (o || '').trim())
      .filter(o => (q.qtype === 'formula' ? true : (o.length >= minLen && !BAD_TAIL.test(o))))
      .filter(o => o.toLowerCase() !== (q.qtype !== 'formula' ? q.question.toLowerCase() : ''))
      .filter(o => { const k = normOpt(o); if (!k || seenLocal.has(k)) return false; seenLocal.add(k); return true; });

    // Start from cleaned options; ensure the correct answer is present
    let arranged = cleanedOpts.slice();
    if (!arranged.some(o => normOpt(o) === normOpt(correct))) arranged.push(correct);

    // Type-specific padding to 4 options
    if (arranged.length < 4) {
      if (q.qtype === 'property') {
        const len = correct.length || 100;
        const candidates = Array.from(new Set(propertyPool.map(x => x.text)))
          .filter(t => t && t !== correct)
          .filter(t => validatePropSentence(t, docTitle))
          .filter(t => !tooSimilar(t, correct));
        // Tighter length band to avoid one-liners among long statements
        const inBand = candidates.filter(t => t.length >= Math.floor(len * 0.8) && t.length <= Math.ceil(len * 1.25));
        const pool = inBand.length >= 3 ? inBand : candidates;
        for (let ci = 0; arranged.length < 4 && ci < pool.length; ci++) {
          const cand = ensureCaseAndPeriod(correct, adjustToLengthBand(correct.length, pool[ci], 0.85, 1.15));
          if (!cand) continue;
          if (arranged.includes(cand)) continue;
          arranged.push(cand);
        }
      } else if (q.qtype === 'concept') {
        const candPool = [...phrases, 'General concepts', 'Background theory', 'Implementation details', 'Best practices'];
        for (let ci = 0; arranged.length < 4 && ci < candPool.length; ci++) {
          const cand = ensureCaseAndPeriod(correct, adjustToLengthBand(correct.length, candPool[ci], 0.85, 1.15));
          if (!cand) continue;
          if (arranged.includes(cand)) continue;
          if (tooSimilar(cand, correct)) continue;
          arranged.push(cand);
        }
      } else if (q.qtype === 'formula') {
        const pool = formulaPool.filter(f => f && f !== correct);
        for (let ci = 0; arranged.length < 4 && ci < pool.length; ci++) {
          const cand = pool[ci];
          if (!cand) continue;
          if (arranged.includes(cand)) continue;
          arranged.push(cand);
        }
      }
    }

    // Enforce cross-question option diversity
    const correctKey = normKey(correct);
    for (let k = 0; k < arranged.length; k++) {
      const key = normKey(arranged[k]);
      const isCorrectOpt = key === correctKey;
      if (!isCorrectOpt && globalSeen.has(key)) {
        // find replacement not used globally and not too similar to the correct answer
        const candidates = [...phrases, 'General concepts', 'Background theory', 'Implementation details', 'Best practices'];
        let repl = null;
        for (const cand of candidates) {
          const ck = normKey(cand);
          if (!ck) continue;
          if (globalSeen.has(ck)) continue;
          if (arranged.some(x => normKey(x) === ck)) continue;
          if (tooSimilar(cand, correct)) continue;
          repl = ensureCaseAndPeriod(correct, adjustToLengthBand(correct.length, cand, 0.85, 1.15));
          break;
        }
        if (repl) arranged[k] = repl;
      }
      globalSeen.add(normKey(arranged[k]));
    }

    // Unify option display lengths: summarize long options to a reasonable target window and remove ellipsis
    const correctLen = (correct || '').length || 0;
    const targetLen = Math.min(100, Math.max(60, Math.round(correctLen * 1.2)));
    arranged = arranged.map((opt) => {
      let v = (opt || '').toString().trim();
      if (v.length > targetLen) v = summarizeSentence(v, targetLen);
      v = v.replace(/\.\.\.$/, '.');
      v = ensureCaseAndPeriod(correct, v);
      return v;
    });

    // Deterministic placement of the correct answer among arranged options to avoid bias
    const { arranged: placedArr, idx: placedIdx } = placeDeterministically(arranged, correct, (i + modeIdx) % 4);
    const resolvedIdx = placedArr.indexOf(correct);
    return { ...q, options: placedArr, answer_index: resolvedIdx >= 0 ? resolvedIdx : placedIdx, qtype: q.qtype || 'mcq', explanation: q.explanation };
  });

  // Standardize punctuation on short label-like options across all questions
  const isLabel = (s) => (s || '').split(/\s+/).filter(Boolean).length <= 3 && !/[,:;]/.test(s || '');
  for (let i = 0; i < fixed.length; i++) {
    const q = fixed[i];
    const prevCorrect = q.options[q.answer_index] || '';
    const cleaned = q.options.map((o) => {
      const v = (o || '').toString();
      return isLabel(v) ? v.replace(/[\.;:,]+$/,'').trim() : v.trim();
    });
    const correctCleaned = cleaned[q.answer_index] || prevCorrect;
    // Re-place deterministically to keep bias-free ordering after cleaning
    const { arranged, idx } = placeDeterministically(cleaned, correctCleaned, (i + modeIdx) % 4);
    fixed[i] = { ...q, options: arranged, answer_index: idx };
  }

  // If still fewer than total (edge-case), synthesize filler concept items
  if (fixed.length < total) {
    const fillerNeeded = total - fixed.length;
    for (let i = 0; i < fillerNeeded; i++) {
      const phrase = phrases[(i + modeIdx) % Math.max(1, phrases.length)] || 'Concept';
      const stem = `Which concept best matches: "${(sentences[i % sentences.length] || phrase).slice(0, 180)}"`;
      const correct = phrase;
      const basePool = phrases.filter(p => p !== correct);
      const optsArr = distinctFillOptions(correct, basePool, [], phrases, 4).map(o => ensureCaseAndPeriod(correct, o));
      const placedC = placeDeterministically(optsArr, correct, (i + modeIdx) % 4);
      fixed.push({ id: generateUUID(), question: stem, options: placedC.arranged, answer_index: placedC.idx, qtype: 'concept' });
    }
  }

  return fixed;
}

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
      (p, s) => `Summarize the key ideas behind "${p}" using 5–8 sentences, citing evidence from the material.`
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
    out.push('Explain a core idea from the material in depth. Include definitions, context, and an example.');
  }
  return out.slice(0, total);
}

// Build flashcards from sentences and phrases
export function buildFlashcards(sentences, phrases, total = 12) {
  const cards = [];
  const used = new Set();
  const hasPhrase = (p, s) => new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(s);
  for (const p of phrases) {
    if (cards.length >= total) break;
    const s = sentences.find(sen => hasPhrase(p, sen));
    if (!s || used.has(p) || s.length < 60) continue;
    used.add(p);
    const front = `Define: ${p}`;
    const back = s.length <= 280 ? s : s.slice(0, 277) + '...';
    cards.push({ front, back });
  }
  // Add generic concept questions if needed
  while (cards.length < total && sentences.length > 0) {
    const s = sentences[cards.length % sentences.length];
    const back = s.length <= 280 ? s : s.slice(0, 277) + '...';
    cards.push({ front: 'Key idea?', back });
  }
  return cards.slice(0, total);
}

// Build 7-day study plan using topical grouping
export function buildStudyPlan(sentences, phrases) {
  const days = 7;
  const groups = Array.from({ length: days }, () => []);
  // Assign sentences greedily to phrase buckets by first match
  const buckets = phrases.slice(0, days).map(p => ({ phrase: p, items: [] }));
  const hasPhrase = (p, s) => new RegExp(`\\b${escapeRegExp(p)}\\b`, 'i').test(s);
  for (const s of sentences) {
    const idx = buckets.findIndex(b => hasPhrase(b.phrase, s));
    if (idx !== -1) buckets[idx].items.push(s);
  }
  // Backfill remaining sentences round-robin
  const remaining = sentences.filter(s => !buckets.some(b => b.items.includes(s)));
  let ri = 0;
  for (const s of remaining) { buckets[ri % buckets.length].items.push(s); ri++; }

  const plan = [];
  for (let d = 0; d < days; d++) {
    const bucket = buckets[d % buckets.length];
    const chunk = bucket.items.slice(0, 3);
    const objectives = chunk.length ? chunk : [`Review concept: ${bucket.phrase}`];
    const title = `Day ${d + 1}: ${bucket.phrase || 'Focus'}`;
    plan.push({ day: d + 1, title, objectives });
  }
  return plan;
}

// Main function to generate all study artifacts (async to optionally use ML refinement)
export async function generateArtifacts(rawText, title = null, options = {}) {
  prewarmML(); // schedule ML model load in the background ASAP
  const { difficulty = 'balanced', includeFormulas = true, explain = false } = options;
  const text = rawText.trim();
  if (!text) {
    throw new Error('Empty content');
  }
  const limitedText = text.length > 150000 ? text.slice(0, 150000) : text;

  await tick();
  const normalized = normalizeText(limitedText);
  const firstLine = (limitedText.split(/\n+/).map(l => l.trim()).find(l => l.length > 0)) || '';
  let sentences = splitSentences(limitedText);
  await tick();
  if (sentences.length === 0) {
    // Create pseudo-sentences by chunking
    sentences = [];
    for (let i = 0; i < Math.min(limitedText.length, 2000); i += 160) {
      sentences.push(limitedText.slice(i, i + 160));
    }
  }

  await tick();
  // Prefer keyphrases (multi-word) with unigram fallback, then refine
  let phrases = extractKeyPhrases(limitedText, 18);
  phrases = refineKeyPhrases(phrases, sentences, firstLine);
  if (phrases.length < 8) {
    // fallback to add more tokens ignoring refine, but skip banned
    const extra = extractKeyPhrases(limitedText, 24).filter(p => !phrases.includes(p));
    phrases.push(...refineKeyPhrases(extra, sentences, firstLine));
  }

  // Extract exact formulas from content and keep them intact
  const formulas = extractFormulasFromText(limitedText);

  await tick();
  // Heuristic build first (fast) – all MCQ; enforce 10
  let quiz = buildQuiz(sentences, phrases, 10, { difficulty, formulas, includeFormulas, explain, docTitle: firstLine });
  await tick();
  let flashcards = buildFlashcards(sentences, phrases, 12);
  await tick();
  let plan = buildStudyPlan(sentences, phrases);

  const base = {
    id: generateUUID(),
    title: title || (sentences[0] ? sentences[0].slice(0, 40) + '...' : 'Untitled'),
    text: limitedText,
    created_at: new Date().toISOString(),
    quiz,
    flashcards,
    plan
  };

  // Try ML refinement quickly: enhance options & explanations without flattening question types or mode differences
  try {
    const enhanced = await tryEnhanceArtifacts(base, sentences, phrases, 140, { difficulty, formulas, preserveTypes: true });
    return enhanced || base;
  } catch {
    return base;
  }
}