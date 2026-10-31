import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';

import { BrowserHome } from '@/components/browser/browser-home';
import { BrowserView } from '@/components/browser/browser-view';
import { getBrowserSettings, whenSettingsLoaded } from '@/lib/browser-settings';
import { getSites, lastVisitedUrl } from '@/lib/browsing';

/**
 * Onglet Navigateur : on est directement dans le navigateur. Sans page ouverte, l'accueil (reprendre sa lecture,
 * ses sites, l'adresse) ; avec une page, le navigateur. L'onglet reste monté quand on en change : la page est gardée.
 */
export default function BrowserTab() {
  // `t` change à chaque demande d'ouverture : rouvrir la même adresse depuis une fiche recharge quand même la page.
  const { url, t } = useLocalSearchParams<{ url?: string; t?: string }>();
  const [page, setPage] = useState<{ url: string; session: number } | null>(null);
  const lastRequest = useRef('');

  const open = useCallback((target: string) => setPage((current) => ({ url: target, session: (current?.session ?? 0) + 1 })), []);
  const goHome = useCallback(() => setPage(null), []);

  // Première ouverture sans adresse demandée : l'accueil du navigateur, ou la dernière page selon le réglage.
  useEffect(() => {
    if (url) return;
    let cancelled = false;
    void whenSettingsLoaded()
      .then(async () => {
        if (cancelled || getBrowserSettings().startPage !== 'last') return;
        const last = lastVisitedUrl(await getSites());
        if (last && !cancelled) setPage((current) => current ?? { url: last, session: 1 });
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

  return page ? <BrowserView key={page.session} url={page.url} onHome={goHome} /> : <BrowserHome onOpen={open} />;
}
