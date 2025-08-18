import io
import os
from typing import Optional

from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# PDF rendering
import fitz  # PyMuPDF
from PIL import Image

# RapidOCR (ONNXRuntime backend, no GPU needed)
try:
    from rapidocr_onnxruntime import RapidOCR
except Exception as e:
    RapidOCR = None

app = FastAPI(title="Skriptio OCR Backend", version="1.0.0")

# Allow frontend to call us (ingress terminates and routes correctly)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OCR engine lazily
_ocr_engine = None

def get_ocr_engine():
    global _ocr_engine
    if _ocr_engine is None:
        if RapidOCR is None:
            raise RuntimeError("RapidOCR not available")
        _ocr_engine = RapidOCR()
    return _ocr_engine

@app.get("/api/healthz")
async def healthz():
    return {"ok": True}

@app.post("/api/ocr/pdf")
async def ocr_pdf(
    file: UploadFile = File(...),
    max_pages: int = Form(8),
    scale: float = Form(1.6),
):
    """
    Accepts a PDF and returns recognized text using RapidOCR (server-side, no keys, no DB).
    """
    try:
        data = await file.read()
        doc = fitz.open(stream=data, filetype="pdf")
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": f"Invalid PDF: {e}"})

    max_pages = max(1, min(int(max_pages or 8), len(doc)))
    scale = max(1.2, min(float(scale or 1.6), 2.5))

    ocr = get_ocr_engine()

    full_text_parts = []
    try:
        for i in range(max_pages):
            page = doc.load_page(i)
            mat = fitz.Matrix(scale, scale)
            pix = page.get_pixmap(matrix=mat, alpha=False)
            img_bytes = pix.tobytes(output="png")
            pil_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            result, _ = ocr(pil_img)
            # result is list of [box, text, score]
            if result:
                texts = [r[1] for r in result if len(r) >= 2 and isinstance(r[1], str)]
                if texts:
                    full_text_parts.append("\n".join(texts))
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"OCR failed: {e}"})
    finally:
        try:
            doc.close()
        except Exception:
            pass

    combined = "\n".join([t for t in full_text_parts if t]).strip()
    return {"text": combined}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)