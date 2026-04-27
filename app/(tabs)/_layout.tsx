import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors } from '../../src/theme/colors';
import { useThemeStore } from '../../src/lib/store';
import { fonts } from '../../src/theme/fonts';
import { useRecipesRealtime } from '../../src/hooks/useRecipesRealtime';

const TAB_BAR_HEIGHT = 64;

function TabIcon({
  icon,
  label,
  focused,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  focused: boolean;
}) {
  const { palette } = useThemeStore();
  const active = focused ? palette.accent : colors.inkFaint;
  return (
    <View style={[styles.tabItem, { minWidth: 70 }]}>
      <Feather name={icon} size={20} color={active} />
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        allowFontScaling={false}
        style={[styles.tabLabel, { color: active }]}
      >
        {label}
      </Text>
    </View>
  );
}

function FABButton() {
  const router = useRouter();
  const { palette } = useThemeStore();
  const insets = useSafeAreaInsets();
  return (
    <TouchableOpacity
      style={[styles.fabWrapper, { paddingBottom: insets.bottom > 0 ? 4 : 8 }]}
      onPress={() => router.push('/recipe/import')}
      activeOpacity={0.85}
    >
      <View style={[styles.fab, { backgroundColor: palette.accent }]}>
        <Text style={styles.fabIcon}>+</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { palette } = useThemeStore();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const tabBarHeight = TAB_BAR_HEIGHT + (Platform.OS === 'ios' ? insets.bottom : 0);

  // Subscribe to live `recipes` changes for the signed-in user — when the
  // Telegram bot inserts a recipe, the library refreshes within ~2 s.
  useRecipesRealtime();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.paper,
          borderTopColor: colors.line,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: Platform.OS === 'ios' ? insets.bottom : 8,
          paddingTop: 10,
          shadowColor: colors.ink,
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 6,
        },
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="home" label={t('tabs.home')} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="shelves"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="book-open" label={t('tabs.shelves')} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          tabBarButton: () => <FABButton />,
        }}
      />
      <Tabs.Screen
        name="stash"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="grid" label={t('tabs.stash')} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="me"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon icon="user" label={t('tabs.me')} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  tabLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 10,
  },
  fabWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 0,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabIcon: {
    color: colors.paper,
    fontSize: 30,
    lineHeight: 34,
    marginTop: -2,
  },
});
