import { router } from 'expo-router';
import { ArrowLeft, ChevronRight, type LucideIcon } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Screen } from '@/components/screen';
import { Pressable } from '@/components/tap';
import { usePalette } from '@/components/theme-context';
import { Txt } from '@/components/tw';
import { ScreenGutter, Tw, alpha } from '@/constants/theme';
import { cardOverride } from '@/lib/palette';

/** Page de réglages : retour, titre, explication, contenu qui défile. */
export function SettingsPage({ title, description, children }: Readonly<{ title: string; description?: string; children: React.ReactNode }>) {
  const palette = usePalette();
  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.navigate('/settings'))} style={[styles.back, !palette.isDefault && { backgroundColor: palette.input }]}>
          <ArrowLeft size={16} color={Tw.color.foreground} />
          <Txt size="sm">Retour</Txt>
        </Pressable>
        <View style={styles.head}>
          <Txt size="2xl" weight="bold">
            {title}
          </Txt>
          {description ? (
            <Txt size="sm" color={Tw.color.mutedForeground}>
              {description}
            </Txt>
          ) : null}
        </View>
        {children}
      </ScrollView>
    </Screen>
  );
}

/** Carte de réglages, comme les `SettingsSection` du site. */
export function SettingsCard({ children }: Readonly<{ children: React.ReactNode }>) {
  const palette = usePalette();
  return <View style={[styles.card, cardOverride(palette)]}>{children}</View>;
}

/** Ligne qui mène à un écran de réglages. */
export function SettingsLink({ icon: Icon, label, hint, onPress }: Readonly<{ icon: LucideIcon; label: string; hint?: string; onPress: () => void }>) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.link}>
      <Icon size={22} color={Tw.color.mutedForeground} />
      <View style={styles.flex}>
        <Txt size="sm" weight="semibold">
          {label}
        </Txt>
        {hint ? (
          <Txt size="xs" color={Tw.color.mutedForeground}>
            {hint}
          </Txt>
        ) : null}
      </View>
      <ChevronRight size={20} color={Tw.color.mutedForeground} />
    </Pressable>
  );
}

/** Message d'état d'une action (enregistré, erreur). */
export function StatusNote({ tone, children }: Readonly<{ tone: 'success' | 'error' | 'info'; children: React.ReactNode }>) {
  const color = tone === 'success' ? Tw.color.green400 : tone === 'error' ? Tw.color.destructive : Tw.color.mutedForeground;
  return (
    <View style={[styles.note, { borderColor: alpha(color, 0.4), backgroundColor: alpha(color, 0.1) }]}>
      <Txt size="sm" color={color}>
        {children}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  content: { padding: ScreenGutter, gap: 16, paddingBottom: 32 },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: Tw.radius.md,
    backgroundColor: Tw.color.muted,
  },
  head: { gap: 6 },
  card: { backgroundColor: Tw.color.card, borderRadius: Tw.radius.xl, padding: 16, gap: 12, overflow: 'hidden' },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 6 },
  note: { padding: 12, borderRadius: Tw.radius.lg, borderWidth: 1 },
});
