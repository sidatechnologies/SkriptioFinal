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

// Extract text from PDF using pdf.js
export async function extractTextFromPDF(file) {
  try {
    // Use legacy bundle to avoid nested ESM imports in worker
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    // Serve worker as a static asset to avoid bundler/module resolution issues
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      fullText += pageText + '\n';
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
function looksLikeHeading(s) {
  const t = s.trim();
  if (t.length <= 2) return true;
  if (/^(table of contents|references|bibliography|index|appendix|chapter|section|contents)\b/i.test(t)) return true;
  if (/^page\s+\d+(\s+of\s+\d+)?$/i.test(t)) return true;
  if (/^fig(ure)?\s*\d+[:.]/i.test(t)) return true;
  if (isAllCaps(t)) return true;
  if (isTitleCaseLine(t)) return true;
  if (!/[.!?]$/.test(t) && t.split(/\s+/).length <= 8) return true;
  return false;
}
function normalizeText(raw) {
  // Remove excessive whitespace and join hyphenated line breaks
  const lines = raw.replace(/\r/g, '').split(/\n+/).map(l => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    let l = lines[i];
    // Strip bullet/number markers
    l = l.replace(/^\s*([•\-*–\u2013]|\d+\.?)\s+/, '');
    // Merge lines that look like continuation (no terminal punctuation)
    if (kept.length > 0 && !/[.!?]$/.test(kept[kept.length - 1])) {
      kept[kept.length - 1] = (kept[kept.length - 1] + ' ' + l).trim();
      continue;
    }
    if (!looksLikeHeading(l)) kept.push(l);
  }
  return kept.join('\n');
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

// Extract keyPhrases: unigrams + bigrams + trigrams
export function extractKeyPhrases(text, k = 14) {
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
  return (str || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
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
function tooSimilar(a, b) {
  if (!a || !b) return false;
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return true;
  return jaccard(a, b) >= 0.7; // stricter threshold
}

function removePhraseOnce(sentence, phrase) {
  const rx = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
  return sentence.replace(rx, '').replace(/\s{2,}/g, ' ').trim();
}

function contextFromSentence(sentence, phrase, maxLen = 220) {
  let ctx = removePhraseOnce(sentence, phrase);
  if (!ctx || ctx.length < 30) ctx = sentence;
  // de-emphasize raw numbers to avoid giveaways
  ctx = ctx.replace(/\b\d+(\.\d+)?\b/g, 'X');
  if (!/[.!?]$/.test(ctx)) ctx += '.';
  if (ctx.length > maxLen) ctx = ctx.slice(0, maxLen - 3) + '...';
  return ctx;
}

function detIndex(str, n) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return n ? h % n : h;
}

function placeDeterministically(choices, correct) {
  const n = choices.length;
  const idx = Math.min(n - 1, detIndex(correct, n));
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
  const selected = [correct];
  const seen = new Set([correct.toLowerCase()]);
  const addIf = (opt) => {
    if (!opt) return false;
    const norm = opt.trim();
    if (!norm) return false;
    if (seen.has(norm.toLowerCase())) return false;
    for (const s of selected) { if (tooSimilar(s, norm)) return false; }
    selected.push(norm);
    seen.add(norm.toLowerCase());
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

// Build quiz questions from sentences and phrases (deterministic, tough, non-cloze) – always return exactly `total` MCQs with 4 options each
export function buildQuiz(sentences, phrases, total = 10) {
  const quiz = [];
  const used = new Set();
  const cooccur = Object.fromEntries(phrases.map(p => [p, new Set()]));
  const hasPhrase = (p, s) => new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(s);
  sentences.forEach((s, idx) => {
    phrases.forEach(p => { if (hasPhrase(p, s)) cooccur[p].add(idx); });
  });

  function distractorsFor(p) {
    const base = cooccur[p] || new Set();
    const sims = phrases.filter(q => q !== p).map(q => {
      const inter = new Set([...base].filter(x => cooccur[q]?.has(x))).size;
      const uni = new Set([...base, ...(cooccur[q] || [])]).size || 1;
      return { q, jacc: inter / uni };
    }).sort((a, b) => b.jacc - a.jacc).map(o => o.q);
    // filter out items too similar textually to the correct
    return sims.filter(opt => !tooSimilar(opt, p));
  }

  function buildOne(s, phrase) {
    const primary = contextFromSentence(s, phrase);
    let secondary = '';
    const supIdx = sentences.findIndex((t, ti) => ti !== sentences.indexOf(s) && hasPhrase(phrase, t) && t.length >= 50);
    if (supIdx !== -1) secondary = contextFromSentence(sentences[supIdx], phrase, 160);
    const qtext = secondary
      ? `Which concept is best described by: "${primary}" Additional detail: "${secondary}"`
      : `Which concept is best described by: "${primary}"`;

    const pool = distractorsFor(phrase);
    const fallbackPool = phrases.filter(p => p !== phrase && !tooSimilar(p, phrase));
    const opts = distinctFillOptions(phrase, pool.slice(0, 10), fallbackPool, phrases, 4);
    const { arranged, idx } = placeDeterministically(opts, phrase);
    return { question: qtext, options: arranged, answer_index: idx };
  }

  for (const s of sentences) {
    if (quiz.length >= total) break;
    const phrase = phrases.find(p => p.includes(' ') && hasPhrase(p, s) && !used.has(p))
      || phrases.find(p => hasPhrase(p, s) && !used.has(p));
    if (!phrase) continue;
    used.add(phrase);
    const { question, options, answer_index } = buildOne(s, phrase);
    quiz.push({ id: generateUUID(), question, options, answer_index, qtype: 'mcq' });
  }

  // Fallback padding to ensure exactly `total` MCQs
  let si = 0;
  let pi = 0;
  while (quiz.length < total && (si < sentences.length || pi < phrases.length)) {
    const s = sentences[si % Math.max(1, sentences.length)] || (sentences[0] || 'This passage discusses key ideas and definitions.');
    const phrase = phrases[pi % Math.max(1, phrases.length)] || 'core concept';
    if (!used.has(phrase)) {
      used.add(phrase);
      const { question, options, answer_index } = buildOne(s, phrase);
      quiz.push({ id: generateUUID(), question, options, answer_index, qtype: 'mcq' });
    }
    si++; pi++;
  }

  // Final safeguard: truncate to total and ensure each question has 4 distinct non-similar options
  const fixed = quiz.slice(0, total).map(q => {
    const opts = distinctFillOptions(q.options[q.answer_index], q.options.filter((o, i) => i !== q.answer_index), [], q.options, 4);
    const placed = placeDeterministically(opts, q.options[q.answer_index]);
    return { ...q, options: placed.arranged, answer_index: placed.idx, qtype: 'mcq' };
  });

  return fixed;
}

// Build flashcards from sentences and phrases
export function buildFlashcards(sentences, phrases, total = 12) {
  const cards = [];
  const used = new Set();
  const hasPhrase = (p, s) => new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(s);
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
  const hasPhrase = (p, s) => new RegExp(`\\b${p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(s);
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
export async function generateArtifacts(rawText, title = null) {
  prewarmML(); // schedule ML model load in the background ASAP
  const text = rawText.trim();
  if (!text) {
    throw new Error('Empty content');
  }
  const limitedText = text.length > 150000 ? text.slice(0, 150000) : text;

  await tick();
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
  // Prefer keyphrases (multi-word) with unigram fallback
  const phrases = extractKeyPhrases(limitedText, 14);

  await tick();
  // Heuristic build first (fast) – all MCQ; enforce 10
  let quiz = buildQuiz(sentences, phrases, 10);
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

  // Try ML refinement within a short deadline to avoid blocking UX
  try {
    const enhanced = await tryEnhanceArtifacts(base, sentences, phrases, 120);
    // Ensure constraints after enhancement too
    if (enhanced && Array.isArray(enhanced.quiz)) {
      const fixedQuiz = buildQuiz(sentences, phrases, 10); // rebuild constraints if needed
      return { ...enhanced, quiz: fixedQuiz };
    }
    return enhanced || base;
  } catch {
    return base;
  }
}