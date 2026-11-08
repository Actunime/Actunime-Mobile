import { describe, expect, it } from 'vitest';

import type { IListEntry } from '@/lib/api';
import type { ILastRead } from '@/lib/browsing';

import { readFirst, readOf } from './resume';

const entry = (id: string, mediaType: 'Anime' | 'Manga' = 'Anime') => ({ id, mediaType, media: { id: `m-${id}` } }) as unknown as IListEntry;
const read = (at: number, number = 3): ILastRead => ({ url: `https://site.fr/${at}`, number, host: 'site.fr', at });

describe('readOf', () => {
  it('retrouve la page lue d\'une œuvre par son type et son identifiant', () => {
    const reads = { 'manga:m-b': read(200, 12) };
    expect(readOf(entry('b', 'Manga'), reads)?.number).toBe(12);
    expect(readOf(entry('b', 'Anime'), reads)).toBeUndefined();
  });
});

describe('readFirst', () => {
  it('met en tête la lecture la plus récente puis les œuvres jamais lues dans leur ordre', () => {
    const reads = { 'anime:m-a': read(100), 'manga:m-c': read(300) };
    const sorted = readFirst([entry('x'), entry('a'), entry('y'), entry('c', 'Manga')], reads);
    expect(sorted.map((e) => e.id)).toEqual(['c', 'a', 'x', 'y']);
  });
});
