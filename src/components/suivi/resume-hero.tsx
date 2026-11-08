import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { openMedia } from '@/components/media-row';
import { Poster } from '@/components/poster';
import { Pressable } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Sheen } from '@/components/ui/sheen';
import { Floating, Spacing } from '@/constants/theme';
import { mediaId } from '@/lib/api';
import { agoLabel } from '@/lib/browsing';
import type { IResumeTarget } from '@/lib/resume';

/**
 * « Reprendre » de Mon suivi : la dernière œuvre lue dans le navigateur, avec un bouton « Continuer » qui rouvre
 * la page où l'on s'était arrêté (comme la carte héros du site).
 */
export function ResumeHero({ target }: Readonly<{ target: IResumeTarget }>) {
  const { entry, kind, title, read } = target;
  const unit = kind === 'manga' ? 'Chapitre' : 'Épisode';
  return (
    <View style={styles.card}>
      <Sheen />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Fiche de ${title}`}
        onPress={() => entry.media && openMedia(kind, mediaId(entry.media))}
        style={styles.head}
      >
        <Poster uri={entry.media?.posterUrl ?? entry.preview?.coverImage} width={64} />
        <View style={styles.flex}>
          <ThemedText type="small" themeColor="primary">
            {kind === 'manga' ? 'Manga · En lecture' : 'Anime · En cours'}
          </ThemedText>
          <ThemedText type="smallBold" numberOfLines={2}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {unit} {read.number} · {read.host} · {agoLabel(read.at)}
          </ThemedText>
        </View>
      </Pressable>
      <Button
        label={`Continuer · ${unit.toLowerCase()} ${read.number}`}
        onPress={() => router.navigate({ pathname: '/reading', params: { url: read.url, t: String(Date.now()) } })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...Floating, overflow: 'hidden', padding: Spacing.three, gap: Spacing.three },
  head: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  flex: { flex: 1, gap: 2 },
});
