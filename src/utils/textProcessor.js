/* Minimal, stable frontend text utilities + PDF extractors
   Goal: guarantee smooth UI with no black screens and provide working study-kit generation.
   Note: This replaces the previous very large module with a lean version that exports the same API
   used by the app: extractTextFromPDF, extractTextFromPDFQuick, generateUUID, splitSentences,
   normalizeText, ensureSentence, extractKeyPhrases, buildTheoryQuestions, generateArtifacts,
   looksLikeHeadingStrong, isAuthorish, tokenize.
*/

// -------------------- Basic helpers --------------------
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','by','for','from','has','have','if','in','into','is','it','its','of','on','that','the','to','was','were','will','with','this','those','these','your','you','i','we','our','us','their','they','them','he','she','his','her','or','nor','not','but','than','then','so','too','very','can','just','should','would','could','about','above','after','again','against','all','am','any','because','been','before','being','below','between','both','did','do','does','doing','down','during','each','few','further','here','how','more','most','other','over','own','same','some','such','under','until','up','when','where','which','while','who','whom','why','yourself','themselves','itself','ourselves','myself'
]);

export function tokenize(text) {
  const tokenRegex = /[A-Za-z][A-Za-z\-']+/g;
  const matches = (String(text || '').match(tokenRegex) || []).map(t => t.toLowerCase());
  return matches;
}

export function ensureSentence(text = '') {
  let t = String(text || '').trim();
  if (!t) return '';
  t = t.replace(/\s{2,}/g, ' ');
  if (!/[.!?]$/.test(t)) t += '.';
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t.trim();
}

export function normalizeText(raw) {
  const lines = String(raw || '').replace(/\r/g, '').split(/\n+/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  return lines.join('\n');
}

function isInstructionish(s) {
  const t = String(s || '').trim();
  if (!t) return false;
  // Common instructional prompts and headings that should not become content
  const patterns = [
    /include what it is[, ]+why it matters/i,
    /in your own words/i,
    /explain the concept\b/i,
    /summariz(e|e) the key ideas/i,
    /\banalyze\b/i,
    /identify (?:causes|consequences)/i,
    /\btheory questions?\b/i,
    /\bquestions?\s*\d+\b/i,
    /^\s*(?:q|question)\s*\d+\b/i
  ];
  for (const rx of patterns) { if (rx.test(t)) return true; }
  return false;
}

export function splitSentences(text) {
  const clean = normalizeText(text);
  const merged = clean.replace(/\s+/g, ' ').trim();
  if (!merged) return [];
  const parts = merged.split(/([.!?])\s+/).reduce((acc, cur, idx) => {
    if (idx % 2 === 1) { const prev = acc.pop() || ''; acc.push((prev + cur).trim()); }
    else { if (cur) acc.push(cur); }
    return acc;
  }, []);
  // Keep medium-length sentences, avoid all-caps headings
  return parts.map(s => s.trim()).filter(s => s.length >= 40 && /[.!?]$/.test(s) && !/^[\-A-Z0-9 ,.:]{10,}$/.test(s) && !isInstructionish(s)).slice(0, 2000);
}

export function isAuthorish(s) {
  return /\b(About the Author|author|edited by|editor|biography|Professor|Prof\.|Dr\.|Department|Institute|University|College)\b/i.test(String(s||''));
}
export function looksLikeHeadingStrong(s) {
  const t = String(s||'').trim();
  if (!t) return true;
  if (/^(table of contents|references|bibliography|index|appendix|chapter|section|contents)\b/i.test(t)) return true;
  if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(t)) return true;
  if (!/[.!?]$/.test(t) && t.split(/\s+/).length <= 8) return true;
  if (/^[A-Z0-9 ,.:\-]{10,}$/.test(t) && !/[a-z]/.test(t)) return true;
  return false;
}

export function extractKeyPhrases(text, k = 18) {
  const tokens = tokenize(text).filter(t => !STOPWORDS.has(t));
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  const scored = Array.from(counts.entries()).map(([w, c]) => [w, c * Math.log(1 + c)]).sort((a, b) => b[1] - a[1]);
  const words = scored.map(([w]) => w);
  // naive bigrams from stream
  const bi = [];
  for (let i = 0; i + 1 < tokens.length; i++) {
    const a = tokens[i], b = tokens[i+1];
    if (STOPWORDS.has(a) || STOPWORDS.has(b)) continue;
    bi.push(a + ' ' + b);
  }
  const uniq = (arr) => { const s = new Set(); const out = []; for (const x of arr) { if (!s.has(x)) { s.add(x); out.push(x); } } return out; };
  return uniq([...bi.slice(0, Math.min(k-6, 12)), ...words]).slice(0, k);
}

// -------------------- PDF extractors (fast and full) --------------------
export async function extractTextFromPDFQuick(file, options = {}) {
  const { maxPages = 24, totalBudgetMs = 4500 } = options;
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const arrayBuffer = await file.arrayBuffer();
    const t0 = Date.now();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const limitPages = Math.min(pdf.numPages || 1, Math.max(1, maxPages || pdf.numPages));
    let out = '';
    for (let i = 1; i <= limitPages; i++) {
      if (Date.now() - t0 > totalBudgetMs) break;
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent().catch(() => null);
      const items = Array.isArray(textContent?.items) ? textContent.items : [];
      const pageText = items.map(item => String(item?.str || '')).join(' ').trim();
      if (pageText) out += pageText + '\n';
      if (i % 2 === 0) await new Promise(r => setTimeout(r, 0));
    }
    return out.trim();
  } catch {
    return '';
  }
}

