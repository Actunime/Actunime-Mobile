import type { EntityKind, FavoriteType, IFavorite, IListStats, IMemberPublicProfile, ListStatus, MediaKind } from './api';

export type MemberTab = 'profil' | 'animes' | 'mangas' | 'favoris' | 'stats';

export const MEMBER_TAB_LABELS: Record<MemberTab, string> = {
  profil: 'Profil',
  animes: 'Liste Anime',
  mangas: 'Liste Manga',
  favoris: 'Favoris',
  stats: 'Statistiques',
};

/** Sections visibles : les listes et favoris dépendent de ce que le membre laisse voir (tout pour le propriétaire). */
export function visibleTabs(visibility: IMemberPublicProfile['visibility'], isOwner: boolean): MemberTab[] {
  const tabs: MemberTab[] = ['profil'];
  if (visibility.listsVisible || isOwner) tabs.push('animes', 'mangas', 'favoris');
  tabs.push('stats');
  return tabs;
}

/** Nombre d'œuvres par statut d'une liste, tiré des statistiques (même vocabulaire que « Ma liste »). */
export function statusCounts(stats: IListStats | undefined, kind: MediaKind): Record<string, number> {
  if (!stats) return {};
  const active: ListStatus = kind === 'anime' ? 'WATCHING' : 'READING';
  const planned: ListStatus = kind === 'anime' ? 'PLAN_TO_WATCH' : 'PLAN_TO_READ';
  return {
    ALL: stats.total,
    [active]: stats.watching,
    COMPLETED: stats.completed,
    ON_HOLD: stats.onHold,
    DROPPED: stats.dropped,
    [planned]: stats.planToWatch,
  };
}

export interface IFavoriteTarget {
  /** Œuvre (fiche d'œuvre) ou entité (fiche d'entité). */
  kind: MediaKind | EntityKind;
  id: string;
  title: string;
  imageUrl: string | null;
}

interface IFavoriteTargetData {
  title?: { original?: string };
  name?: { original?: string };
  posterUrl?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  logoUrl?: string | null;
}

const FAVORITE_KINDS: Record<FavoriteType, MediaKind | EntityKind> = {
  Anime: 'anime',
  Manga: 'manga',
  Character: 'character',
  Person: 'person',
  Company: 'company',
};

/** Cible d'un favori : de quoi l'afficher et l'ouvrir ; `null` si la cible a disparu. */
export function favoriteTarget(favorite: IFavorite): IFavoriteTarget | null {
  // La cible est jointe selon son type : on la lit comme une fiche aux champs facultatifs.
  const target = favorite.target as unknown as IFavoriteTargetData | null;
  if (!target) return null;
  const kind = FAVORITE_KINDS[favorite.targetType as FavoriteType];
  if (!kind || !favorite.targetId) return null;
  return {
    kind,
    id: favorite.targetId,
    title: target.title?.original ?? target.name?.original ?? 'Sans titre',
    imageUrl: target.posterUrl ?? target.avatarUrl ?? target.coverUrl ?? target.logoUrl ?? null,
  };
}

export const FAVORITE_FILTERS: { id: FavoriteType | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'Tous' },
  { id: 'Anime', label: 'Animes' },
  { id: 'Manga', label: 'Mangas' },
  { id: 'Character', label: 'Personnages' },
  { id: 'Person', label: 'Personnalités' },
];

/** Membre depuis, en français (« octobre 2026 »). */
export function memberSince(value?: string | Date): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}
