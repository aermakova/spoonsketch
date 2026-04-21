import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';

export default function ElementsScreen() {
  return (
    <View style={styles.root}>
      <Text style={styles.text}>Elements — coming in Phase 4</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.hand, fontSize: 20, color: colors.inkSoft },
});
