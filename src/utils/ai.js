/* Frontend-only AI pipelines using Transformers.js with the exact models requested.
   Models:
   - Summarisation: t5-small
   - Question Generation: t5-small (default). No attempt to valhalla to avoid 404s.
   - Embeddings: Xenova/all-MiniLM-L6-v2 (ONNX mirror of requested MiniLM) with batching and safe fallbacks.
*/

import { env, pipeline } from '@xenova/transformers';
import * as ort from 'onnxruntime-web';

// Route ONNX assets to local /ort and silence non-critical logs
try {
  env.useBrowserCache = true;
  env.allowLocalModels = false;
  env.backends = env.backends || {};
  env.backends.onnx = env.backends.onnx || {};
  env.backends.onnx.wasm = Object.assign({}, env.backends.onnx.wasm, {
    wasmPaths: '/ort/',
    numThreads: 1,
    proxy: false,
  });
  // Silence ORT optimizer spam
  if (ort && ort.env) {
    ort.env.logLevel = 'error';
    if (ort.env.wasm) {
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;
    }
  }
} catch {}

let _summarizerPromise = null;
let _qgPromise = null;
let _embedPromise = null;

async function withTimeout(promise, ms) {
  return await Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

export function prewarmAI() {
  try {
    if (!_embedPromise) {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => { _embedPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2').catch(() => null); }, { timeout: 1500 });
      } else {
        setTimeout(() => { _embedPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2').catch(() => null); }, 1000);
      }
    }
  } catch {}
}

export async function getSummarizer(deadlineMs = 0) {
  if (_summarizerPromise) return deadlineMs ? await withTimeout(_summarizerPromise, deadlineMs) : await _summarizerPromise;
  _summarizerPromise = pipeline('text2text-generation', 'Xenova/t5-small');
  return deadlineMs ? await withTimeout(_summarizerPromise, deadlineMs) : await _summarizerPromise;
}

export async function getQG(deadlineMs = 0) {
  if (_qgPromise) return deadlineMs ? await withTimeout(_qgPromise, deadlineMs) : await _qgPromise;
  _qgPromise = pipeline('text2text-generation', 'Xenova/t5-small');
  return deadlineMs ? await withTimeout(_qgPromise, deadlineMs) : await _qgPromise;
}

export async function getEmbedder(deadlineMs = 0) {
  if (_embedPromise) return deadlineMs ? await withTimeout(_embedPromise, deadlineMs) : await _embedPromise;
  _embedPromise = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  return deadlineMs ? await withTimeout(_embedPromise, deadlineMs) : await _embedPromise;
}

// Summarise long text into 5-8 bullets based on target length
export async function summarisePointwise(text, length = 'short') {
  // Wait for model without a hard timeout to avoid premature null on slow first-load
  const model = await getSummarizer(0);
  if (!model) return [];
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const targetChars = length === 'long' ? 4000 : length === 'medium' ? 2200 : 1200;
  const chunkSize = 900;
  const chunks = [];
  for (let i = 0; i < Math.min(clean.length, targetChars); i += chunkSize) {
    chunks.push(clean.slice(i, i + chunkSize));
    if (chunks.length >= 4) break; // reduce compute
  }
  const outputs = [];
  for (const ch of chunks) {
    const input = `summarize: ${ch}`;
    try {
      const res = await model(input, { max_new_tokens: 80, temperature: 0.7 });
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

// Embeddings helper with batching and truncation to avoid WASM OOM
export async function embedTexts(texts, deadlineMs = 30000) {
  const arr = (texts || []).map(t => String(t || '').slice(0, 512));
  const maxN = 160;
  const items = arr.slice(0, maxN);

  let embedder = null;
  try { embedder = await getEmbedder(Math.min(12000, deadlineMs)); } catch {}

  async function runBatches(ppl) {
    const out = [];
    const batchSize = 16;
    for (let i = 0; i < items.length; i += batchSize) {
      const chunk = items.slice(i, i + batchSize);
      try {
        const res = await ppl(chunk, { pooling: 'mean', normalize: true });
        const data = Array.isArray(res) ? res : res?.data || res;
        if (Array.isArray(data) && Array.isArray(data[0])) out.push(...data);
        else if (res?.tolist) out.push(...res.tolist());
        else if (res?.data && res?.dims) {
          for (let r = 0; r < res.dims[0]; r++) out.push(Array.from(res.data.slice(r * res.dims[1], (r + 1) * res.dims[1])));
        }
      } catch (e) {
        console.warn('Batch embedding failed, breaking to fallback', e?.message || e);
        return null;
      }
    }
    return out.length ? out : null;
  }

  if (embedder) {
    const vecs = await runBatches(embedder);
    if (vecs) return vecs;
  }

  try {
    const ml = await import('./ml');
    const res = await ml.embedSentences(items, Math.min(1200, deadlineMs));
    return res;
  } catch {
    return null;
  }
}

export async function generateQuestionFromContext(context, answerSpan) {
  const qg = await getQG(15000);
  if (!qg) return null;
  const ctx = String(context || '');
  const ans = String(answerSpan || '').trim();
  const prompt = `generate question: context: ${ctx} answer: ${ans}`;
  try {
    const res = await qg(prompt, { max_new_tokens: 64, temperature: 0.7 });
    const text = (Array.isArray(res) ? res[0]?.generated_text : res?.[0]?.generated_text) || '';
    return text.replace(/\s+/g, ' ').trim();
  } catch {
    return null;
  }
}