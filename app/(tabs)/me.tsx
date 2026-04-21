import React from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { ClayButton } from '../../src/components/ui/ClayButton';
import { signOut } from '../../src/api/auth';
import { colors } from '../../src/theme/colors';
import { fonts } from '../../src/theme/fonts';

export default function MeScreen() {
  async function handleSignOut() {
    try {
      await signOut();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  return (
    <View style={styles.root}>
      <Text style={styles.text}>Profile — coming soon</Text>
      <ClayButton label="Sign out" variant="secondary" onPress={handleSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', gap: 24 },
  text: { fontFamily: fonts.hand, fontSize: 20, color: colors.inkSoft },
});
