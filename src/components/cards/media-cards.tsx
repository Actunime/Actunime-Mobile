import { Image } from 'expo-image';
import { ArrowRight, BookOpen, Calendar, Clock, Film, Layers, Pencil, Plus, Star, Tv } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Pressable } from '@/components/tap';
import { ListEntryBand } from '@/components/cards/list-entry-band';
import { Txt } from '@/components/tw';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Tw, alpha } from '@/constants/theme';
import type { IFriendEntry, IListEntry, IMedia, MediaKind } from '@/lib/api';
import { STATUS_LABELS } from '@/lib/list-form';
import { LIST_STATUS_BAR, MEDIA_STATUS_BG } from '@/lib/list-status';
import { MEDIA_STATUS_LABELS } from '@/lib/list-form';
import { SOURCE_LABELS, formatReleaseDate, mediaTitle, seasonLabel, totalOf } from '@/lib/media';
import type { IEntryPatch } from '@/lib/queries';
import { estimatedAired } from '@/lib/suivi';

/** Épisodes sortis (anime en diffusion), `undefined` quand rien n'est sorti ou pour un manga. */
export const airedFor = (kind: MediaKind, media?: IMedia | null): number | undefined => {
  if (kind !== 'anime' || !media) return undefined;
  const aired = estimatedAired(media);
  return aired > 0 ? aired : undefined;
};

/** Image d'une carte (`CardImage`) : affiche ou aplat `bg-muted` avec l'icône du type. */
export function CardImage({
  uri,
  kind,
  style,
  iconSize = 28,
  icon,
}: Readonly<{ uri?: string | null; kind: MediaKind; style?: StyleProp<ViewStyle>; iconSize?: number; icon?: typeof Tv }>) {
  const Icon = icon ?? (kind === 'manga' ? BookOpen : Tv);
  return (
    <View style={[styles.image, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} recyclingKey={uri} />
      ) : (
        <Icon size={iconSize} color={Tw.color.mutedForeground} />
      )}
    </View>
  );
}

/** Petit badge rectangulaire (`text-[10px] font-semibold px-1.5 py-0.5 rounded`). */
export function Badge({ label, background, color = '#ffffff', size = '10' }: Readonly<{ label: string; background: string; color?: string; size?: '10' | '11' }>) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <Txt size={size} weight="semibold" color={color} numberOfLines={1}>
        {label}
      </Txt>
    </View>
  );
}

const formatScore = (value: number) => value.toFixed(1).replace('.', ',');

/** Ligne de notes : communauté (« ★ 8,1 » ou « Pas encore assez de notes (2/3) ») et ma note avec l'écart. */
export function ScoreLine({ community, mine }: Readonly<{ community?: IListEntry['communityScore']; mine?: number | null }>) {
  const myScore = mine && mine > 0 ? mine : undefined;
  const average = community?.average;
  if (average === undefined && !myScore && !community?.count) return null;
  const gap = average !== undefined && myScore !== undefined ? Math.round((myScore - average) * 10) / 10 : undefined;
  return (
    <View style={styles.scoreLine}>
      {average !== undefined ? (
        <View style={styles.inline}>
          <Star size={12} color={Tw.color.amber400} fill={Tw.color.amber400} />
          <Txt size="xs" weight="medium" tabular color={alpha(Tw.color.foreground, 0.8)}>
            {formatScore(average)}
          </Txt>
        </View>
      ) : community?.count ? (
        <Txt size="xs" color={Tw.color.mutedForeground}>
          Pas encore assez de notes ({community.count}/3)
        </Txt>
      ) : null}
      {myScore !== undefined ? (
        <Txt size="xs" tabular color={Tw.color.mutedForeground}>
          Ma note{' '}
          <Txt size="xs" weight="semibold">
            {myScore}
          </Txt>
          {gap !== undefined && gap !== 0 ? (
            <Txt size="xs" weight="medium" color={gap > 0 ? Tw.color.emerald500 : Tw.color.amber500}>
              {' '}({gap > 0 ? '+' : '−'}
              {formatScore(Math.abs(gap))})
            </Txt>
          ) : null}
        </Txt>
      ) : null}
    </View>
  );
}

const nameOf = (friend: IFriendEntry) => friend.displayName || friend.username;

