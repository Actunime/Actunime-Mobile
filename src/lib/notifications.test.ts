import { describe, expect, it } from 'vitest';

import { notificationGroups, notificationRoute, plainDescribe, preferenceValue, timeAgo } from './notifications';

describe('notificationRoute', () => {
  it('traduit les liens du site en pages de l’app', () => {
    expect(notificationRoute('/animes/123')).toBe('/media/anime/123');
    expect(notificationRoute('/mangas/9?tab=x')).toBe('/media/manga/9');
    expect(notificationRoute('/membres/maud')).toBe('/member/maud');
    expect(notificationRoute('/suivi/amis')).toBe('/settings/amis');
  });
  it('renvoie null sans équivalent', () => {
    expect(notificationRoute('/contribute/proposals/4')).toBeNull();
    expect(notificationRoute(null)).toBeNull();
  });
});

describe('timeAgo', () => {
  const now = new Date('2026-11-07T12:00:00Z').getTime();
  it('exprime la durée écoulée', () => {
    expect(timeAgo('2026-11-07T11:58:00Z', now)).toBe('il y a 2 min');
    expect(timeAgo('2026-11-07T09:00:00Z', now)).toBe('il y a 3 h');
    expect(timeAgo('2026-11-05T12:00:00Z', now)).toBe('il y a 2 j');
  });
});

describe('préférences', () => {
  it('utilise la valeur par défaut de l’API sans choix du membre', () => {
    expect(preferenceValue(undefined, 'FRIEND_REQUEST_RECEIVED', 'DISCORD')).toBe(true);
    expect(preferenceValue(undefined, 'NEW_FOLLOWER', 'DISCORD')).toBe(false);
  });
  it('le choix du membre l’emporte', () => {
    expect(preferenceValue({ NEW_FOLLOWER: { IN_APP: false } }, 'NEW_FOLLOWER', 'IN_APP')).toBe(false);
  });
  it('regroupe tous les types par catégorie', () => {
    const groups = notificationGroups();
    expect(groups.length).toBeGreaterThan(2);
    expect(groups.flatMap((g) => g.types).length).toBeGreaterThan(15);
  });
});

describe('plainDescribe', () => {
  it('garde le texte des liens internes', () => {
    expect(plainDescribe("Ajout de l'anime [ai wo taberu](Anime:8212073982) à la liste (Terminé)")).toBe("Ajout de l'anime ai wo taberu à la liste (Terminé)");
  });
  it('laisse le reste intact', () => {
    expect(plainDescribe('Mise à jour (note, date de fin)')).toBe('Mise à jour (note, date de fin)');
  });
});
