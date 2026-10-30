import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Poster } from '@/components/poster';
import { Screen } from '@/components/screen';
import { Pressable } from '@/components/tap';
import { ThemedText } from '@/components/themed-text';
import { Sheen } from '@/components/ui/sheen';
import { Colors, Floating, Fonts, ScreenGutter, Spacing, Tw } from '@/constants/theme';
import { resolveAddress } from '@/lib/address';
import { mediaId, type IListEntry } from '@/lib/api';
import { useBrowserSettings } from '@/lib/browser-settings';
import {
  agoLabel,
  forgetSite,
  getLastReads,
  getSites,
  lastReadKey,
  pinSite,
  siteHome,
  type IBrowserSite,
  type ILastRead,
} from '@/lib/browsing';
import { entryId, mediaTitle } from '@/lib/media';
import { useAllMyList } from '@/lib/queries';

interface IResumable {
  entry: IListEntry;
  kind: 'anime' | 'manga';
  title: string;
  read: ILastRead;
}

/** Œuvres en cours de ma liste dont une page a déjà été lue dans le navigateur, la plus récente d'abord. */
function resumables(entries: IListEntry[], reads: Record<string, ILastRead>): IResumable[] {
  return entries
    .flatMap((entry) => {
      const kind = entry.mediaType === 'Manga' ? 'manga' : 'anime';
      const id = entry.media ? mediaId(entry.media) : entryId(entry);
      const read = reads[lastReadKey(kind, id)];
      const title = entry.media ? mediaTitle(entry.media) : (entry.preview?.title ?? 'Sans titre');
      return read ? [{ entry, kind, title, read } satisfies IResumable] : [];
    })
    .sort((a, b) => b.read.at - a.read.at)
    .slice(0, 6);
}

