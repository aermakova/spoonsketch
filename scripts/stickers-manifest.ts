// Sticker manifest for Phase 8.5A.
// Each entry's `prompt` is concatenated with STYLE_PREFIX in generate-stickers.ts.
// IDs become file names: assets/stickers/<pack>/<id>.png
// IDs become string keys consumed by the registry + auto-sticker Edge Function.
//
// Edit before running the generator. After PNGs are committed, change the IDs only
// if you also update src/lib/stickerRegistry.ts and supabase/functions/auto-sticker/index.ts.

export type PackId =
  // Food/edible stickers — generated with STYLE_PREFIX applied (watercolor cookbook style)
  | 'baking'
  | 'herbs'
  | 'vegetables'
  | 'fruits'
  | 'spices'
  | 'pantry'
  | 'meals'
  | 'desserts'
  | 'botanical'
  | 'holiday'
  // Scrapbook decor — generated WITHOUT STYLE_PREFIX (each prompt is self-contained)
  | 'washi'
  | 'paper'
  | 'photo'
  | 'stickers'
  | 'adhesive'
  | 'labels'
  | 'doodles';

export interface StickerManifestEntry {
  pack: PackId;
  id: string;
  prompt: string;
}

export const STYLE_PREFIX =
"Detailed hand-painted watercolor illustration with loose but refined brushstrokes, " +
"with clear contour," +
"fine brown-olive ink linework, delicate sketch details, visible watercolor pigment texture, " +
"layered translucent washes, subtle granulation, soft imperfect edges, " +
"premium vintage cookbook illustration style, " +
"isolated subject centered in a 100x100 viewbox, " +
"real transparent background with alpha transparency, no visible background, " +
"no visible background, no paper background, no checkerboard pattern, no white fill, " +
"no glow, no halo, no drop shadow, no cast shadow, no contact shadow, no ground shadow, " +
"no floor, no surface, no table, no base, no pedestal, " +
"no watercolor splash, no paint puddle, no beige wash, no surrounding wash, no background stains, " +
"all paint and linework must belong only to the subject silhouette, " +
"clean isolated cutout object ONLY, floating object, " +
"no text, no photorealism, not a flat icon, " +
"do not add any background or shadow below or near the subject, the image should only contain the subject." +
"Subject: ";

