// 60-sticker manifest for Phase 8.5A — three premium packs of 20 each.
// Each entry's `prompt` is concatenated with STYLE_PREFIX in generate-stickers.ts.
// IDs become file names: assets/stickers/<pack>/<id>.png
// IDs become string keys consumed by the registry + auto-sticker Edge Function.
//
// Edit before running the generator. After PNGs are committed, change the IDs only
// if you also update src/lib/stickerRegistry.ts and supabase/functions/auto-sticker/index.ts.

export type PackId = 'baking' | 'herbs' | 'holiday';

export interface StickerManifestEntry {
  pack: PackId;
  id: string;
  prompt: string;
}

export const STYLE_PREFIX =
  "painterly hand-drawn cookbook sticker, gouache and watercolor style, " +
  "slightly imperfect strokes, soft gradient fills with a darker ink outline, " +
  "isolated subject centered in a 100x100 viewbox, transparent background, " +
  "no text, no photo realism, no drop shadow, painted-paper texture acceptable, " +
  "warm cream + terracotta + sage palette tones. Subject:";

export const MANIFEST: StickerManifestEntry[] = [
  // ─── Baking pack ──────────────────────────────────────────────
  { pack: 'baking', id: 'rolling-pin',    prompt: 'a light wooden rolling pin at a slight diagonal' },
  { pack: 'baking', id: 'stand-mixer',    prompt: 'a small stand mixer with a cream bowl and pastel handle' },
  { pack: 'baking', id: 'oven-mitt',      prompt: 'a quilted oven mitt in soft terracotta' },
  { pack: 'baking', id: 'flour-bag',      prompt: 'a small paper flour bag tied with twine, slightly dusty' },
  { pack: 'baking', id: 'sugar',          prompt: 'a small open jar of granulated sugar with a wooden spoon' },
  { pack: 'baking', id: 'butter',         prompt: 'a stick of butter on a small ceramic dish' },
  { pack: 'baking', id: 'egg',            prompt: 'a single brown chicken egg with a soft highlight' },
  { pack: 'baking', id: 'dough-ball',     prompt: 'a round ball of bread dough resting on a floured surface' },
  { pack: 'baking', id: 'yeast-jar',      prompt: 'a small glass jar of dry yeast with a kraft-paper label' },
  { pack: 'baking', id: 'vanilla-pod',    prompt: 'a single dried vanilla bean pod, dark brown' },
  { pack: 'baking', id: 'chocolate-chip', prompt: 'a small pile of three chocolate chips' },
  { pack: 'baking', id: 'cake-slice',     prompt: 'a slice of layered cream-filled cake on a small plate' },
  { pack: 'baking', id: 'croissant',      prompt: 'a single golden flaky croissant' },
  { pack: 'baking', id: 'cupcake',        prompt: 'a vanilla cupcake with swirled cream frosting and one cherry' },
  { pack: 'baking', id: 'muffin',         prompt: 'a blueberry muffin in a paper liner' },
  { pack: 'baking', id: 'donut',          prompt: 'a glazed ring donut with rainbow sprinkles' },
  { pack: 'baking', id: 'pretzel',        prompt: 'a soft baked pretzel with coarse salt' },
  { pack: 'baking', id: 'scone',          prompt: 'a triangular currant scone, lightly dusted with sugar' },
  { pack: 'baking', id: 'cookie',         prompt: 'a single round chocolate-chip cookie, slightly crumbly' },
  { pack: 'baking', id: 'pie-slice',      prompt: 'a slice of fruit pie with lattice crust on a small plate' },

  // ─── Herbs & garnish pack ────────────────────────────────────
  { pack: 'herbs', id: 'rosemary',        prompt: 'a small sprig of rosemary with needle leaves' },
  { pack: 'herbs', id: 'thyme',           prompt: 'a small sprig of fresh thyme' },
  { pack: 'herbs', id: 'sage-leaf',       prompt: 'three soft sage leaves on a short stem' },
  { pack: 'herbs', id: 'mint',            prompt: 'a fresh mint sprig with bright green leaves' },
  { pack: 'herbs', id: 'parsley',         prompt: 'a curly parsley bunch, deep green' },
  { pack: 'herbs', id: 'dill',            prompt: 'a delicate dill sprig with feathery fronds' },
  { pack: 'herbs', id: 'oregano',         prompt: 'a small oregano sprig with rounded leaves' },
  { pack: 'herbs', id: 'chives',          prompt: 'a tied bundle of long thin chive stems' },
  { pack: 'herbs', id: 'cilantro',        prompt: 'a small bunch of fresh cilantro/coriander leaves' },
  { pack: 'herbs', id: 'cinnamon-stick',  prompt: 'two cinnamon sticks tied with twine' },
  { pack: 'herbs', id: 'peppercorn',      prompt: 'a small pile of black peppercorns' },
  { pack: 'herbs', id: 'salt-shaker',     prompt: 'a short ceramic salt shaker, off-white with a tiny silver cap' },
  { pack: 'herbs', id: 'pepper-mill',     prompt: 'a wooden pepper mill, tall and slim' },
  { pack: 'herbs', id: 'lime',            prompt: 'a halved lime showing the wedge segments' },
  { pack: 'herbs', id: 'orange-slice',    prompt: 'a single round slice of orange showing pulp segments' },
  { pack: 'herbs', id: 'lavender',        prompt: 'a small bunch of dried lavender stems with purple buds' },
  { pack: 'herbs', id: 'fennel',          prompt: 'a fennel bulb with feathery green tops' },
  { pack: 'herbs', id: 'ginger-root',     prompt: 'a knobby ginger root piece, tan colored' },
  { pack: 'herbs', id: 'chili-pepper',    prompt: 'a single red chili pepper with green stem' },
  { pack: 'herbs', id: 'vanilla-bean',    prompt: 'a glass vial holding two split vanilla bean pods' },

  // ─── Holiday & seasonal pack ─────────────────────────────────
  { pack: 'holiday', id: 'pumpkin',         prompt: 'a small round orange pumpkin with a curled green stem' },
  { pack: 'holiday', id: 'gingerbread-man', prompt: 'a gingerbread man cookie with white icing dots and a red bow' },
  { pack: 'holiday', id: 'candy-cane',      prompt: 'a single red-and-white striped candy cane with a small bow' },
  { pack: 'holiday', id: 'snowflake',       prompt: 'a delicate six-pointed snowflake in pale blue' },
  { pack: 'holiday', id: 'holly-sprig',     prompt: 'a sprig of holly with three glossy green leaves and red berries' },
  { pack: 'holiday', id: 'pinecone',        prompt: 'a small brown pinecone with a tiny green sprig' },
  { pack: 'holiday', id: 'roast-turkey',    prompt: 'a roast turkey on a small platter, golden brown' },
  { pack: 'holiday', id: 'christmas-tree',  prompt: 'a small evergreen Christmas tree with a gold star' },
  { pack: 'holiday', id: 'easter-egg',      prompt: 'a pastel-painted Easter egg with a simple floral pattern' },
  { pack: 'holiday', id: 'heart-balloon',   prompt: 'a red heart-shaped balloon on a thin string' },
  { pack: 'holiday', id: 'birthday-candle', prompt: 'a single tall birthday candle with a small flame' },
  { pack: 'holiday', id: 'ribbon-bow',      prompt: 'a soft satin gift bow in dusty rose pink' },
  { pack: 'holiday', id: 'gift-box',        prompt: 'a small wrapped gift box in cream paper with a sage ribbon' },
  { pack: 'holiday', id: 'champagne-flute', prompt: 'a tall thin champagne flute with bubbles' },
  { pack: 'holiday', id: 'party-hat',       prompt: 'a striped conical party hat with a pom-pom on top' },
  { pack: 'holiday', id: 'autumn-leaf',     prompt: 'a single maple leaf in deep red and orange' },
  { pack: 'holiday', id: 'acorn',           prompt: 'a single brown acorn with its cap' },
  { pack: 'holiday', id: 'snowman',         prompt: 'a small snowman with a carrot nose and tiny scarf' },
  { pack: 'holiday', id: 'wreath',          prompt: 'a small evergreen wreath with a red ribbon at the bottom' },
  { pack: 'holiday', id: 'sparkler',        prompt: 'a lit sparkler with bright golden sparks radiating outward' },
];

// Dev-time invariant: 60 entries, ids unique within each pack.
const _ids = MANIFEST.map((m) => `${m.pack}/${m.id}`);
if (new Set(_ids).size !== _ids.length) {
  throw new Error('stickers-manifest.ts: duplicate pack/id pairs detected');
}
if (MANIFEST.length !== 60) {
  throw new Error(`stickers-manifest.ts: expected 60 entries, got ${MANIFEST.length}`);
}
