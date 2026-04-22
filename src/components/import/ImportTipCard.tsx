import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Sticker } from '../stickers/Sticker';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

export function ImportTipCard() {
  return (
    <View style={styles.card}>
      <Sticker kind="whisk" size={64} rotate={-8} style={styles.whisk} />
      <View style={styles.content}>
        <Text style={styles.tip}>
          Tip: You can always edit and make it your own.
        </Text>
      </View>
      <Feather name="heart" size={18} color={colors.rose} style={styles.heart} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.paperSoft,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  whisk: {
    marginLeft: -6,
  },
  content: {
    flex: 1,
  },
  tip: {
    fontFamily: fonts.hand,
    fontSize: 18,
    color: colors.inkSoft,
    lineHeight: 22,
  },
  heart: {
    marginLeft: 6,
  },
});
