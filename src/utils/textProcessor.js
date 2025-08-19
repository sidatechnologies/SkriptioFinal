/* Full file preserved above; only patches changed below intentionally */
// Frontend-only text processing utilities (converted from Python backend) with ML-enhanced refinement.

import { prewarmML, tryEnhanceArtifacts, selectTopSentences, bestSentenceForPhrase } from './ml';

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'if', 'in', 'into', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with', 'this', 'those', 'these', 'your', 'you', 'i', 'we', 'our', 'us', 'their', 'they', 'them', 'he', 'she', 'his', 'her', 'or', 'nor', 'not', 'but', 'than', 'then', 'so', 'too', 'very', 'can', 'just', 'should', 'would', 'could', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'any', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'further', 'here', 'how', 'more', 'most', 'other', 'over', 'own', 'same', 'some', 'such', 'under', 'until', 'up', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'yourself', 'themselves', 'itself', 'ourselves', 'myself', "don't", "can't", "won't", "shouldn't", "couldn't", "isn't", "aren't", "wasn't", "weren't", "i'm", "you're", "we're", "they're", "it's", "that's", "there's", "here's", "what's", "who's", "didn't", "haven't", "hasn't", "hadn't", "doesn't", "shouldn't", "wouldn't", "mustn't", "mightn't", "needn't"
]);

// Generate UUID
export function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Tiny yielding helper to keep UI responsive during heavy work
async function tick() { return new Promise(resolve => setTimeout(resolve, 0)); }

// ... (unchanged helper code above)

// QUICK path: lightweight text extraction with strict time budget and no OCR
export async function extractTextFromPDFQuick(file, options = {}) {
  const { maxPages = 24, totalBudgetMs = 4500 } = options;
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
    const arrayBuffer = await file.arrayBuffer();
    const t0 = Date.now();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const limitPages = Math.min(pdf.numPages || 1, Math.max(1, maxPages || pdf.numPages));
    let out = '';
    for (let i = 1; i <= limitPages; i++) {
      if (Date.now() - t0 > totalBudgetMs) break;
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent().catch(() => null);
      const items = Array.isArray(textContent?.items) ? textContent.items : [];
      const pageText = items.map(item => String(item?.str || '')).join(' ').trim();
      if (pageText) out += pageText + '\n';
      if (i % 2 === 0) await tick();
    }
    return sentenceShape(cleanOCROutput(out));
  } catch (e) {
    return '';
  }
}

