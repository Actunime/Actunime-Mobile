import {
  NOTIFICATION_DEFAULTS,
  NotificationCategoryObj,
  NotificationTypeObj,
  type INotificationCategory,
  type INotificationChannel,
  type INotificationPreferences,
  type INotificationType,
} from '@actunime/types';

/**
 * Page de l'app qui correspond au lien d'une notification (l'API renvoie des chemins du site).
 * `null` : pas d'équivalent dans l'app, la notification se lit sans s'ouvrir.
 */
export function notificationRoute(link?: string | null): string | null {
  if (!link) return null;
  const path = link.split(/[?#]/)[0] ?? '';
  const parts = path.split('/').filter(Boolean);
  const [first, second] = parts;
  if ((first === 'animes' || first === 'mangas') && second) return `/media/${first === 'animes' ? 'anime' : 'manga'}/${second}`;
  if (first === 'membres' && second) return `/member/${second}`;
  if (path === '/suivi/amis' || path === '/settings/amis') return '/settings/amis';
  if (first === 'personnages' && second) return `/character/${second}`;
  if (first === 'personnes' && second) return `/person/${second}`;
  if (first === 'musiques' && second) return `/track/${second}`;
  return null;
}

/** « il y a 5 min », « il y a 3 h », « il y a 2 j », puis la date. */
export function timeAgo(value: string | Date, now = Date.now()): string {
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return '';
  const minutes = Math.max(0, Math.round((now - time) / 60_000));
  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 1440) return `il y a ${Math.round(minutes / 60)} h`;
  if (minutes < 10_080) return `il y a ${Math.round(minutes / 1440)} j`;
  return new Date(time).toLocaleDateString('fr-FR');
}

/** Valeur d'un réglage : le choix du membre, sinon la valeur par défaut de l'API. */
export function preferenceValue(
  preferences: INotificationPreferences['preferences'] | undefined,
  type: INotificationType,
  channel: INotificationChannel,
): boolean {
  return preferences?.[type]?.[channel] ?? NOTIFICATION_DEFAULTS[type][channel];
}

export interface INotificationGroup {
  category: INotificationCategory;
  label: string;
  types: { type: INotificationType; label: string }[];
}

/** Les types de notification regroupés par catégorie, dans l'ordre du catalogue de l'API. */
export function notificationGroups(): INotificationGroup[] {
  const types = Object.keys(NotificationTypeObj) as INotificationType[];
  return (Object.keys(NotificationCategoryObj) as INotificationCategory[])
    .map((category) => ({
      category,
      label: NotificationCategoryObj[category].label,
      types: types
        .filter((type) => NotificationTypeObj[type].category === category)
        .map((type) => ({ type, label: NotificationTypeObj[type].label })),
    }))
    .filter((group) => group.types.length > 0);
}

/** Retire le balisage de liens internes des textes d'activité : `[ai wo taberu](Anime:8212073982)` → `ai wo taberu`. */
export function plainDescribe(text: string): string {
  return text.replace(/\[([^\]]+)\]\((?:Anime|Manga|Character|Person|PersonGroup|Company|Track|Member|User)[:/][^)]*\)/g, '$1');
}
