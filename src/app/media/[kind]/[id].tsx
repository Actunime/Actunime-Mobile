import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  Activity,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  ChevronDown,
  CircleAlert,
  Clock,
  ExternalLink,
  Heart,
  Info,
  LayoutList,
  MessagesSquare,
  Music,
  Newspaper,
  Pencil,
  Play,
  PlayCircle,
  Plus,
  Share2,
  Star,
  TriangleAlert,
  Tv,
  User,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useMemo, useRef, useState } from 'react';
import { ScrollView, Share, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Pressable } from '@/components/tap';
import { ListEntrySheetTrigger } from '@/components/media/list-button';
import { openEntity, openMediaRelations } from '@/components/entity/open-entity';
import { CardCarousel, InfoRow, NewsList, PRIMARY_PILL, Pill, STATUS_PILL, SectionCard, type ICarouselItem } from '@/components/media/detail-parts';
import { MobileNav } from '@/components/nav/mobile-nav';
import { ManageEntry } from '@/components/list/manage-entry';
import { openMedia } from '@/components/media-row';
import { Screen } from '@/components/screen';
import { ErrorState, Loading } from '@/components/states';
import { Txt } from '@/components/tw';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { ScreenGutter, Tw, alpha } from '@/constants/theme';
import type { IMedia, IMediaFollowerEntry, MediaKind } from '@/lib/api';
import { WEB_URL } from '@/lib/config';
import { MEDIA_STATUS_LABELS, STATUS_LABELS } from '@/lib/list-form';
import { LIST_STATUS_BAR } from '@/lib/list-status';
import { ANIME_FORMAT_LABELS, MANGA_FORMAT_LABELS, RELATION_LABELS, SOURCE_LABELS, formatLongDate, formatReleaseDate, linkLabel, mediaTitle, seasonLabel } from '@/lib/media';
import {
  useIsFavorite,
  useMedia,
  useMediaFollowers,
  useMediaLinks,
  useMediaNews,
  useMetadataNames,
  useMyEntries,
  useRelations,
  useToggleFavorite,
} from '@/lib/queries';
import { nextBroadcast } from '@/lib/suivi';

const COUNTRY_LABELS: Record<string, string> = { JAPAN: 'Japon', KOREA: 'Corée du Sud', CHINA: 'Chine', OTHER: 'Autre' };
const AUDIENCE_LABELS: Record<string, string> = { ALL: 'Tout public', TEEN: 'Adolescents', MATURE: 'Public averti' };
const ROLE_LABELS: Record<string, string> = { PRINCIPAL: 'Principal', SECONDAIRE: 'Secondaire', FIGURANT: 'Figurant', ANTAGONISTE: 'Antagoniste', SOUTIEN: 'Soutien' };
const TRACK_LABELS: Record<string, string> = { OPENING: 'Opening', ENDING: 'Ending', BGM: 'BGM', INSERT: 'INSERT' };
const COMPANY_LABELS: Record<string, string> = { STUDIO: 'Studio', PRODUCER: 'Producteur', PUBLISHER: 'Editeur', LABEL: 'Label' };
const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const STATUS_ORDER = ['WATCHING', 'READING', 'COMPLETED', 'ON_HOLD', 'PLAN_TO_WATCH', 'PLAN_TO_READ'] as const;

/** Page du site ouverte dans le navigateur du téléphone (onglets et actions hors V1). */
const openSite = (path: string) => WebBrowser.openBrowserAsync(`${WEB_URL}${path}`).catch(() => undefined);
/** Lien externe ouvert dans le navigateur de lecture de l'app. */
const openInReader = (url: string) => router.navigate({ pathname: '/reading', params: { url, t: String(Date.now()) } });

/** « dans 3 jours », « dans 5 heures » (`formatDistanceToNow` du site, en plus court). */
function fromNow(date: Date): string {
  const minutes = Math.round((date.getTime() - Date.now()) / 60000);
  if (minutes < 60) return `dans ${Math.max(1, minutes)} minute${minutes > 1 ? 's' : ''}`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `dans ${hours} heure${hours > 1 ? 's' : ''}`;
  const days = Math.round(hours / 24);
  return `dans ${days} jour${days > 1 ? 's' : ''}`;
}

/** Fiche incomplète : affiche, genres, synopsis, date, format ou statut manquant (`isMediaIncomplete`). */
const isIncomplete = (m: IMedia) =>
  !m.posterUrl || !m.genres?.length || !m.synopsis || !m.date?.start || !m.format || m.format === 'UNKNOWN' || !m.status || m.status === 'UNKNOWN';

