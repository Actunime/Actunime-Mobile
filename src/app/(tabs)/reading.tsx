import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BrowserHome } from '@/components/browser/browser-home';
import { BrowserView } from '@/components/browser/browser-view';
import { TabSwitcher } from '@/components/browser/tab-switcher';
import { getBrowserSettings, whenSettingsLoaded } from '@/lib/browser-settings';
import { getSites, lastVisitedUrl } from '@/lib/browsing';
import { initialTabs, tabsReducer } from '@/lib/tabs';

/**
 * Onglet Navigateur : on est directement dans le navigateur. L'accueil (reprendre sa lecture, ses sites, l'adresse)
 * ou l'un des onglets ouverts. Chaque onglet garde sa page : ils restent montés, seul celui qu'on regarde est visible.
 * L'onglet de la barre du bas reste monté quand on en change : les pages sont gardées.
 */
export default function BrowserTab() {
  // `t` change à chaque demande d'ouverture : rouvrir la même adresse depuis une fiche ouvre quand même une page.
  const { url, t } = useLocalSearchParams<{ url?: string; t?: string }>();
  const [state, dispatch] = useReducer(tabsReducer, initialTabs);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const lastRequest = useRef('');

  const open = useCallback((target: string) => dispatch({ type: 'open', url: target }), []);
  const goHome = useCallback(() => dispatch({ type: 'home' }), []);

  // Première ouverture sans adresse demandée : l'accueil du navigateur, ou la dernière page selon le réglage.
  useEffect(() => {
    if (url) return;
    let cancelled = false;
    void whenSettingsLoaded()
      .then(async () => {
        if (cancelled || getBrowserSettings().startPage !== 'last') return;
        const last = lastVisitedUrl(await getSites());
        if (last && !cancelled) dispatch({ type: 'open', url: last });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- seulement à la première ouverture

  useEffect(() => {
    const request = `${url}|${t}`;
    if (!url || request === lastRequest.current) return;
    lastRequest.current = request;
    open(url);
  }, [url, t, open]);

  return (
    <View style={styles.fill}>
      {state.tabs.map((tab) => (
        <View key={tab.id} style={tab.id === state.activeId ? styles.fill : styles.hidden}>
          <BrowserView
            url={tab.url}
            active={tab.id === state.activeId}
            tabCount={state.tabs.length}
            onHome={goHome}
            onOpenTabs={() => setSwitcherOpen(true)}
            onInfo={(info) => dispatch({ type: 'info', id: tab.id, ...info })}
          />
        </View>
      ))}
      {state.activeId === null ? (
        <BrowserHome onOpen={open} tabCount={state.tabs.length} onOpenTabs={() => setSwitcherOpen(true)} />
      ) : null}
      <TabSwitcher
        open={switcherOpen}
        tabs={state.tabs}
        activeId={state.activeId}
        onClose={() => setSwitcherOpen(false)}
        onSelect={(id) => {
          setSwitcherOpen(false);
          dispatch({ type: 'activate', id });
        }}
        onCloseTab={(id) => dispatch({ type: 'close', id })}
        onNewTab={() => {
          setSwitcherOpen(false);
          goHome();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hidden: { display: 'none' },
});
