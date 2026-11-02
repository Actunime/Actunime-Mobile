/**
 * Onglets du navigateur : chaque onglet garde sa page (et son état de lecture) tant qu'il n'est pas fermé.
 * `activeId` à `null` = l'accueil du navigateur, avec les onglets toujours ouverts en arrière-plan.
 */
export interface ITab {
  id: number;
  url: string;
  title?: string;
}

export interface ITabsState {
  tabs: ITab[];
  activeId: number | null;
  nextId: number;
}

/** Au-delà, ouvrir une page remplace un onglet : chaque onglet garde une WebView vivante en mémoire. */
export const MAX_TABS = 6;

export const initialTabs: ITabsState = { tabs: [], activeId: null, nextId: 1 };

export type TabsAction =
  | { type: 'open'; url: string }
  | { type: 'activate'; id: number }
  | { type: 'home' }
  | { type: 'close'; id: number }
  | { type: 'info'; id: number; title?: string; url?: string };

export function tabsReducer(state: ITabsState, action: TabsAction): ITabsState {
  switch (action.type) {
    case 'open': {
      const tab: ITab = { id: state.nextId, url: action.url };
      let tabs = state.tabs;
      if (tabs.length >= MAX_TABS) {
        // plus ancien onglet qui n'est pas celui qu'on regarde
        const victim = tabs.find((candidate) => candidate.id !== state.activeId) ?? tabs[0]!;
        tabs = tabs.filter((candidate) => candidate.id !== victim.id);
      }
      return { tabs: [...tabs, tab], activeId: tab.id, nextId: state.nextId + 1 };
    }
    case 'activate':
      return state.tabs.some((tab) => tab.id === action.id) ? { ...state, activeId: action.id } : state;
    case 'home':
      return state.activeId === null ? state : { ...state, activeId: null };
    case 'close': {
      const index = state.tabs.findIndex((tab) => tab.id === action.id);
      if (index === -1) return state;
      const tabs = state.tabs.filter((tab) => tab.id !== action.id);
      if (state.activeId !== action.id) return { ...state, tabs };
      // l'onglet fermé était affiché : on passe au voisin, ou à l'accueil s'il n'en reste aucun
      const neighbour = tabs[Math.min(index, tabs.length - 1)];
      return { ...state, tabs, activeId: neighbour?.id ?? null };
    }
    case 'info': {
      let changed = false;
      const tabs = state.tabs.map((tab) => {
        if (tab.id !== action.id) return tab;
        const title = action.title ?? tab.title;
        const url = action.url ?? tab.url;
        if (title === tab.title && url === tab.url) return tab;
        changed = true;
        return { ...tab, title, url };
      });
      return changed ? { ...state, tabs } : state;
    }
  }
}
