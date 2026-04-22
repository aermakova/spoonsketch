import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { FoodImage } from '../ui/FoodImage';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import type { Palette } from '../../lib/store';
import type { Ingredient, Instruction, Recipe } from '../../types/recipe';
import type { TemplateKey, FontPresetKey } from '../../lib/canvasStore';
import type { StepOverride, IngOverride } from '../../lib/canvasStore';
import type { BlockOverride } from '../../lib/blockDefs';
import { TEMPLATE_BLOCKS } from '../../lib/blockDefs';
import type { CookbookSectionTitles } from '../../types/cookbook';
import { DEFAULT_SECTION_TITLES } from '../../types/cookbook';
import { BlockElement } from './BlockElement';
import { BlockItemEditor } from './BlockItemEditor';

// Cookbook section titles are user-editable per book. Empty / whitespace-only
// values fall back to the English default so users can clear a field to reset.
function resolveSectionTitle(
  titles: CookbookSectionTitles | undefined,
  key: keyof CookbookSectionTitles,
): string {
  const t = titles?.[key]?.trim();
  return t && t.length > 0 ? t : DEFAULT_SECTION_TITLES[key];
}

// Reference width for proportional font scaling (A4-equivalent "design canvas").
// All base font sizes are authored at this width; scaled by pw/DESIGN_WIDTH at render.
const DESIGN_WIDTH = 560;

// ─── Font presets ─────────────────────────────────────────────────
export interface FontPreset {
  key: FontPresetKey;
  label: string;
  title: string;    // fontFamily for recipe title
  section: string;  // fontFamily for all other text
  preview: string;  // word shown in the picker card
}

export const FONT_PRESETS: FontPreset[] = [
  { key: 'caveat',     label: 'Caveat',       title: 'Caveat_700Bold',         section: 'Caveat_400Regular',      preview: 'Recipe' },
  { key: 'marck',      label: 'Marck Script', title: 'MarckScript_400Regular', section: 'MarckScript_400Regular', preview: 'Recipe' },
  { key: 'bad-script', label: 'Bad Script',   title: 'BadScript_400Regular',   section: 'BadScript_400Regular',   preview: 'Recipe' },
  { key: 'amatic',     label: 'Amatic SC',    title: 'AmaticSC_700Bold',       section: 'AmaticSC_400Regular',    preview: 'Recipe' },
];

function resolvePreset(key: FontPresetKey): FontPreset {
  return FONT_PRESETS.find(p => p.key === key) ?? FONT_PRESETS[0];
}

