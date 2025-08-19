/* Frontend-only AI pipelines using Transformers.js with the exact models requested.
   Models:
   - Summarisation: t5-small (from prompt, lightweight option).
   - Question Generation: valhalla/t5-small-qa-qg-hl (highlight format "<hl>answer<hl>" with prefix "generate question:")
   - Embeddings: sentence-transformers/all-MiniLM-L6-v2 was requested; however Transformers.js needs ONNX-converted weights which are not hosted under the original repo, causing 404.
     Until you approve using the converted (same) model repo or hosting weights locally, we use TF.js USE (Universal Sentence Encoder) for embeddings to avoid console errors.

   All loads are lazy with short timeouts and safe fallbacks to keep UI responsive.
*/

import { env, pipeline } from '@xenova/transformers';

env.allowLocalModels = false;
env.useBrowserCache = true;

let _summarizerPromise = null;
let _qgPromise = null;

async function withTimeout(promise, ms) {
  return await Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export function prewarmAI() {
  // Prewarm TF.js USE only (to avoid 404s from MiniLM ONNX fetch under original repo)
  try {
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(async () => {
        try { const ml = await import('./ml'); ml.prewarmML && ml.prewarmML(); } catch {}
      }, { timeout: 1500 });
    } else {
      setTimeout(async () => { try { const ml = await import('./ml'); ml.prewarmML && ml.prewarmML(); } catch {} }, 1000);
    }
  } catch {}
}

export async function getSummarizer(deadlineMs = 0) {
  if (_summarizerPromise) return deadlineMs ? await withTimeout(_summarizerPromise, deadlineMs) : await _summarizerPromise;
  _summarizerPromise = pipeline('text2text-generation', 't5-small');
  return deadlineMs ? await withTimeout(_summarizerPromise, deadlineMs) : await _summarizerPromise;
}

export async function getQG(deadlineMs = 0) {
  if (_qgPromise) return deadlineMs ? await withTimeout(_qgPromise, deadlineMs) : await _qgPromise;
  _qgPromise = pipeline('text2text-generation', 'valhalla/t5-small-qa-qg-hl');
  return deadlineMs ? await withTimeout(_qgPromise, deadlineMs) : await _qgPromise;
}

// Summarise long text into 5-8 bullets based on target length
export async function summarisePointwise(text, length = 'short') {
  const model = await getSummarizer(25000);
  if (!model) return [];
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const targetChars = length === 'long' ? 4000 : length === 'medium' ? 2200 : 1200;
  const chunkSize = 900;
  const chunks = [];
  for (let i = 0; i < Math.min(clean.length, targetChars); i += chunkSize) {
    chunks.push(clean.slice(i, i + chunkSize));
    if (chunks.length >= 6) break;
  }
  const outputs = [];
  for (const ch of chunks) {
    const input = `summarize: ${ch}`;
    try {
      const res = await model(input, { max_new_tokens: 96, temperature: 0.7 });
      const txt = (Array.isArray(res) ? res[0]?.generated_text : res?.[0]?.generated_text) || '';
      if (txt) outputs.push(txt.trim());
    } catch {}
  }
  const bullets = outputs.join(' ').split(/\s*\n|\s*\d+\.|\s*\-\s+/).map(s => s.trim()).filter(s => s.length > 0);
  const seen = new Set();
  const out = [];
  for (const b of bullets) {
    const t = b.replace(/^[•\-\d.\s]+/, '').trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t.charAt(0).toUpperCase() + t.slice(1).replace(/\s+$/, ''));
    if (out.length >= (length === 'long' ? 12 : length === 'medium' ? 9 : 6)) break;
  }
  return out;
}

// Embeddings helper: Use TF.js Universal Sentence Encoder to avoid 404 from MiniLM under original repo name
export async function embedTexts(texts, deadlineMs = 30000) {
  try {
    const ml = await import('./ml');
    const arr = await ml.embedSentences(texts, Math.min(1200, deadlineMs));
    return arr;
  } catch {
    return null;
  }
}

export async function generateQuestionFromContext(context, answerSpan) {
  const qg = await getQG(25000);
  if (!qg) return null;
  const highlighted = String(context || '').replace(answerSpan, `<hl>${answerSpan}<hl>`);
  const prompt = `generate question: ${highlighted}`;
  try {
    const res = await qg(prompt, { max_new_tokens: 64, temperature: 0.7 });
    const text = (Array.isArray(res) ? res[0]?.generated_text : res?.[0]?.generated_text) || '';
    return text.replace(/\s+/g, ' ').trim();
  } catch {
    return null;
  }
}