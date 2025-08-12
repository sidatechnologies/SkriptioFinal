/* Frontend-only ML helpers (lazy-loaded). Uses TensorFlow.js + Universal Sentence Encoder. */

let _modelPromise = null;
let _useModel = null;

// Kick off model load during idle time to avoid blocking UI
export function prewarmML() {
  try {
    if (_modelPromise) return _modelPromise;
    const load = async () => {
      // Dynamic import to keep initial bundle small
      const [{ default: tf }, use] = await Promise.all([
        import('@tensorflow/tfjs'),
        import('@tensorflow-models/universal-sentence-encoder')
      ]);
      // Force CPU backend to avoid WebGL context loss on some hosts (e.g., Vercel preview)
      try {
        await tf.setBackend('cpu');
        await tf.ready();
      } catch {}
      _useModel = await use.load();
      return _useModel;
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        _modelPromise = load().catch(() => null);
      }, { timeout: 2000 });
    } else {
      setTimeout(() => {
        _modelPromise = load().catch(() => null);
      }, 800);
    }
    return _modelPromise;
  } catch {
    return null;
  }
}

async function ensureModel(deadlineMs = 0) {
  // If already loading or loaded
  if (_useModel) return _useModel;
  if (_modelPromise) {
    if (deadlineMs > 0) {
      try {
        return await Promise.race([
          _modelPromise,
          new Promise((resolve) => setTimeout(() => resolve(null), deadlineMs))
        ]);
      } catch {
        return null;
      }
    }
    try {
      return await _modelPromise;
    } catch {
      return null;
    }
  }
  // Start loading with a small deadline
  prewarmML();
  if (deadlineMs > 0) {
    try {
      return await new Promise((resolve) => setTimeout(() => resolve(_useModel), deadlineMs));
    } catch {
      return null;
    }
  }
  return null;
}

export async function embedSentences(sentences, deadlineMs = 0) {
  const model = await ensureModel(deadlineMs);
  if (!model) return null;
  try {
    const embeddings = await model.embed(sentences);
    const arr = await embeddings.array();
    embeddings.dispose && embeddings.dispose();
    return arr;
  } catch {
    return null;
  }
}

export function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function dedupeByCosine(sentences, vectors, threshold = 0.85) {
  const kept = [];
  const keptVecs = [];
  for (let i = 0; i < sentences.length; i++) {
    const v = vectors[i];
    let isDup = false;
    for (let j = 0; j < keptVecs.length; j++) {
      if (cosine(v, keptVecs[j]) >= threshold) { isDup = true; break; }
    }
    if (!isDup) {
      kept.push(sentences[i]);
      keptVecs.push(v);
    }
  }
  return { sentences: kept, vectors: keptVecs };
}

export function centralityRank(vectors) {
  const n = vectors.length;
  const scores = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      s += cosine(vectors[i], vectors[j]);
    }
    scores[i] = s / Math.max(1, n - 1);
  }
  return scores;
}

export function kmeans(vectors, k = 7, maxIter = 20) {
  const n = vectors.length;
  if (n === 0) return { labels: [], centroids: [] };
  k = Math.min(k, n);
  // Init: pick first centroid then farthest points (k-means++) simplified
  const centroids = [];
  const chosen = new Set();
  centroids.push(vectors[0]);
  chosen.add(0);
  while (centroids.length < k) {
    let bestIdx = -1; let bestDist = -1;
    for (let i = 0; i < n; i++) {
      if (chosen.has(i)) continue;
      // use 1 - cosine as distance to nearest centroid
      let dmin = 1;
      for (const c of centroids) {
        dmin = Math.min(dmin, 1 - cosine(vectors[i], c));
      }
      if (dmin > bestDist) { bestDist = dmin; bestIdx = i; }
    }
    chosen.add(bestIdx);
    centroids.push(vectors[bestIdx]);
  }
  let labels = new Array(n).fill(0);
  for (let it = 0; it < maxIter; it++) {
    // Assign
    for (let i = 0; i < n; i++) {
      let best = 0; let bestSim = -1;
      for (let c = 0; c < centroids.length; c++) {
        const sim = cosine(vectors[i], centroids[c]);
        if (sim > bestSim) { bestSim = sim; best = c; }
      }
      labels[i] = best;
    }
    // Update
    const sums = Array.from({ length: k }, () => new Array(vectors[0].length).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i < n; i++) {
      const c = labels[i];
      const v = vectors[i];
      for (let d = 0; d < v.length; d++) sums[c][d] += v[d];
      counts[c]++;
    }
    for (let c = 0; c < k; c++) {
      if (counts[c] === 0) continue;
      for (let d = 0; d < sums[c].length; d++) sums[c][d] /= counts[c];
      centroids[c] = sums[c];
    }
  }
  return { labels, centroids };
}