// ─── Shared types ─────────────────────────────────────────────────
export interface TemplateProps {
  recipe: Recipe;
  pageWidth: number;
  palette: Palette;
  recipeFont: FontPresetKey;
  sectionTitles?: CookbookSectionTitles;
  // Block editing — all optional; omit for read-only (scrapbook preview)
  blockOverrides?: Record<string, BlockOverride>;
  blockEditMode?: boolean;
  selectedBlockId?: string | null;
  onSelectBlock?: (id: string | null) => void;
  onUpdateBlock?: (blockId: string, patch: Partial<BlockOverride>) => void;
  onMeasuredHeight?: (blockId: string, hFrac: number) => void;
  onDeleteBlock?: (blockId: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  layoutResetVersion?: number;
  // Content overrides (canvas-only edits to step/ingredient text)
  stepOverrides?: Record<number, StepOverride>;
  ingOverrides?: Record<string, IngOverride>;
  onSaveStep?: (stepNum: number, o: StepOverride) => void;
  onSaveIng?: (ingId: string, o: IngOverride) => void;
}

// ─── Block resolve helper ─────────────────────────────────────────
interface ResolvedBlock {
  cx: number; cy: number; w: number; h: number;
  rotation: number; scale: number;
  fontScale: number;
  isTextHeavy: boolean;
  // True iff the user has explicitly resized the block's width OR bumped its fontScale.
  // Drives "let text wrap naturally" — we disable numberOfLines caps and adjustsFontSizeToFit
  // when the user has expressed a layout preference, so RN doesn't silently cancel it.
  hasTextOverride: boolean;
  elKey: string;
}

function useBlockResolver(templateKey: TemplateKey, pageWidth: number, blockOverrides?: Record<string, BlockOverride>, layoutResetVersion?: number) {
  const pageHeight = Math.round(pageWidth * 1.4142);
  const defs = TEMPLATE_BLOCKS[templateKey] ?? [];
  const ver = layoutResetVersion ?? 0;

  function getBlock(id: string): ResolvedBlock | null {
    const def = defs.find(d => d.blockId === id);
    if (!def) return null;
    const ov = blockOverrides?.[id];
    if (ov?.hidden) return null;
    const elKey = `${id}-${ver}`;
    const base = def.getDefault(pageWidth);
    const fontScale = ov?.fontScale ?? 1;
    const hasTextOverride = fontScale !== 1 || ov?.w != null;
    return {
      cx: ov?.cx != null ? ov.cx * pageWidth  : base.cx,
      cy: ov?.cy != null ? ov.cy * pageHeight : base.cy,
      w:  ov?.w  != null ? ov.w  * pageWidth  : base.w,
      // Text-heavy blocks always use default h for translateY anchoring; the
      // measured-content override would otherwise shift them vertically once
      // onLayout commits (~200ms after mount / template change).
      h: def.isTextHeavy
        ? base.h
        : (ov?.h != null ? ov.h * pageWidth : base.h),
      rotation: ov?.rotation ?? base.rotation,
      scale: ov?.scale ?? base.scale,
      fontScale,
      isTextHeavy: def.isTextHeavy,
      hasTextOverride,
      elKey,
    };
  }

  return { getBlock, pageHeight };
}

// ─── Block wiring helper — reduces per-template boilerplate ──────
function makeBlockProps(
  blockId: string,
  resolved: ResolvedBlock,
  props: TemplateProps,
  pageHeight: number,
) {
  const { blockEditMode = false, selectedBlockId, onSelectBlock, onUpdateBlock, onMeasuredHeight, onDeleteBlock, onDragStart, onDragEnd } = props;
  return {
    blockId,
    cx: resolved.cx,
    cy: resolved.cy,
    w: resolved.w,
    h: resolved.h,
    rotation: resolved.rotation,
    scale: resolved.scale,
    isTextHeavy: resolved.isTextHeavy,
    selected: selectedBlockId === blockId,
    editMode: blockEditMode,
    pageWidth: props.pageWidth,
    pageHeight,
    onSelect: () => onSelectBlock?.(blockId),
    onUpdate: (bid: string, patch: Partial<BlockOverride>) => onUpdateBlock?.(bid, patch),
    onMeasuredHeight,
    onDelete: (bid: string) => onDeleteBlock?.(bid),
    onDragStart: () => onDragStart?.(),
    onDragEnd: () => onDragEnd?.(),
  };
}

// ─── Text scaling helper ──────────────────────────────────────────
// Multiplies fontSize (and lineHeight if present) by `s`. No-op at s=1.
// Used to apply per-block user fontScale to individual text styles without
// rebuilding the whole StyleSheet per block.
function scaleText(style: any, s: number) {
  if (s === 1) return style;
  const out: any = { ...style, fontSize: (style.fontSize ?? 0) * s };
  if (style.lineHeight) out.lineHeight = style.lineHeight * s;
  return out;
}

// ─── Dynamic item count — matches actual row heights from makeT ───
type ItemType = 'step' | 'step-sm' | 'step-journal' | 'ing' | 'ing-sm';

function maxCount(blockH: number, pw: number, type: ItemType): number {
  const fs = pw / DESIGN_WIDTH;
  const lh = (n: number) => Math.max(9, Math.round(n * fs));
  const mg = (n: number) => Math.max(2, Math.round(n * fs));
  const sz = (n: number) => Math.max(9, Math.round(n * fs));

  switch (type) {
    case 'step': {
      const headerH = lh(13) + mg(5);
      const rowH = Math.max(sz(15), lh(14) * 2) + mg(5);
      return Math.max(1, Math.floor((blockH - headerH) / rowH));
    }
    case 'step-sm': {
      const headerH = lh(13) + mg(5);
      const rowH = Math.max(sz(12), lh(13) * 3) + mg(4);
      return Math.max(1, Math.floor((blockH - headerH) / rowH));
    }
    case 'step-journal': {
      const headerH = mg(8);
      const rowH = lh(16) * 2 + mg(4) * 2;
      return Math.max(1, Math.floor((blockH - headerH) / rowH));
    }
    case 'ing': {
      const headerH = lh(13) + mg(5);
      const rowH = lh(14) + mg(3);
      return Math.max(1, Math.floor((blockH - headerH) / rowH));
    }
    case 'ing-sm': {
      const headerH = lh(13) + mg(5);
      const rowH = lh(13) + mg(3);
      return Math.max(1, Math.floor((blockH - headerH) / rowH));
    }
  }
}

// ─── Uniform step font scale — computes one scale for ALL steps ───
// Prevents one long step from being disproportionately smaller than the others.
function uniformStepScale(texts: string[], textAreaW: number, baseFs: number): number {
  const charsPerLine = Math.max(1, textAreaW / (baseFs * 0.52));
  const maxChars = charsPerLine * 2;
  const longest = texts.reduce((m, s) => Math.max(m, s.length), 0);
  if (longest <= maxChars) return 1;
  return Math.max(0.5, maxChars / longest);
}

// ─── Classic ──────────────────────────────────────────────────────
function Classic(props: TemplateProps) {
  const { recipe, pageWidth, palette, recipeFont, sectionTitles } = props;
  const ingredientsTitle = resolveSectionTitle(sectionTitles, 'ingredients');
  const methodTitle = resolveSectionTitle(sectionTitles, 'method');
  const t = makeT(pageWidth);
  const preset = resolvePreset(recipeFont);
  const f = preset.section;
  const fs = pageWidth / DESIGN_WIDTH;
  const imgSize = Math.round(pageWidth * 0.38);
  const { getBlock, pageHeight } = useBlockResolver('classic', pageWidth, props.blockOverrides, props.layoutResetVersion);
  const [editing, setEditing] = useState<{ kind: 'step'; num: number; text: string } | { kind: 'ing'; id: string; text: string } | null>(null);

  const title = getBlock('title');
  const description = getBlock('description');
  const pills = getBlock('pills');
  const image = getBlock('image');
  const ingHeading = getBlock('ingredients-heading');
  const ingList = getBlock('ingredients-list');
  const methodHeading = getBlock('method-heading');
  const methodList = getBlock('method-list');
  const tags = getBlock('tags');

  const inEdit = (bid: string) => !!props.blockEditMode && props.selectedBlockId === bid;

  const visibleSteps = (recipe.instructions as Instruction[]).filter(s => !props.stepOverrides?.[s.step]?.hidden);
  const visibleIngs  = (recipe.ingredients  as Ingredient[]).filter(i => !props.ingOverrides?.[i.id]?.hidden);
  const stepText = (s: Instruction) => props.stepOverrides?.[s.step]?.text ?? s.text;
  const ingText  = (i: Ingredient)  => props.ingOverrides?.[i.id]?.text  ?? [i.amount, i.unit, i.name].filter(Boolean).join(' ');

  const slicedSteps = methodList ? visibleSteps : [];
  const stepTextW = methodList ? methodList.w - Math.max(9, Math.round(15 * fs)) - Math.max(2, Math.round(7 * fs)) : 0;
  const stepScale = uniformStepScale(slicedSteps.map(s => stepText(s)), stepTextW, t.stepText.fontSize);

  return (
    <>
      {title && (
        <BlockElement key={title.elKey} {...makeBlockProps('title', title, props, pageHeight)}>
          <Text style={[scaleText(t.title, title.fontScale), { fontFamily: preset.title }]} numberOfLines={title.hasTextOverride ? undefined : 2} adjustsFontSizeToFit={!title.hasTextOverride} minimumFontScale={0.5}>{recipe.title}</Text>
        </BlockElement>
      )}

      {description && recipe.description ? (
        <BlockElement key={description.elKey} {...makeBlockProps('description', description, props, pageHeight)}>
          <Text style={[scaleText(t.desc, description.fontScale), { fontFamily: f }]} numberOfLines={description.hasTextOverride ? undefined : 2}>{recipe.description}</Text>
        </BlockElement>
      ) : null}

      {pills && (
        <BlockElement key={pills.elKey} {...makeBlockProps('pills', pills, props, pageHeight)}>
          <TimePills recipe={recipe} palette={palette} pageWidth={pageWidth} fontSection={f} />
        </BlockElement>
      )}

      {image && (
        <BlockElement key={image.elKey} {...makeBlockProps('image', image, props, pageHeight)}>
          <View style={t.polaroid}>
            <FoodImage width={imgSize - 2} height={imgSize - 2} borderRadius={2} />
          </View>
        </BlockElement>
      )}

      {ingHeading && (
        <BlockElement key={ingHeading.elKey} {...makeBlockProps('ingredients-heading', ingHeading, props, pageHeight)}>
          <Text style={[scaleText(t.colHead, ingHeading.fontScale), { color: palette.accent, fontFamily: f }]}>{ingredientsTitle}</Text>
        </BlockElement>
      )}

      {ingList && (
        <BlockElement key={ingList.elKey} {...makeBlockProps('ingredients-list', ingList, props, pageHeight)}>
          {visibleIngs.map((ing) => (
            <TouchableOpacity
              key={ing.id}
              disabled={!inEdit('ingredients-list')}
              onPress={() => setEditing({ kind: 'ing', id: ing.id, text: ingText(ing) })}
              style={[t.ingRow, inEdit('ingredients-list') && t.editableRow]}
            >
              <View style={[t.dot, { backgroundColor: palette.accent }]} />
              <Text style={[scaleText(t.ingText, ingList.fontScale), { fontFamily: f }]} numberOfLines={ingList.hasTextOverride ? undefined : 1} adjustsFontSizeToFit={!ingList.hasTextOverride} minimumFontScale={0.7}>{ingText(ing)}</Text>
            </TouchableOpacity>
          ))}
        </BlockElement>
      )}

      {methodHeading && (
        <BlockElement key={methodHeading.elKey} {...makeBlockProps('method-heading', methodHeading, props, pageHeight)}>
          <Text style={[scaleText(t.colHead, methodHeading.fontScale), { color: palette.accent, fontFamily: f }]}>{methodTitle}</Text>
        </BlockElement>
      )}

      {methodList && (
        <BlockElement key={methodList.elKey} {...makeBlockProps('method-list', methodList, props, pageHeight)}>
          {slicedSteps.map(step => (
            <TouchableOpacity
              key={step.step}
              disabled={!inEdit('method-list')}
              onPress={() => setEditing({ kind: 'step', num: step.step, text: stepText(step) })}
              style={[t.stepRow, inEdit('method-list') && t.editableRow]}
            >
              <View style={[t.stepBadge, { backgroundColor: palette.accent }]}>
                <Text style={[t.stepNum, { fontFamily: f }]}>{step.step}</Text>
              </View>
              <Text style={[scaleText(t.stepText, stepScale * methodList.fontScale), { fontFamily: f }]} numberOfLines={methodList.hasTextOverride ? undefined : 2}>{stepText(step)}</Text>
            </TouchableOpacity>
          ))}
        </BlockElement>
      )}

      {tags && recipe.tags.length > 0 && (
        <BlockElement key={tags.elKey} {...makeBlockProps('tags', tags, props, pageHeight)}>
          <View style={[t.sticky, { transform: [{ rotate: '-1.2deg' }] }]}>
            <Text style={[scaleText(t.stickyText, tags.fontScale), { fontFamily: f }]}>{recipe.tags.join(' · ')}</Text>
          </View>
        </BlockElement>
      )}

      <Text style={[t.pageNum, { color: colors.inkFaint, fontFamily: f }]}>1</Text>

      <BlockItemEditor
        visible={!!editing}
        initialText={editing?.text ?? ''}
        onSave={text => {
          if (!editing) return;
          if (editing.kind === 'step') props.onSaveStep?.(editing.num, { text });
          else props.onSaveIng?.(editing.id, { text });
          setEditing(null);
        }}
        onDelete={() => {
          if (!editing) return;
          if (editing.kind === 'step') props.onSaveStep?.(editing.num, { hidden: true });
          else props.onSaveIng?.(editing.id, { hidden: true });
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    </>
  );
}

// ─── Photo Hero ───────────────────────────────────────────────────
function PhotoHero(props: TemplateProps) {
  const { recipe, pageWidth, palette, recipeFont, sectionTitles } = props;
  const ingredientsTitle = resolveSectionTitle(sectionTitles, 'ingredients');
  const methodTitle = resolveSectionTitle(sectionTitles, 'method');
  const t = makeT(pageWidth);
  const preset = resolvePreset(recipeFont);
  const f = preset.section;
  const fs = pageWidth / DESIGN_WIDTH;
  const { getBlock, pageHeight } = useBlockResolver('photo-hero', pageWidth, props.blockOverrides, props.layoutResetVersion);
  const [editing, setEditing] = useState<{ kind: 'step'; num: number; text: string } | { kind: 'ing'; id: string; text: string } | null>(null);

  const image = getBlock('image');
  const title = getBlock('title');
  const description = getBlock('description');
  const pills = getBlock('pills');
  const ingHeading = getBlock('ingredients-heading');
  const ingList = getBlock('ingredients-list');
  const methodHeading = getBlock('method-heading');
  const methodList = getBlock('method-list');

  const inEdit = (bid: string) => !!props.blockEditMode && props.selectedBlockId === bid;

  const visibleSteps = (recipe.instructions as Instruction[]).filter(s => !props.stepOverrides?.[s.step]?.hidden);
  const visibleIngs  = (recipe.ingredients  as Ingredient[]).filter(i => !props.ingOverrides?.[i.id]?.hidden);
  const stepText = (s: Instruction) => props.stepOverrides?.[s.step]?.text ?? s.text;
  const ingText  = (i: Ingredient)  => props.ingOverrides?.[i.id]?.text  ?? [i.amount, i.unit, i.name].filter(Boolean).join(' ');

  const slicedSteps = methodList ? visibleSteps : [];
  const stepTextW = methodList ? methodList.w - Math.max(9, Math.round(15 * fs)) - Math.max(2, Math.round(7 * fs)) : 0;
  const stepScale = uniformStepScale(slicedSteps.map(s => stepText(s)), stepTextW, t.stepText.fontSize);

  return (
    <>
      {image && (
        <BlockElement key={image.elKey} {...makeBlockProps('image', image, props, pageHeight)}>
          <View style={{ width: image.w, height: image.h, overflow: 'hidden' }}>
            <FoodImage width={image.w} height={image.h} borderRadius={0} />
            <View style={[t.heroOverlay, { backgroundColor: palette.accent + '99' }]} />
          </View>
        </BlockElement>
      )}

      {title && (
        <BlockElement key={title.elKey} {...makeBlockProps('title', title, props, pageHeight)}>
          <Text style={[scaleText(t.title, title.fontScale), { fontFamily: preset.title }]} numberOfLines={title.hasTextOverride ? undefined : 2} adjustsFontSizeToFit={!title.hasTextOverride} minimumFontScale={0.5}>{recipe.title}</Text>
        </BlockElement>
      )}

      {description && recipe.description ? (
        <BlockElement key={description.elKey} {...makeBlockProps('description', description, props, pageHeight)}>
          <Text style={[scaleText(t.desc, description.fontScale), { fontFamily: f }]} numberOfLines={description.hasTextOverride ? undefined : 2}>{recipe.description}</Text>
        </BlockElement>
      ) : null}

      {pills && (
        <BlockElement key={pills.elKey} {...makeBlockProps('pills', pills, props, pageHeight)}>
          <TimePills recipe={recipe} palette={palette} pageWidth={pageWidth} fontSection={f} />
        </BlockElement>
      )}

      {ingHeading && (
        <BlockElement key={ingHeading.elKey} {...makeBlockProps('ingredients-heading', ingHeading, props, pageHeight)}>
          <Text style={[scaleText(t.colHead, ingHeading.fontScale), { color: palette.accent, fontFamily: f }]}>{ingredientsTitle}</Text>
        </BlockElement>
      )}

      {ingList && (
        <BlockElement key={ingList.elKey} {...makeBlockProps('ingredients-list', ingList, props, pageHeight)}>
          {visibleIngs.map((ing) => (
            <TouchableOpacity
              key={ing.id}
              disabled={!inEdit('ingredients-list')}
              onPress={() => setEditing({ kind: 'ing', id: ing.id, text: ingText(ing) })}
              style={[t.ingRow, inEdit('ingredients-list') && t.editableRow]}
            >
              <View style={[t.dot, { backgroundColor: palette.accent }]} />
              <Text style={[scaleText(t.ingText, ingList.fontScale), { fontFamily: f }]} numberOfLines={ingList.hasTextOverride ? undefined : 1} adjustsFontSizeToFit={!ingList.hasTextOverride} minimumFontScale={0.7}>{ingText(ing)}</Text>
            </TouchableOpacity>
          ))}
        </BlockElement>
      )}

      {methodHeading && (
        <BlockElement key={methodHeading.elKey} {...makeBlockProps('method-heading', methodHeading, props, pageHeight)}>
          <Text style={[scaleText(t.colHead, methodHeading.fontScale), { color: palette.accent, fontFamily: f }]}>{methodTitle}</Text>
        </BlockElement>
      )}

      {methodList && (
        <BlockElement key={methodList.elKey} {...makeBlockProps('method-list', methodList, props, pageHeight)}>
          {slicedSteps.map(step => (
            <TouchableOpacity
              key={step.step}
              disabled={!inEdit('method-list')}
              onPress={() => setEditing({ kind: 'step', num: step.step, text: stepText(step) })}
              style={[t.stepRow, inEdit('method-list') && t.editableRow]}
            >
              <View style={[t.stepBadge, { backgroundColor: palette.accent }]}>
                <Text style={[t.stepNum, { fontFamily: f }]}>{step.step}</Text>
              </View>
              <Text style={[scaleText(t.stepText, stepScale * methodList.fontScale), { fontFamily: f }]} numberOfLines={methodList.hasTextOverride ? undefined : 2}>{stepText(step)}</Text>
            </TouchableOpacity>
          ))}
        </BlockElement>
      )}

      <Text style={[t.pageNum, { color: colors.inkFaint, fontFamily: f }]}>1</Text>

      <BlockItemEditor
        visible={!!editing}
        initialText={editing?.text ?? ''}
        onSave={text => {
          if (!editing) return;
          if (editing.kind === 'step') props.onSaveStep?.(editing.num, { text });
          else props.onSaveIng?.(editing.id, { text });
          setEditing(null);
        }}
        onDelete={() => {
          if (!editing) return;
          if (editing.kind === 'step') props.onSaveStep?.(editing.num, { hidden: true });
          else props.onSaveIng?.(editing.id, { hidden: true });
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    </>
  );
}

// ─── Minimal ──────────────────────────────────────────────────────
function Minimal(props: TemplateProps) {
  const { recipe, pageWidth, palette, recipeFont, sectionTitles } = props;
  const ingredientsTitle = resolveSectionTitle(sectionTitles, 'ingredients');
  const methodTitle = resolveSectionTitle(sectionTitles, 'method');
  const t = makeT(pageWidth);
  const preset = resolvePreset(recipeFont);
  const f = preset.section;
  const fs = pageWidth / DESIGN_WIDTH;
  const { getBlock, pageHeight } = useBlockResolver('minimal', pageWidth, props.blockOverrides, props.layoutResetVersion);
  const [editing, setEditing] = useState<{ kind: 'step'; num: number; text: string } | { kind: 'ing'; id: string; text: string } | null>(null);

  const title = getBlock('title');
  const description = getBlock('description');
  const pills = getBlock('pills');
  const ingHeading = getBlock('ingredients-heading');
  const ingList = getBlock('ingredients-list');
  const methodHeading = getBlock('method-heading');
  const methodList = getBlock('method-list');

  const inEdit = (bid: string) => !!props.blockEditMode && props.selectedBlockId === bid;

  const visibleSteps = (recipe.instructions as Instruction[]).filter(s => !props.stepOverrides?.[s.step]?.hidden);
  const visibleIngs  = (recipe.ingredients  as Ingredient[]).filter(i => !props.ingOverrides?.[i.id]?.hidden);
  const stepText = (s: Instruction) => props.stepOverrides?.[s.step]?.text ?? s.text;
  const ingText  = (i: Ingredient)  => props.ingOverrides?.[i.id]?.text  ?? [i.amount, i.unit, i.name].filter(Boolean).join(' ');

  const slicedSteps = methodList ? visibleSteps : [];
  const stepTextW = methodList ? methodList.w - Math.max(9, Math.round(14 * fs)) - Math.max(2, Math.round(6 * fs)) : 0;
  const stepScale = uniformStepScale(slicedSteps.map(s => stepText(s)), stepTextW, t.minimalStepText.fontSize);

  return (
    <>
      {title && (
        <BlockElement key={title.elKey} {...makeBlockProps('title', title, props, pageHeight)}>
          <Text style={[scaleText(t.minimalTitle, title.fontScale), { color: colors.ink, fontFamily: preset.title }]} numberOfLines={title.hasTextOverride ? undefined : 2} adjustsFontSizeToFit={!title.hasTextOverride} minimumFontScale={0.5}>{recipe.title}</Text>
          <View style={[t.minimalAccentLine, { backgroundColor: palette.accent }]} />
        </BlockElement>
      )}

      {description && recipe.description ? (
        <BlockElement key={description.elKey} {...makeBlockProps('description', description, props, pageHeight)}>
          <Text style={[scaleText(t.minimalDesc, description.fontScale), { fontFamily: f }]} numberOfLines={description.hasTextOverride ? undefined : 2}>{recipe.description}</Text>
        </BlockElement>
      ) : null}

      {pills && (
        <BlockElement key={pills.elKey} {...makeBlockProps('pills', pills, props, pageHeight)}>
          <TimePills recipe={recipe} palette={palette} pageWidth={pageWidth} fontSection={f} />
        </BlockElement>
      )}

      {ingHeading && (
        <BlockElement key={ingHeading.elKey} {...makeBlockProps('ingredients-heading', ingHeading, props, pageHeight)}>
          <Text style={[scaleText(t.minimalSection, ingHeading.fontScale), { color: palette.accent, fontFamily: f }]}>{ingredientsTitle}</Text>
        </BlockElement>
      )}

      {ingList && (
        <BlockElement key={ingList.elKey} {...makeBlockProps('ingredients-list', ingList, props, pageHeight)}>
          <View style={t.minimalIngList}>
            {visibleIngs.map((ing) => (
              <TouchableOpacity
                key={ing.id}
                disabled={!inEdit('ingredients-list')}
                onPress={() => setEditing({ kind: 'ing', id: ing.id, text: ingText(ing) })}
              >
                <Text style={[scaleText(t.minimalIngItem, ingList.fontScale), { fontFamily: f }, inEdit('ingredients-list') && t.editableRow]}>
                  {ingText(ing)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </BlockElement>
      )}

      {methodHeading && (
        <BlockElement key={methodHeading.elKey} {...makeBlockProps('method-heading', methodHeading, props, pageHeight)}>
          <Text style={[scaleText(t.minimalSection, methodHeading.fontScale), { color: palette.accent, fontFamily: f }]}>{methodTitle}</Text>
        </BlockElement>
      )}

      {methodList && recipe.instructions.length > 0 && (
        <BlockElement key={methodList.elKey} {...makeBlockProps('method-list', methodList, props, pageHeight)}>
          {slicedSteps.map(step => (
            <TouchableOpacity
              key={step.step}
              disabled={!inEdit('method-list')}
              onPress={() => setEditing({ kind: 'step', num: step.step, text: stepText(step) })}
              style={[t.minimalStep, inEdit('method-list') && t.editableRow]}
            >
              <Text style={[scaleText(t.minimalStepNum, methodList.fontScale), { color: palette.accent, fontFamily: f }]}>{step.step}.</Text>
              <Text style={[scaleText(t.minimalStepText, stepScale * methodList.fontScale), { fontFamily: f }]} numberOfLines={methodList.hasTextOverride ? undefined : 3}>{stepText(step)}</Text>
            </TouchableOpacity>
          ))}
        </BlockElement>
      )}

      <Text style={[t.pageNum, { color: colors.inkFaint, fontFamily: f }]}>1</Text>

      <BlockItemEditor
        visible={!!editing}
        initialText={editing?.text ?? ''}
        onSave={text => {
          if (!editing) return;
          if (editing.kind === 'step') props.onSaveStep?.(editing.num, { text });
          else props.onSaveIng?.(editing.id, { text });
          setEditing(null);
        }}
        onDelete={() => {
          if (!editing) return;
          if (editing.kind === 'step') props.onSaveStep?.(editing.num, { hidden: true });
          else props.onSaveIng?.(editing.id, { hidden: true });
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    </>
  );
}

// ─── Two Column ───────────────────────────────────────────────────
function TwoColumn(props: TemplateProps) {
  const { recipe, pageWidth, palette, recipeFont, sectionTitles } = props;
  const ingredientsTitle = resolveSectionTitle(sectionTitles, 'ingredients');
  const methodTitle = resolveSectionTitle(sectionTitles, 'method');
  const t = makeT(pageWidth);
  const preset = resolvePreset(recipeFont);
  const f = preset.section;
  const fs = pageWidth / DESIGN_WIDTH;
  const { getBlock, pageHeight } = useBlockResolver('two-column', pageWidth, props.blockOverrides, props.layoutResetVersion);
  const [editing, setEditing] = useState<{ kind: 'step'; num: number; text: string } | { kind: 'ing'; id: string; text: string } | null>(null);

  const title = getBlock('title');
  const description = getBlock('description');
  const image = getBlock('image');
  const pills = getBlock('pills');
  const ingHeading = getBlock('ingredients-heading');
  const ingList = getBlock('ingredients-list');
  const methodHeading = getBlock('method-heading');
  const methodList = getBlock('method-list');

  const inEdit = (bid: string) => !!props.blockEditMode && props.selectedBlockId === bid;

  const visibleSteps = (recipe.instructions as Instruction[]).filter(s => !props.stepOverrides?.[s.step]?.hidden);
  const visibleIngs  = (recipe.ingredients  as Ingredient[]).filter(i => !props.ingOverrides?.[i.id]?.hidden);
  const stepText = (s: Instruction) => props.stepOverrides?.[s.step]?.text ?? s.text;
  const ingText  = (i: Ingredient)  => props.ingOverrides?.[i.id]?.text  ?? [i.amount, i.unit, i.name].filter(Boolean).join(' ');

  const slicedSteps = methodList ? visibleSteps : [];
  const stepTextW = methodList ? methodList.w - Math.max(9, Math.round(12 * fs)) - Math.max(2, Math.round(5 * fs)) : 0;
  const stepScale = uniformStepScale(slicedSteps.map(s => stepText(s)), stepTextW, t.stepTextSm.fontSize);

  return (
    <>
      {title && (
        <BlockElement key={title.elKey} {...makeBlockProps('title', title, props, pageHeight)}>
          <Text style={[scaleText(t.twoColTitle, title.fontScale), { borderBottomColor: palette.accent + '44', fontFamily: preset.title }]} numberOfLines={title.hasTextOverride ? undefined : 1} adjustsFontSizeToFit={!title.hasTextOverride} minimumFontScale={0.5}>{recipe.title}</Text>
        </BlockElement>
      )}

      {description && recipe.description ? (
        <BlockElement key={description.elKey} {...makeBlockProps('description', description, props, pageHeight)}>
          <Text style={[scaleText(t.desc, description.fontScale), { fontFamily: f }]} numberOfLines={description.hasTextOverride ? undefined : 2}>{recipe.description}</Text>
        </BlockElement>
      ) : null}

      {image && (
        <BlockElement key={image.elKey} {...makeBlockProps('image', image, props, pageHeight)}>
          <View style={[t.twoColImg, { height: image.h }]}>
            <FoodImage width={image.w} height={image.h} borderRadius={6} />
          </View>
        </BlockElement>
      )}

      {pills && (
        <BlockElement key={pills.elKey} {...makeBlockProps('pills', pills, props, pageHeight)}>
          <TimePills recipe={recipe} palette={palette} pageWidth={pageWidth} compact fontSection={f} />
        </BlockElement>
      )}

      {ingHeading && (
        <BlockElement key={ingHeading.elKey} {...makeBlockProps('ingredients-heading', ingHeading, props, pageHeight)}>
          <Text style={[scaleText(t.colHead, ingHeading.fontScale), { color: palette.accent, fontFamily: f }]}>{ingredientsTitle}</Text>
        </BlockElement>
      )}

      {ingList && (
        <BlockElement key={ingList.elKey} {...makeBlockProps('ingredients-list', ingList, props, pageHeight)}>
          {visibleIngs.map((ing) => (
            <TouchableOpacity
              key={ing.id}
              disabled={!inEdit('ingredients-list')}
              onPress={() => setEditing({ kind: 'ing', id: ing.id, text: ingText(ing) })}
              style={[t.ingRow, inEdit('ingredients-list') && t.editableRow]}
            >
              <View style={[t.dot, { backgroundColor: palette.accent }]} />
              <Text style={[t.ingTextSm, { fontFamily: f }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{ingText(ing)}</Text>
            </TouchableOpacity>
          ))}
        </BlockElement>
      )}

      {methodHeading && (
        <BlockElement key={methodHeading.elKey} {...makeBlockProps('method-heading', methodHeading, props, pageHeight)}>
          <Text style={[scaleText(t.colHead, methodHeading.fontScale), { color: palette.accent, fontFamily: f }]}>{methodTitle}</Text>
        </BlockElement>
      )}

      {methodList && (
        <BlockElement key={methodList.elKey} {...makeBlockProps('method-list', methodList, props, pageHeight)}>
          {slicedSteps.map(step => (
            <TouchableOpacity
              key={step.step}
              disabled={!inEdit('method-list')}
              onPress={() => setEditing({ kind: 'step', num: step.step, text: stepText(step) })}
              style={[t.stepRowSm, inEdit('method-list') && t.editableRow]}
            >
              <View style={[t.stepBadgeSm, { backgroundColor: palette.accent }]}>
                <Text style={[t.stepNumSm, { fontFamily: f }]}>{step.step}</Text>
              </View>
              <Text style={[scaleText(t.stepTextSm, stepScale * methodList.fontScale), { fontFamily: f }]} numberOfLines={methodList.hasTextOverride ? undefined : 3}>{stepText(step)}</Text>
            </TouchableOpacity>
          ))}
        </BlockElement>
      )}

      <Text style={[t.pageNum, { color: colors.inkFaint, fontFamily: f }]}>1</Text>

      <BlockItemEditor
        visible={!!editing}
        initialText={editing?.text ?? ''}
        onSave={text => {
          if (!editing) return;
          if (editing.kind === 'step') props.onSaveStep?.(editing.num, { text });
          else props.onSaveIng?.(editing.id, { text });
          setEditing(null);
        }}
        onDelete={() => {
          if (!editing) return;
          if (editing.kind === 'step') props.onSaveStep?.(editing.num, { hidden: true });
          else props.onSaveIng?.(editing.id, { hidden: true });
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    </>
  );
}

// ─── Journal ──────────────────────────────────────────────────────
function Journal(props: TemplateProps) {
  const { recipe, pageWidth, palette, recipeFont, sectionTitles } = props;
  const ingredientsTitle = resolveSectionTitle(sectionTitles, 'ingredients');
  const methodTitle = resolveSectionTitle(sectionTitles, 'method');
  const t = makeT(pageWidth);
  const preset = resolvePreset(recipeFont);
  const f = preset.section;
  const fs = pageWidth / DESIGN_WIDTH;
  const imgSize = Math.round(pageWidth * 0.42);
  const { getBlock, pageHeight } = useBlockResolver('journal', pageWidth, props.blockOverrides, props.layoutResetVersion);
  const [editing, setEditing] = useState<{ kind: 'step'; num: number; text: string } | { kind: 'ing'; id: string; text: string } | null>(null);

  const title = getBlock('title');
  const description = getBlock('description');
  const photo = getBlock('photo');
  const pills = getBlock('pills');
  const ingHeading = getBlock('ingredients-heading');
  const ingList = getBlock('ingredients-list');
  const methodHeading = getBlock('method-heading');
  const methodList = getBlock('method-list');
  const tags = getBlock('tags');

  const inEdit = (bid: string) => !!props.blockEditMode && props.selectedBlockId === bid;

  const visibleSteps = (recipe.instructions as Instruction[]).filter(s => !props.stepOverrides?.[s.step]?.hidden);
  const visibleIngs  = (recipe.ingredients  as Ingredient[]).filter(i => !props.ingOverrides?.[i.id]?.hidden);
  const stepText = (s: Instruction) => props.stepOverrides?.[s.step]?.text ?? s.text;
  const ingText  = (i: Ingredient)  => props.ingOverrides?.[i.id]?.text  ?? [i.amount, i.unit, i.name].filter(Boolean).join(' ');

  const slicedSteps = methodList ? visibleSteps : [];
  const stepTextW = methodList ? methodList.w - Math.max(9, Math.round(18 * fs)) - Math.max(2, Math.round(8 * fs)) : 0;
  const stepScale = uniformStepScale(slicedSteps.map(s => stepText(s)), stepTextW, t.journalStepText.fontSize);

  return (
    <>
      {title && (
        <BlockElement key={title.elKey} {...makeBlockProps('title', title, props, pageHeight)}>
          <Text style={[scaleText(t.journalTitle, title.fontScale), { color: palette.accent, fontFamily: preset.title }]} numberOfLines={title.hasTextOverride ? undefined : 2} adjustsFontSizeToFit={!title.hasTextOverride} minimumFontScale={0.5}>{recipe.title}</Text>
        </BlockElement>
      )}

      {description && recipe.description && (
        <BlockElement key={description.elKey} {...makeBlockProps('description', description, props, pageHeight)}>
          <Text style={[scaleText(t.journalDesc, description.fontScale), { fontFamily: f }]} numberOfLines={description.hasTextOverride ? undefined : 3}>{recipe.description}</Text>
        </BlockElement>
      )}

      {photo && (
        <BlockElement key={photo.elKey} {...makeBlockProps('photo', photo, props, pageHeight)}>
          <View style={{ borderRadius: 4, overflow: 'hidden' }}>
            <FoodImage width={imgSize} height={imgSize} borderRadius={4} />
          </View>
        </BlockElement>
      )}

      {pills && (
        <BlockElement key={pills.elKey} {...makeBlockProps('pills', pills, props, pageHeight)}>
          <TimePills recipe={recipe} palette={palette} pageWidth={pageWidth} compact fontSection={f} />
        </BlockElement>
      )}

      {ingHeading && (
        <BlockElement key={ingHeading.elKey} {...makeBlockProps('ingredients-heading', ingHeading, props, pageHeight)}>
          <Text style={[scaleText(t.journalNote, ingHeading.fontScale), { color: palette.accent, fontFamily: f }]}>{ingredientsTitle}:</Text>
        </BlockElement>
      )}

      {ingList && (
        <BlockElement key={ingList.elKey} {...makeBlockProps('ingredients-list', ingList, props, pageHeight)}>
          {visibleIngs.map((ing) => (
            <TouchableOpacity
              key={ing.id}
              disabled={!inEdit('ingredients-list')}
              onPress={() => setEditing({ kind: 'ing', id: ing.id, text: ingText(ing) })}
              style={inEdit('ingredients-list') ? t.editableRow : undefined}
            >
              <Text style={[scaleText(t.journalIng, ingList.fontScale), { fontFamily: f }]} numberOfLines={ingList.hasTextOverride ? undefined : 1} adjustsFontSizeToFit={!ingList.hasTextOverride} minimumFontScale={0.7}>
                — {ingText(ing)}
              </Text>
            </TouchableOpacity>
          ))}
        </BlockElement>
      )}

      {methodHeading && (
        <BlockElement key={methodHeading.elKey} {...makeBlockProps('method-heading', methodHeading, props, pageHeight)}>
          <Text style={[scaleText(t.journalNote, methodHeading.fontScale), { color: palette.accent, fontFamily: f }]}>{methodTitle}:</Text>
        </BlockElement>
      )}

      {methodList && (
        <BlockElement key={methodList.elKey} {...makeBlockProps('method-list', methodList, props, pageHeight)}>
          <View style={[t.journalRuled, { borderTopColor: palette.accent + '22' }]}>
            {slicedSteps.map(step => (
              <TouchableOpacity
                key={step.step}
                disabled={!inEdit('method-list')}
                onPress={() => setEditing({ kind: 'step', num: step.step, text: stepText(step) })}
                style={[t.journalStepRow, { borderBottomColor: palette.accent + '18' }, inEdit('method-list') && t.editableRow]}
              >
                <Text style={[scaleText(t.journalStepNum, methodList.fontScale), { color: palette.accent, fontFamily: f }]}>{step.step}</Text>
                <Text style={[scaleText(t.journalStepText, stepScale * methodList.fontScale), { fontFamily: f }]} numberOfLines={methodList.hasTextOverride ? undefined : 2}>{stepText(step)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </BlockElement>
      )}

      {tags && recipe.tags.length > 0 && (
        <BlockElement key={tags.elKey} {...makeBlockProps('tags', tags, props, pageHeight)}>
          <View style={[t.sticky, { transform: [{ rotate: '-1.2deg' }] }]}>
            <Text style={[scaleText(t.stickyText, tags.fontScale), { fontFamily: f }]}>{recipe.tags.join(' · ')}</Text>
          </View>
        </BlockElement>
      )}

      <Text style={[t.pageNum, { color: colors.inkFaint, fontFamily: f }]}>1</Text>

      <BlockItemEditor
        visible={!!editing}
        initialText={editing?.text ?? ''}
        onSave={text => {
          if (!editing) return;
          if (editing.kind === 'step') props.onSaveStep?.(editing.num, { text });
          else props.onSaveIng?.(editing.id, { text });
          setEditing(null);
        }}
        onDelete={() => {
          if (!editing) return;
          if (editing.kind === 'step') props.onSaveStep?.(editing.num, { hidden: true });
          else props.onSaveIng?.(editing.id, { hidden: true });
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    </>
  );
}

// ─── Recipe Card ─────────────────────────────────────────────────
function RecipeCard(props: TemplateProps) {
  const { recipe, pageWidth, palette, recipeFont, sectionTitles } = props;
  const ingredientsTitle = resolveSectionTitle(sectionTitles, 'ingredients');
  const methodTitle = resolveSectionTitle(sectionTitles, 'method');
  const t = makeT(pageWidth);
  const preset = resolvePreset(recipeFont);
  const f = preset.section;
  const fs = pageWidth / DESIGN_WIDTH;
  const imgW = Math.round(pageWidth * 0.44);
  const { getBlock, pageHeight } = useBlockResolver('recipe-card', pageWidth, props.blockOverrides, props.layoutResetVersion);
  const [editing, setEditing] = useState<{ kind: 'step'; num: number; text: string } | { kind: 'ing'; id: string; text: string } | null>(null);

  const title = getBlock('title');
  const description = getBlock('description');
  const image = getBlock('image');
  const ingHeading = getBlock('ingredients-heading');
  const ingList = getBlock('ingredients-list');
  const methodHeading = getBlock('method-heading');
  const methodList = getBlock('method-list');
  const tags = getBlock('tags');

  const inEdit = (bid: string) => !!props.blockEditMode && props.selectedBlockId === bid;

  const visibleSteps = (recipe.instructions as Instruction[]).filter(s => !props.stepOverrides?.[s.step]?.hidden);
  const visibleIngs  = (recipe.ingredients  as Ingredient[]).filter(i => !props.ingOverrides?.[i.id]?.hidden);
  const stepText = (s: Instruction) => props.stepOverrides?.[s.step]?.text ?? s.text;
  const ingText  = (i: Ingredient)  => props.ingOverrides?.[i.id]?.text  ?? [i.amount, i.unit, i.name].filter(Boolean).join(' ');

  const slicedSteps = methodList ? visibleSteps : [];
  // Each card step item is ~48% of block width; text area minus badge
  const cardItemW = methodList ? methodList.w * 0.48 - Math.max(9, Math.round(12 * fs)) - Math.max(2, Math.round(4 * fs)) : 0;
  const stepScale = uniformStepScale(slicedSteps.map(s => stepText(s)), cardItemW, t.cardStepText.fontSize);

  return (
    <>
      {title && (
        <BlockElement key={title.elKey} {...makeBlockProps('title', title, props, pageHeight)}>
          <View style={[t.cardBanner, { backgroundColor: palette.accent, width: title.w, height: title.h }]}>
            <Text style={[t.cardBannerTitle, { fontFamily: preset.title }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{recipe.title}</Text>
          </View>
        </BlockElement>
      )}

      {description && recipe.description ? (
        <BlockElement key={description.elKey} {...makeBlockProps('description', description, props, pageHeight)}>
          <Text style={[scaleText(t.desc, description.fontScale), { fontFamily: f }]} numberOfLines={description.hasTextOverride ? undefined : 2}>{recipe.description}</Text>
        </BlockElement>
      ) : null}

      {image && (
        <BlockElement key={image.elKey} {...makeBlockProps('image', image, props, pageHeight)}>
          <FoodImage width={imgW} height={imgW} borderRadius={6} />
          <TimePills recipe={recipe} palette={palette} pageWidth={pageWidth} compact fontSection={f} />
        </BlockElement>
      )}

      {ingHeading && (
        <BlockElement key={ingHeading.elKey} {...makeBlockProps('ingredients-heading', ingHeading, props, pageHeight)}>
          <Text style={[scaleText(t.cardSection, ingHeading.fontScale), { color: palette.accent, fontFamily: f }]}>{ingredientsTitle}</Text>
        </BlockElement>
      )}

      {ingList && (
        <BlockElement key={ingList.elKey} {...makeBlockProps('ingredients-list', ingList, props, pageHeight)}>
          {visibleIngs.map((ing) => (
            <TouchableOpacity
              key={ing.id}
              disabled={!inEdit('ingredients-list')}
              onPress={() => setEditing({ kind: 'ing', id: ing.id, text: ingText(ing) })}
              style={inEdit('ingredients-list') ? t.editableRow : undefined}
            >
              <Text style={[scaleText(t.cardIng, ingList.fontScale), { fontFamily: f }]} numberOfLines={ingList.hasTextOverride ? undefined : 1} adjustsFontSizeToFit={!ingList.hasTextOverride} minimumFontScale={0.7}>
                · {ingText(ing)}
              </Text>
            </TouchableOpacity>
          ))}
        </BlockElement>
      )}

      {methodHeading && (
        <BlockElement key={methodHeading.elKey} {...makeBlockProps('method-heading', methodHeading, props, pageHeight)}>
          <Text style={[scaleText(t.cardSection, methodHeading.fontScale), { color: palette.accent, fontFamily: f }]}>{methodTitle}</Text>
        </BlockElement>
      )}

      {methodList && (
        <BlockElement key={methodList.elKey} {...makeBlockProps('method-list', methodList, props, pageHeight)}>
          <View style={t.cardStepGrid}>
            {slicedSteps.map(step => (
              <TouchableOpacity
                key={step.step}
                disabled={!inEdit('method-list')}
                onPress={() => setEditing({ kind: 'step', num: step.step, text: stepText(step) })}
                style={[t.cardStepItem, inEdit('method-list') && t.editableRow]}
              >
                <View style={[t.stepBadgeSm, { backgroundColor: palette.accent }]}>
                  <Text style={[t.stepNumSm, { fontFamily: f }]}>{step.step}</Text>
                </View>
                <Text style={[scaleText(t.cardStepText, stepScale * methodList.fontScale), { fontFamily: f }]} numberOfLines={methodList.hasTextOverride ? undefined : 2}>{stepText(step)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </BlockElement>
      )}

      {tags && recipe.tags.length > 0 && (
        <BlockElement key={tags.elKey} {...makeBlockProps('tags', tags, props, pageHeight)}>
          <View style={[t.sticky, { transform: [{ rotate: '-1.2deg' }] }]}>
            <Text style={[scaleText(t.stickyText, tags.fontScale), { fontFamily: f }]}>{recipe.tags.join(' · ')}</Text>
          </View>
        </BlockElement>
      )}

      <Text style={[t.pageNum, { color: colors.inkFaint, fontFamily: f }]}>1</Text>

      <BlockItemEditor
        visible={!!editing}
        initialText={editing?.text ?? ''}
        onSave={text => {
          if (!editing) return;
          if (editing.kind === 'step') props.onSaveStep?.(editing.num, { text });
          else props.onSaveIng?.(editing.id, { text });
          setEditing(null);
        }}
        onDelete={() => {
          if (!editing) return;
          if (editing.kind === 'step') props.onSaveStep?.(editing.num, { hidden: true });
          else props.onSaveIng?.(editing.id, { hidden: true });
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    </>
  );
}

// ─── Shared sub-components ────────────────────────────────────────
function TimePills({ recipe, palette, pageWidth, light, compact, fontSection }: { recipe: Recipe; palette: Palette; pageWidth: number; light?: boolean; compact?: boolean; fontSection: string }) {
  const t = makeT(pageWidth);
  const textColor = light ? 'rgba(255,255,255,0.9)' : colors.inkSoft;
  const accentColor = light ? '#fff' : palette.accent;
  const bgColor = light ? 'rgba(0,0,0,0.2)' : palette.bg2;
  const pillStyle = compact ? t.pillCompact : t.pill;
  return (
    <View style={t.pills}>
      {recipe.prep_minutes != null && (
        <View style={[pillStyle, { backgroundColor: bgColor }]}>
          <Text style={[t.pillLabel, { color: textColor, fontFamily: fontSection }]}>prep </Text>
          <Text style={[t.pillVal, { color: accentColor, fontFamily: fontSection }]}>{recipe.prep_minutes}m</Text>
        </View>
      )}
      {recipe.cook_minutes != null && (
        <View style={[pillStyle, { backgroundColor: bgColor }]}>
          <Text style={[t.pillLabel, { color: textColor, fontFamily: fontSection }]}>cook </Text>
          <Text style={[t.pillVal, { color: accentColor, fontFamily: fontSection }]}>{recipe.cook_minutes}m</Text>
        </View>
      )}
      {recipe.servings != null && (
        <View style={[pillStyle, { backgroundColor: bgColor }]}>
          <Text style={[t.pillLabel, { color: textColor, fontFamily: fontSection }]}>serves </Text>
          <Text style={[t.pillVal, { color: accentColor, fontFamily: fontSection }]}>{recipe.servings}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Main export — picks the right template ───────────────────────
export function PageTemplate({ templateKey, ...props }: TemplateProps & { templateKey: TemplateKey }) {
  switch (templateKey) {
    case 'photo-hero':  return <PhotoHero {...props} />;
    case 'minimal':     return <Minimal {...props} />;
    case 'two-column':  return <TwoColumn {...props} />;
    case 'journal':     return <Journal {...props} />;
    case 'recipe-card': return <RecipeCard {...props} />;
    default:            return <Classic {...props} />;
  }
}

// ─── Template metadata (for picker) ──────────────────────────────
export const TEMPLATES: Array<{
  key: TemplateKey;
  label: string;
  diagram: string[][];
}> = [
  {
    key: 'classic',
    label: 'Classic',
    diagram: [['wide'], ['img', 'ing'], ['step', 'step']],
  },
  {
    key: 'photo-hero',
    label: 'Photo Hero',
    diagram: [['wide-img'], ['ing', 'step']],
  },
  {
    key: 'minimal',
    label: 'Minimal',
    diagram: [['wide'], ['wide'], ['wide'], ['wide']],
  },
  {
    key: 'two-column',
    label: 'Two Column',
    diagram: [['wide'], ['img-col', 'step-col']],
  },
  {
    key: 'journal',
    label: 'Journal',
    diagram: [['wide-hand'], ['img', 'ing'], ['wide-ruled']],
  },
  {
    key: 'recipe-card',
    label: 'Recipe Card',
    diagram: [['wide-accent'], ['img', 'ing'], ['step', 'step']],
  },
];

// ─── Styles (proportional to pageWidth) ─────────────────────────────────────
// Call makeT(pageWidth) at the top of each template function; all font sizes,
// line heights, and text-adjacent margins scale down uniformly on smaller canvases.
function makeT(pw: number) {
  const fs = pw / DESIGN_WIDTH;
  const px = (n: number) => Math.max(7, Math.round(n * fs));  // font size floor 7
  const lh = (n: number) => Math.max(9, Math.round(n * fs));  // line height floor 9
  const mg = (n: number) => Math.max(2, Math.round(n * fs));  // margin/padding floor 2
  const sz = (n: number) => Math.max(9, Math.round(n * fs));  // badge/col size floor 9

  return StyleSheet.create({
    // Shared
    title: { fontFamily: fonts.display, fontSize: px(16), lineHeight: lh(21), color: colors.ink, marginBottom: mg(3), paddingTop: mg(4) },
    desc: { fontFamily: fonts.hand, fontSize: px(11), lineHeight: lh(15), color: colors.inkSoft, marginBottom: mg(6) },
    pills: { flexDirection: 'row', gap: mg(5), flexWrap: 'wrap', marginTop: mg(2) },
    pill: { flexDirection: 'row', borderRadius: 5, paddingHorizontal: mg(6), paddingVertical: mg(2), alignItems: 'baseline' },
    pillCompact: { flexDirection: 'row', borderRadius: 4, paddingHorizontal: mg(4), paddingVertical: mg(1), alignItems: 'baseline' },
    pillLabel: { fontFamily: fonts.body, fontSize: px(8) },
    pillVal: { fontFamily: fonts.displayBold, fontSize: px(10) },
    polaroid: { backgroundColor: '#fff', padding: 5, paddingBottom: 14, borderRadius: 2, transform: [{ rotate: '-1.5deg' }], shadowColor: colors.ink, shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.12, shadowRadius: 3 },
    colHead: { fontFamily: fonts.hand, fontSize: px(13), marginBottom: mg(5) },
    ingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: mg(5), marginBottom: mg(3) },
    dot: { width: 4, height: 4, borderRadius: 2, marginTop: 5, flexShrink: 0 },
    ingText: { fontFamily: fonts.body, fontSize: px(10), color: colors.ink, flex: 1, lineHeight: lh(14) },
    ingTextSm: { fontFamily: fonts.body, fontSize: px(9), color: colors.ink, flex: 1, lineHeight: lh(13) },
    stepRow: { flexDirection: 'row', gap: mg(7), marginBottom: mg(3), alignItems: 'flex-start' },
    stepRowSm: { flexDirection: 'row', gap: mg(5), marginBottom: mg(2), alignItems: 'flex-start' },
    stepBadge: { width: sz(15), height: sz(15), borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
    stepBadgeSm: { width: sz(12), height: sz(12), borderRadius: 6, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
    stepNum: { fontFamily: fonts.bodyBold, fontSize: px(8), color: colors.paper },
    stepNumSm: { fontFamily: fonts.bodyBold, fontSize: px(7), color: colors.paper },
    stepText: { fontFamily: fonts.body, fontSize: px(10), color: colors.ink, flex: 1, lineHeight: lh(14) },
    stepTextSm: { fontFamily: fonts.body, fontSize: px(9), color: colors.ink, flex: 1, lineHeight: lh(13) },
    sticky: { alignSelf: 'flex-start', backgroundColor: '#fff9c4', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 2, shadowColor: colors.ink, shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    stickyText: { fontFamily: fonts.hand, fontSize: px(10), color: colors.inkSoft },
    pageNum: { position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontFamily: fonts.hand, fontSize: px(9) },
    editableRow: { backgroundColor: 'rgba(196,106,76,0.07)', borderRadius: 3 },

    // Photo Hero
    heroOverlay: { ...StyleSheet.absoluteFillObject },
    heroText: { position: 'absolute', bottom: 32, left: 12, right: 12 },
    heroTitle: { fontFamily: fonts.displayBold, fontSize: px(18), color: '#fff', textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    heroDesc: { fontFamily: fonts.hand, fontSize: px(11), color: 'rgba(255,255,255,0.85)', marginTop: mg(2) },
    heroPills: { position: 'absolute', bottom: 8, left: 12 },

    // Minimal
    minimalTitle: { fontFamily: fonts.display, fontSize: px(22), lineHeight: lh(28), marginBottom: mg(6), paddingTop: mg(4) },
    minimalAccentLine: { height: 2, width: 40, borderRadius: 1, marginBottom: mg(8) },
    minimalDesc: { fontFamily: fonts.hand, fontSize: px(13), color: colors.inkSoft, marginBottom: mg(8) },
    minimalSection: { fontFamily: fonts.hand, fontSize: px(14), marginBottom: mg(6), marginTop: mg(8) },
    minimalIngList: { flexDirection: 'row', flexWrap: 'wrap', gap: mg(4), marginBottom: mg(4) },
    minimalIngItem: { fontFamily: fonts.body, fontSize: px(10), color: colors.ink, backgroundColor: colors.bg, borderRadius: 4, paddingHorizontal: mg(6), paddingVertical: mg(2) },
    minimalStep: { flexDirection: 'row', gap: mg(6), marginBottom: mg(6) },
    minimalStepNum: { fontFamily: fonts.displayBold, fontSize: px(12), width: sz(14) },
    minimalStepText: { fontFamily: fonts.body, fontSize: px(10), color: colors.ink, flex: 1, lineHeight: lh(15) },

    // Two Column
    twoColTitle: { fontFamily: fonts.display, fontSize: px(15), color: colors.ink, borderBottomWidth: 1, paddingTop: mg(3), paddingBottom: mg(6) },
    twoColImg: { borderRadius: 6, overflow: 'hidden', marginBottom: mg(6) },

    // Journal
    journalTitle: { fontFamily: fonts.handBold, fontSize: px(26), lineHeight: lh(30), marginBottom: mg(4), paddingTop: mg(4) },
    journalDesc: { fontFamily: fonts.hand, fontSize: px(13), color: colors.inkSoft, marginBottom: mg(8) },
    journalDivider: { height: 1, marginVertical: mg(6) },
    journalNote: { fontFamily: fonts.hand, fontSize: px(12), marginBottom: mg(4) },
    journalIng: { fontFamily: fonts.hand, fontSize: px(11), color: colors.ink, lineHeight: lh(16) },
    journalRuled: { borderTopWidth: 1, paddingTop: mg(8) },
    journalStepRow: { flexDirection: 'row', gap: mg(8), paddingVertical: mg(4), borderBottomWidth: 1 },
    journalStepNum: { fontFamily: fonts.handBold, fontSize: px(14), width: sz(18) },
    journalStepText: { fontFamily: fonts.hand, fontSize: px(12), color: colors.ink, flex: 1, lineHeight: lh(16) },

    // Recipe Card
    cardBanner: { paddingHorizontal: mg(12), paddingVertical: mg(10), justifyContent: 'center' },
    cardBannerTitle: { fontFamily: fonts.displayBold, fontSize: px(16), color: '#fff' },
    cardBannerDesc: { fontFamily: fonts.hand, fontSize: px(11), color: 'rgba(255,255,255,0.85)', marginTop: mg(2) },
    cardSection: { fontFamily: fonts.hand, fontSize: px(12), marginBottom: mg(4) },
    cardIng: { fontFamily: fonts.body, fontSize: px(9), color: colors.ink, lineHeight: lh(13) },
    cardStepGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: mg(4) },
    cardStepItem: { flexDirection: 'row', gap: mg(4), alignItems: 'flex-start', width: '48%' },
    cardStepText: { fontFamily: fonts.body, fontSize: px(9), color: colors.ink, flex: 1, lineHeight: lh(13) },
  });
}