function FriendAvatar({ friend, size }: Readonly<{ friend: IFriendEntry; size: number }>) {
  return (
    <View style={[styles.avatarRing, { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2 }]}>
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        {friend.avatarUrl ? (
          <Image source={{ uri: friend.avatarUrl }} style={StyleSheet.absoluteFill} />
        ) : (
          <Txt size={size > 28 ? 'sm' : 'xs'} color={Tw.color.mutedForeground}>
            {nameOf(friend).charAt(0).toUpperCase()}
          </Txt>
        )}
      </View>
      <View style={[styles.avatarDot, { backgroundColor: LIST_STATUS_BAR[friend.status] }]} />
    </View>
  );
}

/**
 * Pastille d'amis d'une carte de ma liste (`FriendsPill`) : avatars et moyenne ; un appui ouvre, à la place du
 * menu du site, un tiroir avec le statut et la note de chacun comparés aux miens.
 */
export function FriendsPill({ entry, kind }: Readonly<{ entry: IListEntry; kind: MediaKind }>) {
  const [open, setOpen] = useState(false);
  const friends = entry.friends;
  if (!friends?.length) return null;
  const summary = entry.friendsSummary;
  const scores = friends.map((f) => f.score).filter((s): s is number => !!s);
  const total = Math.max(summary?.count ?? 0, friends.length);
  const average = summary ? summary.average : scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
  const completed = summary?.completed ?? friends.filter((f) => f.status === 'COMPLETED').length;
  const shown = friends.slice(0, 3);
  const extra = total - shown.length;
  const mine = entry.score && entry.score > 0 ? entry.score : undefined;

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Voir ce qu'ont mis les ${total} amis qui ont cette œuvre`}
        onPress={() => setOpen(true)}
        style={styles.friendsPill}
      >
        <View style={styles.avatars}>
          {shown.map((friend, index) => (
            <View key={friend.memberId} style={index > 0 && styles.avatarOverlap}>
              <FriendAvatar friend={friend} size={24} />
            </View>
          ))}
          {extra > 0 ? (
            <View style={[styles.avatarOverlap, styles.extra]}>
              <Txt size="10" weight="medium" color={Tw.color.mutedForeground}>
                +{extra}
              </Txt>
            </View>
          ) : null}
        </View>
        {average !== undefined ? (
          <View style={styles.inline}>
            <Star size={12} color={Tw.color.amber400} fill={Tw.color.amber400} />
            <Txt size="xs" weight="medium" tabular color={alpha(Tw.color.foreground, 0.8)}>
              {formatScore(average)}
            </Txt>
          </View>
        ) : null}
      </Pressable>
      <BottomSheet open={open} onClose={() => setOpen(false)}>
        <View style={styles.friendsSheet}>
          <Txt size="11" weight="medium" upper tracking={0.5} color={Tw.color.mutedForeground}>
            Amis · {total}
          </Txt>
          <View style={styles.meRow}>
            <View style={styles.meBadge}>
              <Txt size="10" weight="semibold" color={Tw.color.primaryForeground}>
                Moi
              </Txt>
            </View>
            <Txt size="sm" weight="medium" style={styles.flex}>
              Ma liste
            </Txt>
            <View style={[styles.statusPill, { backgroundColor: LIST_STATUS_BAR[entry.status] }]}>
              <Txt size="11" color="#fff">
                {STATUS_LABELS[entry.status]}
              </Txt>
            </View>
            <Txt size="sm" weight="semibold" tabular style={styles.friendScore}>
              {mine ? `★ ${mine}` : '–'}
            </Txt>
          </View>
          {friends.map((friend) => {
            const done = kind === 'anime' ? friend.episodesWatched : friend.chaptersRead;
            const progress =
              friend.status === 'COMPLETED' || friend.status.startsWith('PLAN') || !done ? null : `${kind === 'anime' ? 'Ép.' : 'Ch.'} ${done}`;
            return (
              <View key={friend.memberId} style={styles.friendRow}>
                <FriendAvatar friend={friend} size={32} />
                <View style={styles.flex}>
                  <Txt size="sm" numberOfLines={1}>
                    {nameOf(friend)}
                  </Txt>
                  {progress ? (
                    <Txt size="xs" tabular color={Tw.color.mutedForeground}>
                      {progress}
                    </Txt>
                  ) : null}
                </View>
                <View style={[styles.statusPill, { backgroundColor: LIST_STATUS_BAR[friend.status] }]}>
                  <Txt size="11" color="#fff">
                    {STATUS_LABELS[friend.status]}
                  </Txt>
                </View>
                <View style={styles.friendScoreCol}>
                  <Txt size="sm" weight="semibold" tabular>
                    {friend.score ? `★ ${friend.score}` : '–'}
                  </Txt>
                  {!friend.score ? (
                    <Txt size="xs" color={Tw.color.mutedForeground}>
                      pas noté
                    </Txt>
                  ) : mine ? (
                    friend.score === mine ? (
                      <Txt size="xs" color={Tw.color.emerald500}>
                        même note
                      </Txt>
                    ) : (
                      <Txt size="xs" tabular color={Tw.color.mutedForeground}>
                        {friend.score - mine > 0 ? '+' : '−'}
                        {Math.abs(friend.score - mine)} pt
                      </Txt>
                    )
                  ) : null}
                </View>
              </View>
            );
          })}
          <View style={styles.friendsFooter}>
            <Txt size="xs" color={Tw.color.mutedForeground}>
              Moyenne des amis{' '}
              <Txt size="xs" weight="semibold">
                {average !== undefined ? `★ ${formatScore(average)}` : '–'}
              </Txt>
            </Txt>
            <Txt size="xs" color={Tw.color.mutedForeground}>
              {completed} terminé{completed > 1 ? 's' : ''}
            </Txt>
          </View>
        </View>
      </BottomSheet>
    </>
  );
}