export const MANIFEST: StickerManifestEntry[] = [

  // ─── Baking pack (unchanged, good) ───────────────────────────
  { pack: 'baking', id: 'rolling-pin', prompt: 'a light wooden rolling pin at a slight diagonal' },
  { pack: 'baking', id: 'stand-mixer', prompt: 'a small stand mixer with a cream bowl and pastel handle' },
  { pack: 'baking', id: 'oven-mitt', prompt: 'a quilted oven mitt in soft terracotta' },
  { pack: 'baking', id: 'flour-bag', prompt: 'a small paper flour bag tied with twine, slightly dusty' },
  { pack: 'baking', id: 'sugar', prompt: 'a small open jar of granulated sugar with a wooden spoon' },
  { pack: 'baking', id: 'butter', prompt: 'a stick of butter on a small ceramic dish' },
  { pack: 'baking', id: 'egg', prompt: 'a single brown chicken egg with a soft highlight' },
  { pack: 'baking', id: 'dough-ball', prompt: 'a round ball of bread dough resting on a floured surface' },
  { pack: 'baking', id: 'yeast-jar', prompt: 'a small glass jar of dry yeast with a kraft-paper label' },
  { pack: 'baking', id: 'vanilla-pod', prompt: 'a single dried vanilla bean pod, dark brown' },
  { pack: 'baking', id: 'chocolate-chip', prompt: 'a small pile of three chocolate chips' },
  { pack: 'baking', id: 'cake-slice', prompt: 'a slice of layered cream-filled cake on a small plate' },
  { pack: 'baking', id: 'croissant', prompt: 'a single golden flaky croissant' },
  { pack: 'baking', id: 'cupcake', prompt: 'a vanilla cupcake with swirled cream frosting and one cherry' },
  { pack: 'baking', id: 'muffin', prompt: 'a blueberry muffin in a paper liner' },
  { pack: 'baking', id: 'donut', prompt: 'a glazed ring donut with rainbow sprinkles' },
  { pack: 'baking', id: 'pretzel', prompt: 'a soft baked pretzel with coarse salt' },
  { pack: 'baking', id: 'scone', prompt: 'a triangular currant scone, lightly dusted with sugar' },
  { pack: 'baking', id: 'cookie', prompt: 'a single round chocolate-chip cookie, slightly crumbly' },
  { pack: 'baking', id: 'pie-slice', prompt: 'a slice of fruit pie with lattice crust on a small plate' },

  // ─── Fresh Herbs (cleaned) ───────────────────────────────────
  { pack: 'herbs', id: 'rosemary', prompt: 'a small sprig of rosemary with needle leaves' },
  { pack: 'herbs', id: 'thyme', prompt: 'a small sprig of fresh thyme' },
  { pack: 'herbs', id: 'sage', prompt: 'three soft sage leaves on a short stem' },
  { pack: 'herbs', id: 'mint', prompt: 'a fresh mint sprig with bright green leaves' },
  { pack: 'herbs', id: 'parsley', prompt: 'a curly parsley bunch, deep green' },
  { pack: 'herbs', id: 'dill', prompt: 'a delicate dill sprig with feathery fronds' },
  { pack: 'herbs', id: 'oregano', prompt: 'a small oregano sprig with rounded leaves' },
  { pack: 'herbs', id: 'chives', prompt: 'a tied bundle of long thin chive stems' },
  { pack: 'herbs', id: 'cilantro', prompt: 'a small bunch of fresh cilantro leaves' },
  { pack: 'herbs', id: 'basil', prompt: 'a small basil sprig with soft rounded leaves' },
  { pack: 'herbs', id: 'bay-leaf', prompt: 'two dried bay leaves overlapping slightly' },

  // ─── Vegetables pack ─────────────────────────────────────────
  { pack: 'vegetables', id: 'carrot', prompt: 'a whole carrot with leafy green top' },
  { pack: 'vegetables', id: 'carrot-slice', prompt: 'three round carrot slices arranged loosely' },
  { pack: 'vegetables', id: 'tomato', prompt: 'a ripe red tomato with a green stem' },
  { pack: 'vegetables', id: 'tomato-half', prompt: 'a halved tomato showing seeds and pulp' },
  { pack: 'vegetables', id: 'cucumber', prompt: 'a fresh cucumber slightly curved' },
  { pack: 'vegetables', id: 'onion', prompt: 'a whole golden onion with papery skin' },
  { pack: 'vegetables', id: 'garlic', prompt: 'a garlic bulb with two loose cloves' },
  { pack: 'vegetables', id: 'broccoli', prompt: 'a broccoli crown with textured florets' },
  { pack: 'vegetables', id: 'mushroom', prompt: 'two small mushrooms with light brown caps' },
  { pack: 'vegetables', id: 'bell-pepper', prompt: 'a red bell pepper with a green stem' },
  { pack: 'vegetables', id: 'eggplant', prompt: 'a deep purple eggplant with glossy skin' },
  { pack: 'vegetables', id: 'zucchini', prompt: 'a long green zucchini with soft highlights' },
  { pack: 'vegetables', id: 'potato', prompt: 'a rustic brown potato with uneven surface' },
  { pack: 'vegetables', id: 'corn', prompt: 'a corn cob partially wrapped in husk' },
  { pack: 'vegetables', id: 'radish', prompt: 'a small bunch of red radishes with leaves' },

  // ─── Fruits pack ─────────────────────────────────────────────
  { pack: 'fruits', id: 'apple', prompt: 'a red apple with a small stem and leaf' },
  { pack: 'fruits', id: 'apple-slice', prompt: 'two apple slices showing the core' },
  { pack: 'fruits', id: 'banana', prompt: 'a slightly curved yellow banana' },
  { pack: 'fruits', id: 'strawberries', prompt: 'a small cluster of strawberries with green tops' },
  { pack: 'fruits', id: 'blueberries', prompt: 'a small pile of blueberries with soft bloom' },
  { pack: 'fruits', id: 'lemon', prompt: 'a whole lemon with textured skin' },
  { pack: 'fruits', id: 'lemon-slice', prompt: 'a single lemon slice showing segments' },
  { pack: 'fruits', id: 'orange', prompt: 'a whole orange with dimpled skin' },
  { pack: 'fruits', id: 'peach', prompt: 'a soft peach with a blush gradient' },
  { pack: 'fruits', id: 'fig', prompt: 'a halved fig showing seeds and deep interior' },
  { pack: 'fruits', id: 'grapes', prompt: 'a small bunch of grapes on a stem' },

  // ─── Spices pack ─────────────────────────────────────────────
  { pack: 'spices', id: 'cinnamon', prompt: 'two cinnamon sticks tied with twine' },
  { pack: 'spices', id: 'star-anise', prompt: 'a single star anise pod' },
  { pack: 'spices', id: 'cloves', prompt: 'a small pile of whole cloves' },
  { pack: 'spices', id: 'peppercorn', prompt: 'a small pile of black peppercorns' },
  { pack: 'spices', id: 'chili', prompt: 'a red chili pepper slightly curved' },
  { pack: 'spices', id: 'ginger', prompt: 'a knobby ginger root piece' },
  { pack: 'spices', id: 'turmeric', prompt: 'a turmeric root with warm orange tone' },
  { pack: 'spices', id: 'vanilla', prompt: 'a dark vanilla bean pod slightly curved' },
  { pack: 'spices', id: 'nutmeg', prompt: 'a whole nutmeg seed with textured shell' },

  // ─── Pantry essentials ───────────────────────────────────────
  { pack: 'pantry', id: 'flour', prompt: 'a small pile of white flour with soft edges' },
  { pack: 'pantry', id: 'sugar-pile', prompt: 'a small mound of granulated sugar' },
  { pack: 'pantry', id: 'honey', prompt: 'a drip of golden honey with soft shine' },
  { pack: 'pantry', id: 'milk', prompt: 'a small glass of milk with soft reflection' },
  { pack: 'pantry', id: 'eggs-group', prompt: 'three brown eggs grouped together' },
  { pack: 'pantry', id: 'cheese', prompt: 'a wedge of cheese with small holes' },
  { pack: 'pantry', id: 'olive-oil', prompt: 'a small glass bottle of olive oil with a cork' },
  { pack: 'pantry', id: 'pasta-dry', prompt: 'a small bundle of uncooked spaghetti tied with twine' },
  { pack: 'pantry', id: 'rice', prompt: 'a small ceramic bowl filled with rice grains' },

  // ─── Meals pack (key visual pack) ────────────────────────────
  { pack: 'meals', id: 'pasta', prompt: 'a plate of pasta with soft sauce and herbs' },
  { pack: 'meals', id: 'ramen', prompt: 'a bowl of ramen with noodles and toppings' },
  { pack: 'meals', id: 'soup', prompt: 'a bowl of warm soup with herbs on top' },
  { pack: 'meals', id: 'salad', prompt: 'a fresh salad in a ceramic bowl' },
  { pack: 'meals', id: 'pancakes', prompt: 'a stack of pancakes with syrup dripping' },
  { pack: 'meals', id: 'toast-avocado', prompt: 'a slice of toast topped with mashed avocado' },
  { pack: 'meals', id: 'sandwich', prompt: 'a layered sandwich cut diagonally' },
  { pack: 'meals', id: 'pizza', prompt: 'a slice of pizza with melted cheese' },
  { pack: 'meals', id: 'sushi', prompt: 'a small set of sushi pieces neatly arranged' },
  { pack: 'meals', id: 'rice-bowl', prompt: 'a bowl of rice with simple toppings' },
  { pack: 'meals', id: 'grilled-salmon', prompt: 'a piece of grilled salmon with garnish' },
  { pack: 'meals', id: 'roast-chicken', prompt: 'a roasted chicken on a serving plate' },

  // ─── Desserts pack ───────────────────────────────────────────
  { pack: 'desserts', id: 'cheesecake', prompt: 'a slice of cheesecake with smooth top' },
  { pack: 'desserts', id: 'brownies', prompt: 'two stacked brownies with soft texture' },
  { pack: 'desserts', id: 'macarons', prompt: 'three pastel macarons stacked loosely' },
  { pack: 'desserts', id: 'tart', prompt: 'a fruit tart with glossy topping' },
  { pack: 'desserts', id: 'ice-cream', prompt: 'a scoop of ice cream with soft melting edge' },
  { pack: 'desserts', id: 'waffles', prompt: 'a waffle with syrup and berries' },

  // ─── Botanical decor (signature style) ───────────────────────
  { pack: 'botanical', id: 'flower-sprig', prompt: 'a delicate wildflower sprig with thin stems and soft blossoms' },
  { pack: 'botanical', id: 'buds', prompt: 'a small branch with closed flower buds' },
  { pack: 'botanical', id: 'leaves', prompt: 'a soft arrangement of sage green leaves' },
  { pack: 'botanical', id: 'branch', prompt: 'a thin botanical branch with small leaves' },
  { pack: 'botanical', id: 'floral-cluster', prompt: 'a small cluster of mixed pastel flowers' },
  
  // ─── Holiday (cleaned) ───────────────────────────────────────
  { pack: 'holiday', id: 'pumpkin', prompt: 'a small round pumpkin with a curved stem' },
  { pack: 'holiday', id: 'gingerbread', prompt: 'a gingerbread cookie with icing details' },
  { pack: 'holiday', id: 'pinecone', prompt: 'a small pinecone with natural texture' },
  { pack: 'holiday', id: 'holly', prompt: 'a holly sprig with red berries and glossy leaves' },
  { pack: 'holiday', id: 'autumn-leaf', prompt: 'a maple leaf in warm autumn colors' },
  { pack: 'holiday', id: 'acorn', prompt: 'a small brown acorn with cap' },
  { pack: 'holiday', id: 'wreath', prompt: 'a simple evergreen wreath with subtle ribbon' },

];

