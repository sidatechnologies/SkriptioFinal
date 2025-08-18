export async function ocrPdfViaBackend(file, opts = {}) {
  const { maxPages = 8, scale = 1.6, backendUrl = (process.env.REACT_APP_BACKEND_URL || import.meta?.env?.REACT_APP_BACKEND_URL) } = opts;
  if (!backendUrl) throw new Error('Missing REACT_APP_BACKEND_URL');
  const url = `${backendUrl}/ocr/pdf`.replace(/\/+ocr\/pdf$/, '/api/ocr/pdf'); // ensure /api prefix
  const fd = new FormData();
  fd.append('file', file);
  fd.append('max_pages', String(maxPages));
  fd.append('scale', String(scale));
  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) {
    let msg = `Backend OCR failed (${res.status})`;
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
    throw new Error(msg);
  }
  const data = await res.json();
  return (data && data.text) ? String(data.text) : '';
}