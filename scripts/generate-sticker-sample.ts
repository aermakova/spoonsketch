// Phase 8.5A — single-sample sticker generator for style validation.
//
// Generates ONE sticker using the exact same prompt + STYLE_PREFIX + sharp resize
// pipeline as the full generate-stickers.ts run. Writes to scripts/samples/
// (NOT to assets/), so you can iterate on the style without polluting the repo.
// scripts/samples/ is gitignored.
//
// Usage:
//   OPENAI_API_KEY=sk-... npx tsx scripts/generate-sticker-sample.ts [pack/id]
//
// Default sample: holiday/pumpkin (visually distinctive — easy to judge style).
// Examples:
//   npx tsx scripts/generate-sticker-sample.ts                    # holiday/pumpkin
//   npx tsx scripts/generate-sticker-sample.ts baking/croissant
//   npx tsx scripts/generate-sticker-sample.ts herbs/rosemary
//
// On macOS the generated PNG opens automatically. If you don't like the style,
// edit STYLE_PREFIX in scripts/stickers-manifest.ts and re-run this script.
//
// Cost: ~$0.04 per sample.

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import OpenAI from 'openai';
import sharp from 'sharp';

import {
  MANIFEST,
  DECOR_MANIFEST,
  STYLE_PREFIX,
  ALL_MANIFEST_ENTRIES,
  type StickerManifestEntry,
} from './stickers-manifest';

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY not set. Aborting.');
    process.exit(1);
  }

  const arg = process.argv[2] ?? 'holiday/pumpkin';
  const [packArg, idArg] = arg.split('/');

  if (!packArg || !idArg) {
    console.error(`Bad arg "${arg}". Expected format: pack/id (e.g. baking/croissant)`);
    process.exit(1);
  }

  const entry: StickerManifestEntry | undefined = ALL_MANIFEST_ENTRIES.find(
    (m) => m.pack === packArg && m.id === idArg,
  );

  if (!entry) {
    console.error(`No manifest entry for "${arg}".`);
    console.error('Available IDs:');
    for (const m of ALL_MANIFEST_ENTRIES) console.error(`  ${m.pack}/${m.id}`);
    process.exit(1);
  }

  // Decor entries (washi, paper, photo, stickers, adhesive, labels, doodles)
  // bring their own complete prompts and intentionally don't use the
  // watercolor-cookbook STYLE_PREFIX. Match the bulk-generator's logic.
  const isDecorEntry = DECOR_MANIFEST.some(
    (m) => m.pack === entry.pack && m.id === entry.id,
  );
  const fullPrompt = isDecorEntry ? entry.prompt : `${STYLE_PREFIX} ${entry.prompt}.`;
  // Reference MANIFEST so the import isn't reported as unused — keeps the
  // intent ("we know about both manifests") explicit at the call site.
  void MANIFEST;
  const samplesDir = resolve(process.cwd(), 'scripts', 'samples');
  mkdirSync(samplesDir, { recursive: true });
  const outPath = resolve(samplesDir, `${entry.pack}-${entry.id}.png`);

  console.log(`Generating sample: ${entry.pack}/${entry.id}`);
  console.log(`Prompt: ${fullPrompt}`);
  console.log('');

  const openai = new OpenAI({ apiKey });
  const startedAt = Date.now();

  const res = await openai.images.generate({
    model: 'gpt-image-1',
    prompt: fullPrompt,
    size: '1024x1024',
    background: 'transparent',
    n: 1,
  });

  const b64 = res.data?.[0]?.b64_json;
  if (!b64) {
    console.error('No b64_json in response.');
    process.exit(1);
  }

  // 512x512 — crisp at 300 DPI print up to ~1.7" sticker size while keeping
  // per-file weight ~30-80KB (76 stickers × ~50KB ≈ 3.8MB total bundle hit).
  const raw = Buffer.from(b64, 'base64');
  const resized = await sharp(raw)
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toBuffer();

  writeFileSync(outPath, resized);
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

  console.log(`Wrote ${outPath} (${resized.length} bytes, ${elapsed}s)`);

  // Auto-open on macOS so the user can judge the style immediately.
  if (process.platform === 'darwin') {
    try {
      execSync(`open "${outPath}"`);
    } catch {
      // ignore — file is on disk, user can open manually
    }
  }

  console.log('');
  console.log('If the style looks right, run the full generator:');
  console.log('  npx tsx scripts/generate-stickers.ts');
  console.log('');
  console.log('If not, edit STYLE_PREFIX in scripts/stickers-manifest.ts and re-run this sample.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
