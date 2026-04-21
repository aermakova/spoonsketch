import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';

const PAGE_LABELS: Record<string, string> = {
  cover: 'Cover',
  dedication: 'Dedication',
  about: 'About / Intro',
  chapter_divider: 'Chapter Divider',
  blank: 'Blank Page',
  closing: 'Closing',
};

const PAGE_ICONS: Record<string, string> = {
  cover: '📕',
  dedication: '💌',
  about: '✍️',
  chapter_divider: '🔖',
  blank: '📄',
  closing: '🎀',
};

export default function PageStubScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const label = PAGE_LABELS[type ?? ''] ?? 'Page';
  const icon = PAGE_ICONS[type ?? ''] ?? '📄';

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} hitSlop={8}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{label}</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.heading}>Coming soon</Text>
        <Text style={styles.desc}>
          The {label.toLowerCase()} editor will let you add text, photos, and decorations
          using the same canvas tools as recipe pages.
        </Text>
        <TouchableOpacity style={styles.backLink} onPress={handleBack}>
          <Text style={styles.backLinkText}>← Back to cookbook</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    backgroundColor: colors.paper,
  },
  backBtn: {
    width: 36,
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 28,
    color: colors.inkSoft,
    lineHeight: 32,
  },
  title: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.ink,
    textAlign: 'center',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  icon: {
    fontSize: 56,
    marginBottom: 16,
  },
  heading: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.ink,
    marginBottom: 10,
  },
  desc: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  backLink: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.bg2,
  },
  backLinkText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.inkSoft,
  },
});
