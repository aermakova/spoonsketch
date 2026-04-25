import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';
import { useThemeStore } from '../../lib/store';

export type ImportTabKey = 'paste' | 'type' | 'photo' | 'file' | 'json';

interface TabDef {
  key: ImportTabKey;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  disabled?: boolean;
}

const TABS: TabDef[] = [
  { key: 'paste', label: 'Paste Link', icon: 'paperclip' },
  { key: 'type', label: 'Type', icon: 'edit-2' },
  { key: 'photo', label: 'Photo', icon: 'camera' },
  { key: 'file', label: 'File', icon: 'file-text' },
  { key: 'json', label: 'JSON', icon: 'code' },
];

interface Props {
  active: ImportTabKey;
  onChange: (tab: ImportTabKey) => void;
}

export function ImportTabs({ active, onChange }: Props) {
  const { palette } = useThemeStore();
  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        const color = tab.disabled
          ? colors.inkFaint
          : isActive
            ? palette.accent
            : colors.inkSoft;
        return (
          <Pressable
            key={tab.key}
            onPress={() => !tab.disabled && onChange(tab.key)}
            style={styles.tab}
            disabled={tab.disabled}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive, disabled: tab.disabled }}
          >
            <Feather name={tab.icon} size={20} color={color} />
            <Text style={[styles.label, { color }]} numberOfLines={1}>
              {tab.label}
            </Text>
            {tab.disabled ? (
              <View style={styles.soonPill}>
                <Text style={styles.soonText}>Soon</Text>
              </View>
            ) : null}
            {isActive && !tab.disabled ? (
              <View style={[styles.underline, { backgroundColor: palette.accent }]} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  label: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  underline: {
    position: 'absolute',
    left: '20%',
    right: '20%',
    bottom: -1,
    height: 2,
    borderRadius: 2,
  },
  soonPill: {
    position: 'absolute',
    top: 2,
    right: 6,
    backgroundColor: colors.line,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  soonText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 8,
    color: colors.inkSoft,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
