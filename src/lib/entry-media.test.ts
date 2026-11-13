import { describe, expect, it } from 'vitest';

import type { IListEntry } from './api';
import { isDisplayableEntry, isPendingEntry, mediaOf } from './entry-media';

const entry = (over: Record<string, unknown>) => ({ id: 'e1', mediaType: 'Manga', ...over }) as unknown as IListEntry;

describe('entrées de ma liste affichables', () => {
  const validated = entry({ mediaId: 'm1', media: { id: 'm1', title: { original: 'X' } } });
  const pending = entry({ proposalId: 'p1', preview: { title: 'Mon ajout rapide', coverImage: 'https://img/c.jpg' } });
  const empty = entry({});

  it('reconnaît un ajout rapide pas encore validé : une proposition, pas de fiche', () => {
    expect(isPendingEntry(pending)).toBe(true);
    expect(isPendingEntry(validated)).toBe(false);
    expect(isPendingEntry(empty)).toBe(false);
  });

  it('affiche une fiche validée ou un ajout en attente, jamais une entrée sans rien à montrer', () => {
    expect(isDisplayableEntry(validated)).toBe(true);
    expect(isDisplayableEntry(pending)).toBe(true);
    expect(isDisplayableEntry(empty)).toBe(false);
  });

  it('montre l’aperçu de la proposition à la place de la fiche', () => {
    expect(mediaOf(pending)).toMatchObject({ title: { original: 'Mon ajout rapide' }, posterUrl: 'https://img/c.jpg' });
    expect(mediaOf(entry({ preview: {} })).title).toEqual({ original: 'Titre inconnu' });
  });
});