interface ICardBaseProps {
  kind: MediaKind;
  media: IMedia;
  /** Mon entrée pour cette œuvre, s'il y en a une. */
  entry?: IListEntry | null;
  onPress?: () => void;
}

/**
 * Carte en grille (`AnimeCard` / `MangaCard` par défaut) : affiche 3:4, badge de diffusion à gauche, progression
 * « 3/5 eps » à droite, titre dessous.
 */
export function MediaGridCard({ kind, media, entry, onPress, dense }: Readonly<ICardBaseProps & { dense?: boolean }>) {
  const aired = airedFor(kind, media);
  const status = media.status;
  const progress = kind === 'anime' ? entry?.episodesWatched : entry?.chaptersRead;
  const progressLabel =
    progress != null
      ? `${progress}${kind === 'anime' && aired != null ? `/${aired}` : ''} ${kind === 'anime' ? 'eps' : 'ch.'}`
      : kind === 'anime' && aired != null
        ? `${aired} eps`
        : null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={mediaTitle(media)} onPress={onPress} style={({ pressed }) => [styles.gridCard, pressed && styles.pressed]}>
      <View>
        <CardImage uri={media.posterUrl} kind={kind} style={styles.gridImage} />
        <View style={[styles.badgeZone, styles.badgeLeft]}>
          {status && MEDIA_STATUS_LABELS[status] ? <Badge label={MEDIA_STATUS_LABELS[status]} background={MEDIA_STATUS_BG[status] ?? Tw.color.gray600} /> : null}
        </View>
        <View style={[styles.badgeZone, styles.badgeRight]}>
          {progressLabel ? <Badge label={progressLabel} background={alpha(Tw.color.primary, 0.9)} color={Tw.color.primaryForeground} /> : null}
        </View>
      </View>
      <View style={dense ? styles.gridBodyDense : styles.gridBody}>
        <Txt size={dense ? 'xs' : 'sm'} weight="semibold" numberOfLines={2}>
          {mediaTitle(media)}
        </Txt>
      </View>
    </Pressable>
  );
}

/** Ligne compacte (`AnimeCard.Inline`) : vignette, titre, statut de diffusion, bouton d'action. */
export function MediaRowCard({
  kind,
  media,
  entry,
  onPress,
  action,
}: Readonly<ICardBaseProps & { action?: React.ReactNode }>) {
  const aired = airedFor(kind, media);
  const progress = kind === 'anime' ? entry?.episodesWatched : entry?.chaptersRead;
  const corner = progress != null ? `${progress}${kind === 'anime' && aired != null ? `/${aired}` : ''}` : kind === 'anime' && aired != null ? String(aired) : null;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={mediaTitle(media)} onPress={onPress} style={({ pressed }) => [styles.rowCard, pressed && styles.pressed]}>
      <View>
        <CardImage uri={media.posterUrl} kind={kind} style={styles.rowImage} iconSize={18} />
        {corner ? (
          <View style={styles.rowCorner}>
            <Txt size="10" color={Tw.color.primaryForeground}>
              {corner}
            </Txt>
          </View>
        ) : null}
      </View>
      <View style={styles.flex}>
        <Txt size="sm" weight="semibold" numberOfLines={2}>
          {mediaTitle(media)}
        </Txt>
      </View>
      {media.status && MEDIA_STATUS_LABELS[media.status] ? (
        <Badge label={MEDIA_STATUS_LABELS[media.status]} background={MEDIA_STATUS_BG[media.status] ?? Tw.color.gray600} />
      ) : null}
      {action}
    </Pressable>
  );
}

