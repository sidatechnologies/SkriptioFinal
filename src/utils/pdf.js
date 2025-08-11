// Lightweight helpers to prewarm and access jsPDF without blocking the UI
let _pdfPromise = null;
let _jsPDF = null;

export function prewarmPDF() {
  try {
    if (_pdfPromise || _jsPDF) return _pdfPromise;
    const load = async () => {
      const mod = await import('jspdf');
      _jsPDF = mod.jsPDF;
      return _jsPDF;
    };
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        _pdfPromise = load().catch(() => null);
      }, { timeout: 2000 });
    } else {
      setTimeout(() => {
        _pdfPromise = load().catch(() => null);
      }, 800);
    }
    return _pdfPromise;
  } catch {
    return null;
  }
}

export async function getJsPDF(deadlineMs = 0) {
  if (_jsPDF) return _jsPDF;
  if (_pdfPromise) {
    if (deadlineMs > 0) {
      try {
        return await Promise.race([
          _pdfPromise,
          new Promise((resolve) => setTimeout(() => resolve(null), deadlineMs))
        ]);
      } catch {
        return null;
      }
    }
    try { return await _pdfPromise; } catch { return null; }
  }
  // not started yet
  prewarmPDF();
  if (deadlineMs > 0) {
    try {
      return await new Promise((resolve) => setTimeout(() => resolve(_jsPDF), deadlineMs));
    } catch {
      return null;
    }
  }
  return null;
}