import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

interface Props {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  body: string;
}

export function ComingSoonTab({ icon, title, body }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Feather name={icon} size={40} color={colors.inkFaint} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.ink,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 20,
  },
});