export async function extractTextFromPDF(file, options = {}) {
  // For stability, use the same extractor as quick but allow more time/pages.
  const { maxPages = 60 } = options;
  return await extractTextFromPDFQuick(file, { maxPages, totalBudgetMs: 10000 });
}

// -------------------- Study kit builders --------------------
function ensureCaseAndPeriod(prefix = '', text = '') {
  let t = String(text || '').trim();
  if (!t) return prefix.trim();
  t = t.replace(/\s{2,}/g, ' ');
  if (!/[.!?]$/.test(t)) t += '.';
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return (prefix ? prefix + ' ' : '') + t.trim();
}

function summarizeSentence(s, targetLen = 180) {
  if (!s) return s;
  let t = s.replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '');
  // Drop common list bullets/hyphens copied from PDFs
  t = t.replace(/^\s*(?:[•◦·➢►»›–—\-]+|\(?\d{1,3}\)?[.)]|[A-Za-z]\.)\s+/, '');
  t = t.replace(/(:)\s*[•◦·➢►»›]\s+/g, '$1 ');
  // Remove stray sequences of bullets within the sentence
  t = t.replace(/[•◦·➢►»›❖]+/g, ' ');
  // Collapse duplicated 'X: X ...' patterns
  t = t.replace(/^([^:]{2,}?)\s*:\s*\1\b/i, '$1');
  // Normalize common dashed term formatting like 'K - means' -> 'K‑means'
  t = t.replace(/\bK\s*[-–—]\s*means\b/gi, 'K‑means');
  t = t.replace(/\s{2,}/g, ' ');

  if (t.length > targetLen) {
    const cut = t.slice(0, targetLen - 1);
    const idx = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf(','), cut.lastIndexOf(';'));
    t = (idx > 20 ? cut.slice(0, idx) : cut).replace(/[,:;]$/, '') + '.';
  }
  return ensureSentence(t);
}

export function buildTheoryQuestions(rawText, phrases, total = 10, opts = {}) {
  const sents = splitSentences(rawText || '');
  const list = [
    (p, s) => `Explain the concept of "${p}" in your own words. Include what it is, why it matters, and one example from the material.`,
    (p, s) => `Summarize the key ideas behind "${p}" using 5–8 sentences, citing evidence from the material.`,
    (p, s) => `Analyze "${p}" in context. Identify causes, consequences, and two mitigation strategies.`,
  ];
  const out = []; let i = 0;
  while (out.length < total && (phrases?.length || 0) > 0) {
    const p = phrases[i % phrases.length]; i++;
    const s = sents[i % Math.max(1, sents.length)] || '';
    const q = list[out.length % list.length](p, s);
    if (q && q.length >= 40) out.push(q);
  }
  while (out.length < total) out.push(`Explain the topic in your own words. Provide context and one example.`);
  return out.slice(0, total);
}