function MemberAvatar({ member, size }: Readonly<{ member: IMediaFollowerEntry['member']; size: number }>) {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      {member.avatarUrl ? (
        <Image source={{ uri: member.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <Txt size="xs" color={Tw.color.mutedForeground}>
          {(member.displayName ?? member.username).charAt(0).toUpperCase()}
        </Txt>
      )}
    </View>
  );
}

/**
 * Fiche anime ou manga, transposée de `Actunime-Web/src/routes/animes/$id.tsx` (et `$id/index.tsx`, onglet
 * « Général ») : en-tête immersif avec l'affiche centrée (choix du PO), relations, titre et pastilles, membres qui
 * suivent, barre d'actions, puis synopsis, informations, liens, studios, tags, bande-annonce, amis, communauté,
 * personnages, staff et musiques. Les onglets propres au site (discussion, activités, statistiques) l'ouvrent.
 */
export default function MediaScreen() {
  const { kind, id } = useLocalSearchParams<{ kind: MediaKind; id: string }>();
  const media = useMedia(kind, id);
  const mediaType = kind === 'manga' ? 'Manga' : 'Anime';
  const mine = useMyEntries(mediaType);
  const entry = useMemo(() => mine.data?.find((e) => e.mediaId === id) ?? null, [mine.data, id]);
  const relations = useRelations(kind, id);
  const followers = useMediaFollowers(kind, id);
  const characters = useMediaLinks(kind, id, 'characters');
  const staffs = useMediaLinks(kind, id, 'staffs');
  const news = useMediaNews(id);
  const tracks = useMediaLinks(kind, id, kind === 'anime' ? 'tracks' : 'characters');
  const companies = useMediaLinks(kind, id, 'companies');
  const favorite = useIsFavorite(id, mediaType);
  const toggleFavorite = useToggleFavorite(id, mediaType);
  const [manageOpen, setManageOpen] = useState(false);
  const [tabsOpen, setTabsOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  // voile sous la barre d'état dès que le contenu défile dessous (sinon l'heure et les icônes se mêlent au texte)
  const [scrolled, setScrolled] = useState(false);
  const offsets = useRef<Record<string, number>>({});

  const loaded = media.data;
  const metaIds = useMemo(
    () => [
      ...(loaded?.genres ?? []),
      ...(loaded?.themes ?? []),
      ...(loaded?.demographics ?? []),
      ...(loaded?.tags ?? []).map((t) => String(t.id)),
      ...(staffs.data?.results ?? []).map((s) => (s.job !== undefined ? String(s.job) : '')).filter(Boolean),
    ],
    [loaded, staffs.data],
  );
  const meta = useMetadataNames(metaIds);
  const nameOf = (metaId: string | number) => meta.data?.find((m) => String(m.id) === String(metaId))?.name;
  const named = (ids?: (string | number)[]) =>
    (ids ?? []).map((metaId) => ({ id: String(metaId), name: nameOf(metaId) })).filter((m): m is { id: string; name: string } => !!m.name);

  const back = (
    <Pressable accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.navigate('/search'))} style={styles.back}>
      <ArrowLeft size={16} color={Tw.color.foreground} />
      <Txt size="sm">Retour</Txt>
    </Pressable>
  );

  if (media.isPending || media.isError) {
    return (
      <Screen>
        <View style={[styles.topBack, { paddingTop: insets.top + 8 }]}>{back}</View>
        {media.isPending ? <Loading /> : <ErrorState error={media.error} onRetry={() => media.refetch()} />}
      </Screen>
    );
  }

  const data = media.data;
  const anime = kind === 'anime';
  const sitePath = `/${anime ? 'animes' : 'mangas'}/${id}`;
  const genres = named(data.genres);
  const themes = named(data.themes);
  const demographics = named(data.demographics);
  const tags = named((data.tags ?? []).map((t) => t.id));
  const formatLabel = data.format ? (anime ? ANIME_FORMAT_LABELS : MANGA_FORMAT_LABELS)[data.format] : undefined;
  const statusPill = STATUS_PILL[data.status ?? 'UNKNOWN'] ?? STATUS_PILL.UNKNOWN!;
  const airing = anime && data.status === 'AIRING' && data.format !== 'FILM';
  const start = data.date?.start ? new Date(data.date.start) : null;
  const next = airing ? nextBroadcast(data) : null;
  const broadcastLabel = !airing
    ? undefined
    : data.episodesInfo?.broadcastPaused
      ? 'Diffusion en pause'
      : start && next && (!data.date?.startPrecision || data.date.startPrecision === 'day')
        ? `Nouvel épisode ${WEEKDAYS[start.getDay()]} · ${fromNow(next)}`
        : undefined;
  const sagaItems: ICarouselItem[] = [
    ...(relations.data?.direct ?? []).map((rel) => ({
      rel,
      label: [seasonLabel(rel.season), rel.label !== undefined ? RELATION_LABELS[rel.label] : undefined].filter(Boolean).join(' · ') || rel.targetType,
    })),
    ...(relations.data?.indirect ?? []).map((rel) => ({ rel, label: rel.targetType as string })),
  ]
    .filter(({ rel }) => rel.target)
    .map(({ rel, label }) => ({
      id: rel.id,
      title: mediaTitle(rel.target),
      imageUrl: rel.target?.posterUrl,
      overlay: label,
      onPress: () => openMedia(rel.targetType === 'Manga' ? 'manga' : 'anime', rel.targetId),
    }));
  const community = followers.data;
  const friendEntries = community?.friendEntries ?? [];
  const statusRows = STATUS_ORDER.map((status) => ({ status, n: community?.statusCounts?.[status] ?? 0 })).filter((r) => r.n > 0);
  const statusSum = statusRows.reduce((n, r) => n + r.n, 0);
  const memberAvatars = [...friendEntries, ...(community?.recentFollowers ?? [])]
    .filter((e, i, all) => all.findIndex((x) => x.member.id === e.member.id) === i)
    .slice(0, 5);
  const links = (data.links ?? []).filter((link) => /^https?:\/\//.test(link.url));
  const trailer = data.trailers?.[0]?.url;
  const youtubeId = trailer?.match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/)?.[1];

  const tabs: { id: string; label: string; icon: LucideIcon; section?: string; path?: string }[] = [
    { id: 'general', label: 'Général', icon: LayoutList, section: 'top' },
    { id: 'staffs', label: 'Staff', icon: Users, section: 'staffs' },
    { id: 'personnages', label: 'Personnages', icon: Users, section: 'characters' },
    ...(anime ? [{ id: 'musiques', label: 'Musiques', icon: Music, section: 'tracks' }] : []),
    { id: 'discussion', label: 'Discussion', icon: MessagesSquare, path: `${sitePath}/discussion` },
    { id: 'activites', label: 'Activités', icon: Activity, path: `${sitePath}/activites` },
    { id: 'statistiques', label: 'Statistiques', icon: BarChart3, path: `${sitePath}/statistiques` },
    ...(anime ? [{ id: 'episodes', label: 'Épisodes', icon: PlayCircle, path: `${sitePath}/episodes` }] : []),
  ];
  const goTab = (tab: (typeof tabs)[number]) => {
    setTabsOpen(false);
    if (tab.path) openSite(tab.path);
    else scroll.current?.scrollTo({ y: tab.section === 'top' ? 0 : Math.max(0, (offsets.current[tab.section ?? ''] ?? 0) - 8), animated: true });
  };
  const at = (key: string) => (y: number) => {
    offsets.current[key] = y;
  };

  type IRow = { label: string; value: React.ReactNode };
  const infoRows = ([
    data.source && SOURCE_LABELS[data.source] ? { label: 'Source', value: SOURCE_LABELS[data.source]! } : null,
    data.country ? { label: 'Pays', value: COUNTRY_LABELS[data.country] ?? data.country } : null,
    seasonLabel(data.season) ? { label: 'Saison', value: seasonLabel(data.season)! } : null,
    data.date?.start
      ? {
          label: 'Date de début',
          value: `${formatReleaseDate(data.date.start, data.date.startPrecision)?.replace(/^0/, '') ?? '-'}${start && start.getTime() > Date.now() ? ' · à venir' : ''}`,
        }
      : null,
    data.date?.end ? { label: 'Date de fin', value: formatLongDate(data.date.end) ?? '-' } : null,
    anime ? { label: 'Épisodes', value: data.episodesInfo?.total ? String(data.episodesInfo.total) : 'Inconnu' } : null,
    anime && airing && start ? { label: 'Diffusion', value: `le ${WEEKDAYS[start.getDay()]}` } : null,
    !anime && data.chaptersInfo?.total ? { label: 'Chapitres', value: `${data.chaptersInfo.airing ?? 0} / ${data.chaptersInfo.total}` } : null,
    !anime && data.volumesInfo?.total ? { label: 'Volumes', value: `${data.volumesInfo.airing ?? 0} / ${data.volumesInfo.total}` } : null,
    data.vf ? { label: 'VF', value: 'Oui' } : null,
    data.audience ? { label: 'Public', value: AUDIENCE_LABELS[data.audience] ?? data.audience } : null,
    demographics.length ? { label: 'Démographie', value: demographics.map((g) => <Pill key={g.id} label={g.name} {...PRIMARY_PILL} />) } : null,
    themes.length ? { label: 'Thèmes', value: themes.map((g) => <Pill key={g.id} label={g.name} {...PRIMARY_PILL} />) } : null,
  ] as (IRow | null)[]).filter((row): row is IRow => !!row);

  const carouselOf = (what: 'characters' | 'staffs' | 'tracks'): ICarouselItem[] => {
    const page = what === 'characters' ? characters.data : what === 'staffs' ? staffs.data : tracks.data;
    return (page?.results ?? [])
      .filter((rel) => rel.data)
      .map((rel) => ({
        id: rel.id ?? rel.data!.id,
        title: rel.data!.name?.original ?? '',
        imageUrl: rel.data!.avatarUrl ?? rel.data!.coverUrl,
        subtitle:
          what === 'characters'
            ? ROLE_LABELS[rel.role ?? ''] ?? rel.role
            : what === 'staffs'
              ? rel.job !== undefined
                ? nameOf(rel.job)
                : undefined
              : TRACK_LABELS[rel.type ?? rel.data!.type ?? ''] ?? rel.data!.type,
        onPress: () => openEntity(what === 'characters' ? 'character' : what === 'staffs' ? 'person' : 'track', rel.data!.id),
      }));
  };
  const characterItems = carouselOf('characters');
  const staffItems = carouselOf('staffs');
  const trackItems = anime ? carouselOf('tracks') : [];

  return (
    <Screen edges={[]}>
      <ScrollView
        ref={scroll}
        contentContainerStyle={styles.content}
        scrollEventThrottle={32}
        onScroll={(e) => {
          const past = e.nativeEvent.contentOffset.y > 8;
          setScrolled((was) => (was === past ? was : past));
        }}
      >
        {/* En-tête immersif : bannière en fond, dégradé vers le fond de page, affiche centrée. */}
        <View style={styles.hero}>
          {data.bannerUrl ? <Image source={{ uri: data.bannerUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          <Svg style={StyleSheet.absoluteFill} preserveAspectRatio="none" viewBox="0 0 1 1">
            <Defs>
              <LinearGradient id="hero" x1="0" y1="1" x2="0" y2="0">
                <Stop offset="0.08" stopColor={Tw.color.background} stopOpacity={1} />
                <Stop offset="0.45" stopColor={Tw.color.background} stopOpacity={0.75} />
                <Stop offset="1" stopColor={Tw.color.background} stopOpacity={0.1} />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width="1" height="1" fill="url(#hero)" />
          </Svg>
          <View style={[styles.heroBack, { top: insets.top + 8 }]}>{back}</View>
          <View style={[styles.heroBody, { paddingTop: insets.top + 64 }]}>
            <View style={styles.poster}>
              {data.posterUrl ? (
                <Image source={{ uri: data.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
              ) : anime ? (
                <Tv size={48} color={Tw.color.mutedForeground} />
              ) : (
                <BookOpen size={48} color={Tw.color.mutedForeground} />
              )}
            </View>
            {sagaItems.length > 0 ? (
              <View style={styles.saga}>
                <CardCarousel items={sagaItems} kind={kind} width={112} />
              </View>
            ) : null}
            <View style={styles.titleBlock}>
              <View>
                <Txt size="xl" weight="bold" leading={1.25} numberOfLines={3}>
                  {data.title?.original}
                </Txt>
                {data.title?.alias?.length ? (
                  <Txt size="sm" color={Tw.color.mutedForeground} numberOfLines={2} style={styles.alias}>
                    {data.title.alias.join(' / ')}
                  </Txt>
                ) : null}
              </View>
              <View style={styles.pills}>
                {data.status && MEDIA_STATUS_LABELS[data.status] ? <Pill icon={Play} label={MEDIA_STATUS_LABELS[data.status]!} {...statusPill} /> : null}
                {formatLabel ? <Pill icon={anime ? Tv : BookOpen} label={formatLabel} /> : null}
                {data.communityScore?.count ? (
                  data.communityScore.average !== undefined ? (
                    <Pill
                      icon={Star}
                      iconColor={Tw.color.amber400}
                      iconFill={Tw.color.amber400}
                      label={
                        <Txt size="xs" weight="medium">
                          {data.communityScore.average.toFixed(1).replace('.', ',')}{' '}
                          <Txt size="xs" weight="medium" color={Tw.color.mutedForeground}>
                            · {data.communityScore.count} notes
                          </Txt>
                        </Txt>
                      }
                    />
                  ) : (
                    <Pill icon={Star} iconColor={Tw.color.mutedForeground} label={`Pas encore assez de notes (${data.communityScore.count}/3)`} />
                  )
                ) : null}
                {anime && data.episodesInfo?.total ? <Pill icon={Play} color={Tw.color.mutedForeground} label={`${data.episodesInfo.total} épisodes`} /> : null}
                {!anime && data.chaptersInfo?.total ? <Pill icon={BookOpen} color={Tw.color.mutedForeground} label={`${data.chaptersInfo.total} chapitres`} /> : null}
                {anime && data.episodesInfo?.durationMinutes ? <Pill icon={Clock} color={Tw.color.mutedForeground} label={`${data.episodesInfo.durationMinutes} min`} /> : null}
                {broadcastLabel ? (
                  <Pill icon={Calendar} label={broadcastLabel} color={Tw.color.purple400} background={alpha(Tw.color.purple500, 0.15)} border={alpha(Tw.color.purple500, 0.3)} />
                ) : null}
                {genres.map((g) => (
                  <Pill key={g.id} label={g.name} {...PRIMARY_PILL} />
                ))}
              </View>
              {community && community.count > 0 ? (
                <Pressable onPress={() => goTab({ id: 'community', label: '', icon: Users, section: 'community' })} style={styles.socialPill}>
                  <View style={styles.socialAvatars}>
                    {memberAvatars.map((e, i) => (
                      <View key={e.member.id} style={[styles.avatarRing, i > 0 && { marginLeft: -8 }]}>
                        <MemberAvatar member={e.member} size={28} />
                      </View>
                    ))}
                  </View>
                  <Txt size="sm" color={alpha(Tw.color.foreground, 0.9)}>
                    <Txt size="sm" weight="semibold">
                      {community.count > 1 ? `${community.count} membres suivent` : '1 membre suit'}
                    </Txt>
                    {community.friendsCount > 0 ? (
                      <Txt size="sm" weight="medium" color={Tw.color.primary}>
                        {' '}· {community.friendsCount} {community.friendsCount > 1 ? 'amis' : 'ami'}
                      </Txt>
                    ) : null}
                  </Txt>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {isIncomplete(data) ? (
          <View style={styles.warning}>
            <View style={styles.warningText}>
              <CircleAlert size={20} color={Tw.color.amber500} />
              <Txt size="sm" weight="medium" color={Tw.color.amber500} style={styles.flex}>
                Les informations de cette page sont incompletes.
              </Txt>
            </View>
            <Pressable onPress={() => openSite(`/contribute/${kind}/new?editId=${id}`)} style={styles.warningButton}>
              <Txt size="xs" weight="medium" color="#000">
                Completer
              </Txt>
            </Pressable>
          </View>
        ) : null}

        {/* Barre d'actions (`MediaActionBar`, téléphone). */}
        <View style={styles.actionBar}>
          <ListEntrySheetTrigger entry={entry} loading={mine.isPending} onPress={() => setManageOpen(true)} />
          <Pressable accessibilityRole="button" onPress={() => setTabsOpen(true)} style={styles.tabButton}>
            <LayoutList size={16} color={Tw.color.foreground} />
            <Txt size="sm">Général</Txt>
            <ChevronDown size={14} color={alpha(Tw.color.foreground, 0.6)} style={styles.tabChevron} />
          </Pressable>
          <View style={styles.icons}>
            <IconButton icon={Pencil} label="Modifier" onPress={() => openSite(`/contribute/${kind}/new?editId=${id}`)} />
            <IconButton icon={Share2} label="Partager" onPress={() => Share.share({ message: `${mediaTitle(data)} — ${WEB_URL}${sitePath}` }).catch(() => undefined)} />
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: !!favorite.data }}
              onPress={() => toggleFavorite.mutate()}
              style={styles.favorite}
            >
              <Heart size={16} color={favorite.data ? Tw.color.rose400 : Tw.color.foreground} fill={favorite.data ? Tw.color.rose400 : 'transparent'} />
              <Txt size="sm" weight="medium">
                Favori
              </Txt>
            </Pressable>
            <View style={styles.iconSeparator}>
              <IconButton icon={TriangleAlert} label="Signaler" onPress={() => openSite(sitePath)} />
            </View>
          </View>
        </View>

        <View style={styles.sections}>
          {data.synopsis ? (
            <SectionCard title="Synopsis" icon={BookOpen}>
              <Txt size="base" color={Tw.color.mutedForeground} leading={1.625}>
                {data.synopsis}
              </Txt>
            </SectionCard>
          ) : null}

          <SectionCard title="Informations" icon={Info}>
            {infoRows.map((row, index) => (
              <InfoRow key={row.label} label={row.label} value={row.value} first={index === 0} />
            ))}
          </SectionCard>

          {links.length > 0 ? (
            <SectionCard title="Liens externes">
              <View style={styles.wrap}>
                {links.map((link) => (
                  <Pressable key={link.url} onPress={() => openInReader(link.url)} style={styles.linkPill}>
                    <Txt size="xs" weight="medium">
                      {linkLabel(link)}
                    </Txt>
                    <ExternalLink size={12} color={Tw.color.foreground} />
                  </Pressable>
                ))}
                <Pressable onPress={() => router.navigate('/reading')} style={styles.linkPill}>
                  <Txt size="xs" weight="medium">
                    Navigateur de lecture
                  </Txt>
                  <BookOpen size={12} color={Tw.color.foreground} />
                </Pressable>
              </View>
            </SectionCard>
          ) : null}

          {(companies.data?.results ?? []).some((c) => c.data) ? (
            <SectionCard title={anime ? 'Studios & Producteurs' : 'Éditeurs & Producteurs'} icon={Building2}>
              <View style={styles.stack}>
                {companies.data!.results.filter((c) => c.data).map((c) => (
                  <Pressable key={c.id ?? c.data!.id} onPress={() => openEntity('company', c.data!.id)} style={styles.company}>
                    <View style={styles.companyLogo}>
                      {c.data!.logoUrl ? (
                        <Image source={{ uri: c.data!.logoUrl }} style={StyleSheet.absoluteFill} contentFit="contain" />
                      ) : (
                        <Building2 size={20} color={Tw.color.mutedForeground} />
                      )}
                    </View>
                    <Txt size="sm" weight="medium" numberOfLines={1} style={styles.flex}>
                      {c.data!.name?.original}
                    </Txt>
                    {c.data!.type ? (
                      <View style={styles.companyType}>
                        <Txt size="xs" weight="medium" color={Tw.color.primaryForeground}>
                          {COMPANY_LABELS[c.data!.type] ?? c.data!.type}
                        </Txt>
                      </View>
                    ) : null}
                  </Pressable>
                ))}
              </View>
            </SectionCard>
          ) : null}

          <SectionCard title="Tags">
            {tags.length ? (
              <View style={styles.wrap}>
                {tags.map((t) => (
                  <Pill key={t.id} label={t.name} />
                ))}
              </View>
            ) : (
              <Txt size="sm" color={Tw.color.mutedForeground} style={styles.italic}>
                Aucun tag.
              </Txt>
            )}
          </SectionCard>

          {trailer ? (
            <SectionCard title="Bande-annonce">
              <Pressable onPress={() => WebBrowser.openBrowserAsync(trailer).catch(() => undefined)} style={styles.trailer}>
                {youtubeId ? <Image source={{ uri: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                <View style={styles.play}>
                  <Play size={28} color="#fff" fill="#fff" />
                </View>
              </Pressable>
            </SectionCard>
          ) : null}

          <SectionCard title="Tes amis" icon={Users} count={community?.friendsCount || undefined}>
            {friendEntries.length === 0 ? (
              <View style={styles.inline}>
                <UserPlus size={16} color={Tw.color.mutedForeground} />
                <Txt size="sm" color={Tw.color.mutedForeground} style={styles.flex}>
                  Aucun de tes amis ne suit encore cette œuvre.
                </Txt>
              </View>
            ) : (
              friendEntries.slice(0, 6).map((e) => (
                <View key={e.member.id} style={styles.friendRow}>
                  <MemberAvatar member={e.member} size={32} />
                  <Txt size="sm" style={styles.flex} numberOfLines={1}>
                    {e.member.displayName ?? e.member.username}
                  </Txt>
                  <View style={[styles.statusPill, { backgroundColor: LIST_STATUS_BAR[e.status] }]}>
                    <Txt size="11" color="#fff">
                      {STATUS_LABELS[e.status]}
                    </Txt>
                  </View>
                </View>
              ))
            )}
          </SectionCard>

          <View onLayout={(e) => at('community')(e.nativeEvent.layout.y)}>
            <SectionCard title="Communauté" icon={Users} count={community?.count || undefined}>
              {!community || community.count === 0 ? (
                <Txt size="sm" color={Tw.color.mutedForeground}>
                  Personne n'a encore ajouté cette œuvre à sa liste publique.
                </Txt>
              ) : (
                <View style={styles.communityBody}>
                  {statusSum > 0 ? (
                    <View style={styles.stackSmall}>
                      <View style={styles.bar}>
                        {statusRows.map((r) => (
                          <View key={r.status} style={{ width: `${(r.n / statusSum) * 100}%`, backgroundColor: LIST_STATUS_BAR[r.status] }} />
                        ))}
                      </View>
                      <View style={styles.legend}>
                        {statusRows.map((r) => (
                          <View key={r.status} style={styles.inline}>
                            <View style={[styles.dot, { backgroundColor: LIST_STATUS_BAR[r.status] }]} />
                            <Txt size="xs" color={Tw.color.mutedForeground}>
                              <Txt size="xs" weight="semibold">
                                {r.n}
                              </Txt>{' '}
                              {STATUS_LABELS[r.status].toLowerCase()}
                            </Txt>
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : null}
                  {community.recentFollowers?.length ? (
                    <View style={styles.stackSmall}>
                      <Txt size="xs" weight="medium" color={Tw.color.mutedForeground}>
                        Derniers à l'avoir ajoutée
                      </Txt>
                      <View style={styles.wrap}>
                        {community.recentFollowers.map((e) => (
                          <Pressable key={e.member.id} onPress={() => openSite(`/membres/${e.member.username}`)}>
                            <MemberAvatar member={e.member} size={36} />
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ) : null}
                </View>
              )}
            </SectionCard>
          </View>

          <SectionCard title="Activités récentes" icon={Activity} action={{ label: 'Tout voir', onPress: () => openSite(`${sitePath}/activites`) }}>
            <Txt size="sm" color={Tw.color.mutedForeground}>
              Le fil d'activité de l'œuvre s'ouvre sur le site.
            </Txt>
          </SectionCard>
          <SectionCard title="Discussion" icon={MessagesSquare} action={{ label: 'Ouvrir', onPress: () => openSite(`${sitePath}/discussion`) }}>
            <Txt size="sm" color={Tw.color.mutedForeground}>
              La discussion de l'œuvre s'ouvre sur le site.
            </Txt>
          </SectionCard>

          {(news.data ?? []).length > 0 ? (
            <SectionCard title="Actualités" icon={Newspaper}>
              <NewsList articles={news.data!} onOpen={(url) => void WebBrowser.openBrowserAsync(url).catch(() => undefined)} />
            </SectionCard>
          ) : null}

          {characterItems.length > 0 ? (
            <SectionCard
              title="Personnages"
              icon={Users}
              count={characters.data?.total}
              action={(characters.data?.total ?? 0) > characterItems.length ? { label: 'Voir tout', onPress: () => openMediaRelations(kind, id, 'characters') } : undefined}
              onLayout={at('characters')}
            >
              <CardCarousel items={characterItems} placeholder={User} square />
            </SectionCard>
          ) : null}
          {staffItems.length > 0 ? (
            <SectionCard
              title="Staff"
              icon={Users}
              count={staffs.data?.total}
              action={(staffs.data?.total ?? 0) > staffItems.length ? { label: 'Voir tout', onPress: () => openMediaRelations(kind, id, 'staffs') } : undefined}
              onLayout={at('staffs')}
            >
              <CardCarousel items={staffItems} placeholder={User} square />
            </SectionCard>
          ) : null}
          {anime ? (
            trackItems.length > 0 ? (
              <SectionCard
                title="Musiques"
                icon={Music}
                count={tracks.data?.total}
                action={(tracks.data?.total ?? 0) > trackItems.length ? { label: 'Voir tout', onPress: () => openMediaRelations(kind, id, 'tracks') } : undefined}
                onLayout={at('tracks')}
              >
                <CardCarousel items={trackItems} placeholder={Music} square />
              </SectionCard>
            ) : (
              <View style={styles.emptyTracks} onLayout={(e) => at('tracks')(e.nativeEvent.layout.y)}>
                <Txt size="sm" color={Tw.color.mutedForeground} style={styles.flex}>
                  Cette fiche n'a pas encore de musiques.
                </Txt>
                <Pressable onPress={() => openSite(`/contribute/${kind}/new?editId=${id}`)} style={styles.inline}>
                  <Pencil size={16} color={Tw.color.primary} />
                  <Txt size="sm" weight="medium" color={Tw.color.primary}>
                    Compléter
                  </Txt>
                </Pressable>
              </View>
            )
          ) : null}
        </View>
      </ScrollView>
      {scrolled ? (
        <View pointerEvents="none" style={[styles.statusVeil, { height: insets.top }]} />
      ) : null}
      <MobileNav />

      <ManageEntry kind={kind} media={data} entry={entry} open={manageOpen} onClose={() => setManageOpen(false)} genres={genres.map((g) => g.name)} hideViewEntity />

      <BottomSheet open={tabsOpen} onClose={() => setTabsOpen(false)} title="Navigation">
        <View style={styles.tabList}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.id === 'general';
            return (
              <Pressable key={tab.id} onPress={() => goTab(tab)} style={[styles.tabItem, active && { backgroundColor: Tw.color.muted }]}>
                <Icon size={20} color={active ? Tw.color.foreground : Tw.color.mutedForeground} />
                <Txt size="sm" weight="medium" color={active ? Tw.color.foreground : Tw.color.mutedForeground} style={styles.flex}>
                  {tab.label}
                </Txt>
                {tab.path ? <ExternalLink size={14} color={Tw.color.mutedForeground} /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </Screen>
  );
}

function IconButton({ icon: Icon, label, onPress }: Readonly<{ icon: LucideIcon; label: string; onPress: () => void }>) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.iconButton}>
      <Icon size={16} color={Tw.color.foreground} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  italic: { fontStyle: 'italic' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stack: { gap: 8 },
  stackSmall: { gap: 8 },
  content: { paddingBottom: 24 },
  topBack: { padding: 12, paddingTop: 48 },
  statusVeil: { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: alpha(Tw.color.background, 0.9) },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 14, borderRadius: Tw.radius.md, backgroundColor: Tw.color.muted },
  hero: { overflow: 'hidden', backgroundColor: Tw.color.muted, borderTopLeftRadius: Tw.radius.lg, borderTopRightRadius: Tw.radius.lg },
  heroBack: { position: 'absolute', top: 44, left: 12, zIndex: 2 },
  heroBody: { paddingHorizontal: ScreenGutter, paddingTop: 96, paddingBottom: 12, gap: 16 },
  poster: {
    alignSelf: 'center',
    width: 208,
    aspectRatio: 2 / 3,
    borderRadius: Tw.radius.lg,
    overflow: 'hidden',
    backgroundColor: Tw.color.muted,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 12,
  },
  saga: { marginHorizontal: -16, paddingLeft: 16 },
  titleBlock: { gap: 12 },
  alias: { marginTop: 4 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  socialPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: alpha(Tw.color.primary, 0.2),
    backgroundColor: alpha(Tw.color.primary, 0.1),
    paddingVertical: 4,
    paddingLeft: 6,
    paddingRight: 14,
  },
  socialAvatars: { flexDirection: 'row' },
  avatarRing: { borderRadius: 999, borderWidth: 2, borderColor: Tw.color.background },
  avatar: { backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  warning: {
    marginTop: 16,
    marginHorizontal: ScreenGutter,
    gap: 12,
    borderRadius: Tw.radius.lg,
    borderWidth: 1,
    borderColor: alpha(Tw.color.amber500, 0.4),
    backgroundColor: alpha(Tw.color.amber500, 0.1),
    padding: 12,
  },
  warningText: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  warningButton: { minHeight: 44, justifyContent: 'center', borderRadius: Tw.radius.md, backgroundColor: Tw.color.amber500, paddingHorizontal: 12 },
  actionBar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: ScreenGutter, borderTopWidth: 1, borderBottomWidth: 1, borderColor: alpha(Tw.color.foreground, 0.05), marginTop: 8 },
  tabButton: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 12, borderRadius: Tw.radius.lg, backgroundColor: Tw.color.card },
  tabChevron: { marginLeft: 'auto' },
  icons: { flexDirection: 'row', alignItems: 'center', gap: 2, marginLeft: 'auto' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: Tw.radius.lg },
  favorite: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44, paddingHorizontal: 10, borderRadius: Tw.radius.lg },
  iconSeparator: { marginLeft: 8, paddingLeft: 8, borderLeftWidth: 1, borderColor: Tw.color.border },
  sections: { gap: 16, paddingTop: 20, paddingHorizontal: ScreenGutter },
  linkPill: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: Tw.color.border },
  company: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: Tw.radius.md, backgroundColor: Tw.color.card },
  companyLogo: { width: 32, height: 32, borderRadius: Tw.radius.md, backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  companyType: { borderRadius: 999, backgroundColor: Tw.color.primary, paddingHorizontal: 8, paddingVertical: 2 },
  trailer: { width: '100%', aspectRatio: 16 / 9, borderRadius: Tw.radius.lg, overflow: 'hidden', backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center' },
  play: { width: 64, height: 44, borderRadius: 12, backgroundColor: 'rgba(255, 0, 0, 0.85)', alignItems: 'center', justifyContent: 'center' },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  communityBody: { gap: 16 },
  bar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: Tw.color.muted },
  legend: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  emptyTracks: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Tw.radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: Tw.color.border, padding: 12 },
  tabList: { paddingHorizontal: 16, paddingBottom: 24, gap: 4 },
  tabItem: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: Tw.radius.lg, paddingHorizontal: 16, paddingVertical: 14 },
});
