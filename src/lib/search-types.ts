import type { LogoIconName } from '@/components/nav/logo-icons.data';
import type { EntityKind, MediaKind } from '@/lib/api';

export type SearchType = MediaKind | EntityKind | 'member';

export interface ISearchTypeOption {
  readonly value: SearchType;
  readonly label: string;
  readonly hint: string;
  readonly icon: LogoIconName;
}

/** Ce qu'on peut chercher, dans l'ordre du tiroir ouvert par « Recherche » dans la barre du bas. */
export const SEARCH_TYPES: readonly ISearchTypeOption[] = [
  { value: 'anime', label: 'Animes', hint: 'Séries et films', icon: 'anime' },
  { value: 'manga', label: 'Mangas', hint: 'Mangas, manhwas, light novels', icon: 'manga' },
  { value: 'character', label: 'Personnages', hint: 'Par nom', icon: 'character' },
  { value: 'person', label: 'Personnes', hint: 'Doubleurs, staff, artistes', icon: 'staff' },
  { value: 'track', label: 'Musiques', hint: 'Openings, endings, bandes originales', icon: 'music' },
  { value: 'company', label: 'Sociétés', hint: 'Studios et éditeurs', icon: 'company' },
  { value: 'member', label: 'Membres', hint: 'Par pseudo, pour les ajouter en ami', icon: 'user' },
];

export const isSearchType = (value: string | undefined): value is SearchType => SEARCH_TYPES.some((type) => type.value === value);

/** Route de la recherche pour un type. */
export const searchHref = (type: SearchType) => `/search?kind=${type}`;
