// Custom colour picker modal — opens from the drawing toolbar's "+" tile.
// Renders a 7×7 HSL grid (49 colours) covering the visible spectrum at three
// lightness bands (highlights / midtones / shadows). Tap a tile → setColor +
// dismiss.
//
// Why a grid instead of a hue wheel: zero deps (hand-rolled HSL math),
// works on iOS + Web identically, and a grid is easier to tap accurately
// than a wheel on a phone screen.
import React from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (hex: string) => void;
}

const COLS = 7;            // hue divisions
const LIGHTNESS_ROWS = [
  // light → dark; the middle row is the "vivid" midtones, top is pastel,
  // bottom is shadow.
  { l: 80, label: 'soft' },
  { l: 65, label: '' },
  { l: 52, label: 'vivid' },
  { l: 40, label: '' },
  { l: 28, label: 'deep' },
  { l: 18, label: '' },
  { l: 92, label: '' },     // 7th row — neutral pastels for highlights
];

// HSL → hex (worklet-safe, no deps). Standard formula.
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function buildGrid(): string[][] {
  const grid: string[][] = [];
  for (const row of LIGHTNESS_ROWS) {
    const rowColors: string[] = [];
    for (let i = 0; i < COLS; i++) {
      const hue = (i / COLS) * 360;
      // Lower saturation on the very-light "highlights" row so it doesn't go
      // washed-out white.
      const sat = row.l > 85 ? 35 : 70;
      rowColors.push(hslToHex(hue, sat, row.l));
    }
    grid.push(rowColors);
  }
  return grid;
}

const GRID = buildGrid();

export function ColorPickerModal({ open, onClose, onPick }: Props) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Pick a colour</Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Feather name="x" size={20} color={colors.inkSoft} />
            </Pressable>
          </View>

          <View style={styles.grid}>
            {GRID.map((row, ri) => (
              <View key={ri} style={styles.row}>
                {row.map((hex) => (
                  <Pressable
                    key={hex}
                    onPress={() => {
                      onPick(hex);
                      onClose();
                    }}
                    style={[styles.tile, { backgroundColor: hex }]}
                  />
                ))}
              </View>
            ))}
          </View>

          <Text style={styles.hint}>
            Tap a colour to use it. Soft on top, vivid in the middle, deep at the bottom.
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(59,42,31,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.bg,
    borderRadius: 18,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.ink,
  },
  grid: { gap: 6 },
  row: {
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'space-between',
  },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 8,
  },
  hint: {
    marginTop: 10,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkFaint,
    textAlign: 'center',
    lineHeight: 16,
  },
});