// Option similarity helpers
function optionTokens(str) {
  return (str || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean);
}
function jaccardText(a, b) {
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
  return jaccardText(a, b) >= 0.7;
}
function detIndex(str, n) { let h = 0; for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return n ? h % n : h; }
function placeDeterministically(choices, correct) {
  const n = choices.length;
  const idx = Math.min(n - 1, detIndex(correct, n));
  const others = choices.filter(c => c !== correct);
  const arranged = new Array(n);
  arranged[idx] = correct;
  let oi = 0;
  for (let i = 0; i < n; i++) { if (arranged[i]) continue; arranged[i] = others[oi++] || ''; }
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
  for (const c of pool || []) { if (selected.length >= needed) break; addIf(c); }
  if (selected.length < needed) { for (const c of (fallbackPool || [])) { if (selected.length >= needed) break; addIf(c); } }
  if (selected.length < needed) { for (const c of (allPhrases || [])) { if (selected.length >= needed) break; if (c === correct) continue; addIf(c); } }
  const generics = ['General concepts', 'Background theory', 'Implementation details', 'Best practices'];
  let gi = 0; while (selected.length < needed && gi < generics.length) { addIf(generics[gi++]); }
  return selected.slice(0, needed);
}

// MMR selection helper for distractors using embeddings
function mmrSelect(queryVec, candidateVecs, candidateLabels, k = 3, lambda = 0.7) {
  const selected = [];
  const selectedIdxs = [];
  const used = new Set();
  while (selected.length < k && selected.length < candidateLabels.length) {
    let bestIdx = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < candidateLabels.length; i++) {
      if (used.has(i)) continue;
      const rel = cosine(queryVec, candidateVecs[i]);
      let div = 0;
      for (const si of selectedIdxs) {
        div = Math.max(div, cosine(candidateVecs[i], candidateVecs[si]));
      }
      const score = lambda * rel - (1 - lambda) * div;
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    }
    if (bestIdx === -1) break;
    used.add(bestIdx);
    selectedIdxs.push(bestIdx);
    selected.push(candidateLabels[bestIdx]);
  }
  return selected;
}

