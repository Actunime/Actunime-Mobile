import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { getLastReads, type ILastRead } from '@/lib/browsing';

/** Dernières pages lues dans le navigateur, relues à chaque retour sur l'écran (la lecture a pu avancer entre-temps). */
export function useLastReads(): Record<string, ILastRead> {
  const [reads, setReads] = useState<Record<string, ILastRead>>({});
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getLastReads()
        .then((stored) => {
          if (!cancelled) setReads(stored);
        })
        .catch(() => undefined);
      return () => {
        cancelled = true;
      };
    }, []),
  );
  return reads;
}
