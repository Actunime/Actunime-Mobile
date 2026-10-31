import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ArrowLeft, BarChart3, BookOpen, Heart, Lock, Tv, UserX, Users, type LucideIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { MediaDetailedCard } from '@/components/cards/media-cards';
import { openEntity } from '@/components/entity/open-entity';
import { ListStatusStrip } from '@/components/list/list-controls';
import { CardCarousel, InfoRow, PRIMARY_PILL, Pill, SectionCard, type ICarouselItem } from '@/components/media/detail-parts';
import { openMedia } from '@/components/media-row';
import { Screen } from '@/components/screen';
import { EmptyState, ErrorState, Loading } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { ScreenGutter, Tw, alpha } from '@/constants/theme';
import { mediaId, type FavoriteType, type IFavorite, type IListEntry, type IListStats, type IMedia, type IMemberProfile, type MediaKind } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import type { ListStatusFilter } from '@/lib/list-filter';
import { ANIME_STATUSES, MANGA_STATUSES, STATUS_LABELS } from '@/lib/list-form';
import {
  FAVORITE_FILTERS,
  MEMBER_TAB_LABELS,
  favoriteTarget,
  memberSince,
  statusCounts,
  visibleTabs,
  type IFavoriteTarget,
  type MemberTab,
} from '@/lib/member';
import { progressLabel } from '@/lib/media';
import { useMemberFavorites, useMemberList, useMemberProfile, useMemberStats } from '@/lib/queries';

const TAB_ICONS: Record<MemberTab, LucideIcon> = { profil: Users, animes: Tv, mangas: BookOpen, favoris: Heart, stats: BarChart3 };

const mediaOf = (entry: IListEntry): IMedia | null => (entry.media ? entry.media : null);

function Avatar({ member, size }: Readonly<{ member: IMemberProfile; size: number }>) {
  const initial = (member.displayName ?? member.username).slice(0, 1).toUpperCase();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: Tw.radius.lg }]}>
      {member.avatarUrl ? (
        <Image source={{ uri: member.avatarUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
      ) : (
        <Txt size="xl" weight="bold" color={Tw.color.mutedForeground}>
          {initial}
        </Txt>
      )}
    </View>
  );
}

function Counter({ value, label }: Readonly<{ value?: number; label: string }>) {
  return (
    <View style={styles.counter}>
      <Txt size="lg" weight="bold">
        {value ?? 0}
      </Txt>
      <Txt size="xs" color={Tw.color.mutedForeground}>
        {label}
      </Txt>
    </View>
  );
}

function Header({ member }: Readonly<{ member: IMemberProfile }>) {
  const since = memberSince(member.createdAt);
  const badges = (member.badges ?? []).filter((entry) => entry.badge?.label);
  return (
    <View style={styles.identity}>
      <View style={styles.identityRow}>
        <Avatar member={member} size={72} />
        <View style={styles.identityText}>
          <Txt size="xl" weight="bold" numberOfLines={2}>
            {member.displayName ?? member.username}
          </Txt>
          <Txt size="sm" color={Tw.color.mutedForeground}>
            @{member.username}
          </Txt>
          {since ? (
            <Txt size="xs" color={Tw.color.mutedForeground}>
              Membre depuis {since}
            </Txt>
          ) : null}
        </View>
      </View>
      <View style={styles.counters}>
        <Counter value={member.friendsCount} label="amis" />
        <Counter value={member.followersCount} label="abonnés" />
        <Counter value={member.followingCount} label="abonnements" />
      </View>
      {badges.length > 0 ? (
        <View style={styles.badges}>
          {badges.map((entry) => {
            const color = entry.badge?.color ?? Tw.color.primary;
            return <Pill key={entry.id ?? entry.badge?.id} label={entry.badge!.label} color={color} background={alpha(color, 0.12)} border={alpha(color, 0.35)} />;
          })}
        </View>
      ) : null}
    </View>
  );
}

