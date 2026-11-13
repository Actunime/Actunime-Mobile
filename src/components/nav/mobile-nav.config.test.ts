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

  it('dans l’éventail : aucune entrée « bientôt », aucun renvoi vers le site, un seul niveau de sous-menu', () => {
    for (const { item, trail } of flattenItems(MEMBER_FAN)) {
      expect(isSoonEntry(item), item.id).toBe(false);
      expect(item.path, item.id).toBeUndefined();
      expect(trail.length, item.id).toBeLessThanOrEqual(1);
    }
  });

  it('dans l’éventail : aucune page essentielle n’est devenue inaccessible', () => {
    const targets = new Set(flattenItems(MEMBER_FAN).flatMap(({ item }) => (item.native ? [item.native] : [])));
    // Pages sans autre point d'entrée dans l'app (le reste des réglages est listé dans l'écran Paramètres).
    for (const route of ['/agenda', '/notifications', '/communaute', '/propositions', '/contributeurs', '/profile', '/settings/amis', '/favoris', '/statistiques', '/settings']) {
      expect(targets.has(route), route).toBe(true);
    }
  });

  it('dans l’éventail : pas deux entrées vers le même écran', () => {
    const targets = flattenItems(MEMBER_FAN).flatMap(({ item }) => (item.native ? [item.native] : []));
    expect(new Set(targets).size).toBe(targets.length);
  });
});