function jaccard(a, b) {
  const A = new Set(tokenize(a).filter(t => !STOPWORDS.has(t)));
  const B = new Set(tokenize(b).filter(t => !STOPWORDS.has(t)));
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0; for (const x of A) if (B.has(x)) inter++;
  const uni = A.size + B.size - inter; return uni === 0 ? 0 : inter / uni;
}

// ---------- New: MCQ distractor transformers ----------
function flipNegations(text) {
  let t = ' ' + String(text || '') + ' ';
  t = t.replace(/\s+is\s+/gi, ' is not ');
  t = t.replace(/\s+are\s+/gi, ' are not ');
  t = t.replace(/\s+includes\s+/gi, ' excludes ');
  t = t.replace(/\s+require(s)?\s+/gi, ' does not require ');
  t = t.replace(/\s+must\s+/gi, ' may ');
  t = t.replace(/\s+only\s+/gi, ' often ');
  t = t.replace(/\s+always\s+/gi, ' often ');
  t = t.replace(/\s+never\s+/gi, ' sometimes ');
  return ensureSentence(t.trim());
}
function perturbNumbers(text) {
  const s = String(text || '');
  const rx = /(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)(%?)/;
  const m = s.match(rx);
  if (!m) return '';
  const numStr = m[1].replace(/,/g, '');
  const isPct = !!m[2];
  const num = parseFloat(numStr);
  if (!isFinite(num)) return '';
  const delta = Math.max(1, Math.round(num * 0.01));
  const cand = Math.random() < 0.5 ? num - delta : num + delta;
  const nstr = isPct ? cand.toFixed(1) + '%' : String(cand);
  const out = s.replace(rx, nstr);
  return ensureSentence(out);
}
function tweakModals(text) {
  let t = ' ' + String(text || '') + ' ';
  t = t.replace(/\s+must\s+/gi, ' may ');
  t = t.replace(/\s+shall\s+/gi, ' should ');
  t = t.replace(/\s+only\s+/gi, ' often ');
  t = t.replace(/\s+all\s+/gi, ' many ');
  t = t.replace(/\s+none\s+/gi, ' some ');
  return ensureSentence(t.trim());
}
function titleCase(str) {
  return String(str || '').split(/\s+/).map(w => w ? w[0].toUpperCase() + w.slice(1) : '').join(' ').trim();
}
function pickEntityFromSentence(s) {
  const toks = String(s||'').split(/\s+/);
  for (const w of toks) {
    if (/^[A-Z][A-Za-z0-9\-]{3,}$/.test(w)) return w;
  }
  // fallback: longest non-stopword token
  let best = ''; for (const w of toks) { const wl = w.replace(/[^A-Za-z]/g, '').toLowerCase(); if (STOPWORDS.has(wl)) continue; if (w.length > best.length) best = w; }
  return best || toks[0] || '';
}
function entitySwap(text, phrases = []) {
  const ent = pickEntityFromSentence(text);
  if (!ent) return '';
  const repl = (phrases || []).find(p => !new RegExp(`\\b${ent.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(String(text||'')) && p.length >= Math.min(4, ent.length));
  if (!repl) return '';
  const out = String(text).replace(new RegExp(`\\b${ent.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g'), repl);
  return ensureSentence(out);
}
function tooSimilar(a, b) { try { return jaccard(a, b) >= 0.6; } catch { return false; } }
function notInSource(sent, src) { try { return !src || !src.toLowerCase().includes(String(sent||'').toLowerCase()); } catch { return true; } }

function buildDistractors(correct, phrases, sourceText) {
  const c = ensureSentence(correct);
  const cands = [flipNegations(c), perturbNumbers(c), tweakModals(c), entitySwap(c, phrases)].filter(Boolean);
  const out = [];
  const seen = new Set([c.toLowerCase()]);
  for (const x of cands) {
    const t = ensureSentence(x);
    if (!t) continue;
    if (seen.has(t.toLowerCase())) continue;
    if (tooSimilar(t, c)) continue;
    if (!notInSource(t, sourceText)) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= 3) break;
  }
  return out;
}

function normalizeToLength(text, target = 120) {
  let t = ensureSentence(String(text || ''));
  const min = Math.max(60, Math.floor(target * 0.8));
  const max = Math.floor(target * 1.2);
  if (t.length > max) {
    const cut = t.slice(0, max - 1);
    const idx = Math.max(cut.lastIndexOf(' '), cut.lastIndexOf(','), cut.lastIndexOf(';'));
    t = (idx > 20 ? cut.slice(0, idx) : cut).replace(/[,:;]$/, '') + '.';
  }
  return ensureSentence(t);
}

function balanceLength(text, target = 120) {
  let t = ensureSentence(String(text || ''));
  const min = Math.max(60, Math.floor(target * 0.85));
  if (t.length < min) {
    const tails = [
      'Consider context and scope.',
      'This may vary across scenarios.',
      'Practical cases can differ.',
      'Subject to policy, limits, and approvals.',
      'Depending on jurisdiction and scope.',
      'With safeguards, governance, and audit controls.',
      'Under explicit authorization and oversight.',
      'In alignment with internal procedures and risk thresholds.',
      'As documented in the execution plan.',
      'Based on operational requirements and compliance rules.'
    ];
    const pick = tails[(Math.abs(t.length + target) % tails.length)];
    t = (t.replace(/[.!?]$/, '').trim() + '. ' + pick).replace(/\s{2,}/g,' ').trim();
    t = ensureSentence(t);
  }
  return normalizeToLength(t, target);
}

export function distinctFillOptions(correct, pool = [], needed = 4) {
  const selected = [];
  const seen = new Set();
  const targetLen = Math.max(80, Math.min(200, String(correct||'').length));
  const addIf = (opt) => {
    const norm = normalizeToLength(opt, targetLen);
    const key = norm.toLowerCase();
    if (!norm || seen.has(key)) return false;
    if (selected.some(s => jaccard(s, norm) >= 0.7)) return false;
    selected.push(norm); seen.add(key); return true;
  };
  addIf(String(correct || '').trim());
  for (const c of pool) { if (selected.length >= needed) break; addIf(c); }
  const variants = [tweakModals(correct), flipNegations(correct), perturbNumbers(correct)];
  for (const v of variants) { if (selected.length >= needed) break; if (v) addIf(v); }
  const uniq = [];
  const seen2 = new Set();
  for (const o of selected) {
    const k = (o||'').toLowerCase();
    if (!k || seen2.has(k)) continue;
    if (uniq.some(x => jaccard(x, o) >= 0.55)) continue;
    uniq.push(o); seen2.add(k);
    if (uniq.length >= needed) break;
  }
  // Last resort: duplicate a lightly tweaked modal form
  while (uniq.length < needed) {
    const v = tweakModals(correct);
    if (v && !seen2.has(v.toLowerCase()) && !uniq.some(x => jaccard(x, v) >= 0.55)) { uniq.push(normalizeToLength(v, targetLen)); seen2.add(v.toLowerCase()); }
    else break;
  }
  return uniq.slice(0, needed);
}

function ensureUniqueOptions(arranged, correct) {
  const norm = (s) => String(s || '').trim().toLowerCase();
  const out = [];
  const seen = new Set();
  for (const o of arranged || []) {
    const k = norm(o);
    if (!k || seen.has(k)) continue;
    out.push(o); seen.add(k);
    if (out.length >= 4) break;
  }
  const generics = [
    'A related but inaccurate claim about the topic.',
    'An unrelated statement that does not follow from the text.',
    'A plausible but incorrect detail about the material.',
    'A misinterpretation of the concept discussed.'
  ];
  let gi = 0;
  while (out.length < 4 && gi < generics.length) {
    const g = generics[gi++];
    const k = norm(g);
    if (!seen.has(k)) { out.push(g); seen.add(k); }
  }
  const tweak = (s) => String(s||'').replace(/\bmay\b/gi,'must').replace(/\boften\b/gi,'always').replace(/\bsometimes\b/gi,'always');
  while (out.length < 4) {
    const v = tweak(correct);
    const k = norm(v);
    if (k && !seen.has(k)) { out.push(v); seen.add(k); }
    else break;
  }
  return out.slice(0, 4);
}

// -------------------- Artifact builder with improved MCQs/Flashcards/Plan --------------------
export async function generateArtifacts(rawText, providedTitle = null, opts = {}) {
  const text = String(rawText || '');
  const allSents = splitSentences(text);
  const title = (providedTitle && providedTitle.trim()) || (normalizeText(text).split(/\n+/).find(Boolean) || 'Study Kit').slice(0, 80);

  // Try to rank sentences for variety; fallback to first N
  let baseSentences = allSents.slice(0, 60);
  try {
    const ml = await import('./ml');
    const ranked = await ml.selectTopSentences(allSents, 60, 220);
    if (Array.isArray(ranked) && ranked.length) baseSentences = ranked;
  } catch {}

  // Phrases/terms for term-definition items
  const phrases = extractKeyPhrases(text, 40);

  // Helpers for global de-duplication across the quiz
  function normKey(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  const usedCorrects = new Set();
  const usedOptionKeys = new Set();
  const usedSentenceKeys = new Set(); // avoid reusing same base sentence across questions
  const globalOptionCount = new Map(); // ensure option text appears at most once across quiz
  const usedBank = []; // global bank of option texts to avoid semantic repeats across questions
  function globallyNovel(s) { try { const t = String(s||''); for (const u of usedBank) { if (jaccard(t, u) >= 0.6) return false; } return true; } catch { return true; } }

  const total = 10;
  const quiz = [];
  let si = 0, pi = 0;

  function pickSentence() {
    for (let t = 0; t < baseSentences.length; t++) {
      const idx = (si + t) % baseSentences.length;
      const s = baseSentences[idx];
      const key = normKey(s);
      if (usedSentenceKeys.has(key)) continue;
      const candidate = ensureCaseAndPeriod('', summarizeSentence(s, 150));
      if (!globallyNovel(candidate)) continue;
      si = idx + 1;
      usedSentenceKeys.add(key);
      return s;
    }
    const s = baseSentences[si % baseSentences.length] || '';
    si++;
    usedSentenceKeys.add(normKey(s));
    return s;
  }

  function placeDeterministically(choices, correct, seed = 0) {
    const n = choices.length;
    const idx = Math.min(n - 1, (seed * 7 + 3) % n);
    const arranged = [...choices];
    const c0 = arranged[0]; arranged[0] = arranged[idx]; arranged[idx] = c0;
    return { arranged, idx };
  }

  const QUESTION_STEM_TXT = 'Which statement is accurate based on the material?';

  function nextAlt(correct, phrases, targetLen) {
    const pool = [
      tweakModals(correct),
      flipNegations(correct),
      perturbNumbers(correct),
      entitySwap(correct, phrases),
      'This statement appears related but does not reflect the material.',
      'This conclusion does not follow from the provided context.',
      'A plausible but incorrect interpretation of the content.',
      'A misreading that conflicts with the material.'
    ].filter(Boolean);
    for (const cand of pool) {
      const c = balanceLength(cand, targetLen);
      const k = normKey(c);
      if (!k) continue;
      if ((globalOptionCount.get(k) || 0) >= 1) continue;
      if (!globallyNovel(c)) continue;
      return c;
    }
    return balanceLength(tweakModals(correct), targetLen);
  }

  while (quiz.length < total && baseSentences.length > 0) {
    // Always use the same question stem for all 10, per spec
    let s = pickSentence();
    let correct = ensureCaseAndPeriod('', summarizeSentence(s, 160));
    let guard = 0;
    while ((usedCorrects.has(normKey(correct)) || !globallyNovel(correct)) && guard < 12) {
      s = pickSentence();
      correct = ensureCaseAndPeriod('', summarizeSentence(s, 160));
      guard++;
    }
    usedCorrects.add(normKey(correct));

    const d = buildDistractors(correct, phrases, text);
    let opts = distinctFillOptions(correct, d, 4);

    // Deterministic placement seeded by question index
    let placed = placeDeterministically(opts, correct, quiz.length);

    // Global uniqueness enforcement for options across all questions
    const targetLen = Math.max(100, Math.min(180, correct.length));
    let arranged = placed.arranged.map(o => balanceLength(o, targetLen));

    for (let oi = 0; oi < arranged.length; oi++) {
      const k = normKey(arranged[oi]);
      if ((globalOptionCount.get(k) || 0) >= 1 || !globallyNovel(arranged[oi])) {
        const replacement = nextAlt(correct, phrases, targetLen);
        arranged[oi] = replacement;
      }
    }

    // Ensure option set uniqueness (no two questions share same set)
    let setKey = arranged.map(normKey).sort().join('|');
    if (usedOptionKeys.has(setKey)) {
      arranged[arranged.length - 1] = nextAlt(correct, phrases, targetLen);
      setKey = arranged.map(normKey).sort().join('|');
    }
    usedOptionKeys.add(setKey);

    // Fix correct index position after adjustments
    let correctIdx = arranged.findIndex(o => normKey(o) === normKey(correct));
    if (correctIdx === -1) {
      // Force correct in
      arranged[0] = balanceLength(correct, targetLen);
      correctIdx = 0;
    }

    // Update global usage trackers
    for (const o of arranged) {
      const k = normKey(o);
      globalOptionCount.set(k, (globalOptionCount.get(k) || 0) + 1);
      usedBank.push(o);
    }

    quiz.push({ id: `q-${quiz.length}`, type: 'statement', question: QUESTION_STEM_TXT, options: arranged.slice(0,4), answer_index: correctIdx, explanation: '' });
  }

  // Pad if short
  while (quiz.length < total) {
    const s = baseSentences[quiz.length % Math.max(1, baseSentences.length)] || text || 'The material describes a topic.';
    const correct = ensureCaseAndPeriod('', summarizeSentence(s, 150));
    const d = buildDistractors(correct, phrases, text);
    let opts2 = distinctFillOptions(correct, d, 4);
    let placed = placeDeterministically(opts2, correct, quiz.length);
    const targetLen = Math.max(100, Math.min(180, correct.length));
    let arranged = placed.arranged.map(o => balanceLength(o, targetLen));
    for (let oi = 0; oi < arranged.length; oi++) {
      const k = normKey(arranged[oi]);
      if ((globalOptionCount.get(k) || 0) >= 1 || !globallyNovel(arranged[oi])) {
        arranged[oi] = balanceLength(tweakModals(correct), targetLen);
      }
    }
    for (const o of arranged) { const k = normKey(o); globalOptionCount.set(k, (globalOptionCount.get(k) || 0) + 1); usedBank.push(o); }
    quiz.push({ id: `t-${quiz.length}`, type: 'statement', question: QUESTION_STEM_TXT, options: arranged.slice(0,4), answer_index: arranged.findIndex(o => normKey(o) === normKey(correct)), explanation: '' });
  }

  // Flashcards — per-card titles
  function titleFromSentence(s, phrases) {
    const raw = String(s || '').trim();
    const colonIdx = raw.indexOf(':');
    if (colonIdx > 0 && colonIdx < 60) return titleCase(raw.slice(0, colonIdx));
    // Try phrase containment
    for (const p of phrases || []) { if (new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(raw)) return titleCase(p); }
    // Else pick top non-stopword tokens
    const toks = tokenize(raw).filter(t => !STOPWORDS.has(t)).slice(0, 4);
    return titleCase(toks.join(' ') || 'Key Idea');
  }

  let flashBase = baseSentences.slice(0, 40);
  try {
    const ml = await import('./ml');
    const ranked = await ml.selectTopSentences(baseSentences, 20, 200);
    if (Array.isArray(ranked) && ranked.length) flashBase = ranked;
  } catch {}
  const seenSig = new Set();
  const flashPicked = [];
  for (const s of flashBase) {
    const sig = tokenize(s).filter(t => !STOPWORDS.has(t)).slice(0,3).join(' ');
    if (!seenSig.has(sig)) { seenSig.add(sig); flashPicked.push(s); }
    if (flashPicked.length >= 12) break;
  }
  // Ensure flashcard backs are real content (not generic instructions) and unique
  const usedBacks = new Set();
  function normalizeBack(b) { return String(b || '').trim().toLowerCase(); }
  async function fixBack(front, back) {
    let b = String(back || '').trim();
    if (isInstructionish(b) || usedBacks.has(normalizeBack(b))) {
      try {
        const ml = await import('./ml');
        const best = await ml.bestSentenceForPhrase(front, baseSentences, 200);
        if (best) b = ensureCaseAndPeriod('', summarizeSentence(best, 200));
      } catch {}
    }
    if (!b || isInstructionish(b) || usedBacks.has(normalizeBack(b))) {
      const alt = (baseSentences.find(x => !isInstructionish(x)) || '').trim();
      if (alt) b = ensureCaseAndPeriod('', summarizeSentence(alt, 200));
    }
    if (!b || isInstructionish(b)) {
      return '';
    }
    b = ensureCaseAndPeriod('', b);
    usedBacks.add(normalizeBack(b));
    return b;
  }

  // Build initial flashcards from top sentences
  let flashcards = await Promise.all(flashPicked.map(async (s, i) => {
    const front = titleFromSentence(s, phrases);
    const back0 = ensureCaseAndPeriod('', summarizeSentence(s, 200));
    const back = await fixBack(front, back0);
    return { front, back };
  }));

  // If nothing yet, seed with whole-text summary
  if (flashcards.length === 0 && text.trim()) {
    const seed = baseSentences.find(x => !isInstructionish(x)) || '';
    if (seed) {
      const front = titleFromSentence(seed, phrases);
      const back0 = ensureCaseAndPeriod('', summarizeSentence(seed, 200));
      const back = await fixBack(front, back0);
      if (back) flashcards.push({ front, back });
    }
  }

  // Ensure at least 8 flashcards by backfilling from phrases (skip weak one-word/noise)
  const MIN_FC = 8;
  if (flashcards.length < MIN_FC) {
    const pool = phrases.slice(0, 32);
    for (let i = 0; i < pool.length && flashcards.length < MIN_FC; i++) {
      const pRaw = pool[i];
      const p = String(pRaw || '').trim();
      if (!p || p.length < 3) continue;
      if (STOPWORDS.has(p.toLowerCase())) continue;
      // avoid extremely short single-token concepts unless they reoccur strongly
      const tokCount = (p.match(/\S+/g) || []).length;
      if (tokCount === 1 && p.length < 5) continue;

      // pick best matching sentence for the phrase
      let best = '';
      try {
        const ml = await import('./ml');
        best = await ml.bestSentenceForPhrase(p, baseSentences, 180);
      } catch {}
      const back = ensureCaseAndPeriod('', summarizeSentence(best || (baseSentences[i] || text), 200));
      const front = titleCase(p);
      // de-dup by fronts
      if (!flashcards.some(fc => (fc.front||'').toLowerCase() === front.toLowerCase())) {
        flashcards.push({ front, back });
      }
    }
  }

  // Final cleanup: normalize, deduplicate by fronts and backs, collapse spacing, enforce min quality
  function collapseLetters(t) {
    try {
      if (!/\b(?:[A-Za-z]\s){4,}[A-Za-z]\b/.test(t)) return t;
      return t.replace(/\b(([A-Za-z])(?:\s+[A-Za-z]){4,})\b/g, (m) => m.replace(/\s+/g, ''));
    } catch { return t; }
  }
  const clean = (s) => {
    let t = String(s || '').replace(/\s+/g, ' ').trim();
    t = collapseLetters(t);
    // drop trailing dangling hyphens/colons
    t = t.replace(/[\-:]+$/, '').trim();
    // ensure punctuation at end for backs
    return t;
  };
  const normFront = (s) => clean(s).toLowerCase();
  const normBack = (s) => clean(s).toLowerCase();

  const seenFronts = new Set();
  const seenBacks = new Set();
  const cleaned = [];
  for (const fc of flashcards) {
    let front = titleCase(clean(fc.front));
    let back = ensureCaseAndPeriod('', clean(fc.back));
    if (!back) continue;
    if (front.length < 2) continue;
    const nf = normFront(front);
    const nb = normBack(back);
    if (seenFronts.has(nf) || seenBacks.has(nb)) continue;
    seenFronts.add(nf); seenBacks.add(nb);
    cleaned.push({ front, back });
    if (cleaned.length >= 12) break;
  }
  flashcards = cleaned;

  // If still short, try to pull real sentences from content (no generic placeholders)
  if (flashcards.length < MIN_FC) {
    for (let i = 0; i < baseSentences.length && flashcards.length < MIN_FC; i++) {
      const s = baseSentences[i];
      if (!s || isInstructionish(s)) continue;
      const front = titleFromSentence(s, phrases);
      let back = ensureCaseAndPeriod('', summarizeSentence(s, 200));
      if (!back) continue;
      const nf = normFront(front), nb = normBack(back);
      if (seenFronts.has(nf) || seenBacks.has(nb)) continue;
      seenFronts.add(nf); seenBacks.add(nb);
      flashcards.push({ front: titleCase(clean(front)), back: back });
    }
  }

  // Final sanitization: drop instruction-like/too-short backs
  flashcards = flashcards.filter(fc => !isInstructionish(fc.front) && !isInstructionish(fc.back) && /[A-Za-z]/.test(fc.back || '') && (fc.back || '').length >= 40);
  // Enforce final cap but do NOT pad with placeholders
  flashcards = flashcards.slice(0, Math.min(12, flashcards.length));

  // 7-day plan with variety
  const OBJECTIVES = [
    'Explain the core idea and key terms for {topic}.',
    'Create 3 example scenarios; contrast with a near‑miss case for {topic}.',
    'Derive 5 flashcards and self‑test twice (spaced) on {topic}.',
    'Solve 3 practice questions; write one explained solution about {topic}.',
    'Teach‑back: write a 6–8 sentence explanation for a peer on {topic}.',
    'Build a quick mind map; note dependencies, risks, and assumptions for {topic}.',
    'Review mistakes; do a timed self‑test; summarize lessons on {topic}.',
    'List common pitfalls and how to avoid them in {topic}.',
    'Summarize {topic} in 5 bullet points and one counter‑example.',
    'Relate {topic} to a real‑world use case with trade‑offs.'
  ];

  let topics = (phrases.length ? phrases.slice(0,14) : Array.from({ length: 14 }, (_, i) => `Topic ${i+1}`));
  // Deduplicate phrase signatures (first 2 tokens)
  const seenP = new Set();
  const uniqP = [];
  for (const p of topics) { const sig = String(p).split(/\s+/).slice(0,2).join(' ').toLowerCase(); if (!seenP.has(sig)) { seenP.add(sig); uniqP.push(p); } }
  topics = uniqP.slice(0, 14);

  const days = [];
  for (let i = 0; i < 7; i++) {
    const p = topics[i] || `Topic ${i+1}`;
    const templates = [];
    let start = (i * 3) % OBJECTIVES.length;
    while (templates.length < 3) { templates.push(OBJECTIVES[(start++) % OBJECTIVES.length]); }
    const objectives = templates.map(t => ensureSentence(t.replace('{topic}', p)));
    days.push({ title: `Day ${i + 1}: ${p}`, objectives });
  }

  const theory = buildTheoryQuestions(text, phrases, 10);
  return { title, quiz: quiz.slice(0, total), flashcards: flashcards.slice(0, 12), plan: days.slice(0, 7), theory };
}