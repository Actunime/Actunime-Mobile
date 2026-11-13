import type { LogoIconName } from './logo-icons.data';

export type MobileNavAction = 'logout';

export interface IMobileNavItem {
  readonly id: string;
  readonly label: string;
  readonly icon: LogoIconName;
  /** Écran natif de l'app (route Expo Router). Prioritaire sur `path`. */
  readonly native?: string;
  /** Page du site, ouverte dans le navigateur système : l'écran n'existe pas dans la V1 de l'app. */
  readonly path?: string;
  readonly action?: MobileNavAction;
  /** Sous-éventail ouvert par cet item (8 actions au plus). */
  readonly children?: readonly IMobileNavItem[];
  /** Action mise en avant (contour bleu) : contribuer. */
  readonly highlight?: boolean;
}

const item = (
  id: string,
  label: string,
  icon: LogoIconName,
  rest: Partial<Omit<IMobileNavItem, 'id' | 'label' | 'icon'>> = {},
): IMobileNavItem => ({ id, label, icon, ...rest });

/**
 * Les 4 raccourcis de la barre : 2 à gauche du bouton central, 2 à droite. Le site met « Mon suivi / Mes animes /
 * Mes mangas / Recherche » ; l'app n'a pas d'en-tête, ses cinq écrans V1 sont donc répartis entre la barre
 * (mon suivi, ma liste, recherche, navigateur) et l'éventail (profil, dans « Mon compte »).
 */
export const MEMBER_TABS: readonly IMobileNavItem[] = [
  item('suivi', 'Mon suivi', 'dashboard', { native: '/' }),
  item('list', 'Ma liste', 'anime', { native: '/list' }),
  item('search', 'Recherche', 'search', { native: '/search' }),
  item('reading', 'Navigateur', 'globe', { native: '/reading' }),
];

const AGENDA = item('agenda', 'Agenda', 'calendar', { native: '/agenda' });

const COMMUNITY = item('community', 'Communauté', 'community', {
  children: [
    item('community-home', 'Vue d’ensemble', 'community', { native: '/communaute' }),
    item('community-proposals', 'Propositions', 'proposal', { native: '/propositions' }),
    item('community-top', 'Contributeurs', 'trophy', { native: '/contributeurs' }),
  ],
});

/**
 * Éventail du bouton central (photo de profil → logo). Volontairement court et à plat : uniquement des écrans qui
 * existent dans l'app (rien de « bientôt », rien qui renvoie au site), un seul niveau de sous-menu, pas de doublon.
 * Les réglages (profil, sécurité, amis…) sont rangés dans l'écran Paramètres, pas dans l'éventail.
 */
export const MEMBER_FAN: readonly IMobileNavItem[] = [
  AGENDA,
  item('notifications', 'Notifications', 'bell', { native: '/notifications' }),
  COMMUNITY,
  item('mine', 'Mon espace', 'user', {
    children: [
      item('mine-profile', 'Mon profil', 'user', { native: '/profile' }),
      item('mine-friends', 'Mes amis', 'community', { native: '/settings/amis' }),
      item('mine-favorites', 'Favoris', 'heart', { native: '/favoris' }),
      item('mine-stats', 'Statistiques', 'stats', { native: '/statistiques' }),
    ],
  }),
  item('settings', 'Paramètres', 'settings', { native: '/settings' }),
];

/** Raccourci de la barre correspondant à l'écran courant (route native). */
export function findActiveTabId(tabs: readonly IMobileNavItem[], pathname: string): string | null {
  return tabs.find((tab) => tab.native && tab.native.split('?')[0] === pathname)?.id ?? null;
}

/** Toutes les entrées de l'éventail et leur cible, pour le rapport et les tests. */
export function flattenItems(items: readonly IMobileNavItem[], trail: string[] = []): { trail: string[]; item: IMobileNavItem }[] {
  return items.flatMap((entry) => [
    { trail, item: entry },
    ...(entry.children ? flattenItems(entry.children, [...trail, entry.label]) : []),
  ]);
}

/**
 * Entrée du site pas encore reprise dans l'app : une page du site sans écran natif, ou un groupe dont tout le contenu
 * l'est. Elle est grisée dans l'éventail et un appui dit « bientôt disponible » (jamais de renvoi vers le site).
 */
export function isSoonEntry(entry: IMobileNavItem): boolean {
  if (entry.native || entry.action) return false;
  if (entry.children) return entry.children.every(isSoonEntry);
  return !!entry.path;
}
