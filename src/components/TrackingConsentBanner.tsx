// Shown at app boot if the user hasn't yet decided whether to allow
// analytics tracking. Modal-style — dismissable only by Accept or
// Reject (per ePrivacy Directive: must be an active choice).
//
// "Accept analytics" and "Reject" are visually equal weight per CJEU
// Planet49 + national DPA guidance — reject button cannot be smaller
// or less prominent than accept.

import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrackingConsent } from '../lib/trackingConsent';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

export function TrackingConsentBanner() {
  const status = useTrackingConsent((s) => s.status);
  const accept = useTrackingConsent((s) => s.accept);
  const reject = useTrackingConsent((s) => s.reject);
  const insets = useSafeAreaInsets();

  if (status !== null) return null;

  return (
    <Modal visible transparent animationType="slide" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom + 12, 24) }]}>
          <Text style={styles.title}>A quick privacy choice</Text>
          <Text style={styles.body}>
            We'd like to use a small amount of usage data (which screens you open, which features
            you tap) to figure out what to improve. <Text style={styles.bodyStrong}>Crash reports</Text> always send so
            we can fix bugs — those don't include your recipes or photos.
          </Text>
          <Text style={styles.body}>
            You can change this any time in <Text style={styles.bodyStrong}>Me → Privacy</Text>.
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonReject]}
              onPress={reject}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, styles.buttonTextReject]}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonAccept]}
              onPress={accept}
              activeOpacity={0.7}
            >
              <Text style={[styles.buttonText, styles.buttonTextAccept]}>Accept analytics</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 28,
    gap: 14,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 21,
  },
  bodyStrong: {
    fontFamily: fonts.bodyBold,
    color: colors.ink,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  // Reject + Accept must be visually equal weight per CJEU Planet49.
  // Same padding, same font size, same flex; only color/border differs.
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonReject: {
    backgroundColor: colors.bg2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  buttonAccept: {
    backgroundColor: colors.terracotta,
  },
  buttonText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
  },
  buttonTextReject: {
    color: colors.ink,
  },
  buttonTextAccept: {
    color: '#fff',
  },
});
