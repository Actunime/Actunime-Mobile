import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { EntryCard } from '@/components/cards/entry-card';
import { Button } from '@/components/button';
import type { IListEntry, MediaKind } from '@/lib/api';
import type { ILastRead } from '@/lib/browsing';

/**
 * Une page du carrousel de Mon suivi : la carte détaillée de l'entrée et, quand elle a été lue dans le navigateur,
 * un bouton « Continuer » qui rouvre la page où l'on s'était arrêté.
 */
export function EntrySlide({ kind, entry, note, read, width }: Readonly<{ kind: MediaKind; entry: IListEntry; note?: string; read?: ILastRead; width: number }>) {
  const unit = kind === 'manga' ? 'chapitre' : 'épisode';
  return (
    <View style={[styles.slide, { width }]}>
      <EntryCard kind={kind} entry={entry} note={note} />
      {read ? (
        <Button label={`Continuer · ${unit} ${read.number} · ${read.host}`} onPress={() => router.navigate({ pathname: '/reading', params: { url: read.url, t: String(Date.now()) } })} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  slide: { gap: 12 },
});
