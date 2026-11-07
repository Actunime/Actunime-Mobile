import { useMutation, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Building2, Music } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Field, NumberField } from '@/components/form-fields';
import { SettingsCard, SettingsPage, StatusNote } from '@/components/settings/settings-ui';
import { EmptyState, ErrorState, Loading, errorMessage } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Colors, Fonts, Radius, Spacing, Tw } from '@/constants/theme';
import { api, type IEntity, type MediaKind } from '@/lib/api';
import { entityBadge, entityImage, entityName } from '@/lib/entity';
import { mediaTitle } from '@/lib/media';
import { buildRelationAdd, type RelationKind } from '@/lib/propose';

const CONFIG: Record<RelationKind, { entity: 'track' | 'company'; title: string; hint: string; empty: string; icon: typeof Music }> = {
  tracks: { entity: 'track', title: 'Ajouter une musique', hint: 'Rechercher une musique', empty: 'Aucune musique trouvée.', icon: Music },
  companies: { entity: 'company', title: 'Ajouter une société', hint: 'Rechercher un studio, un éditeur…', empty: 'Aucune société trouvée.', icon: Building2 },
};

/**
 * Compléter une fiche (petit parcours, à la place du formulaire complet du site) : chercher une musique ou une société
 * qui existe déjà et proposer de la rattacher à l'œuvre. La modération vérifie avant que ce soit appliqué.
 */
export default function CompleteScreen() {
  const { kind: rawKind, id, what: rawWhat } = useLocalSearchParams<{ kind: string; id: string; what: string }>();
  const kind: MediaKind = rawKind === 'manga' ? 'manga' : 'anime';
  const what: RelationKind = rawWhat === 'companies' ? 'companies' : 'tracks';
  const config = CONFIG[what];
  const Icon = config.icon;

  const media = useQuery({ queryKey: ['media', kind, id], queryFn: () => api.getMedia(kind, id), enabled: !!id });
  const linked = useQuery({
    queryKey: ['media-links', kind, id, what, 'all'],
    queryFn: () => api.getMediaLinks(kind, id, what, 100),
    enabled: !!id,
  });
  const linkedIds = new Set((linked.data?.results ?? []).map((link) => link.data?.id).filter(Boolean));

  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setSearch(text.trim()), 350);
    return () => clearTimeout(timer);
  }, [text]);
  const results = useQuery({
    queryKey: ['complete-search', config.entity, search],
    queryFn: () => api.searchEntities(config.entity, search),
    enabled: search.length >= 2,
  });

  const [picked, setPicked] = useState<IEntity | null>(null);
  const [start, setStart] = useState<number | undefined>(undefined);
  const [end, setEnd] = useState<number | undefined>(undefined);
  const send = useMutation({
    mutationFn: () => api.proposeRelationAdd(kind, id, buildRelationAdd(what, { id: picked!.id, startEpisode: start, endEpisode: end })),
  });

  return (
    <SettingsPage title={config.title} description={media.data ? mediaTitle(media.data) : undefined}>
      {send.isSuccess ? (
        <SettingsCard>
          <StatusNote tone="success">Proposition envoyée. La modération la vérifie ; tu peux suivre son avancement dans « Propositions ».</StatusNote>
        </SettingsCard>
      ) : picked ? (
        <SettingsCard>
          <View style={styles.row}>
            <Thumb image={entityImage(picked)} Icon={Icon} />
            <View style={styles.flex}>
              <Txt size="sm" weight="semibold">
                {entityName(picked)}
              </Txt>
              {entityBadge(config.entity, picked) ? (
                <Txt size="xs" color={Tw.color.mutedForeground}>
                  {entityBadge(config.entity, picked)}
                </Txt>
              ) : null}
            </View>
          </View>
          {what === 'tracks' && kind === 'anime' ? (
            <>
              <Field label="À partir de l’épisode" hint="facultatif">
                <NumberField value={start} onChange={setStart} />
              </Field>
              <Field label="Jusqu’à l’épisode" hint="facultatif">
                <NumberField value={end} onChange={setEnd} />
              </Field>
            </>
          ) : null}
          {send.isError ? <StatusNote tone="error">{errorMessage(send.error)}</StatusNote> : null}
          <Button label={send.isPending ? 'Envoi…' : 'Proposer l’ajout'} disabled={send.isPending} onPress={() => send.mutate()} />
          <Button label="Choisir autre chose" variant="outline" disabled={send.isPending} onPress={() => setPicked(null)} />
        </SettingsCard>
      ) : (
        <>
          <TextInput value={text} onChangeText={setText} placeholder={config.hint} placeholderTextColor={Colors.textSecondary} autoCapitalize="none" autoCorrect={false} style={styles.input} />
          {search.length < 2 ? (
            <Txt size="sm" color={Tw.color.mutedForeground}>
              Tape au moins deux lettres pour chercher.
            </Txt>
          ) : results.isPending ? (
            <Loading />
          ) : results.isError ? (
            <ErrorState error={results.error} onRetry={() => void results.refetch()} />
          ) : results.data.results.length === 0 ? (
            <EmptyState title={config.empty} hint="Vérifie l’orthographe ou essaie un autre nom." />
          ) : (
            <View style={styles.list}>
              {results.data.results.map((entity) => {
                const already = linkedIds.has(entity.id);
                return (
                  <Pressable key={entity.id} accessibilityRole="button" disabled={already} onPress={() => setPicked(entity)} style={[styles.row, styles.item, already && styles.dim]}>
                    <Thumb image={entityImage(entity)} Icon={Icon} />
                    <View style={styles.flex}>
                      <Txt size="sm" weight="semibold" numberOfLines={2}>
                        {entityName(entity)}
                      </Txt>
                      <Txt size="xs" color={Tw.color.mutedForeground}>
                        {already ? 'Déjà sur la fiche' : (entityBadge(config.entity, entity) ?? ' ')}
                      </Txt>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      )}
    </SettingsPage>
  );
}

function Thumb({ image, Icon }: Readonly<{ image: string | null; Icon: typeof Music }>) {
  return (
    <View style={styles.thumb}>
      {image ? <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" /> : <Icon size={20} color={Tw.color.mutedForeground} />}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  input: { minHeight: 48, paddingHorizontal: Spacing.three, borderRadius: Radius.medium, backgroundColor: Tw.color.input, color: Colors.text, fontFamily: Fonts.medium, fontSize: 14 },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  item: { minHeight: 60, padding: 8, borderRadius: Tw.radius.lg, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: Tw.color.card },
  dim: { opacity: 0.5 },
  thumb: { width: 44, height: 44, borderRadius: Tw.radius.md, overflow: 'hidden', backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center' },
});
