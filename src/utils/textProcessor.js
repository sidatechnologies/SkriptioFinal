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
  return parts.map(s => s.trim()).filter(s => s.length >= 40 && /[.!?]$/.test(s) && !/^[-A-Z0-9 ,.:]{10,}$/.test(s)).slice(0, 2000);
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

function distinctFillOptions(correct, pool = [], needed = 4) {
  const selected = [String(correct || '').trim()].filter(Boolean);
  const seen = new Set(selected.map(s => s.toLowerCase()));
  const addIf = (opt) => {
    const norm = String(opt || '').trim(); if (!norm) return false;
    if (seen.has(norm.toLowerCase())) return false;
    // avoid near duplicates
    if (selected.some(s => jaccard(s, norm) >= 0.55)) return false;
    selected.push(norm); seen.add(norm.toLowerCase()); return true;
  };
  for (const c of pool) { if (selected.length >= needed) break; addIf(c); }
  const generics = ['General concepts', 'Background theory', 'Implementation details', 'Best practices'];
  let gi = 0; while (selected.length < needed && gi < generics.length) addIf(generics[gi++]);
  while (selected.length < needed) selected.push('Background theory');
  return selected.slice(0, needed);
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
  const repl = (phrases || []).find(p => !new RegExp(`\\b${ent.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i').test(String(text||'')) && p.length >= Math.min(4, ent.length));
  if (!repl) return '';
  const out = String(text).replace(new RegExp(`\\b${ent.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'g'), repl);
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
  function notOverused(opt) { return (globalOptionCount.get(normKey(opt)) || 0) < 1; }

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

  while (quiz.length < total && baseSentences.length > 0) {
    const typeIdx = quiz.length % 3; // 0: statement, 1: term, 2: fact

    let s = pickSentence();
    let correct = ensureCaseAndPeriod('', summarizeSentence(s, 160));
    let guard = 0;
    while ((usedCorrects.has(normKey(correct)) || !globallyNovel(correct)) && guard < 12) {
      s = pickSentence();
      correct = ensureCaseAndPeriod('', summarizeSentence(s, 160));
      guard++;
    }
    usedCorrects.add(normKey(correct));

    let question = 'Which statement is accurate based on the material?';
    let opts = [];

    if (typeIdx === 1) {
      // term definition
      const term = phrases[pi % Math.max(1, phrases.length)] || 'the topic';
      pi++;
      question = `Which option best describes ${term} as used in the material?`;
      let definition = s;
      try {
        const ml = await import('./ml');
        const best = await ml.bestSentenceForPhrase(term, baseSentences, 220);
        if (best) definition = best;
      } catch {}
      const defCorrect = ensureCaseAndPeriod('', summarizeSentence(definition, 150));
      const d = buildDistractors(defCorrect, phrases, text);
      opts = distinctFillOptions(defCorrect, d, 4);
      correct = defCorrect;
    } else if (typeIdx === 2) {
      question = 'Which of the following aligns with the material?';
      const d = buildDistractors(correct, phrases, text);
      opts = distinctFillOptions(correct, d, 4);
    } else {
      question = 'Which statement is accurate based on the material?';
      const d = buildDistractors(correct, phrases, text);
      opts = distinctFillOptions(correct, d, 4);
    }

    // Deterministic placement seeded by question index
    const placed = placeDeterministically(opts, correct, quiz.length);

    const setKey = placed.arranged.map(normKey).sort().join('|');
    if (usedOptionKeys.has(setKey)) {
      // Replace last distractor with a slight modal tweak to keep unique
      const alt = tweakModals(correct);
      if (alt && normKey(alt) !== normKey(correct)) placed.arranged[placed.arranged.length - 1] = alt;
    }
    usedOptionKeys.add(placed.arranged.map(normKey).sort().join('|'));

    for (const o of placed.arranged) {
      const key = normKey(o);
      globalOptionCount.set(key, (globalOptionCount.get(key) || 0) + 1);
      usedBank.push(o);
    }

    quiz.push({ id: `q-${quiz.length}`, type: typeIdx === 1 ? 'term' : (typeIdx === 2 ? 'fact' : 'statement'), question, options: placed.arranged, answer_index: placed.idx, explanation: '' });
  }

  // Pad if short
  while (quiz.length < total) {
    const s = baseSentences[quiz.length % Math.max(1, baseSentences.length)] || text || 'The material describes a topic.';
    const correct = ensureCaseAndPeriod('', summarizeSentence(s, 150));
    const d = buildDistractors(correct, phrases, text);
    const opts2 = distinctFillOptions(correct, d, 4);
    const placed = placeDeterministically(opts2, correct, quiz.length);
    for (const o of placed.arranged) { const key = normKey(o); globalOptionCount.set(key, (globalOptionCount.get(key) || 0) + 1); usedBank.push(o);}    
    quiz.push({ id: `t-${quiz.length}`, type: 'statement', question: `Which statement is accurate based on the material?`, options: placed.arranged, answer_index: placed.idx, explanation: '' });
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
  const flashcards = (flashPicked.map((s, i) => ({ front: titleFromSentence(s, phrases), back: ensureCaseAndPeriod('', summarizeSentence(s, 200)) })));
  if (flashcards.length === 0 && text.trim()) flashcards.push({ front: titleFromSentence(text, phrases), back: ensureCaseAndPeriod('', summarizeSentence(text, 200)) });

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