function ResumeCard({ item, onOpen }: Readonly<{ item: IResumable; onOpen: (url: string) => void }>) {
  const unit = item.kind === 'manga' ? 'Chapitre' : 'Épisode';
  const openMedia = () => {
    if (item.entry.media) router.push({ pathname: '/media/[kind]/[id]', params: { kind: item.kind, id: mediaId(item.entry.media) } });
  };
  return (
    <View style={styles.card}>
      <Sheen />
      <Pressable accessibilityRole="button" accessibilityLabel={`Fiche de ${item.title}`} onPress={openMedia} style={styles.resumeHead}>
        <Poster uri={item.entry.media?.posterUrl ?? item.entry.preview?.coverImage} width={48} />
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {item.title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {unit} {item.read.number} · {item.read.host} · {agoLabel(item.read.at)}
          </ThemedText>
        </View>
      </Pressable>
      <Button label={`Reprendre · ${unit.toLowerCase()} ${item.read.number}`} onPress={() => onOpen(item.read.url)} />
    </View>
  );
}

function SiteRow({ site, onOpen, onPin, onForget }: Readonly<{ site: IBrowserSite; onOpen: (url: string) => void; onPin: () => void; onForget: () => void }>) {
  return (
    <View style={styles.siteRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Ouvrir ${site.host}`}
        onPress={() => onOpen(siteHome(site))}
        onLongPress={onForget}
        style={styles.siteMain}
      >
        <View style={styles.siteLetter}>
          <ThemedText type="smallBold" themeColor="primary">
            {site.host.charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.flex}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {site.host}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {agoLabel(site.at)}
          </ThemedText>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={site.pinned ? `Retirer ${site.host} de mes sites` : `Épingler ${site.host}`}
        onPress={onPin}
        style={styles.pin}
      >
        <Ionicons name={site.pinned ? 'star' : 'star-outline'} size={22} color={site.pinned ? Colors.primary : Colors.textSecondary} />
      </Pressable>
    </View>
  );
}

/**
 * Accueil du navigateur : lire ou regarder sur n'importe quel site (mangas comme animes en streaming), avec le suivi
 * Actunime. Retrouver sa lecture d'un geste, puis ses sites ; l'adresse reste en haut pour les autres cas.
 */
export function BrowserHome({ onOpen }: Readonly<{ onOpen: (url: string) => void }>) {
  const client = useQueryClient();
  const settings = useBrowserSettings();
  const [address, setAddress] = useState('');
  const [sites, setSites] = useState<IBrowserSite[]>([]);
  const [reads, setReads] = useState<Record<string, ILastRead>>({});
  const [refreshing, setRefreshing] = useState(false);
  const watching = useAllMyList('Anime', 'WATCHING');
  const reading = useAllMyList('Manga', 'READING');

  // Le navigateur se ferme sur cette page : on relit ce qu'il vient d'enregistrer à chaque retour.
  useFocusEffect(
    useCallback(() => {
      void Promise.all([getSites(), getLastReads()]).then(([storedSites, storedReads]) => {
        setSites(storedSites);
        setReads(storedReads);
      });
    }, []),
  );

  const items = useMemo(() => resumables([...(watching.data ?? []), ...(reading.data ?? [])], reads), [watching.data, reading.data, reads]);
  const pinned = sites.filter((site) => site.pinned);
  const recent = sites.filter((site) => !site.pinned);

  const open = () => {
    const url = resolveAddress(address);
    if (url) onOpen(url);
  };

  const refresh = async () => {
    setRefreshing(true);
    await client.invalidateQueries({ queryKey: ['my-list'] });
    setRefreshing(false);
  };

  const siteRows = (list: IBrowserSite[]) =>
    list.map((site) => (
      <SiteRow key={site.host} site={site} onOpen={onOpen} onPin={() => void pinSite(site.host).then(setSites)} onForget={() => void forgetSite(site.host).then(setSites)} />
    ));

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Colors.primary} />}
      >
        <View style={styles.titleRow}>
          <View style={styles.flex}>
            <ThemedText type="title">Navigateur</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Lis un manga ou regarde un anime sur le site de ton choix : ta liste se met à jour.
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Réglages du navigateur"
            onPress={() => router.push('/browser-settings')}
            style={styles.gear}
          >
            <Ionicons name="settings-outline" size={24} color={Colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.addressRow}>
          <TextInput
            value={address}
            onChangeText={setAddress}
            onSubmitEditing={open}
            placeholder="Adresse du site ou recherche"
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ouvrir"
            disabled={!address.trim()}
            onPress={open}
            style={[styles.go, !address.trim() && styles.goDisabled]}
          >
            <Ionicons name="arrow-forward" size={22} color={Colors.primaryForeground} />
          </Pressable>
        </View>

        {settings.showResume && items.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="subtitle">Reprendre</ThemedText>
            {items.map((item) => (
              <ResumeCard key={`${item.kind}:${entryId(item.entry)}`} item={item} onOpen={onOpen} />
            ))}
          </View>
        ) : null}

        {settings.showSites && pinned.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="subtitle">Mes sites</ThemedText>
            <View style={styles.card}>{siteRows(pinned)}</View>
          </View>
        ) : null}

        {settings.showRecent && recent.length > 0 ? (
          <View style={styles.section}>
            <ThemedText type="subtitle">Récents</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Touche l’étoile pour garder un site dans « Mes sites » ; appui long pour l’oublier.
            </ThemedText>
            <View style={styles.card}>{siteRows(recent)}</View>
          </View>
        ) : null}

        {sites.length === 0 && items.length === 0 ? (
          <View style={styles.card}>
            <Sheen />
            <ThemedText type="subtitle">Comment ça marche</ThemedText>
            {[
              'Ouvre ton site de lecture ou de streaming avec l’adresse ci-dessus.',
              'Une barre Actunime apparaît en bas : elle indique l’œuvre et le chapitre ou l’épisode reconnus.',
              'À la fin, ta liste est mise à jour (ou touche « Marquer comme lu »).',
              'Ensuite, tes sites et ta dernière lecture se retrouvent ici.',
            ].map((step, index) => (
              <ThemedText key={step} type="small" themeColor="textSecondary">
                {index + 1}. {step}
              </ThemedText>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: ScreenGutter, gap: Spacing.four, paddingBottom: Spacing.five },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  gear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  section: { gap: Spacing.three },
  card: { ...Floating, overflow: 'hidden', padding: Spacing.three, gap: Spacing.three },
  addressRow: { flexDirection: 'row', gap: Spacing.two },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderRadius: Tw.radius.lg,
    backgroundColor: Colors.input,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 16,
  },
  go: { width: 48, height: 48, borderRadius: Tw.radius.lg, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  goDisabled: { opacity: 0.4 },
  resumeHead: { flexDirection: 'row', gap: Spacing.three, alignItems: 'center' },
  siteRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  siteMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: 44 },
  siteLetter: {
    width: 40,
    height: 40,
    borderRadius: Tw.radius.lg,
    backgroundColor: Colors.backgroundSelected,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pin: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
