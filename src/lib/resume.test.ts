import { describe, expect, it } from 'vitest';

import type { IListEntry } from '@/lib/api';
import type { ILastRead } from '@/lib/browsing';

import { latestResume } from './resume';

const entry = (id: string, mediaType: 'Anime' | 'Manga' = 'Anime') => ({ id, mediaType, media: { id: `m-${id}`, title: { original: `Titre ${id}` } } }) as unknown as IListEntry;
const read = (at: number, number = 3): ILastRead => ({ url: `https://site.fr/${at}`, number, host: 'site.fr', at });

describe('latestResume', () => {
  it('prend l\'œuvre dont la page lue est la plus récente', () => {
    const reads = { 'anime:m-a': read(100), 'manga:m-b': read(200, 12) };
    const found = latestResume([entry('a'), entry('b', 'Manga')], reads);
    expect(found?.entry.id).toBe('b');
    expect(found?.read.number).toBe(12);
    expect(found?.kind).toBe('manga');
  });

  it('renvoie null quand aucune page n\'a été lue', () => {
    expect(latestResume([entry('a')], {})).toBeNull();
  });
});
