import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAutoSticker } from '../../hooks/useAutoSticker';
import { useCanvasStore } from '../../lib/canvasStore';
import { AiError } from '../../api/ai';
import { useThemeStore } from '../../lib/store';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

interface Props {
  recipeId: string;
  canvasWidth: number;
  canvasHeight: number;
  onUpgradePress: () => void;
  /** Disabled when the recipe has no title / ingredients / tags. */
  disabled?: boolean;
}

type StatusMessage =
  | { kind: 'none' }
  | { kind: 'success'; text: string }
  | { kind: 'paywall'; used: number; limit: number }
  | { kind: 'error'; text: string };

export function MakeMeSketchButton({
  recipeId,
  canvasWidth,
  canvasHeight,
  onUpgradePress,
  disabled,
}: Props) {
  const { palette } = useThemeStore();
  const addStickersBatch = useCanvasStore((s) => s.addStickersBatch);
  const mutation = useAutoSticker();
  const [status, setStatus] = useState<StatusMessage>({ kind: 'none' });

  // Reset the status (especially a paywall card) whenever the recipe changes,
  // so opening a different recipe doesn't keep the previous paywall visible.
  useEffect(() => {
    setStatus({ kind: 'none' });
  }, [recipeId]);

  // Auto-dismiss success toast after 3.5 s so the canvas stays uncluttered.
  useEffect(() => {
    if (status.kind !== 'success') return;
    const t = setTimeout(() => setStatus({ kind: 'none' }), 3500);
    return () => clearTimeout(t);
  }, [status]);

  async function handlePress() {
    if (mutation.isPending || disabled) return;
    setStatus({ kind: 'none' });
    try {
      const res = await mutation.mutateAsync({ recipeId });
      if (!res.elements.length) {
        setStatus({ kind: 'error', text: 'No stickers this time — try again.' });
        return;
      }
      addStickersBatch(
        res.elements.map((e) => ({
          stickerKey: e.sticker_key,
          x: e.x_frac * canvasWidth,
          y: e.y_frac * canvasHeight,
          rotation: e.rotation,
          scale: e.scale,
        })),
      );
      setStatus({
        kind: 'success',
        text: `Sketched ${res.elements.length} stickers! Tap undo if you want to try again.`,
      });
    } catch (e) {
      if (e instanceof AiError) {
        if (e.errorCode === 'monthly_limit_reached') {
          setStatus({
            kind: 'paywall',
            used: e.details?.used ?? 0,
            limit: e.details?.limit ?? 5,
          });
          return;
        }
        setStatus({ kind: 'error', text: errorCopy(e) });
        return;
      }
      setStatus({ kind: 'error', text: 'Something went wrong.' });
    }
  }

  const isPaywall = status.kind === 'paywall';

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={handlePress}
        disabled={mutation.isPending || disabled || isPaywall}
        style={({ pressed }) => [
          styles.btn,
          { backgroundColor: palette.accent },
          (mutation.isPending || disabled || isPaywall) && styles.btnDisabled,
          pressed && !mutation.isPending && styles.btnPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Make me Sketch — auto-place stickers"
      >
        {mutation.isPending ? (
          <ActivityIndicator color="#faf4e6" size="small" />
        ) : (
          <>
            <Feather name="star" size={16} color="#faf4e6" />
            <Text style={styles.btnText}>Make me Sketch</Text>
            <Feather name="star" size={12} color="#faf4e6" style={styles.sparkleRight} />
          </>
        )}
      </Pressable>

      {status.kind === 'success' ? (
        <View style={[styles.toast, styles.toastSuccess]}>
          <Feather name="check-circle" size={14} color={colors.sage} />
          <Text style={styles.toastText}>{status.text}</Text>
        </View>
      ) : null}

      {status.kind === 'error' ? (
        <View style={[styles.toast, styles.toastError]}>
          <Feather name="alert-circle" size={14} color={colors.tomato} />
          <Text style={styles.toastText}>{status.text}</Text>
        </View>
      ) : null}

      {status.kind === 'paywall' ? (
        <View
          style={[
            styles.paywall,
            { backgroundColor: palette.bg2, borderColor: palette.accent },
          ]}
        >
          <Pressable
            onPress={() => setStatus({ kind: 'none' })}
            hitSlop={10}
            style={styles.paywallDismiss}
            accessibilityRole="button"
            accessibilityLabel="Dismiss paywall"
          >
            <Feather name="x" size={16} color={colors.inkSoft} />
          </Pressable>
          <Text style={[styles.paywallHeader, { color: palette.accent }]}>
            {status.used} / {status.limit} sketches used this month
          </Text>
          <Text style={styles.paywallBody}>
            Upgrade to Premium for unlimited AI sketches.
          </Text>
          <Pressable
            onPress={onUpgradePress}
            style={[styles.upgradeBtn, { backgroundColor: palette.accent }]}
          >
            <Text style={styles.upgradeText}>Upgrade to Premium</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function errorCopy(err: AiError): string {
  switch (err.errorCode) {
    case 'rate_limited':
      return 'A little fast — wait a moment and try again.';
    case 'ai_unavailable':
      return 'AI is taking a breather. Try again in a minute.';
    case 'ai_failed':
      return 'AI didn’t find good stickers — try again.';
    case 'recipe_empty':
      return 'Add a title or ingredients first.';
    case 'recipe_not_found':
      return 'Recipe not found.';
    default:
      return err.message || 'Something went wrong.';
  }
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    shadowColor: '#3b2a1f',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 3,
  },
  btnDisabled: { opacity: 0.55 },
  btnPressed: { transform: [{ scale: 0.97 }] },
  btnText: {
    color: '#faf4e6',
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  sparkleRight: {
    opacity: 0.75,
    marginLeft: 2,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(250, 244, 230, 0.92)',
  },
  toastSuccess: {
    borderLeftWidth: 3,
    borderLeftColor: colors.sage,
  },
  toastError: {
    borderLeftWidth: 3,
    borderLeftColor: colors.tomato,
  },
  toastText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.ink,
    lineHeight: 16,
  },
  paywall: {
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    gap: 8,
    position: 'relative',
  },
  paywallDismiss: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paywallHeader: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    textAlign: 'center',
  },
  paywallBody: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.inkSoft,
    textAlign: 'center',
    lineHeight: 17,
  },
  upgradeBtn: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 10,
  },
  upgradeText: {
    color: '#faf4e6',
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
