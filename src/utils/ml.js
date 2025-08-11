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
      // Use webgl if available; otherwise tfjs falls back automatically
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
      if (cosine(v, keptVecs[j]) &gt;= threshold) { isDup = true; break; }
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
  for (let i = 0; i &lt; n; i++) {
    let s = 0;
    for (let j = 0; j &lt; n; j++) {
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
  while (centroids.length &lt; k) {
    let bestIdx = -1; let bestDist = -1;
    for (let i = 0; i &lt; n; i++) {
      if (chosen.has(i)) continue;
      // use 1 - cosine as distance to nearest centroid
      let dmin = 1;
      for (const c of centroids) {
        dmin = Math.min(dmin, 1 - cosine(vectors[i], c));
      }
      if (dmin &gt; bestDist) { bestDist = dmin; bestIdx = i; }
    }
    chosen.add(bestIdx);
    centroids.push(vectors[bestIdx]);
  }
  let labels = new Array(n).fill(0);
  for (let it = 0; it &lt; maxIter; it++) {
    // Assign
    for (let i = 0; i &lt; n; i++) {
      let best = 0; let bestSim = -1;
      for (let c = 0; c &lt; centroids.length; c++) {
        const sim = cosine(vectors[i], centroids[c]);
        if (sim &gt; bestSim) { bestSim = sim; best = c; }
      }
      labels[i] = best;
    }
    // Update
    const sums = Array.from({ length: k }, () => new Array(vectors[0].length).fill(0));
    const counts = new Array(k).fill(0);
    for (let i = 0; i &lt; n; i++) {
      const c = labels[i];
      const v = vectors[i];
      for (let d = 0; d &lt; v.length; d++) sums[c][d] += v[d];
      counts[c]++;
    }
    for (let c = 0; c &lt; k; c++) {
      if (counts[c] === 0) continue;
      for (let d = 0; d &lt; sums[c].length; d++) sums[c][d] /= counts[c];
      centroids[c] = sums[c];
    }
  }
  return { labels, centroids };
}

export async function tryEnhanceArtifacts(artifacts, sentences, keyphrases, deadlineMs = 120) {
  // Attempt to get embeddings quickly; if not ready, return artifacts unchanged
  const vecs = await embedSentences(sentences, deadlineMs);
  if (!vecs) return artifacts;

  // Centrality-based ranking and deduplication
  const scores = centralityRank(vecs);
  const order = scores.map((s, i) => ({ i, s })).sort((a, b) => b.s - a.s).map(o => o.i);
  const orderedSentences = order.map(i => sentences[i]);
  const orderedVecs = order.map(i => vecs[i]);
  const dedup = dedupeByCosine(orderedSentences, orderedVecs, 0.86);

  // Cluster for plan titles
  const k = Math.min(7, dedup.sentences.length);
  const { labels } = kmeans(dedup.vectors, k, 12);
  const clusters = Array.from({ length: k }, () => []);
  for (let i = 0; i &lt; dedup.sentences.length; i++) clusters[labels[i]].push(dedup.sentences[i]);

  // Rebuild quiz: take top 8 MCQs from high-centrality sentences; cap TF to 2
  const rebuilt = { ...artifacts };
  const mcqTargets = dedup.sentences.slice(0, 24);
  const phrases = keyphrases;
  const mcqs = [];
  function hasPhraseInSentence(p, s) { return new RegExp(`\\b${p.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i').test(s); }
  const cooccur = Object.fromEntries(phrases.map(p => [p, new Set()]));
  mcqTargets.forEach((s, idx) => {
    for (const p of phrases) if (hasPhraseInSentence(p, s)) cooccur[p].add(idx);
  });
  const distractorsFor = (p) => {
    // pick phrases sharing similar co-occurrence footprint
    const base = cooccur[p];
    const sims = phrases
      .filter(q => q !== p)
      .map(q => {
        const inter = new Set([...base].filter(x => cooccur[q].has(x))).size;
        const uni = new Set([...base, ...cooccur[q]]).size || 1;
        return { q, jacc: inter / uni };
      })
      .sort((a, b) => b.jacc - a.jacc)
      .slice(0, 6)
      .map(o => o.q);
    return sims;
  };
  const used = new Set();
  for (const s of mcqTargets) {
    if (mcqs.length &gt;= 8) break;
    // prefer multi-word phrase in sentence
    const phrase = phrases.find(p => p.includes(' ') &amp;&amp; hasPhraseInSentence(p, s) &amp;&amp; !used.has(p))
      || phrases.find(p => hasPhraseInSentence(p, s) &amp;&amp; !used.has(p));
    if (!phrase) continue;
    used.add(phrase);
    // avoid masking first word
    const maskRegex = new RegExp(`(?!^)\\b${phrase.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
    if (!maskRegex.test(s)) continue;
    const qtext = s.replace(maskRegex, '_____');
    const pool = distractorsFor(phrase);
    const choices = [phrase, ...pool.filter(d =&gt; d !== phrase)].slice(0, 4);
    while (choices.length &lt; 4) {
      const r = phrases.find(p =&gt; !choices.includes(p));
      if (!r) break; choices.push(r);
    }
    const shuffled = [...choices];
    for (let i = shuffled.length - 1; i &gt; 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
    const answerIndex = shuffled.indexOf(phrase);
    if (answerIndex &lt; 0) continue;
    mcqs.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()), question: qtext, options: shuffled, answer_index: answerIndex, qtype: 'mcq' });
  }
  // True/False up to 2
  const tfs = [];
  for (let i = 0; i &lt; dedup.sentences.length &amp;&amp; tfs.length &lt; 2; i++) {
    const s = dedup.sentences[i];
    const m = s.match(/(\d+\.?\d*)/);
    if (m) {
      // mutate number by +/- 1 (basic approach)
      const num = m[1];
      const replacement = String(Number(num) + 1);
      const falseStmt = s.replace(num, replacement);
      tfs.push({ id: crypto.randomUUID ? crypto.randomUUID() : String(Math.random()), question: `True/False: ${falseStmt}`, options: ['True', 'False'], answer_index: 1, qtype: 'tf' });
    }
  }
  rebuilt.quiz = [...mcqs, ...tfs].slice(0, 10);

  // Flashcards: pick top 12 distinct phrases; back = highest-centrality sentence containing phrase
  const cards = [];
  for (const p of phrases) {
    if (cards.length &gt;= 12) break;
    const sIdx = dedup.sentences.findIndex(s =&gt; hasPhraseInSentence(p, s));
    if (sIdx === -1) continue;
    const back = dedup.sentences[sIdx];
    if (!back || back.length &lt; 60) continue; // avoid heading-like backs
    cards.push({ front: `Define: ${p}`, back: back.length &gt; 280 ? back.slice(0, 277) + '...' : back });
  }
  rebuilt.flashcards = cards;

  // Plan: 7 clusters; each day = cluster title from top phrase present
  const days = [];
  for (let c = 0; c &lt; k; c++) {
    const items = clusters[c] || [];
    if (items.length === 0) continue;
    const titlePhrase = phrases.find(p =&gt; items.some(s =&gt; hasPhraseInSentence(p, s))) || phrases[c % phrases.length] || 'Focus';
    const objectives = items.slice(0, 3).map(s =&gt; s.length &gt; 320 ? s.slice(0, 317) + '...' : s);
    while (objectives.length &lt; 3 &amp;&amp; objectives.length &lt; items.length) objectives.push(items[objectives.length]);
    if (objectives.length &lt; 3) {
      const pad = 3 - objectives.length;
      for (let i = 0; i &lt; pad; i++) objectives.push(`Review concept: ${phrases[(c + i) % phrases.length]}`);
    }
    days.push({ day: days.length + 1, title: `Day ${days.length + 1}: ${titlePhrase}`, objectives });
  }
  // Ensure 7 days
  while (days.length &lt; 7) days.push({ day: days.length + 1, title: `Day ${days.length + 1}: ${phrases[days.length % phrases.length] || 'Focus'}`, objectives: [
    `Review concept: ${phrases[days.length % phrases.length] || 'core idea'}`,
    `Practice recall using quiz Q${(days.length % (rebuilt.quiz.length || 1)) + 1}`,
    `Flip flashcards 1–12`
  ]});
  rebuilt.plan = days.slice(0, 7);

  return rebuilt;
}