// Scrapbook decor manifest — washi tape, paper, photo frames, labels, doodles.
//
// Unlike MANIFEST above, these prompts are self-contained: each one already
// includes the "transparent background, no shadow, no glow" qualifiers, and
// the visual language is paper/scrapbook (not the watercolor-cookbook look
// that STYLE_PREFIX bakes in for food stickers). The generator skips
// STYLE_PREFIX prefixing for entries from this manifest.
export const DECOR_MANIFEST: StickerManifestEntry[] = [

  // ─── Washi tape pack ──────────────────────────────────────────
  { pack: 'washi', id: 'washi-beige', prompt: 'a torn strip of beige washi tape with soft paper fibers, slightly curved, subtle texture, matte finish, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'washi', id: 'washi-grid', prompt: 'a strip of grid pattern washi tape in soft gray lines on off-white paper, slightly torn edges, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'washi', id: 'washi-floral', prompt: 'a decorative washi tape strip with tiny floral pattern in muted pastel colors, soft edges, slightly irregular shape, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'washi', id: 'washi-terra', prompt: 'a torn terracotta colored washi tape strip with paper texture, slightly angled, matte look, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'washi', id: 'washi-sage', prompt: 'a soft sage green washi tape strip with subtle grain, torn edges, organic shape, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'washi', id: 'washi-layered', prompt: 'two overlapping strips of neutral washi tape, slightly rotated, soft paper texture, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },

  // ─── Paper / scrapbook pack ───────────────────────────────────
  { pack: 'paper', id: 'torn-paper', prompt: 'a torn piece of cream paper with rough uneven edges, soft vintage texture, slightly curved, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'paper', id: 'kraft-paper', prompt: 'a small piece of brown kraft paper with subtle grain texture and irregular torn edges, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'paper', id: 'notebook-paper', prompt: 'a piece of lined notebook paper with soft blue lines and slightly torn edges, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'paper', id: 'grid-paper', prompt: 'a small square of grid paper with faint gray lines, clean but slightly imperfect edges, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'paper', id: 'vintage-paper', prompt: 'a soft aged paper piece with warm cream tone and subtle texture, slightly worn edges, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'paper', id: 'paper-stack', prompt: 'two layered pieces of scrapbook paper slightly offset, soft shadows between layers, vintage texture, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no glow' },

  // ─── Photo decor / frames ─────────────────────────────────────
  { pack: 'photo', id: 'polaroid-frame', prompt: 'a polaroid photo frame with white border and empty center, slightly tilted, soft vintage look, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'photo', id: 'polaroid-stack', prompt: 'two overlapping polaroid frames slightly rotated, empty centers, soft matte texture, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'photo', id: 'film-strip', prompt: 'a vertical film strip frame with empty photo slots, dark matte finish, slightly curved, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'photo', id: 'photo-corners', prompt: 'four small vintage photo corners arranged in a square layout for framing a photo, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'photo', id: 'photo-corner-single', prompt: 'a single vintage photo corner with soft paper texture, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'photo', id: 'taped-photo', prompt: 'an empty rectangular photo area with two small pieces of washi tape attached at the top corners, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },

  // ─── Sticker squares (classic stickers) ───────────────────────
  { pack: 'stickers', id: 'sticker-square-cream', prompt: 'a square sticker with rounded corners in soft cream color, slightly curled corner peeling up, subtle glossy surface, transparent background, real alpha transparency, no background, no shadow, no glow' },
  { pack: 'stickers', id: 'sticker-square-sage', prompt: 'a square sage green sticker with rounded corners and one corner slightly folded, matte paper finish, transparent background, real alpha transparency, no background, no shadow, no glow' },
  { pack: 'stickers', id: 'sticker-square-terra', prompt: 'a terracotta square sticker with rounded edges and a small peeled corner, soft paper texture, transparent background, real alpha transparency, no background, no shadow, no glow' },
  { pack: 'stickers', id: 'sticker-square-layered', prompt: 'two overlapping square stickers with rounded corners, slightly rotated, one corner curled, transparent background, real alpha transparency, no background, no shadow, no glow' },

  // ─── Adhesive / bandage style (to hold stickers/photos) ───────
  { pack: 'adhesive', id: 'tape-cross', prompt: 'two small semi-transparent tape strips crossed over each other like holding a photo, soft matte texture, transparent background, real alpha transparency, no background, no shadow, no glow' },
  { pack: 'adhesive', id: 'tape-horizontal', prompt: 'a single horizontal strip of semi-transparent tape with soft edges, slightly uneven, transparent background, real alpha transparency, no background, no shadow, no glow' },
  { pack: 'adhesive', id: 'bandage', prompt: 'a small beige adhesive bandage strip with soft fabric texture, centered, transparent background, real alpha transparency, no background, no shadow, no glow' },
  { pack: 'adhesive', id: 'bandage-cross', prompt: 'two crossed adhesive bandage strips holding an imaginary object, soft fabric texture, transparent background, real alpha transparency, no background, no shadow, no glow' },

  // ─── Labels / tags ────────────────────────────────────────────
  { pack: 'labels', id: 'label-oval', prompt: 'a small oval label sticker in soft cream color with subtle paper texture, empty center, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'labels', id: 'label-rectangle', prompt: 'a rectangular paper label with slightly rounded corners and soft texture, empty center, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'labels', id: 'label-tag', prompt: 'a small tag-shaped label with a hole at the top, tied with thin string, soft paper texture, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },
  { pack: 'labels', id: 'label-ripped', prompt: 'a ripped paper label with uneven edges and soft vintage texture, transparent background, real alpha transparency, no background, no paper texture behind, no checkerboard, no shadow, no glow' },

  // ─── Handwritten / doodles ────────────────────────────────────
  { pack: 'doodles', id: 'heart-line', prompt: 'a single-line hand-drawn heart in soft ink, slightly uneven and organic, transparent background, real alpha transparency, no background, no shadow, no glow' },
  { pack: 'doodles', id: 'smile', prompt: 'a simple hand-drawn smiley face with two dots and a curved line, minimal ink style, transparent background, real alpha transparency, no background, no shadow, no glow' },
  { pack: 'doodles', id: 'sun', prompt: 'a small hand-drawn sun with thin rays and a circular center, sketchy ink lines, transparent background, real alpha transparency, no background, no shadow, no glow' },
  { pack: 'doodles', id: 'made-with-love', prompt: 'handwritten phrase "Made with love" in soft flowing cursive, slightly imperfect ink line, transparent background, real alpha transparency, no background, no shadow, no glow' },
  { pack: 'doodles', id: 'bon-appetit', prompt: 'handwritten phrase "Bon appétit" in elegant casual script, slightly uneven line, transparent background, real alpha transparency, no background, no shadow, no glow' },
  { pack: 'doodles', id: 'yum', prompt: 'handwritten word "yum" in playful casual script, slightly tilted, transparent background, real alpha transparency, no background, no shadow, no glow' },

];

// Combined view used by the sample script. The generator processes the two
// arrays separately so it can apply STYLE_PREFIX to MANIFEST only.
export const ALL_MANIFEST_ENTRIES: ReadonlyArray<StickerManifestEntry> = [
  ...MANIFEST,
  ...DECOR_MANIFEST,
];

// Dev-time invariants:
// - ids unique within each pack across BOTH manifests (no collisions when
//   they all live in the same assets/stickers/<pack>/ directory tree).
// - neither manifest is empty.
const _ids = ALL_MANIFEST_ENTRIES.map((m) => `${m.pack}/${m.id}`);
if (new Set(_ids).size !== _ids.length) {
  throw new Error('stickers-manifest.ts: duplicate pack/id pairs detected');
}
if (MANIFEST.length === 0) {
  throw new Error('stickers-manifest.ts: MANIFEST is empty');
}
if (DECOR_MANIFEST.length === 0) {
  throw new Error('stickers-manifest.ts: DECOR_MANIFEST is empty');
}
