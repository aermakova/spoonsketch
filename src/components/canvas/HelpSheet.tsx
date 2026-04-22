import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Modal } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

type Mode = 'layout' | 'stickers' | 'draw';

interface Props {
  visible: boolean;
  mode: Mode;
  onClose: () => void;
}

export function HelpSheet({ visible, mode, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>
            {mode === 'layout'   && 'Layout mode'}
            {mode === 'stickers' && 'Stickers mode'}
            {mode === 'draw'     && 'Draw mode'}
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Text style={styles.closeX}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {mode === 'layout' && <LayoutHelp />}
          {mode === 'stickers' && <StickersHelp />}
          {mode === 'draw' && <DrawHelp />}
        </ScrollView>
      </View>
    </Modal>
  );
}

function LayoutHelp() {
  return (
    <>
      <Row heading="Pick a template" body="Tap any of the 6 templates in the strip above. Changing templates resets block positions." />
      <Row heading="Pick a font" body="Handwritten fonts apply to the recipe title. Pick one that matches your book's vibe." />
      <Row heading="Arrange Blocks" body="Toggle the pill button. Then tap any block on the page to select it." />
      <Row heading="Move / rotate / scale" body="Drag to move. Rotation handle on top, corner handle for scale, side handles to resize text width." />
      <Row heading="Font size" body="When a text block is selected, use A− / A+ in the toolbar to bump its size." />
      <Row heading="Delete" body="Tap the red × on a selected block to hide it. Press Reset to restore everything." />
    </>
  );
}

function StickersHelp() {
  return (
    <>
      <Row heading="Add stickers" body="Tap any sticker in the tray below to drop it on the page." />
      <Row heading="Move" body="Drag a sticker with one finger." />
      <Row heading="Resize + rotate" body="Pinch with two fingers to resize; rotate at the same time to spin." />
      <Row heading="Delete" body="Tap a selected sticker to bring up the × button, then tap × to remove." />
      <Row heading="Tip" body="Drag a corner sticker first, then scatter smaller accents around it." />
    </>
  );
}

function DrawHelp() {
  return (
    <>
      <Row heading="Brush vs Eraser" body="Switch with the toolbar. Eraser works per-layer." />
      <Row heading="Stroke size + colour" body="Size slider and colour swatches live in the drawing toolbar." />
      <Row heading="Layers panel" body="Tap the layers icon. Reorder, toggle visibility, change blend mode, or adjust opacity per layer." />
      <Row heading="Blend modes" body="• Normal — just paints on top
• Multiply — darkens (good for shadows)
• Screen — lightens (good for glow)
• Overlay — boosts contrast
• Soft Light — gentle tint" />
      <Row heading="Undo" body="Tap the undo button in the top bar — each stroke is one undo step, per recipe." />
      <Row heading="Save" body="Drawings save automatically. Tap Done to return to the recipe detail." />
    </>
  );
}

function Row({ heading, body }: { heading: string; body: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowHeading}>{heading}</Text>
      <Text style={styles.rowBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '80%',
    backgroundColor: colors.paper,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.inkFaint,
    opacity: 0.35,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.ink,
  },
  closeX: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.inkSoft,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  body: {
    paddingBottom: 8,
  },
  row: {
    marginBottom: 14,
  },
  rowHeading: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.ink,
    marginBottom: 4,
  },
  rowBody: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 18,
  },
});
