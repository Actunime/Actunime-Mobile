import { describe, expect, it } from 'vitest';

import { LOGO_ICONS } from './logo-icons.data';
import { MEMBER_FAN, MEMBER_TABS, findActiveTabId, flattenItems, isSoonEntry, type IMobileNavItem } from './mobile-nav.config';
import { FAN_MAX_ITEMS } from './radial-layout';

const all = flattenItems([...MEMBER_TABS, ...MEMBER_FAN]);

describe('configuration de la navigation', () => {
  it('a 4 raccourcis dans la barre, tous des écrans natifs', () => {
    expect(MEMBER_TABS).toHaveLength(4);
    expect(MEMBER_TABS.every((tab) => tab.native)).toBe(true);
  });

  it('n’a pas d’éventail plus grand que la géométrie ne le permet', () => {
    expect(MEMBER_FAN.length).toBeLessThanOrEqual(FAN_MAX_ITEMS);
    for (const { item } of all) expect(item.children?.length ?? 0).toBeLessThanOrEqual(FAN_MAX_ITEMS);
  });

  it('donne à chaque entrée une cible, un sous-menu ou une action', () => {
    for (const { item } of all) {
      expect(Boolean(item.native || item.path || item.action || item.children), item.id).toBe(true);
    }
  });

  it('utilise des icônes du jeu et des identifiants uniques', () => {
    const ids = all.map(({ item }) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const { item } of all) expect(item.icon in LOGO_ICONS, item.id).toBe(true);
  });

  it('ouvre les pages du site en chemin absolu', () => {
    for (const { item } of all) if (item.path) expect(item.path.startsWith('/'), item.id).toBe(true);
  });

  it('repère le raccourci actif', () => {
    expect(findActiveTabId(MEMBER_TABS, '/list')).toBe('list');
    expect(findActiveTabId(MEMBER_TABS, '/')).toBe('suivi');
    expect(findActiveTabId(MEMBER_TABS, '/profile')).toBeNull();
  });
});

describe('isSoonEntry', () => {
  const leaf = (over: Partial<IMobileNavItem>): IMobileNavItem => ({ id: 'x', label: 'X', icon: 'anime', ...over }) as IMobileNavItem;

  it('une page du site sans écran natif est « bientôt », un écran natif ou une action non', () => {
    expect(isSoonEntry(leaf({ path: '/notifications' }))).toBe(true);
    expect(isSoonEntry(leaf({ native: '/agenda' }))).toBe(false);
    expect(isSoonEntry(leaf({ action: 'logout' }))).toBe(false);
  });

  it('un groupe l’est quand tout son contenu l’est, pas dès qu’une entrée est disponible', () => {
    const soon = leaf({ path: '/a' });
    expect(isSoonEntry(leaf({ children: [soon, leaf({ path: '/b' })] }))).toBe(true);
    expect(isSoonEntry(leaf({ children: [soon, leaf({ native: '/list' })] }))).toBe(false);
  });

  it('dans l’éventail : Agenda, Paramètres et Notifications sont disponibles, À propos ne l’est pas', () => {
    const byId = (id: string) => all.find((entry) => entry.item.id === id)!.item;
    expect(isSoonEntry(byId('agenda'))).toBe(false);
    expect(isSoonEntry(byId('settings'))).toBe(false);
    expect(isSoonEntry(byId('notifications'))).toBe(false);
    expect(isSoonEntry(byId('about'))).toBe(true);
  });
});