/** Bouton d'action d'une carte (`CardActions`, taille `sm`) : « Gérer dans ma liste » ou « Ajouter à ma liste ». */
export function CardActionButton({
  icon,
  label,
  onPress,
  variant = 'default',
}: Readonly<{ icon: 'edit' | 'add'; label: string; onPress: () => void; variant?: 'default' | 'secondary' }>) {
  const Icon = icon === 'edit' ? Pencil : Plus;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={[variant === 'secondary' ? styles.actionSecondary : styles.actionDefault]}
    >
      <Icon size={18} color={variant === 'secondary' ? Tw.color.foreground : Tw.color.primaryForeground} />
    </Pressable>
  );
}

interface IDetailedCardProps extends ICardBaseProps {
  /** Genres déjà résolus (noms). */
  genres?: { id: string; name: string }[];
  /** Ma liste : la carte entière ouvre le tiroir et ne garde que la gestion (titre, format, progression, statut). */
  manage?: boolean;
  onListChange?: (patch: IEntryPatch) => void;
  onListEdit?: () => void;
  /** Bouton d'action à gauche de « Voir plus » (ajout ou gestion dans ma liste). */
  action?: React.ReactNode;
  /** Bandeau sous la carte (œuvre en attente de référencement, proposition rejetée). */
  footer?: React.ReactNode;
}

/**
 * Carte détaillée (`AnimeCard.InlineDetailed` / `MangaCard.InlineDetailed`), mode « Liste détaillée » des pages de
 * recherche et de ma liste. En recherche : badges statut / format / source / VF, épisodes, durée, saison, date,
 * diffusion, genres, synopsis et « Voir plus ». Sur ma liste (`manage`) : titre, amis, format et total, notes,
 * bande de gestion.
 */
