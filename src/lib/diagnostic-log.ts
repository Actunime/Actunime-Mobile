import { useSyncExternalStore } from 'react';

import { getBrowserSettings } from './browser-settings';

/**
 * Journal du mode diagnostic : ce que le navigateur de lecture voit et décide (pages, détections, identification de
 * l'œuvre, écritures, erreurs). Gardé en mémoire (les plus récentes), vidé au lancement, copié à la demande pour
 * être relu. Rien n'est écrit tant que le mode est coupé, et rien ne quitte l'appareil sans partage explicite.
 */
export interface IDiagnosticEntry {
  at: number;
  source: 'page' | 'app' | 'nav';
  event: string;
  data?: Record<string, unknown>;
}

export const MAX_ENTRIES = 600;
const MAX_VALUE = 300;

let entries: IDiagnosticEntry[] = [];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** Valeurs bornées : une adresse ou un texte de page très long ne doit pas noyer le journal. */
function shorten(value: unknown): unknown {
  if (typeof value === 'string') return value.length > MAX_VALUE ? `${value.slice(0, MAX_VALUE)}…` : value;
  if (Array.isArray(value)) return value.slice(0, 20).map(shorten);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, v]) => [key, shorten(v)]));
  }
  return value;
}

export function logEvent(source: IDiagnosticEntry['source'], event: string, data?: Record<string, unknown>): void {
  if (!getBrowserSettings().diagnostic) return;
  entries = [...entries.slice(-(MAX_ENTRIES - 1)), { at: Date.now(), source, event, data: data ? (shorten(data) as Record<string, unknown>) : undefined }];
  emit();
}

export const clearDiagnosticLog = (): void => {
  entries = [];
  emit();
};

export const getDiagnosticEntries = (): IDiagnosticEntry[] => entries;

const pad = (n: number, size = 2) => String(n).padStart(size, '0');

/** Une ligne par événement : heure précise, origine, événement, données en JSON compact. */
export function formatDiagnosticLog(list: IDiagnosticEntry[], now = new Date()): string {
  const header = [
    `Journal diagnostic Actunime Mobile — ${now.toISOString()}`,
    `${list.length} événement(s)`,
    '',
  ];
  const lines = list.map(({ at, source, event, data }) => {
    const d = new Date(at);
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
    return `${time} [${source}] ${event}${data ? ` ${JSON.stringify(data)}` : ''}`;
  });
  return [...header, ...lines].join('\n');
}

export function useDiagnosticEntries(): IDiagnosticEntry[] {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getDiagnosticEntries,
  );
}
