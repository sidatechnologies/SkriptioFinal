/* Frontend-only AI pipelines using Transformers.js with the exact models requested.
   Models:
   - Summarisation: t5-small (from prompt, lightweight option). Note: facebook/bart-large-cnn is heavy for browser; t5-small is allowed and fast.
   - Question Generation: valhalla/t5-small-qa-qg-hl (highlight format &quot;&lt;hl&gt;answer&lt;hl&gt;&quot; with prefix &quot;generate question:&quot;)
   - Embeddings: sentence-transformers/all-MiniLM-L6-v2 (feature-extraction) for similarity, dedup, distractors

   All loads are lazy with short timeouts and safe fallbacks to keep UI responsive.
*/

import { env, pipeline } from '@xenova/transformers';

// Keep downloads small and avoid verbose logs
env.allowLocalModels = false;
env.useBrowserCache = true;
// Prefer WebGPU if available, else WASM
// env.backends.onnx.wasm.wasmPaths is already configured globally for other tools if needed

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
  // Warm the smallest models during idle time
  try {
    if (!_embedPromise) {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => { _embedPromise = pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2').catch(() => null); }, { timeout: 1500 });
      } else {
        setTimeout(() => { _embedPromise = pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2').catch(() => null); }, 1000);
      }
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

export async function getEmbedder(deadlineMs = 0) {
  if (_embedPromise) return deadlineMs ? await withTimeout(_embedPromise, deadlineMs) : await _embedPromise;
  _embedPromise = pipeline('feature-extraction', 'sentence-transformers/all-MiniLM-L6-v2');
  return deadlineMs ? await withTimeout(_embedPromise, deadlineMs) : await _embedPromise;
}

// Summarise long text into 5-8 bullets based on target length
export async function summarisePointwise(text, length = 'short') {
  const model = await getSummarizer(25000);
  if (!model) return [];
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  // Chunk text for t5-small
  const targetChars = length === 'long' ? 4000 : length === 'medium' ? 2200 : 1200;
  const chunkSize = 900; // conservative for t5-small
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
  // Split to bullets
  const bullets = outputs.join(' ').split(/\s*\n|\s*\d+\.|\s*\-\s+/).map(s => s.trim()).filter(s => s.length > 0);
  // Normalize
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

// Embeddings helper (returns array of Float32Array or arrays)
export async function embedTexts(texts, deadlineMs = 30000) {
  const embedder = await getEmbedder(deadlineMs);
  if (!embedder) return null;
  try {
    const res = await embedder(texts, { pooling: 'mean', normalize: true });
    // transformers.js returns Tensor or array; normalize to array of arrays
    const arr = Array.isArray(res) ? res : res?.data || res;
    if (Array.isArray(arr) && Array.isArray(arr[0])) return arr;
    if (res?.tolist) return res.tolist();
    if (res?.data) return Array.from({ length: res.dims?.[0] || 0 }, (_, i) => Array.from(res.data.slice(i * res.dims[1], (i + 1) * res.dims[1])));
    return null;
  } catch {
    return null;
  }
}

export async function generateQuestionFromContext(context, answerSpan) {
  const qg = await getQG(25000);
  if (!qg) return null;
  const highlighted = String(context || '').replace(answerSpan, `&lt;hl&gt;${answerSpan}&lt;hl&gt;`);
  const prompt = `generate question: ${highlighted}`;
  try {
    const res = await qg(prompt, { max_new_tokens: 64, temperature: 0.7 });
    const text = (Array.isArray(res) ? res[0]?.generated_text : res?.[0]?.generated_text) || '';
    return text.replace(/\s+/g, ' ').trim();
  } catch {
    return null;
  }
}