export function MediaDetailedCard({
  kind,
  media,
  entry,
  onPress,
  genres,
  manage,
  onListChange,
  onListEdit,
  action,
  footer,
}: Readonly<IDetailedCardProps>) {
  const anime = kind === 'anime';
  const total = totalOf(kind, media);
  const aired = airedFor(kind, media);
  const showBand = !!entry && (!!onListChange || !!onListEdit);
  const compact = !!manage && showBand;
  const status = media.status;
  const sourceLabel = media.source ? SOURCE_LABELS[media.source] : null;
  const releaseDate = anime
    ? formatReleaseDate(media.date?.start, media.date?.startPrecision)
    : media.date?.start
      ? String(new Date(media.date.start).getUTCFullYear())
      : null;
  const volumes = media.volumesInfo?.total;
  const season = seasonLabel(media.season);
  const broadcastDay = anime && status === 'AIRING' && media.format !== 'FILM' ? broadcastDayLabel(media) : null;
  const shownGenres = (genres ?? []).slice(0, 4);

  const body = (
    <View style={styles.detailed}>
      <View>
        <CardImage uri={media.posterUrl} kind={kind} style={styles.detailedImage} />
      </View>
      <View style={styles.detailedBody}>
        <View style={styles.titleRow}>
          <Txt size="base" weight="semibold" numberOfLines={2} leading={1.375} style={styles.flex}>
            {mediaTitle(media)}
          </Txt>
          {entry ? <FriendsPill entry={entry} kind={kind} /> : null}
        </View>
        {compact ? (
          <>
            <Txt size="xs" color={Tw.color.mutedForeground}>
              {[media.format, total ? `${total} ${anime ? 'ép.' : 'chap.'}` : null].filter(Boolean).join(' · ')}
            </Txt>
            <ScoreLine community={entry?.communityScore ?? media.communityScore} mine={entry?.score} />
          </>
        ) : (
          <>
            <View style={styles.badgeRow}>
              {status && MEDIA_STATUS_LABELS[status] ? <Badge label={MEDIA_STATUS_LABELS[status]} background={MEDIA_STATUS_BG[status] ?? Tw.color.gray600} /> : null}
              {media.format ? <Badge label={media.format} background={alpha(Tw.color.primary, 0.9)} color={Tw.color.primaryForeground} /> : null}
              {anime && sourceLabel ? <Badge label={sourceLabel} background={Tw.color.muted} color={Tw.color.foreground} /> : null}
              {media.vf ? <Badge label="VF" background={Tw.color.blue600} /> : null}
            </View>
            <View style={styles.metaRow}>
              {anime && total ? <Meta icon={Film} label={`${total} eps`} /> : null}
              {anime && media.episodesInfo?.durationMinutes ? <Meta icon={Clock} label={`${media.episodesInfo.durationMinutes} min`} /> : null}
              {anime && season ? (
                <Txt size="xs" color={Tw.color.mutedForeground}>
                  {season}
                </Txt>
              ) : null}
              {!anime && media.chaptersInfo?.total ? <Meta icon={BookOpen} label={`${media.chaptersInfo.total} chap.`} /> : null}
              {!anime && volumes ? <Meta icon={Layers} label={`${volumes} vol.`} /> : null}
              {releaseDate ? <Meta icon={Calendar} label={releaseDate} /> : null}
            </View>
            {broadcastDay ? (
              <View style={styles.inline}>
                {media.episodesInfo?.broadcastPaused ? (
                  <Txt size="xs" color={Tw.color.mutedForeground}>
                    Diffusion en pause
                  </Txt>
                ) : (
                  <View style={[styles.broadcast]}>
                    <Txt size="xs" weight="semibold" color="#fff">
                      Tous les {broadcastDay}s
                    </Txt>
                  </View>
                )}
              </View>
            ) : null}
            {shownGenres.length > 0 ? (
              <View style={styles.genreRow}>
                {shownGenres.map((genre) => (
                  <View key={genre.id} style={styles.genre}>
                    <Txt size="10" numberOfLines={1}>
                      {genre.name}
                    </Txt>
                  </View>
                ))}
                {(genres?.length ?? 0) > 4 ? (
                  <Txt size="10" color={Tw.color.mutedForeground}>
                    +{(genres?.length ?? 0) - 4}
                  </Txt>
                ) : null}
              </View>
            ) : null}
            {media.synopsis && !showBand ? (
              <Txt size="xs" color={Tw.color.mutedForeground} numberOfLines={3} leading={1.625}>
                {media.synopsis}
              </Txt>
            ) : null}
          </>
        )}
        {entry && showBand ? (
          <ListEntryBand
            entry={entry}
            kind={kind}
            total={total}
            available={aired}
            onChange={onListChange}
            onEdit={onListEdit}
            interactiveChips={!manage}
          />
        ) : null}
        {!compact ? (
          <View style={styles.actionsRow}>
            {action ? <View style={styles.actionLeft}>{action}</View> : null}
            {onPress ? (
              <Pressable accessibilityRole="button" onPress={onPress} style={styles.more}>
                <Txt size="xs" weight="medium">
                  Voir plus
                </Txt>
                <ArrowRight size={12} color={Tw.color.foreground} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.detailedCard}>
      {compact ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Gérer ${mediaTitle(media)} dans ma liste`}
          onPress={onListEdit}
          style={({ pressed }) => pressed && { backgroundColor: alpha(Tw.color.accent, 0.25) }}
        >
          {body}
        </Pressable>
      ) : (
        body
      )}
      {footer ? <View style={styles.cardFooter}>{footer}</View> : null}
    </View>
  );
}

function Meta({ icon: Icon, label }: Readonly<{ icon: typeof Film; label: string }>) {
  return (
    <View style={styles.inline}>
      <Icon size={12} color={Tw.color.mutedForeground} />
      <Txt size="xs" color={Tw.color.mutedForeground}>
        {label}
      </Txt>
    </View>
  );
}

const WEEKDAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
/** Jour de diffusion hebdomadaire (`getBroadcastDayLabel`) : celui de la première, si elle est datée au jour près. */
function broadcastDayLabel(media: IMedia): string | null {
  const start = media.date?.start;
  if (!start || (media.date?.startPrecision && media.date.startPrecision !== 'day')) return null;
  const date = new Date(start);
  return Number.isNaN(date.getTime()) ? null : WEEKDAYS[date.getDay()]!;
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pressed: { opacity: 0.85 },
  image: { backgroundColor: Tw.color.muted, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Tw.radius.sm },
  badgeZone: { position: 'absolute', top: 4, maxWidth: '60%', gap: 2 },
  badgeLeft: { left: 4, alignItems: 'flex-start' },
  badgeRight: { right: 4, alignItems: 'flex-end' },
  scoreLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 2 },
  // Grille
  gridCard: { borderRadius: Tw.radius.lg, backgroundColor: Tw.color.card, overflow: 'hidden' },
  gridImage: { width: '100%', aspectRatio: 3 / 4, borderTopLeftRadius: Tw.radius.lg, borderTopRightRadius: Tw.radius.lg },
  gridBody: { padding: 8, gap: 4 },
  gridBodyDense: { padding: 6 },
  // Ligne compacte
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 8, borderRadius: Tw.radius.lg, backgroundColor: Tw.color.card },
  rowImage: { width: 48, height: 64, borderRadius: Tw.radius.lg },
  rowCorner: { position: 'absolute', top: 0, right: 0, backgroundColor: alpha(Tw.color.primary, 0.9), paddingHorizontal: 4, borderRadius: Tw.radius.sm },
  actionDefault: { height: 44, minWidth: 44, paddingHorizontal: 10, borderRadius: Tw.radius.lg, backgroundColor: Tw.color.primary, alignItems: 'center', justifyContent: 'center' },
  actionSecondary: { width: 44, height: 44, borderRadius: Tw.radius.lg, borderWidth: 1, borderColor: Tw.color.input, backgroundColor: alpha(Tw.color.input, 0.3), alignItems: 'center', justifyContent: 'center' },
  // Détaillée
  detailedCard: { borderRadius: Tw.radius.lg, backgroundColor: Tw.color.card, overflow: 'hidden' },
  detailed: { flexDirection: 'row', gap: 12, padding: 12 },
  detailedImage: { width: 96, aspectRatio: 3 / 4, borderRadius: Tw.radius.md },
  detailedBody: { flex: 1, minWidth: 0, gap: 6 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 2 },
  broadcast: { backgroundColor: alpha(Tw.color.amber600, 0.9), paddingHorizontal: 6, paddingVertical: 2, borderRadius: Tw.radius.sm },
  genreRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 },
  genre: { backgroundColor: alpha(Tw.color.accent, 0.4), paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8, paddingTop: 4, marginTop: 'auto' },
  actionLeft: { marginRight: 'auto' },
  more: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: Tw.radius.md,
    borderWidth: 1,
    borderColor: Tw.color.input,
    backgroundColor: alpha(Tw.color.input, 0.3),
  },
  cardFooter: { borderTopWidth: 1, borderColor: Tw.color.border, paddingHorizontal: 12, paddingVertical: 8 },
  // Amis
  friendsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Tw.color.border,
    backgroundColor: alpha(Tw.color.background, 0.6),
    paddingVertical: 2,
    paddingLeft: 4,
    paddingRight: 8,
  },
  avatars: { flexDirection: 'row', alignItems: 'center' },
  avatarOverlap: { marginLeft: -6 },
  avatarRing: { backgroundColor: Tw.color.background, alignItems: 'center', justifyContent: 'center' },
  avatar: { backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarDot: { position: 'absolute', right: 0, bottom: 0, width: 8, height: 8, borderRadius: 4, borderWidth: 2, borderColor: Tw.color.background },
  extra: { width: 24, height: 24, borderRadius: 12, backgroundColor: Tw.color.muted, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Tw.color.background },
  friendsSheet: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 4 },
  meRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: Tw.radius.md, backgroundColor: alpha(Tw.color.accent, 0.4), paddingHorizontal: 4, paddingVertical: 6 },
  meBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: Tw.color.primary, alignItems: 'center', justifyContent: 'center' },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  friendScore: { width: 32, textAlign: 'right' },
  friendRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingVertical: 6 },
  friendScoreCol: { width: 56, alignItems: 'flex-end' },
  friendsFooter: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 12, borderTopWidth: 1, borderColor: Tw.color.border, paddingHorizontal: 4, paddingTop: 8, marginTop: 4 },
});