export async function tryEnhanceArtifacts(artifacts, sentences, keyphrases, deadlineMs = 120, options = {}) {
  const { difficulty = 'balanced', formulas = [] } = options;
  // Attempt to get embeddings quickly; if not ready, return artifacts unchanged
  const vecs = await embedSentences(sentences, deadlineMs);
  if (!vecs) return artifacts;

  // Centrality-based ranking and deduplication
  const scores = centralityRank(vecs);
  const order = scores.map((s, i) => ({ i, s })).sort((a, b) => b.s - a.s).map(o => o.i);
  const orderedSentences = order.map(i => sentences[i]);
  const orderedVecs = order.map(i => vecs[i]);
  const dedup = dedupeByCosine(orderedSentences, orderedVecs, 0.86);

  // Cluster for plan titles and topic coverage
  const k = Math.min(7, dedup.sentences.length);
  const { labels } = kmeans(dedup.vectors, k, 12);
  const clusters = Array.from({ length: k }, () => []);
  for (let i = 0; i < dedup.sentences.length; i++) clusters[labels[i]].push({ s: dedup.sentences[i], v: dedup.vectors[i], idx: i });

  // Phrase embeddings (for MMR distractors)
  const phrases = keyphrases;
  const phraseVecs = await embedSentences(phrases, 80); // quick try; may be null

  function hasPhraseInSentence(p, s) { return new RegExp(`\\b${p.replace(/[.*+?^${}()|[\\]\\/g, '\\\\$&')}\\b`, 'i').test(s); }

  // Build candidate order for questions to maximize topic coverage (round-robin clusters, central sentence first)
  const perClusterIdx = new Array(k).fill(0);
  const clusterOrder = [];
  let added = true;
  while (clusterOrder.length < Math.min(36, dedup.sentences.length) && added) {
    added = false;
    for (let c = 0; c < k; c++) {
      const list = clusters[c];
      if (perClusterIdx[c] < list.length) {
        clusterOrder.push(list[perClusterIdx[c]++]);
        added = true;
      }
    }
  }

  // Distractors using MMR over phrase embeddings with textual dissimilarity safeguards; fallback to co-occurrence if embeddings missing
  const cooccur = Object.fromEntries(phrases.map(p => [p, new Set()]));
  dedup.sentences.forEach((s, idx) => { for (const p of phrases) if (hasPhraseInSentence(p, s)) cooccur[p].add(idx); });

  const distractorsFor = (pCorrect) => {
    const lambda = difficulty === 'harder' ? 0.82 : 0.72;
    const kSel = difficulty === 'harder' ? 8 : 6;
    // Prefer MMR if phrase embeddings available
    if (phraseVecs) {
      const correctIdx = phrases.findIndex(pp => pp === pCorrect);
      const qv = phraseVecs[correctIdx] || null;
      if (qv) {
        const cands = [];
        const candVecs = [];
        for (let i = 0; i < phrases.length; i++) {
          const lab = phrases[i];
          if (lab === pCorrect) continue;
          if (tooSimilar(lab, pCorrect)) continue;
          if (!phraseVecs[i]) continue;
          cands.push(lab);
          candVecs.push(phraseVecs[i]);
        }
        const mmr = mmrSelect(qv, candVecs, cands, kSel, lambda);
        return mmr;
      }
    }
    // Fallback: co-occurrence Jaccard
    const base = cooccur[pCorrect] || new Set();
    const sims = phrases
      .filter(q => q !== pCorrect)
      .map(q => {
        const inter = new Set([...base].filter(x => cooccur[q]?.has(x))).size;
        const uni = new Set([...base, ...(cooccur[q] || [])]).size || 1;
        return { q, jacc: inter / uni };
      })
      .sort((a, b) => b.jacc - a.jacc)
      .map(o => o.q)
      .filter(opt => !tooSimilar(opt, pCorrect));
    return sims;
  };

  const usedPhrases = new Set();
  const mcqs = [];

  function buildOne(s, phrase) {
    const rx = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\\]\\/g, '\\\\$&')}\\b`, 'i');
    const primary = (() => {
      const ctx = s.replace(rx, '').replace(/\s{2,}/g, ' ').trim();
      let t = ctx.length < 30 ? s : ctx;
      t = t.replace(/\b\d+(\.\d+)?\b/g, 'X');
      if (!/[.!?]$/.test(t)) t += '.';
      return t.length > 220 ? t.slice(0, 217) + '...' : t;
    })();
    const qtext = `Which concept is best described by: "${primary}"`;
    const pool = distractorsFor(phrase);
    const fallbackPool = phrases.filter(pp => pp !== phrase && !tooSimilar(pp, phrase));
    const opts = distinctFillOptions(phrase, pool.slice(0, difficulty === 'harder' ? 12 : 10), fallbackPool, phrases, 4);
    const { arranged, idx } = placeDeterministically(opts, phrase);
    const explanation = `Context: ${primary}`;
    return { question: qtext, options: arranged, answer_index: idx, qtype: 'mcq', explanation };
  }

  // Walk cluster-balanced order to maximize topic coverage
  for (const item of clusterOrder) {
    if (mcqs.length >= 10) break;
    const s = item.s;
    // prefer multi-word phrase in s that hasn't been used
    const phrase = phrases.find(p => p.includes(' ') && hasPhraseInSentence(p, s) && !usedPhrases.has(p))
      || phrases.find(p => hasPhraseInSentence(p, s) && !usedPhrases.has(p));
    if (!phrase) continue;
    usedPhrases.add(phrase);
    const { question, options, answer_index, qtype, explanation } = buildOne(s, phrase);
    mcqs.push({ id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()), question, options, answer_index, qtype: 'mcq', explanation });
  }

  // Pad to 10 if needed using remaining sentences/phrases
  let si = 0; let pi = 0;
  while (mcqs.length < 10 && (si < dedup.sentences.length || pi < phrases.length)) {
    const s = dedup.sentences[si % Math.max(1, dedup.sentences.length)] || (dedup.sentences[0] || 'This passage discusses key ideas and definitions.');
    const phrase = phrases[pi % Math.max(1, phrases.length)] || 'core concept';
    if (!usedPhrases.has(phrase)) {
      usedPhrases.add(phrase);
      const { question, options, answer_index, qtype, explanation } = buildOne(s, phrase);
      mcqs.push({ id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()), question, options, answer_index, qtype: 'mcq', explanation });
    }
    si++; pi++;
  }

  // Final normalization to guarantee constraints + reduce repetition and enforce unique correct answers if possible
  const normalized = [];
  const seenQ = new Set();
  const seenCorrect = new Set();
  for (const q of mcqs) {
    const key = q.question.toLowerCase();
    const corr = q.options[q.answer_index].toLowerCase();
    if (seenQ.has(key)) continue;
    if (seenCorrect.has(corr)) continue;
    const correct = q.options[q.answer_index];
    const opts = distinctFillOptions(correct, q.options.filter((o, i) => i !== q.answer_index), phrases.filter(p => p !== correct), phrases, 4);
    const placed = placeDeterministically(opts, correct);
    normalized.push({ ...q, options: placed.arranged, answer_index: placed.idx, qtype: 'mcq', explanation: q.explanation });
    seenQ.add(key);
    seenCorrect.add(corr);
    if (normalized.length >= 10) break;
  }

  const rebuilt = { ...artifacts };
  rebuilt.quiz = normalized.length === 10 ? normalized : normalized.slice(0, 10);

  // Flashcards: pick top 12 distinct phrases; back = highest-centrality sentence containing phrase
  const cards = [];
  for (const p of phrases) {
    if (cards.length >= 12) break;
    const sIdx = dedup.sentences.findIndex(s => hasPhraseInSentence(p, s));
    if (sIdx === -1) continue;
    const back = dedup.sentences[sIdx];
    if (!back || back.length < 60) continue; // avoid heading-like backs
    cards.push({ front: `Define: ${p}`, back: back.length > 280 ? back.slice(0, 277) + '...' : back });
  }
  rebuilt.flashcards = cards.length ? cards : artifacts.flashcards;

  // Plan: 7 clusters; each day = cluster title from top phrase present
  const days = [];
  for (let c = 0; c < k; c++) {
    const items = clusters[c] || [];
    if (items.length === 0) continue;
    const titlePhrase = phrases.find(p => items.some(obj => hasPhraseInSentence(p, obj.s))) || phrases[c % phrases.length] || 'Focus';
    const objectives = items.slice(0, 3).map(obj => obj.s.length > 320 ? obj.s.slice(0, 317) + '...' : obj.s);
    while (objectives.length < 3 && objectives.length < items.length) objectives.push(items[objectives.length].s);
    if (objectives.length < 3) {
      const pad = 3 - objectives.length;
      for (let i = 0; i < pad; i++) objectives.push(`Review concept: ${phrases[(c + i) % phrases.length]}`);
    }
    days.push({ day: days.length + 1, title: `Day ${days.length + 1}: ${titlePhrase}`, objectives });
  }
  // Ensure 7 days
  while (days.length < 7) days.push({ day: days.length + 1, title: `Day ${days.length + 1}: ${phrases[days.length % phrases.length] || 'Focus'}`, objectives: [
    `Review concept: ${phrases[days.length % phrases.length] || 'core idea'}`,
    `Practice recall using quiz Q${(days.length % (normalized.length || 1)) + 1}`,
    `Flip flashcards 1–12`
  ]});
  rebuilt.plan = days.slice(0, 7);

  return rebuilt;
}