function Tabs({ tabs, active, onChange }: Readonly<{ tabs: MemberTab[]; active: MemberTab; onChange: (tab: MemberTab) => void }>) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} accessibilityRole="tablist">
      {tabs.map((tab) => {
        const Icon = TAB_ICONS[tab];
        const selected = tab === active;
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab)}
            style={[styles.tab, selected && styles.tabSelected]}
          >
            <Icon size={16} color={selected ? Tw.color.primaryForeground : Tw.color.mutedForeground} />
            <Txt size="sm" weight="medium" color={selected ? Tw.color.primaryForeground : Tw.color.mutedForeground}>
              {MEMBER_TAB_LABELS[tab]}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const openTarget = (target: IFavoriteTarget) =>
  target.kind === 'anime' || target.kind === 'manga' ? openMedia(target.kind, target.id) : openEntity(target.kind, target.id);

function FavoriteRow({ target }: Readonly<{ target: IFavoriteTarget }>) {
  return (
    <Pressable accessibilityRole="button" onPress={() => openTarget(target)} style={styles.favRow}>
      <View style={styles.favThumb}>
        {target.imageUrl ? <Image source={{ uri: target.imageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={120} /> : <Heart size={20} color={Tw.color.mutedForeground} />}
      </View>
      <View style={styles.flex}>
        <Txt size="sm" weight="semibold" numberOfLines={2}>
          {target.title}
        </Txt>
      </View>
    </Pressable>
  );
}

/** Ce que le membre en a fait : statut, progression et note. */
function EntryFooter({ entry }: Readonly<{ entry: IListEntry }>) {
  const parts = [STATUS_LABELS[entry.status], progressLabel(entry, entry.media), entry.score ? `Note ${entry.score}` : null].filter(Boolean);
  return (
    <Txt size="xs" weight="medium" color={Tw.color.mutedForeground}>
      {parts.join(' · ')}
    </Txt>
  );
}

const statRows = (label: string, stats?: IListStats) =>
  stats
    ? [
        { label: `${label} dans la liste`, value: String(stats.total) },
        { label: 'En cours', value: String(stats.watching) },
        { label: 'Terminés', value: String(stats.completed) },
        { label: 'En pause', value: String(stats.onHold) },
        { label: 'Abandonnés', value: String(stats.dropped) },
        { label: 'Planifiés', value: String(stats.planToWatch) },
        ...(stats.averageScore ? [{ label: 'Note moyenne', value: stats.averageScore.toFixed(1).replace('.', ',') }] : []),
      ]
    : [];

/**
 * Profil public d'un membre, transposé de `membres/$username` du site : identité, badges, puis sections Profil, Liste
 * Anime, Liste Manga, Favoris et Statistiques. Les listes et favoris suivent ce que le membre laisse voir.
 */
export function MemberScreen({ username }: Readonly<{ username: string }>) {
  const { auth } = useAuth();
  const profile = useMemberProfile(username);
  const [tab, setTab] = useState<MemberTab>('profil');
  const [status, setStatus] = useState<ListStatusFilter>('ALL');
  const [favoriteType, setFavoriteType] = useState<FavoriteType | 'ALL'>('ALL');

  const member = profile.data?.member;
  const visibility = profile.data?.visibility ?? { profileVisible: true, listsVisible: true, activityVisible: true };
  const isOwner = profile.data?.isOwnProfile ?? auth?.user.username === username;
  const tabs = visibleTabs(visibility, isOwner);
  const listsVisible = visibility.listsVisible || isOwner;
  const blocked = !visibility.profileVisible && !isOwner;

  const listKind: MediaKind = tab === 'mangas' ? 'manga' : 'anime';
  const listType = listKind === 'manga' ? 'Manga' : 'Anime';
  const listing = useMemberList(member?.id, listType, status === 'ALL' ? undefined : status, listsVisible && (tab === 'animes' || tab === 'mangas'));
  const favorites = useMemberFavorites(member?.id, favoriteType === 'ALL' ? undefined : favoriteType, listsVisible && tab === 'favoris');
  const stats = useMemberStats(username, tab === 'stats' || tab === 'profil' || tab === 'animes' || tab === 'mangas');
  const watching = useMemberList(member?.id, 'Anime', 'WATCHING', listsVisible && tab === 'profil');
  const previewFavorites = useMemberFavorites(member?.id, undefined, listsVisible && tab === 'profil');

  const entries = useMemo(() => (listing.data?.pages.flatMap((page) => page.results) ?? []).filter((entry) => mediaOf(entry)), [listing.data]);
  const favoriteTargets = useMemo(
    () => (favorites.data?.pages.flatMap((page) => page.results) ?? []).map(favoriteTarget).filter((target): target is IFavoriteTarget => target !== null),
    [favorites.data],
  );

  const back = (
    <Pressable accessibilityRole="button" onPress={() => (router.canGoBack() ? router.back() : router.navigate('/'))} style={styles.back}>
      <ArrowLeft size={16} color={Tw.color.foreground} />
      <Txt size="sm">Retour</Txt>
    </Pressable>
  );

  if (profile.isPending) {
    return (
      <Screen>
        <View style={styles.topBack}>{back}</View>
        <Loading />
      </Screen>
    );
  }
  if (profile.isError || !member) {
    return (
      <Screen>
        <View style={styles.topBack}>{back}</View>
        <View style={styles.missing}>
          <UserX size={48} color={Tw.color.mutedForeground} />
          <Txt size="lg" weight="bold">
            Membre introuvable
          </Txt>
          <Txt size="sm" color={Tw.color.mutedForeground} style={styles.centered}>
            L’utilisateur « {username} » n’existe pas ou a été supprimé.
          </Txt>
        </View>
      </Screen>
    );
  }

  const isList = tab === 'animes' || tab === 'mangas';
  const kindStats = listKind === 'manga' ? stats.data?.mangaListStats : stats.data?.animeListStats;

  const header = (
    <View>
      <View style={styles.topBack}>{back}</View>
      <Header member={member} />
      <Tabs tabs={tabs} active={tab} onChange={(next) => { setTab(next); setStatus('ALL'); }} />
      {isList ? (
        <View style={styles.strip}>
          <ListStatusStrip
            statuses={listKind === 'anime' ? ANIME_STATUSES : MANGA_STATUSES}
            counts={statusCounts(kindStats, listKind)}
            value={status}
            onChange={setStatus}
          />
        </View>
      ) : null}
      {tab === 'favoris' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {FAVORITE_FILTERS.map((filter) => {
            const selected = filter.id === favoriteType;
            return (
              <Pressable key={filter.id} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => setFavoriteType(filter.id)} style={[styles.tab, selected && styles.tabSelected]}>
                <Txt size="sm" weight="medium" color={selected ? Tw.color.primaryForeground : Tw.color.mutedForeground}>
                  {filter.label}
                </Txt>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      {tab === 'profil' ? (
        <View style={styles.sections}>
          {blocked ? (
            <SectionCard title="Profil privé" icon={Lock}>
              <Txt size="sm" color={Tw.color.mutedForeground}>
                Ce membre ne partage pas son profil.
              </Txt>
            </SectionCard>
          ) : (
            <>
              {member.description ? (
                <SectionCard title="À propos">
                  <Txt size="sm" color={Tw.color.mutedForeground}>
                    {member.description}
                  </Txt>
                </SectionCard>
              ) : null}
              {stats.data ? (
                <SectionCard title="Listes" icon={Tv}>
                  <InfoRow first label="Animes" value={`${stats.data.animeListStats.total}${stats.data.animeListStats.averageScore ? ` · note moyenne ${stats.data.animeListStats.averageScore.toFixed(1).replace('.', ',')}` : ''}`} />
                  <InfoRow label="Mangas" value={`${stats.data.mangaListStats.total}${stats.data.mangaListStats.averageScore ? ` · note moyenne ${stats.data.mangaListStats.averageScore.toFixed(1).replace('.', ',')}` : ''}`} />
                </SectionCard>
              ) : null}
              {listsVisible && (watching.data?.pages[0]?.results ?? []).some((entry) => mediaOf(entry)) ? (
                <SectionCard title="Regarde en ce moment" icon={Tv}>
                  <CardCarousel
                    items={(watching.data?.pages[0]?.results ?? [])
                      .filter((entry) => mediaOf(entry))
                      .slice(0, 10)
                      .map((entry): ICarouselItem => ({
                        id: entry.id ?? entry._id ?? mediaId(mediaOf(entry)!),
                        title: mediaOf(entry)?.title?.original ?? 'Sans titre',
                        imageUrl: mediaOf(entry)?.posterUrl,
                        subtitle: progressLabel(entry, mediaOf(entry)) ?? undefined,
                        onPress: () => openMedia('anime', mediaId(mediaOf(entry)!)),
                      }))}
                    width={112}
                  />
                </SectionCard>
              ) : null}
              {listsVisible && previewFavorites.data?.pages[0]?.results.some((fav) => favoriteTarget(fav)) ? (
                <SectionCard title="Favoris" icon={Heart} action={{ label: 'Voir tout', onPress: () => setTab('favoris') }}>
                  <CardCarousel
                    items={previewFavorites.data.pages[0].results
                      .map(favoriteTarget)
                      .filter((target): target is IFavoriteTarget => target !== null)
                      .slice(0, 10)
                      .map((target): ICarouselItem => ({ id: `${target.kind}:${target.id}`, title: target.title, imageUrl: target.imageUrl, onPress: () => openTarget(target) }))}
                    width={112}
                  />
                </SectionCard>
              ) : null}
            </>
          )}
        </View>
      ) : null}
      {tab === 'stats' ? (
        <View style={styles.sections}>
          {stats.isPending ? (
            <Loading />
          ) : stats.data ? (
            <>
              <SectionCard title="Membre" icon={Users}>
                <InfoRow first label="Membre depuis" value={memberSince(stats.data.memberSince) ?? 'Inconnu'} />
                <InfoRow label="Activités" value={String(stats.data.activityCount)} />
                <InfoRow label="Contributions" value={String(stats.data.proposalCount)} />
              </SectionCard>
              {listsVisible ? (
                <>
                  <SectionCard title="Animes" icon={Tv}>
                    {statRows('Animes', stats.data.animeListStats).map((row, index) => (
                      <InfoRow key={row.label} label={row.label} value={row.value} first={index === 0} />
                    ))}
                  </SectionCard>
                  <SectionCard title="Mangas" icon={BookOpen}>
                    {statRows('Mangas', stats.data.mangaListStats).map((row, index) => (
                      <InfoRow key={row.label} label={row.label} value={row.value} first={index === 0} />
                    ))}
                  </SectionCard>
                  <SectionCard title="Favoris" icon={Heart}>
                    <InfoRow first label="Total" value={String(stats.data.favoriteCount)} />
                    {Object.entries(stats.data.favoritesByType)
                      .filter(([, count]) => count > 0)
                      .map(([type, count]) => (
                        <InfoRow key={type} label={type} value={String(count)} />
                      ))}
                  </SectionCard>
                </>
              ) : null}
              <SectionCard title="Propositions" icon={BarChart3}>
                <InfoRow first label="Approuvées" value={String(stats.data.proposalsByStatus.approved)} />
                <InfoRow label="En attente" value={String(stats.data.proposalsByStatus.pending)} />
                <InfoRow label="Refusées" value={String(stats.data.proposalsByStatus.rejected)} />
                <InfoRow label="Correction demandée" value={String(stats.data.proposalsByStatus.correctionRequested)} />
              </SectionCard>
            </>
          ) : (
            <ErrorState error={stats.error} onRetry={() => void stats.refetch()} />
          )}
        </View>
      ) : null}
    </View>
  );

  const loadingMore = (isList && listing.isFetchingNextPage) || (tab === 'favoris' && favorites.isFetchingNextPage);

  return (
    <Screen>
      <FlatList<IListEntry | IFavoriteTarget>
        data={isList ? (entries as (IListEntry | IFavoriteTarget)[]) : tab === 'favoris' ? favoriteTargets : []}
        keyExtractor={(item, index) => ('kind' in item ? `${item.kind}:${item.id}` : (item.id ?? item._id ?? String(index)))}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        onEndReachedThreshold={0.6}
        onEndReached={() => {
          if (isList && listing.hasNextPage && !listing.isFetchingNextPage) void listing.fetchNextPage();
          if (tab === 'favoris' && favorites.hasNextPage && !favorites.isFetchingNextPage) void favorites.fetchNextPage();
        }}
        ListFooterComponent={loadingMore ? <ActivityIndicator color={Tw.color.primary} style={styles.footer} /> : null}
        ListEmptyComponent={
          isList && !listing.isPending ? (
            <EmptyState title="Aucune œuvre dans cette catégorie" />
          ) : tab === 'favoris' && !favorites.isPending ? (
            <EmptyState title="Aucun favori dans cette catégorie" />
          ) : isList || tab === 'favoris' ? (
            <Loading />
          ) : null
        }
        renderItem={({ item }) =>
          isList ? (
            <View style={styles.card}>
              <MediaDetailedCard
                kind={listKind}
                media={(item as IListEntry).media as IMedia}
                entry={item as IListEntry}
                onPress={() => openMedia(listKind, mediaId((item as IListEntry).media as IMedia))}
                genres={[]}
                footer={<EntryFooter entry={item as IListEntry} />}
              />
            </View>
          ) : (
            <View style={styles.card}>
              <FavoriteRow target={item as IFavoriteTarget} />
            </View>
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centered: { textAlign: 'center' },
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
  missing: { alignItems: 'center', gap: 12, padding: ScreenGutter, paddingTop: 48 },
  identity: { paddingHorizontal: ScreenGutter, gap: 16 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  identityText: { flex: 1, gap: 2 },
  avatar: { overflow: 'hidden', backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center' },
  counters: { flexDirection: 'row', gap: 24 },
  counter: { alignItems: 'flex-start' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tabs: { paddingHorizontal: ScreenGutter, paddingVertical: 12, gap: 8 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Tw.color.border,
    backgroundColor: Tw.color.card,
  },
  tabSelected: { backgroundColor: Tw.color.primary, borderColor: Tw.color.primary },
  strip: { paddingHorizontal: ScreenGutter },
  sections: { paddingHorizontal: ScreenGutter, gap: 16 },
  list: { paddingBottom: 120 },
  card: { paddingHorizontal: ScreenGutter, paddingTop: 12 },
  favRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64, padding: 8, borderRadius: Tw.radius.lg, backgroundColor: Tw.color.card },
  favThumb: { width: 48, height: 48, borderRadius: Tw.radius.md, overflow: 'hidden', backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center' },
  footer: { paddingVertical: 16 },
});
