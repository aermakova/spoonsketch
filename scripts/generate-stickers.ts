// Phase 8.5A — offline sticker generator.
//
// Reads scripts/stickers-manifest.ts and produces 60 PNGs under
// assets/stickers/<pack>/<id>.png via OpenAI gpt-image-1.
//
// Usage:
//   npm install --save-dev openai sharp tsx
//   OPENAI_API_KEY=sk-... npx tsx scripts/generate-stickers.ts
//
// Cost: ~$0.04/image at standard quality => ~$2.40 total for 60 images.
// Idempotent: any PNG that already exists is skipped, so failed runs can resume.
//
// The generated PNGs commit to the repo. The runtime app never calls OpenAI —
// it loads these as Metro static requires from src/lib/stickerRegistry.ts.

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import sharp from 'sharp';

import { MANIFEST, STYLE_PREFIX } from './stickers-manifest';

// process.cwd() is the project root when invoked via `npx tsx scripts/...`
const ASSETS_ROOT = resolve(process.cwd(), 'assets', 'stickers');

const MODEL = 'gpt-image-1';
const REQUEST_SIZE = '1024x1024';
// 512x512 — crisp at 300 DPI print up to ~1.7" sticker size. 76 stickers ×
// ~50KB ≈ 3.8MB bundle hit. Existing core/* PNGs were authored smaller; new
// packs deliberately ship larger so Lulu print orders look sharp.
const TARGET_PX = 512;

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY not set. Aborting.');
    process.exit(1);
  }

  const openai = new OpenAI({ apiKey });

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;
  const startedAt = Date.now();

  for (const entry of MANIFEST) {
    const outDir = resolve(ASSETS_ROOT, entry.pack);
    const outPath = resolve(outDir, `${entry.id}.png`);

    if (existsSync(outPath)) {
      skipped += 1;
      console.log(`skip   ${entry.pack}/${entry.id}.png — already exists`);
      continue;
    }

    mkdirSync(outDir, { recursive: true });

    const fullPrompt = `${STYLE_PREFIX} ${entry.prompt}.`;

    try {
      const res = await openai.images.generate({
        model: MODEL,
        prompt: fullPrompt,
        size: REQUEST_SIZE,
        background: 'transparent',
        n: 1,
      });

      const b64 = res.data?.[0]?.b64_json;
      if (!b64) {
        throw new Error('no b64_json in response');
      }

      const raw = Buffer.from(b64, 'base64');
      const resized = await sharp(raw)
        .resize(TARGET_PX, TARGET_PX, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ compressionLevel: 9 })
        .toBuffer();

      writeFileSync(outPath, resized);
      succeeded += 1;
      console.log(`ok     ${entry.pack}/${entry.id}.png  (${resized.length} bytes)`);
    } catch (err) {
      failed += 1;
      console.error(`FAIL   ${entry.pack}/${entry.id}: ${(err as Error).message}`);
    }
  }

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log('');
  console.log(`Done in ${elapsed}s — ${succeeded} generated, ${skipped} skipped, ${failed} failed.`);
  if (failed > 0) {
    console.log('Re-run the same command to retry the failed entries (existing files are skipped).');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
