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
function placeDeterministically(choices, correct, seed = 0) {
  const n = choices.length;
  const idx = Math.min(n - 1, (detIndex(correct, n) + seed) % n);
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

// Enhance artifacts without flattening question types. Keep stems, improve distractors, enforce per-mode uniqueness further.
export async function tryEnhanceArtifacts(artifacts, sentences, keyphrases, deadlineMs = 120, options = {}) {
  const { difficulty = 'balanced', formulas = [], preserveTypes = true } = options;
  const mode = difficulty;
  const modeIdx = mode === 'balanced' ? 0 : (mode === 'harder' ? 1 : 2);

  // Attempt embeddings quickly
  const vecs = await embedSentences(sentences, deadlineMs);
  // If not available, return as-is
  if (!vecs) return artifacts;

  // Phrase embeddings for MMR distractors
  const phrases = keyphrases;
  const phraseVecs = await embedSentences(phrases, 80);

  function mmrSelect(queryVec, candidateVecs, candidateLabels, k = 3, lambda = 0.72) {
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

  const rebuilt = { ...artifacts };
  if (!Array.isArray(rebuilt.quiz)) return artifacts;

  // For each MCQ, rebuild distractors via MMR but keep stems and types
  const enhancedQuiz = rebuilt.quiz.map((q, qi) => {
    const correct = q.options[q.answer_index];
    if (!correct) return q;
    // Compute candidate phrases different from correct
    const idxCorrect = phrases.findIndex(p => p.toLowerCase() === String(correct).toLowerCase());
    const candidates = [];
    const candVecs = [];
    if (phraseVecs) {
      for (let i = 0; i < phrases.length; i++) {
        const lab = phrases[i];
        if (!phraseVecs[i]) continue;
        if (String(lab).toLowerCase() === String(correct).toLowerCase()) continue;
        if (tooSimilar(lab, correct)) continue;
        // enforce mode disjointness to reduce overlap across modes
        if (detIndex(lab, 3) === modeIdx) continue;
        candidates.push(lab);
        candVecs.push(phraseVecs[i]);
      }
    }
    let mmr = [];
    if (phraseVecs && candidates.length) {
      const qv = idxCorrect >= 0 ? phraseVecs[idxCorrect] : phraseVecs[(qi + modeIdx) % phraseVecs.length];
      const lambda = mode === 'expert' ? 0.8 : (mode === 'harder' ? 0.76 : 0.7);
      mmr = mmrSelect(qv, candVecs, candidates, 6, lambda);
    }

    const optsArr = distinctFillOptions(correct, mmr, q.options.filter((o, i) => i !== q.answer_index), phrases, 4);
    const placed = placeDeterministically(optsArr, correct, (qi + modeIdx) % 4);
    return { ...q, options: placed.arranged, answer_index: placed.idx };
  });

  rebuilt.quiz = enhancedQuiz;
  return rebuilt;
}