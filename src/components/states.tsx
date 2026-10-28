import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { ApiError } from '@/lib/api-error';

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={Colors.primary} />
    </View>
  );
}

export const errorMessage = (error: unknown): string =>
  error instanceof ApiError || error instanceof Error ? error.message : 'Une erreur est survenue';

export function ErrorState({ error, onRetry }: Readonly<{ error: unknown; onRetry?: () => void }>) {
  return (
    <View style={styles.center}>
      <ThemedText themeColor="textSecondary" style={styles.text}>
        {errorMessage(error)}
      </ThemedText>
      {onRetry ? <Button label="Réessayer" variant="outline" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({ title, hint }: Readonly<{ title: string; hint?: string }>) {
  return (
    <View style={styles.center}>
      <ThemedText type="subtitle" style={styles.text}>
        {title}
      </ThemedText>
      {hint ? (
        <ThemedText themeColor="textSecondary" type="small" style={styles.text}>
          {hint}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.five },
  text: { textAlign: 'center' },
});
