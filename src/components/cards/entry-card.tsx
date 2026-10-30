import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { TriangleAlert } from 'lucide-react-native';

import { MediaDetailedCard } from '@/components/cards/media-cards';
import { ManageEntry } from '@/components/list/manage-entry';
import { Txt } from '@/components/tw';
import { Tw, alpha } from '@/constants/theme';
import type { IListEntry, MediaKind } from '@/lib/api';
import { usePatchEntry } from '@/lib/queries';

/**
 * Carte d'une entrée de ma liste (affiche, titre, progression, « +1 », statut) : la même dans Ma liste, Mon suivi
 * et partout où une entrée apparaît, avec son tiroir de gestion. `note` ajoute une mention sous la carte.
 */
export function EntryCard({ kind, entry, note }: Readonly<{ kind: MediaKind; entry: IListEntry; note?: string }>) {
  const patch = usePatchEntry();
  const [open, setOpen] = useState(false);
  const media = entry.media;
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
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Tw.radius.sm, backgroundColor: alpha(Tw.color.warning, 0.12), paddingHorizontal: 8, paddingVertical: 4 },
});
