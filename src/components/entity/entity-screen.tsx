import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowLeft, Building2, ExternalLink, Info, Music, User, type LucideIcon } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { CardCarousel, InfoRow, PRIMARY_PILL, Pill, SectionCard, type ICarouselItem } from '@/components/media/detail-parts';
import { openMedia } from '@/components/media-row';
import { Screen } from '@/components/screen';
import { ErrorState, Loading } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Tw, ScreenGutter, alpha } from '@/constants/theme';
import { mediaId, type EntityKind, type IRelated } from '@/lib/api';
import {
  ENTITY_SECTIONS,
  entityBadge,
  entityId,
  entityImage,
  entityInfoRows,
  entityName,
  type IEntitySection,
} from '@/lib/entity';
import { formatLabel, linkLabel, mediaTitle } from '@/lib/media';
import { useEntity, useEntityRelation } from '@/lib/queries';
import { openEntity, openEntityRelations } from './open-entity';

const ICONS: Record<EntityKind, LucideIcon> = { character: User, person: User, track: Music, company: Building2 };

/** Un lien externe quitte Actunime : il s'ouvre dans le navigateur de lecture de l'app. */
const openExternal = (url: string) => router.navigate({ pathname: '/reading', params: { url, t: String(Date.now()) } });

function itemOf(section: IEntitySection, related: IRelated): ICarouselItem {
  const id = entityId(related);
  if (section.itemKind === 'anime' || section.itemKind === 'manga') {
    return {
      id,
      title: mediaTitle(related as never),
      imageUrl: related.posterUrl,
      subtitle: formatLabel(related.format) ?? undefined,
      onPress: () => openMedia(section.itemKind as 'anime' | 'manga', mediaId(related)),
    };
  }
  return {
    id,
    title: entityName(related),
    imageUrl: entityImage(related),
    onPress: () => openEntity(section.itemKind as EntityKind, id),
  };
}

function RelationSection({ kind, id, section }: Readonly<{ kind: EntityKind; id: string; section: IEntitySection }>) {
  const relation = useEntityRelation(kind, id, section.relation);
  const results = relation.data?.results ?? [];
  if (results.length === 0) return null;
  const total = relation.data?.total ?? results.length;
  const media = section.itemKind === 'anime' || section.itemKind === 'manga';
  return (
    <SectionCard
      title={section.title}
      count={total}
      action={total > results.length ? { label: 'Voir tout', onPress: () => openEntityRelations(kind, id, section.relation) } : undefined}
    >
      <CardCarousel
        items={results.map((related) => itemOf(section, related))}
        kind={section.itemKind === 'manga' ? 'manga' : 'anime'}
        width={media ? 112 : 144}
        placeholder={ICONS[section.itemKind === 'anime' || section.itemKind === 'manga' ? 'person' : (section.itemKind as EntityKind)]}
        square={!media}
      />
    </SectionCard>
  );
}

/**
 * Fiche d'un personnage, d'une personne, d'une musique ou d'une société, transposée des pages du site
 * (`personnages/$id`, `personnes/$id`, `musiques/$id`, `societes/$id`) : visuel, nom, description, informations,
 * liens externes, puis les œuvres et entités reliées.
 */
export function EntityScreen({ kind, id }: Readonly<{ kind: EntityKind; id: string }>) {
  const entity = useEntity(kind, id);
  const Icon = ICONS[kind];

  const back = (
    <Pressable accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))} style={styles.back}>
      <ArrowLeft size={16} color={Tw.color.foreground} />
      <Txt size="sm">Retour</Txt>
    </Pressable>
  );

  if (entity.isPending || entity.isError || !entity.data) {
    return (
      <Screen>
        <View style={styles.topBack}>{back}</View>
        {entity.isPending ? <Loading /> : <ErrorState error={entity.error ?? new Error('Introuvable')} onRetry={() => void entity.refetch()} />}
      </Screen>
    );
  }

  const data = entity.data;
  const image = entityImage(data);
  const badge = entityBadge(kind, data);
  const rows = entityInfoRows(kind, data);
  const links = (data.links ?? []).filter((link) => /^https?:\/\//.test(link.url));
  const alias = data.name?.alias?.filter(Boolean) ?? [];

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBack}>{back}</View>

        {data.verified === false ? (
          <View style={styles.warning}>
            <Txt size="sm" color={Tw.color.amber400}>
              Les informations de cette page n’ont pas encore été vérifiées.
            </Txt>
          </View>
        ) : null}

        <View style={styles.hero}>
          <View style={styles.visual}>
            {image ? (
              <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit={kind === 'company' ? 'contain' : 'cover'} transition={150} />
            ) : (
              <Icon size={48} color={Tw.color.mutedForeground} />
            )}
          </View>
          <View style={styles.titleBlock}>
            <Txt size="xl" weight="bold" leading={1.25} style={styles.centered}>
              {entityName(data)}
            </Txt>
            {alias.length > 0 ? (
              <Txt size="sm" color={Tw.color.mutedForeground} style={styles.centered}>
                {alias.join(', ')}
              </Txt>
            ) : null}
            {badge ? <Pill label={badge} {...PRIMARY_PILL} /> : null}
          </View>
        </View>

        {data.description ? (
          <Txt size="sm" color={Tw.color.mutedForeground} style={styles.description}>
            {data.description}
          </Txt>
        ) : null}

        <View style={styles.sections}>
          {rows.length > 0 ? (
            <SectionCard title="Informations" icon={Info}>
              {rows.map((row, index) => (
                <InfoRow key={row.label} label={row.label} value={row.value} first={index === 0} />
              ))}
            </SectionCard>
          ) : null}

          {links.length > 0 ? (
            <SectionCard title="Liens externes">
              <View style={styles.wrap}>
                {links.map((link) => (
                  <Pressable key={link.url} onPress={() => openExternal(link.url)} style={styles.linkPill}>
                    <Txt size="xs" weight="medium">
                      {linkLabel(link)}
                    </Txt>
                    <ExternalLink size={12} color={Tw.color.foreground} />
                  </Pressable>
                ))}
              </View>
            </SectionCard>
          ) : null}

          {ENTITY_SECTIONS[kind].map((section) => (
            <RelationSection key={section.relation} kind={kind} id={id} section={section} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 120 },
  topBack: { paddingHorizontal: ScreenGutter, paddingTop: 8, paddingBottom: 8 },
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
  warning: {
    marginHorizontal: ScreenGutter,
    marginBottom: 12,
    padding: 12,
    borderRadius: Tw.radius.lg,
    borderWidth: 1,
    borderColor: alpha(Tw.color.amber500, 0.4),
    backgroundColor: alpha(Tw.color.amber500, 0.1),
  },
  hero: { alignItems: 'center', gap: 16, paddingHorizontal: ScreenGutter },
  visual: {
    width: 176,
    height: 176,
    borderRadius: Tw.radius.xl,
    overflow: 'hidden',
    backgroundColor: Tw.color.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { alignItems: 'center', gap: 6 },
  centered: { textAlign: 'center' },
  description: { paddingHorizontal: ScreenGutter, paddingTop: 16 },
  sections: { paddingHorizontal: ScreenGutter, paddingTop: 16, gap: 16 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  linkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Tw.color.border,
  },
});
