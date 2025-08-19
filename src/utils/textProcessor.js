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
    if (selected.some(s => jaccard(s, norm) >= 0.7)) return false;
    selected.push(norm); seen.add(norm.toLowerCase()); return true;
  };
  for (const c of pool) { if (selected.length >= needed) break; addIf(c); }
  const generics = ['General concepts', 'Background theory', 'Implementation details', 'Best practices'];
  let gi = 0; while (selected.length < needed && gi < generics.length) addIf(generics[gi++]);
  while (selected.length < needed) selected.push('Background theory');
  return selected.slice(0, needed);
}

export async function generateArtifacts(rawText, providedTitle = null, opts = {}) {
  const text = String(rawText || '');
  const sentencesAll = splitSentences(text);
  // phrases
  const phrases = extractKeyPhrases(text, 18);
  const title = (providedTitle && providedTitle.trim()) || (normalizeText(text).split(/\n+/).find(Boolean) || 'Study Kit').slice(0, 80);

  // Build quiz
  const total = 10;
  const quiz = [];
  const baseSentences = sentencesAll.slice(0, 30);
  let si = 0;
  while (quiz.length < total && si < baseSentences.length) {
    const s = baseSentences[si++];
    const correct = summarizeSentence(s, 160);
    const distract = baseSentences.filter(x => x !== s).slice(0, 6).map(z => summarizeSentence(z, 140));
    const opts2 = distinctFillOptions(correct, distract, 4);
    const idx = Math.min(3, Math.floor(Math.random() * 4));
    const arranged = [...opts2];
    const correctVal = arranged[0]; arranged[0] = arranged[idx]; arranged[idx] = correctVal;
    quiz.push({ id: `q-${quiz.length}`, type: 'statement', question: `Which statement is supported by the material?`, options: arranged, answer_index: idx, explanation: '' });
  }
  while (quiz.length < total) {
    const s = baseSentences[quiz.length % Math.max(1, baseSentences.length)] || text || 'The material describes a topic.';
    const correct = summarizeSentence(s, 150);
    const opts2 = distinctFillOptions(correct, [], 4);
    quiz.push({ id: `t-${quiz.length}`, type: 'statement', question: `Which statement is supported by the material?`, options: opts2, answer_index: 0, explanation: '' });
  }

  // Flashcards
  const flashcards = (baseSentences.slice(0, 12).map((s, i) => ({ front: 'Key idea?', back: ensureCaseAndPeriod('', summarizeSentence(s, 200)) })));
  if (flashcards.length === 0 && text.trim()) flashcards.push({ front: 'Key idea?', back: ensureCaseAndPeriod('', summarizeSentence(text, 200)) });

  // 7-day plan (simple topics)
  const days = [];
  const topics = (phrases.length ? phrases : Array.from({ length: 7 }, (_, i) => `Topic ${i+1}`));
  for (let i = 0; i < Math.min(7, topics.length || 7); i++) {
    const p = topics[i] || `Topic ${i+1}`;
    days.push({ title: `Day ${i + 1}: ${p}`, objectives: [
      `Review the core idea behind ${p}.`,
      `Write a short explanation of ${p} in 3–4 sentences.`,
      `Do a quick self‑test on ${p}.`
    ]});
  }
  while (days.length < 7) days.push({ title: `Day ${days.length + 1}: Review`, objectives: [ 'Revisit tough flashcards', 'Write a 5‑sentence summary', 'Timed self‑test (10 mins)' ]});

  return { title, quiz: quiz.slice(0, total), flashcards: flashcards.slice(0, 12), plan: days.slice(0, 7) };
}