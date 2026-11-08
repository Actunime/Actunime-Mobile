import { Plus, TriangleAlert } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { Poster } from '@/components/poster';
import { Pressable } from '@/components/tap';
import { openMedia } from '@/components/media-row';
import { Txt } from '@/components/tw';
import { Tw, alpha } from '@/constants/theme';
import type { IListEntry, MediaKind } from '@/lib/api';
import { kindOf, mediaTitle, progressLabel, totalOf } from '@/lib/media';
import { nextProgressPatch, usePatchEntry } from '@/lib/queries';

export const ENTRY_TILE_WIDTH = 116;

/**
 * Vignette compacte d'une entrée de ma liste pour les rangées horizontales de Mon suivi (« À rattraper »,
 * « Reprendre ») : affiche, titre, progression et « +1 ». Un appui ouvre la fiche. `behind` ajoute le retard.
 */
export function EntryTile({ entry, behind }: Readonly<{ entry: IListEntry; behind?: number }>) {
  const patch = usePatchEntry();
  const media = entry.media;
  if (!media || !entry.mediaId) return null;
  const kind: MediaKind = kindOf(entry.mediaType);
  const next = nextProgressPatch(entry, totalOf(kind, media));
  const mediaId = entry.mediaId;

  return (
    <View style={styles.tile}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir ${mediaTitle(media)}`} onPress={() => openMedia(kind, mediaId)} style={styles.open}>
        <Poster uri={media.posterUrl} width={ENTRY_TILE_WIDTH} />
        <Txt size="xs" weight="medium" numberOfLines={2} style={styles.title}>
          {mediaTitle(media)}
        </Txt>
      </Pressable>
      <View style={styles.footer}>
        <Txt size="11" color={Tw.color.mutedForeground} numberOfLines={1} style={styles.progress}>
          {progressLabel(entry, media) ?? '—'}
        </Txt>
        {next ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Un ${kind === 'manga' ? 'chapitre' : 'épisode'} de plus`} onPress={() => patch.mutate({ entry, patch: next })} hitSlop={6} style={styles.plus}>
            <Plus size={14} color={Tw.color.primaryForeground} />
          </Pressable>
        ) : null}
      </View>
      {behind ? (
        <View style={styles.behind}>
          <TriangleAlert size={11} color={Tw.color.warning} />
          <Txt size="10" weight="medium" color={Tw.color.warning}>
            {behind} de retard
          </Txt>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: ENTRY_TILE_WIDTH, gap: 4 },
  open: { gap: 6 },
  title: { minHeight: 32 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progress: { flex: 1 },
  plus: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: Tw.color.primary },
  behind: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: Tw.radius.sm, backgroundColor: alpha(Tw.color.warning, 0.12), paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start' },
});
