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

const DISCOVER = item('discover', 'Découvrir', 'compass', {
  children: [
    item('discover-animes', 'Animes', 'anime', { native: '/search?kind=anime' }),
    item('discover-mangas', 'Mangas', 'manga', { native: '/search?kind=manga' }),
    item('discover-characters', 'Personnages', 'character', { native: '/discover/characters' }),
    item('discover-persons', 'Personnes', 'staff', { native: '/discover/persons' }),
    item('discover-tracks', 'Musiques', 'music', { native: '/discover/tracks' }),
    item('discover-companies', 'Sociétés', 'company', { native: '/discover/companies' }),
    item('discover-members', 'Membres', 'user', { native: '/membres' }),
  ],
});

const AGENDA = item('agenda', 'Agenda', 'calendar', { native: '/agenda' });

const COMMUNITY = item('community', 'Communauté', 'community', {
  children: [
    item('community-home', 'Communauté', 'community', { native: '/communaute' }),
    item('community-proposals', 'Propositions', 'proposal', { path: '/propositions' }),
    item('community-top', 'Contributeurs', 'trophy', { path: '/communaute/contributeurs' }),
    item('community-lab', 'Laboratoire', 'lab', { path: '/laboratoire' }),
  ],
});

const ABOUT = item('about', 'À propos', 'about', {
  children: [
    item('about-legal', 'Mentions', 'document', { path: '/legal/mentions' }),
    item('about-terms', 'CGU', 'terms', { path: '/legal/cgu' }),
    item('about-privacy', 'Confidentialité', 'shield', { path: '/legal/confidentialite' }),
    item('about-content', 'Contenus', 'document', { path: '/legal/contenus' }),
    item('about-contact', 'Contact', 'mail', { path: '/contact' }),
  ],
});

const CONTRIBUTE = item('contribute', 'Contribuer', 'pencil', {
  highlight: true,
  children: [
    item('contribute-anime', 'Anime', 'anime', { path: '/contribute/anime' }),
    item('contribute-manga', 'Manga', 'manga', { path: '/contribute/manga' }),
    item('contribute-character', 'Personnage', 'character', { path: '/contribute/character' }),
    item('contribute-person', 'Personne', 'staff', { path: '/contribute/person' }),
    item('contribute-company', 'Société', 'company', { path: '/contribute/company' }),
    item('contribute-track', 'Musique', 'music', { path: '/contribute/track' }),
  ],
});

const SETTINGS = item('settings', 'Paramètres', 'settings', {
  children: [
    item('settings-profile', 'Profil', 'user', { native: '/settings/profile' }),
    item('settings-notifications', 'Notifications', 'bell', { native: '/settings/notifications' }),
    item('settings-lists', 'Import / export', 'transfer', { path: '/settings/list' }),
    item('settings-social', 'Social', 'community', {
      children: [
        item('settings-friends', 'Amis', 'community', { native: '/settings/amis' }),
        item('settings-blocks', 'Blocages', 'block', { native: '/settings/blocages' }),
        item('settings-privacy', 'Confidentialité', 'lock', { native: '/settings/confidentialite' }),
      ],
    }),
    item('settings-security-group', 'Sécurité', 'shield', {
      children: [
        item('settings-security', 'Sécurité', 'shield', { native: '/settings/security' }),
        item('settings-sessions', 'Appareils', 'device', { native: '/settings/appareils' }),
        item('settings-delete', 'Supprimer', 'trash', { native: '/settings/delete-account' }),
      ],
    }),
  ],
});

const ACCOUNT = item('account', 'Mon compte', 'user', {
  children: [
    item('account-favorites', 'Favoris', 'heart', { native: '/favoris' }),
    item('account-contributions', 'Contributions', 'document', { path: '/contribute/proposals' }),
    item('account-stats', 'Statistiques', 'stats', { native: '/statistiques' }),
    item('account-profile', 'Mon profil', 'user', { native: '/profile' }),
    SETTINGS,
    item('account-logout', 'Se déconnecter', 'logout', { action: 'logout' }),
  ],
});

/** Éventail du bouton central (photo de profil → logo) : celui du site pour un membre connecté, notifications en moins. */
export const MEMBER_FAN: readonly IMobileNavItem[] = [
  DISCOVER,
  AGENDA,
  COMMUNITY,
  CONTRIBUTE,
  item('notifications', 'Notifications', 'bell', { native: '/notifications' }),
  ACCOUNT,
  ABOUT,
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