// Extract text from PDF with automatic aggressive OCR + layout handling
export async function extractTextFromPDF(file, options = {}) {
  const { forceOCR = false, betterAccuracy = true, ocrScale = 2.0, maxPages = 60 } = options;
  try {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = '';
    let Tesseract = null;

    const tStart = Date.now();
    const OCR_TIME_BUDGET_MS = forceOCR ? 28000 : 16000; // reduce to avoid long stalls

    const limitPages = Math.min(pdf.numPages || 1, Math.max(1, maxPages || pdf.numPages));

    const preprocessCanvasForOCR = (canvas) => {
      try {
        const deskewed = autoDeskew(canvas);
        const ctx = ctx2d(deskewed);
        ctx.imageSmoothingEnabled = false;
        contrastStretch(deskewed, 0.02, 0.98);
        const bg = estimateBackgroundBrightness(deskewed);
        const C = bg > 180 ? 6 : 8;
        adaptiveBinarize(deskewed, 24, C);
        close3x3(deskewed);
        despeckle(deskewed);
        invertCanvasIfNeeded(deskewed);
        return deskewed;
      } catch {
        invertCanvasIfNeeded(canvas);
        return canvas;
      }
    };

    const withTimeout = async (promise, ms) => {
      let timeoutId; const timeout = new Promise((resolve) => { timeoutId = setTimeout(() => resolve(null), ms); });
      const result = await Promise.race([promise, timeout]).catch(() => null);
      clearTimeout(timeoutId); return result;
    };

    const ocrCanvasBlock = async (c, perPass, psm = 6) => {
      if (!Tesseract) { const mod = await import('tesseract.js'); Tesseract = mod.default || mod; }
      const ocrOpts = {
        tessedit_pageseg_mode: String(psm),
        tessedit_ocr_engine_mode: '1',
        preserve_interword_spaces: '1',
        user_defined_dpi: '320',
        tessjs_create_hocr: '0',
        tessjs_create_tsv: '0',
        tessedit_char_whitelist: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,:;()[]-+\'"/%'
      };
      const rec = await withTimeout(Tesseract.recognize(c, 'eng', ocrOpts), perPass);
      if (rec && rec.data && rec.data.text) {
        let t = rec.data.text;
        t = cleanOCROutput(t);
        t = fixOCRConfusions(t);
        t = correctWithRules(t);
        return { text: t, score: measureOcrQuality(t) };
      }
      return { text: '', score: 0 };
    };

    const recognizeWithConfigs = async (baseCanvas, isHandwriting) => {
      const baseViewportW = baseCanvas.width || 1200;
      const targetW = 2000;
      const scaleDyn = Math.max(ocrScale, Math.min(2.4, targetW / Math.max(1, baseViewportW)));

      const pageCanvas = document.createElement('canvas');
      const srcW = Math.max(60, Math.ceil(baseCanvas.width * scaleDyn));
      const srcH = Math.max(60, Math.ceil(baseCanvas.height * scaleDyn));
      pageCanvas.width = srcW; pageCanvas.height = srcH;
      const pctx = ctx2d(pageCanvas);
      pctx.imageSmoothingEnabled = false;
      pctx.drawImage(baseCanvas, 0, 0, srcW, srcH);

      const pre = preprocessCanvasForOCR(pageCanvas);
      const splitX = (typeof detectColumnSplit === 'function') ? detectColumnSplit(pre) : null;

      const tBudget = Math.min(10000, OCR_TIME_BUDGET_MS - (Date.now() - tStart));
      if (tBudget <= 600) return '';

      const tryBlocks = [];
      const pushBlock = (sx, sy, sw, sh) => {
        if (sw < 80 || sh < 80) return;
        const c = document.createElement('canvas');
        c.width = sw; c.height = sh;
        const ctx = ctx2d(c);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(pre, sx, sy, sw, sh, 0, 0, sw, sh);
        tryBlocks.push(c);
      };

      if (splitX) {
        pushBlock(0, 0, splitX, pre.height);
        pushBlock(splitX, 0, pre.width - splitX, pre.height);
      } else {
        pushBlock(0, 0, pre.width, pre.height);
      }

      const perPass = Math.max(800, Math.floor(tBudget / (tryBlocks.length * 2))); // fewer passes for speed
      let best = { text: '', score: 0 };
      for (const blk of tryBlocks) {
        const r6 = await ocrCanvasBlock(blk, perPass, 6);
        const r11 = await ocrCanvasBlock(blk, perPass, 11);
        const r = [r6, r11].sort((a, b) => b.score - a.score)[0];
        if (r.score > best.score) best = r;
      }
      return best.text;
    };

    for (let i = 1; i <= limitPages; i++) {
      const page = await pdf.getPage(i);

      let collected = '';
      if (!forceOCR) {
        const textContent = await page.getTextContent().catch(() => null);
        const items = Array.isArray(textContent?.items) ? textContent.items : [];
        const pageText = items.map(item => String(item?.str || '')).join(' ');
        collected = pageText.trim();
      }

      const needOCR = forceOCR || collected.length < 80;
      if (needOCR) {
        const preview = page.getViewport({ scale: 1.0 });
        const baseScale = Math.max(1.1, Math.min(1.8, 1000 / Math.max(1, preview.width)));
        const viewport = page.getViewport({ scale: baseScale });
        const canvas = document.createElement('canvas');
        const ctx = ctx2d(canvas);
        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        await page.render({ canvasContext: ctx, viewport }).promise;
        await tick();
        const textOcr = await recognizeWithConfigs(canvas, true);
        if (textOcr && textOcr.length > collected.length) {
          collected = collected ? collected + '\n' + textOcr : textOcr;
        }
      }

      fullText += (collected || '') + '\n';
      if (i % 2 === 0) await tick();
      if ((Date.now() - tStart) > (OCR_TIME_BUDGET_MS + 1500)) break;
    }

    let out = cleanOCROutput(fullText);
    out = fixOCRConfusions(out);
    out = correctWithRules(out);
    out = sentenceShape(out);
    return out;
  } catch (error) {
    throw new Error(`Failed to read PDF: ${error.message}`);
  }
}

// ... (rest of file remains unchanged, includes ensureSentence exported, quiz/flashcards generation, etc.)