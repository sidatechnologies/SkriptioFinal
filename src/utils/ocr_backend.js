export async function ocrPdfViaBackend(file, opts = {}) {
  const { maxPages = 8, scale = 1.6, backendUrl = (process.env.REACT_APP_BACKEND_URL || (typeof import !== 'undefined' ? (import.meta?.env?.REACT_APP_BACKEND_URL) : undefined)) } = opts;
  if (!backendUrl) throw new Error('Missing REACT_APP_BACKEND_URL');
  const base = String(backendUrl).replace(/\/+$/, '');
  const url = `${base}/ocr/pdf`; // REACT_APP_BACKEND_URL is expected to already include '/api'

  const fd = new FormData();
  fd.append('file', file);
  fd.append('max_pages', String(maxPages));
  fd.append('scale', String(scale));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  let res;
  try {
    res = await fetch(url, { method: 'POST', body: fd, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    let msg = `Backend OCR failed (${res.status})`;
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  return (data && data.text) ? String(data.text) : '';
}