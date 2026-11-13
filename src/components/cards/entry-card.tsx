import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Clock, TriangleAlert } from 'lucide-react-native';

import { MediaDetailedCard } from '@/components/cards/media-cards';
import { ManageEntry } from '@/components/list/manage-entry';
import { Txt } from '@/components/tw';
import { Tw, alpha } from '@/constants/theme';
import type { IListEntry, MediaKind } from '@/lib/api';
import { isPendingEntry, mediaOf } from '@/lib/entry-media';
import { usePatchEntry } from '@/lib/queries';

/**
 * Carte d'une entrée de ma liste (affiche, titre, progression, « +1 », statut) : la même dans Ma liste, Mon suivi
 * et partout où une entrée apparaît, avec son tiroir de gestion. `note` ajoute une mention sous la carte.
 */
export function EntryCard({ kind, entry, note }: Readonly<{ kind: MediaKind; entry: IListEntry; note?: string }>) {
  const patch = usePatchEntry();
  const [open, setOpen] = useState(false);
  const media = entry.media;
  // Ajout rapide pas encore validé : pas de fiche à gérer, on montre l'aperçu et son état (comme dans Ma liste).
  if (isPendingEntry(entry)) {
    return (
      <MediaDetailedCard
        kind={kind}
        media={mediaOf(entry)}
        entry={entry}
        onPress={undefined}
        footer={
          <View style={styles.pending}>
            <Clock size={14} color={Tw.color.primary} />
            <Txt size="xs" weight="medium" color={Tw.color.primary}>
              En attente de référencement
            </Txt>
          </View>
        }
      />
    );
  }
  if (!media || !entry.mediaId) return null;
  return (
    <>
      <MediaDetailedCard
        kind={kind}
        media={media}
        entry={entry}
        manage
        onPress={undefined}
        onListChange={(p) => patch.mutate({ entry, patch: p })}
        onListEdit={() => setOpen(true)}
        footer={
          note ? (
            <View style={styles.note}>
              <TriangleAlert size={14} color={Tw.color.warning} />
              <Txt size="xs" weight="medium" color={Tw.color.warning}>
                {note}
              </Txt>
            </View>
          ) : undefined
        }
      />
      <ManageEntry kind={kind} media={media} entry={entry} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  pending: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Tw.radius.sm, borderWidth: 1, borderColor: alpha(Tw.color.primary, 0.4), backgroundColor: alpha(Tw.color.primary, 0.1), paddingHorizontal: 8, paddingVertical: 4 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Tw.radius.sm, backgroundColor: alpha(Tw.color.warning, 0.12), paddingHorizontal: 8, paddingVertical: 4 },
});
