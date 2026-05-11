/**
 * One-shot script to render static/og.svg → static/og.png at 1200×630.
 * Re-run after editing og.svg:   node scripts/generate-og.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '..', 'static', 'og.svg');
const OUT = resolve(__dirname, '..', 'static', 'og.png');

const svg = await readFile(SRC);
const png = await sharp(svg, { density: 192 })
	.resize(1200, 630, { fit: 'contain', background: '#0E1F3F' })
	.png({ compressionLevel: 9 })
	.toBuffer();
await writeFile(OUT, png);
console.log(`Wrote ${OUT} (${png.byteLength.toLocaleString()} bytes)`);
