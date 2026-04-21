import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { fonts } from '../../theme/fonts';

interface Props {
  children: React.ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  reset = () => this.setState({ hasError: false, message: '' });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.container}>
        <Text style={styles.emoji}>🍳</Text>
        <Text style={styles.title}>{this.props.fallbackLabel ?? 'Something went wrong'}</Text>
        <Text style={styles.detail} numberOfLines={3}>{this.state.message}</Text>
        <TouchableOpacity style={styles.btn} onPress={this.reset}>
          <Text style={styles.btnText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

// HOC sugar — screens export `withErrorBoundary(Screen, 'label')` so a
// render-time crash in one tab doesn't take down siblings.
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallbackLabel?: string,
) {
  const Wrapped = (props: P) => (
    <ErrorBoundary fallbackLabel={fallbackLabel}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${Component.displayName ?? Component.name ?? 'Component'})`;
  return Wrapped;
}

const styles = StyleSheet.create({
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, backgroundColor: colors.bg,
  },
  emoji: { fontSize: 48, marginBottom: 16 },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.ink, marginBottom: 8, textAlign: 'center' },
  detail: { fontFamily: fonts.body, fontSize: 13, color: colors.inkSoft, textAlign: 'center', marginBottom: 24 },
  btn: {
    backgroundColor: colors.terracotta, borderRadius: 12,
    paddingHorizontal: 24, paddingVertical: 10,
  },
  btnText: { fontFamily: fonts.bodyBold, fontSize: 15, color: '#fff' },
});
