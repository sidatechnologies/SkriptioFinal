import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const root = path.resolve(process.cwd());
const src = path.join(root, 'public', 'assets', 'aceel-logo.png');
const outDir = path.join(root, 'public', 'icons');

async function main() {
  try {
    if (!fs.existsSync(src)) {
      console.error('[gen-icons] Source logo not found at', src);
      process.exit(0);
    }
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const sizes = [192, 512];
    for (const size of sizes) {
      const out = path.join(outDir, `icon-${size}.png`);
      await sharp(src).resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(out);
      console.log('[gen-icons] Wrote', out);
    }
  } catch (e) {
    console.error('[gen-icons] Error:', e.message);
  }
}

main();