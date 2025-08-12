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

const FORMULA_LINE_REGEX = /([A-Za-zα-ωΑ-Ω0-9\)\(\[\]\{\}\\]+\s*)[=≈≃≅≡≤≥±∓×÷∝∑∏√∫∂∞\^].+/;

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

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map(item => item.str).join(' ');
      let collected = pageText.trim();

      // Heuristic: if page has too little selectable text or looks like images/formula-heavy, try OCR
      if (collected.length < 80 || /Figure|Diagram|Table/i.test(collected)) {
        try {
          const viewport = page.getViewport({ scale: 1.8 });
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
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
        } catch (e) {
          // OCR is best-effort; continue without failing
          // console.warn('OCR failed', e);
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
  return matches.map(token =&gt; token.toLowerCase());
}

// Extract keyPhrases: unigrams + bigrams + trigrams
export function extractKeyPhrases(text, k = 14) {
  const tokens = tokenize(text).filter(t =&gt; !STOPWORDS.has(t));
  const counts = new Map();
  for (const t of tokens) counts.set(t, (counts.get(t) || 0) + 1);
  const addNgrams = (n) =&gt; {
    for (let i = 0; i + n <= tokens.length; i++) {
      const gram = tokens.slice(i, i + n);
      if (STOPWORDS.has(gram[0]) || STOPWORDS.has(gram[gram.length - 1])) continue;
      const phrase = gram.join(' ');
      counts.set(phrase, (counts.get(phrase) || 0) + 1);
    }
  };
  addNgrams(2); addNgrams(3);
  const scored = Array.from(counts.entries())
    .filter(([w]) =&gt; /[a-z]/.test(w) &amp;&amp; w.length &gt;= 4)
    .map(([w, c]) =&gt; [w, c * Math.log(1 + c)])
    .sort((a, b) =&gt; b[1] - a[1])
    .map(([w]) =&gt; w);
  // Prefer multi-word phrases first, then unigrams
  const multi = scored.filter(w =&gt; w.includes(' '));
  const uni = scored.filter(w =&gt; !w.includes(' '));
  return [...multi.slice(0, Math.min(k - 4, multi.length)), ...uni].slice(0, k);
}

// Option similarity helpers
function optionTokens(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
}
function jaccard(a, b) {
  const A = new Set(optionTokens(a));
  const B = new Set(optionTokens(b));
  if (A.size === 0 &amp;&amp; B.size === 0) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const uni = A.size + B.size - inter;
  return uni === 0 ? 0 : inter / uni;
}
function tooSimilar(a, b) {
  if (!a || !b) return false;
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return true;
  return jaccard(a, b) &gt;= 0.65; // stricter threshold
}

function removePhraseOnce(sentence, phrase) {
  const rx = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\\]\\/g, '\\\\$&')}\\b`, 'i');
  return sentence.replace(rx, '').replace(/\s{2,}/g, ' ').trim();
}

function contextFromSentence(sentence, phrase, maxLen = 220) {
  let ctx = removePhraseOnce(sentence, phrase);
  if (!ctx || ctx.length < 30) ctx = sentence;
  // de-emphasize raw numbers to avoid giveaways
  ctx = ctx.replace(/\b\d+(\.\d+)?\b/g, 'X');
  if (!/[.!?]$/.test(ctx)) ctx += '.';
  if (ctx.length &gt; maxLen) ctx = ctx.slice(0, maxLen - 3) + '...';
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
  const others = choices.filter(c =&gt; c !== correct);
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
  const seen = new Set([String(correct).toLowerCase()]);
  const addIf = (opt) =&gt; {
    if (opt === undefined || opt === null) return false;
    const norm = String(opt).trim();
    if (!norm) return false;
    if (seen.has(norm.toLowerCase())) return false;
    for (const s of selected) { if (tooSimilar(String(s), norm)) return false; }
    selected.push(norm);
    seen.add(norm.toLowerCase());
    return true;
  };
  for (const c of pool || []) {
    if (selected.length &gt;= needed) break;
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

// Build quiz questions from sentences and phrases (deterministic, tougher, varied) – always return exactly `total` MCQs with 4 options each
export function buildQuiz(sentences, phrases, total = 10, opts = {}) {
  const { difficulty = 'balanced', formulas = [] } = opts;
  const includeFormulas = opts.includeFormulas !== false; // default true
  const wantExplanations = !!opts.explain;

  const quiz = [];
  const used = new Set();
  const cooccur = Object.fromEntries(phrases.map(p =&gt; [p, new Set()]));
  const hasPhrase = (p, s) =&gt; new RegExp(`\\b${p.replace(/[.*+?^${}()|[\\]\\/g, '\\\\$&')}\\b`, 'i').test(s);
  const looksVisualRef = (s) =&gt; /\b(figure|fig\.?\s?\d+|diagram|chart|graph|table|image|see\s+(fig|diagram|table)|as\s+shown|following\s+(figure|diagram)|in\s+the\s+(figure|diagram))\b/i.test(s);
  sentences.forEach((s, idx) =&gt; {
    phrases.forEach(p =&gt; { if (hasPhrase(p, s)) cooccur[p].add(idx); });
  });

  function distractorsForConcept(p) {
    const base = cooccur[p] || new Set();
    const sims = phrases.filter(q =&gt; q !== p).map(q =&gt; {
      const inter = new Set([...base].filter(x =&gt; cooccur[q]?.has(x))).size;
      const uni = new Set([...base, ...(cooccur[q] || [])]).size || 1;
      return { q, jacc: inter / uni };
    }).sort((a, b) =&gt; b.jacc - a.jacc).map(o =&gt; o.q);
    return sims.filter(opt =&gt; !tooSimilar(opt, p));
  }

  function sentenceFor(p) {
    // Prefer non-visual references
    let s = sentences.find(ss =&gt; hasPhrase(p, ss) &amp;&amp; !looksVisualRef(ss) &amp;&amp; ss.length &gt;= 50);
    if (!s) s = sentences.find(ss =&gt; hasPhrase(p, ss));
    return s || sentences[0] || '';
  }

  function propertyText(p, maxLen = 180) {
    const s = sentenceFor(p);
    const ctx = contextFromSentence(s, p, maxLen);
    // Normalize into a property-type clause
    let t = ctx.replace(/^\s*(:|-|–)\s*/, '').replace(/^it\s+is\s+/i, '').trim();
    if (!/[.!?]$/.test(t)) t += '.';
    return t;
  }

  function buildConceptQ(s, phrase) {
    // Avoid visual references; fall back to better sentence
    if (looksVisualRef(s)) s = sentenceFor(phrase);
    let primary = contextFromSentence(s, phrase);
    let secondary = '';
    if (difficulty === 'harder' || difficulty === 'expert') {
      // For expert, allow multi-hop by picking a second sentence from a related concept
      const related = distractorsForConcept(phrase);
      const alt = sentences.find(t =&gt; t !== s &amp;&amp; (hasPhrase(phrase, t) || related.slice(0, 3).some(rp =&gt; hasPhrase(rp, t))) &amp;&amp; t.length &gt;= 50 &amp;&amp; !looksVisualRef(t));
      if (alt) secondary = contextFromSentence(alt, phrase, 160);
    }
    const qtext = secondary
      ? `You observe: "${primary}" Additional detail: "${secondary}" Which concept best explains this?`
      : `You observe: "${primary}" Which concept best explains this?`;
    const pool = distractorsForConcept(phrase);
    const fallbackPool = phrases.filter(pp =&gt; pp !== phrase &amp;&amp; !tooSimilar(pp, phrase));
    const optsArr = distinctFillOptions(phrase, pool.slice(0, difficulty === 'harder' || difficulty === 'expert' ? 12 : 8), fallbackPool, phrases, 4);
    const { arranged, idx } = placeDeterministically(optsArr, phrase);
    const explanation = wantExplanations ? `Context: ${primary}${secondary ? ' | ' + secondary : ''}` : undefined;
    return { question: qtext, options: arranged, answer_index: idx, qtype: 'concept', explanation };
  }

  function buildPropertyQ(phrase) {
    const stem = `Which statement about "${phrase}" is most accurate?`;
    const correct = propertyText(phrase, (difficulty === 'harder' || difficulty === 'expert') ? 160 : 140);
    // choose distractor phrases; for harder/expert make them topically close to increase difficulty
    const related = distractorsForConcept(phrase);
    const poolPhrases = ((difficulty === 'harder' || difficulty === 'expert') ? related : phrases.filter(p =&gt; p !== phrase));
    const props = [];
    for (const pp of poolPhrases) {
      if (props.length &gt;= 8) break;
      if (pp === phrase) continue;
      const pt = propertyText(pp, 140);
      if (!tooSimilar(pt, correct)) props.push(pt);
    }
    const optsArr = distinctFillOptions(correct, props, [], [], 4);
    const { arranged, idx } = placeDeterministically(optsArr, correct);
    const explanation = wantExplanations ? `Derived from text around "${phrase}".` : undefined;
    return { question: stem, options: arranged, answer_index: idx, qtype: 'property', explanation };
  }

  // Optionally inject formula-based questions using exact formulas from content
  const formulaQs = [];
  const formulaPoolRaw = Array.from(new Set(formulas.filter(f =&gt; f &amp;&amp; f.trim()).map(f =&gt; f.trim())));
  const formulaPool = includeFormulas ? formulaPoolRaw : [];
  function buildFormulaQ(formula, contextSentence) {
    const ctx = contextSentence ? contextFromSentence(contextSentence, formula) : 'Select the formula exactly as presented in the material.';
    const qtext = `Which formula is referenced in this context: "${ctx}"`;
    const optsArr = distinctFillOptions(formula, formulaPool.filter(f =&gt; f !== formula), phrases, formulaPool, 4);
    const placed = placeDeterministically(optsArr, formula);
    const explanation = wantExplanations ? 'Exact match required from provided material.' : undefined;
    return { question: qtext, options: placed.arranged, answer_index: placed.idx, qtype: 'formula', explanation };
  }

  // Build pool of candidates for concept/property questions
  const conceptTargets = [];
  for (const s of sentences) {
    if (looksVisualRef(s)) continue;
    const phrase = phrases.find(p =&gt; p.includes(' ') &amp;&amp; hasPhrase(p, s) &amp;&amp; !used.has(p))
      || phrases.find(p =&gt; hasPhrase(p, s) &amp;&amp; !used.has(p));
    if (!phrase) continue;
    conceptTargets.push({ s, phrase });
  }

  // Choose composition based on difficulty
  const wantFormula = Math.min(formulaPool.length, difficulty === 'harder' || difficulty === 'expert' ? 2 : 1);
  const wantProperty = difficulty === 'expert' ? 5 : (difficulty === 'harder' ? 4 : 2);
  const wantConcept = Math.max(0, total - wantFormula - wantProperty);

  // Build concept questions (prioritize rarer/less frequent phrases for harder/expert)
  const rarity = new Map(phrases.map(p =&gt; [p, 0]));
  sentences.forEach(s =&gt; phrases.forEach(p =&gt; { if (hasPhrase(p, s)) rarity.set(p, (rarity.get(p) || 0) + 1); }));
  const sortedConcepts = conceptTargets.sort((a, b) =&gt; {
    const ra = rarity.get(a.phrase) || 0;
    const rb = rarity.get(b.phrase) || 0;
    return (difficulty === 'harder' || difficulty === 'expert') ? ra - rb : rb - ra;
  });
  for (const item of sortedConcepts) {
    if (quiz.length &gt;= wantConcept) break;
    const { s, phrase } = item;
    if (used.has(phrase)) continue;
    used.add(phrase);
    const q = buildConceptQ(s, phrase);
    quiz.push({ id: generateUUID(), ...q });
  }

  // Build property questions
  const propPhrases = phrases.filter(p =&gt; !used.has(p));
  let pi = 0;
  while (quiz.length < wantConcept + wantProperty && pi < propPhrases.length) {
    const p = propPhrases[pi++];
    used.add(p);
    const q = buildPropertyQ(p);
    quiz.push({ id: generateUUID(), ...q });
  }

  // Inject formula questions
  const formulaToSentence = new Map();
  for (const s of sentences) {
    for (const f of formulaPool) {
      if (!looksVisualRef(s) &amp;&amp; !formulaToSentence.has(f) &amp;&amp; s.includes(f.replace(/[$]/g, ''))) {
        formulaToSentence.set(f, s);
      }
    }
  }
  let fi = 0;
  while (formulaQs.length < wantFormula && fi < formulaPool.length) {
    const f = formulaPool[fi++];
    const s = formulaToSentence.get(f) || sentences.find(ss =&gt; ss.includes(f.replace(/[$]/g, '')));
    if (!s) continue;
    const fq = buildFormulaQ(f, s);
    formulaQs.push({ id: generateUUID(), ...fq });
  }

  // Merge and pad
  let combined = [...quiz, ...formulaQs];

  // Fallback padding with remaining concept/property
  let ci = 0;
  while (combined.length < total && ci < conceptTargets.length) {
    const { s, phrase } = conceptTargets[ci++];
    if (combined.some(q =&gt; q.qtype === 'concept' &amp;&amp; q.options[q.answer_index] === phrase)) continue;
    const q = buildConceptQ(s, phrase);
    combined.push({ id: generateUUID(), ...q });
  }
  let pj = 0;
  while (combined.length < total && pj < phrases.length) {
    const p = phrases[pj++];
    const q = buildPropertyQ(p);
    combined.push({ id: generateUUID(), ...q });
  }

  // Final safeguards: deduplicate questions by stem and enforce distinctness where possible
  const seenQ = new Set();
  const final = [];
  for (const q of combined) {
    const key = q.question.toLowerCase();
    if (seenQ.has(key)) continue;
    seenQ.add(key);
    final.push(q);
    if (final.length &gt;= total) break;
  }

  // Ensure each question has 4 distinct options and trim to total
  const fixed = final.slice(0, total).map(q =&gt; {
    const correct = q.options[q.answer_index];
    const optsArr = distinctFillOptions(correct, q.options.filter((o, i) =&gt; i !== q.answer_index), phrases.filter(p =&gt; p !== correct), phrases, 4);
    const placed = placeDeterministically(optsArr, correct);
    return { ...q, options: placed.arranged, answer_index: placed.idx, qtype: q.qtype || 'mcq', explanation: q.explanation };
  });

  return fixed;
}

// Build flashcards from sentences and phrases
export function buildFlashcards(sentences, phrases, total = 12) {
  const cards = [];
  const used = new Set();
  const hasPhrase = (p, s) =&gt; new RegExp(`\\b${p.replace(/[.*+?^${}()|[\\]\\/g, '\\\\$&')}\\b`, 'i').test(s);
  for (const p of phrases) {
    if (cards.length &gt;= total) break;
    const s = sentences.find(sen =&gt; hasPhrase(p, sen));
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
  const groups = Array.from({ length: days }, () =&gt; []);
  // Assign sentences greedily to phrase buckets by first match
  const buckets = phrases.slice(0, days).map(p =&gt; ({ phrase: p, items: [] }));
  const hasPhrase = (p, s) =&gt; new RegExp(`\\b${p.replace(/[.*+?^${}()|[\\]\\/g, '\\\\$&')}\\b`, 'i').test(s);
  for (const s of sentences) {
    const idx = buckets.findIndex(b =&gt; hasPhrase(b.phrase, s));
    if (idx !== -1) buckets[idx].items.push(s);
  }
  // Backfill remaining sentences round-robin
  const remaining = sentences.filter(s =&gt; !buckets.some(b =&gt; b.items.includes(s)));
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
  const limitedText = text.length &gt; 150000 ? text.slice(0, 150000) : text;

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
  const phrases = extractKeyPhrases(limitedText, 18);

  // Extract exact formulas from content and keep them intact
  const formulas = extractFormulasFromText(limitedText);

  await tick();
  // Heuristic build first (fast) – all MCQ; enforce 10
  let quiz = buildQuiz(sentences, phrases, 10, { difficulty, formulas, includeFormulas, explain });
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
    const enhanced = await tryEnhanceArtifacts(base, sentences, phrases, 140, { difficulty, formulas });
    // Keep enhanced quiz (already normalized to 10 MCQs with 4 distinct options)
    return enhanced || base;
  } catch {
    return base;
  }
}