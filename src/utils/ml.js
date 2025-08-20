/* Frontend-only ML helpers (lazy-loaded). Uses TensorFlow.js + Universal Sentence Encoder. */

let _modelPromise = null;
let _useModel = null;

// Kick off model load during idle time to avoid blocking UI
export function prewarmML() {
  try {
    if (_modelPromise) return _modelPromise;
    const load = async () => {
      // Dynamic import to keep initial bundle small
      const [tfc, use] = await Promise.all([
        (async () => {
          const core = await import('@tensorflow/tfjs-core');
          await import('@tensorflow/tfjs-backend-cpu');
          return core;
        })(),
        import('@tensorflow-models/universal-sentence-encoder')
      ]);
      try {
        await tfc.setBackend('cpu');
        await tfc.ready();
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
  const seen = new Set([String(correct || '').trim().toLowerCase()]);
  const addIf = (opt) => {
    if (!opt) return false;
    const norm = String(opt).trim();
    if (!norm) return false;
    const key = norm.toLowerCase();
    if (seen.has(key)) return false;
    for (const s of selected) { if (tooSimilar(s, norm)) return false; }
    selected.push(norm);
    seen.add(key);
    return true;
  };
  for (const c of (pool || [])) { if (selected.length >= needed) break; addIf(c); }
  if (selected.length < needed) { for (const c of (fallbackPool || [])) { if (selected.length >= needed) break; addIf(c); } }
  if (selected.length < needed) { for (const c of (allPhrases || [])) { if (selected.length >= needed) break; if (String(c).toLowerCase() === String(correct).toLowerCase()) continue; addIf(c); } }
  // Final uniqueness pass and padding
  const uniq = [];
  const seen2 = new Set();
  const jacc = (a,b) => jaccardText(a,b);
  for (const o of selected) {
    const k = String(o || '').toLowerCase();
    if (!k || seen2.has(k)) continue;
    if (uniq.some(x => jacc(x, o) >= 0.7)) continue;
    uniq.push(o); seen2.add(k);
    if (uniq.length >= needed) break;
  }
  const generics = [
    'A related but inaccurate claim about the topic.',
    'An unrelated statement that does not follow from the text.',
    'A plausible but incorrect detail about the material.',
    'A misinterpretation of the concept discussed.'
  ];
  let gi = 0; while (uniq.length < needed && gi < generics.length) {
    const g = generics[gi++];
    const k = g.toLowerCase();
    if (!seen2.has(k)) { uniq.push(g); seen2.add(k); }
  }
  // As a last resort, minor modal tweak of the correct
  const tweak = (s) => String(s||'').replace(/\bmay\b/gi,'must').replace(/\boften\b/gi,'always').replace(/\bsometimes\b/gi,'always');
  while (uniq.length < needed) {
    const v = tweak(correct);
    const k = v.toLowerCase();
    if (!seen2.has(k) && !uniq.some(x => jacc(x, v) >= 0.7)) { uniq.push(v); seen2.add(k); }
    else break;
  }
  return uniq.slice(0, needed);
}

// Enhance artifacts without flattening question types. Keep stems, improve distractors, enforce per-mode uniqueness further.
export async function tryEnhanceArtifacts(artifacts, sentences, keyphrases, deadlineMs = 120, options = {}) {
  const { difficulty = 'balanced' } = options;
  const mode = difficulty;
  const modeIdx = mode === 'balanced' ? 0 : (mode === 'harder' ? 1 : 2);

  // Light-weight: only embed a small set of phrases to avoid UI stalls
  const phrases = keyphrases.slice(0, Math.min(24, keyphrases.length));
  const phraseVecs = await embedSentences(phrases, Math.min(120, deadlineMs || 120));
  // If not available quickly, skip enhancement entirely
  if (!phraseVecs) return artifacts;

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
    for (let i = 0; i < phrases.length; i++) {
      const lab = phrases[i];
      if (!phraseVecs[i]) continue;
      if (String(lab).toLowerCase() === String(correct).toLowerCase()) continue;
      if (tooSimilar(lab, correct)) continue;
      if (detIndex(lab, 3) === modeIdx) continue;
      candidates.push(lab);
      candVecs.push(phraseVecs[i]);
    }
    let mmr = [];
    if (candidates.length) {
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

// --------- New lightweight helpers for better sentence selection ----------
function hasVerb(s) { return /(\b(is|are|was|were|has|have|represents|means|refers|consists|contains|denotes|uses|used|measures|shows|indicates|describes|defines|computes|estimates)\b)/i.test(String(s || '')); }
function isAllCaps(s) { const letters = String(s || '').replace(/[^A-Za-z]/g, ''); if (!letters) return false; const caps = letters.replace(/[^A-Z]/g, '').length; return caps / letters.length > 0.7; }
function looksValidSentence(s) {
  const t = String(s || '').trim();
  if (t.length < 60 || t.length > 400) return false;
  if (!hasVerb(t)) return false;
  if (isAllCaps(t)) return false;
  const nonAscii = (t.match(/[^\x20-\x7E\n]/g) || []).length;
  if (nonAscii > Math.max(5, Math.floor(t.length * 0.1))) return false;
  return true;
}

export async function selectTopSentences(sentences, maxOut = 120, deadlineMs = 160) {
  const pool = (sentences || []).filter(looksValidSentence);
  if (pool.length === 0) return [];
  const vecs = await embedSentences(pool, deadlineMs);
  if (!vecs) {
    // Fallback: simple heuristic ranking by length (mid-length preferred)
    return pool
      .map(s => [s, Math.abs(180 - s.length)])
      .sort((a, b) => a[1] - b[1])
      .slice(0, maxOut)
      .map(([s]) => s);
  }
  const { sentences: uniq, vectors } = dedupeByCosine(pool, vecs, 0.9);
  const scores = centralityRank(vectors);
  const idxs = scores.map((s, i) => [i, s]).sort((a, b) => b[1] - a[1]).slice(0, Math.min(maxOut, uniq.length)).map(([i]) => i);
  return idxs.map(i => uniq[i]);
}

export async function bestSentenceForPhrase(phrase, sentences, deadlineMs = 160) {
  const pool = (sentences || []).filter(looksValidSentence);
  if (pool.length === 0) return '';
  const vecs = await embedSentences([phrase, ...pool], deadlineMs);
  if (!vecs) {
    // Fallback regex match
    const rx = new RegExp(`\\b${String(phrase).replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}\\b`, 'i');
    const m = pool.find(s => rx.test(s));
    return m || pool[0];
  }
  const qv = vecs[0];
  let best = 0; let bestSim = -1;
  for (let i = 0; i < pool.length; i++) {
    const sim = cosine(qv, vecs[i + 1]);
    if (sim > bestSim) { bestSim = sim; best = i; }
  }
  return pool[best];
}