import { describe, expect, it } from 'vitest';

import { initialTabs, MAX_TABS, tabsReducer, type ITabsState } from './tabs';

const open = (state: ITabsState, url: string) => tabsReducer(state, { type: 'open', url });

describe('tabsReducer', () => {
  it('ouvre un onglet et l’affiche', () => {
    const state = open(initialTabs, 'https://a.example/');
    expect(state.tabs).toHaveLength(1);
    expect(state.activeId).toBe(state.tabs[0]!.id);
  });

  it('retourne à l’accueil sans fermer les onglets, puis en rouvre un', () => {
    let state = open(open(initialTabs, 'https://a.example/'), 'https://b.example/');
    state = tabsReducer(state, { type: 'home' });
    expect(state.activeId).toBeNull();
    expect(state.tabs).toHaveLength(2);
    state = tabsReducer(state, { type: 'activate', id: state.tabs[0]!.id });
    expect(state.activeId).toBe(state.tabs[0]!.id);
  });

  it('fermer l’onglet affiché passe au voisin, puis à l’accueil quand il n’en reste plus', () => {
    let state = open(open(open(initialTabs, 'https://a.example/'), 'https://b.example/'), 'https://c.example/');
    const [a, b, c] = state.tabs;
    state = tabsReducer(state, { type: 'close', id: c!.id });
    expect(state.activeId).toBe(b!.id);
    state = tabsReducer(state, { type: 'close', id: a!.id });
    expect(state.activeId).toBe(b!.id);
    state = tabsReducer(state, { type: 'close', id: b!.id });
    expect(state.tabs).toEqual([]);
    expect(state.activeId).toBeNull();
  });

  it('fermer un autre onglet laisse l’onglet affiché', () => {
    let state = open(open(initialTabs, 'https://a.example/'), 'https://b.example/');
    const [a, b] = state.tabs;
    state = tabsReducer(state, { type: 'close', id: a!.id });
    expect(state.activeId).toBe(b!.id);
  });

  it('au maximum d’onglets, le plus ancien qui n’est pas affiché est remplacé', () => {
    let state = initialTabs;
    for (let i = 0; i < MAX_TABS; i++) state = open(state, `https://s${i}.example/`);
    const first = state.tabs[0]!;
    state = open(state, 'https://neuf.example/');
    expect(state.tabs).toHaveLength(MAX_TABS);
    expect(state.tabs.some((tab) => tab.id === first.id)).toBe(false);
    expect(state.tabs.at(-1)!.url).toBe('https://neuf.example/');
  });

  it('met à jour le titre et l’adresse d’un onglet sans rien changer d’autre', () => {
    const state = open(initialTabs, 'https://a.example/');
    const id = state.tabs[0]!.id;
    const next = tabsReducer(state, { type: 'info', id, title: 'Solo Leveling', url: 'https://a.example/ch-2' });
    expect(next.tabs[0]).toEqual({ id, url: 'https://a.example/ch-2', title: 'Solo Leveling' });
    expect(tabsReducer(next, { type: 'info', id, title: 'Solo Leveling' })).toBe(next);
  });
});
