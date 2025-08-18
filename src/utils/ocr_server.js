export async function ocrPdfViaServer(file, opts = {}) {
  const { maxPages = 8, scale = 1.6, basePath } = opts;
  // Same-origin relative API path. No envs required.
  const apiBase = (basePath || '/api').replace(/\/+$/, '');
  const url = `${apiBase}/ocr/pdf`;

  const fd = new FormData();
  fd.append('file', file);
  fd.append('max_pages', String(maxPages));
  fd.append('scale', String(scale));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  let res;
  try {
    res = await fetch(url, { method: 'POST', body: fd, signal: controller.signal });
  } finally { clearTimeout(timeout); }

  if (!res.ok) {
    let msg = `Backend OCR failed (${res.status})`;
    try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return (data && data.text) ? String(data.text) : '';
}