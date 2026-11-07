import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PageDetection } from '@/detection/messages';

const matches: Record<string, unknown> = {};

vi.mock('./storage', () => ({
  getMatches: async () => ({ ...matches }),
  saveMatch: async (key: string, match: unknown) => {
    matches[key] = match;
  },
  forgetMatch: async (key: string) => {
    delete matches[key];
  },
}));

vi.mock('./api', () => {
  class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    ApiError,
    mediaId: (e: { id?: string; _id?: string }) => e.id ?? e._id,
    api: {
      searchByKind: vi.fn(),
      searchPendingProposals: vi.fn(),
      getPendingListEntries: vi.fn(),
      getListByMedia: vi.fn(),
      createListEntry: vi.fn(),
      createListEntryFromProposal: vi.fn(),
      updateListEntry: vi.fn(),
    },
  };
});

import { api, ApiError, type IListEntry } from './api';
import { confirm, currentProgress, markPreviousSeen, pushProgress, resolve, searchCandidates, StaleMatchError } from './sync';

const mocked = vi.mocked(api);

const detection = (overrides: Partial<PageDetection> = {}): PageDetection => ({
  kind: 'manga',
  title: 'Mon Manga Proposé',
  chapter: 7,
  url: 'https://site.example/lire/7',
  host: 'site.example',
  source: 'generic',
  ...overrides,
});

const pendingEntry: IListEntry = {
  id: 'e1',
  mediaType: 'Manga' as const,
  status: 'READING',
  chaptersRead: 3,
  preview: { title: 'Mon Manga Proposé' },
} as IListEntry;

beforeEach(() => {
  Object.keys(matches).forEach((key) => delete matches[key]);
  vi.resetAllMocks();
  mocked.searchByKind.mockResolvedValue([]);
  mocked.searchPendingProposals.mockResolvedValue([]);
  mocked.getPendingListEntries.mockResolvedValue([]);
});

describe('resolve', () => {
  it('reconnaît un manga en attente de validation déjà présent dans ma liste', async () => {
    mocked.getPendingListEntries.mockResolvedValue([pendingEntry]);

    const result = await resolve(detection());

    expect(result.match).toEqual({ kind: 'pending', id: 'e1', title: 'Mon Manga Proposé' });
    expect(mocked.searchByKind).not.toHaveBeenCalled();
  });

  it('tolère une petite différence de titre avec l’entrée en attente', async () => {
    mocked.getPendingListEntries.mockResolvedValue([pendingEntry]);

    const result = await resolve(detection({ title: 'Mon manga propose' }));

    expect(result.match?.kind).toBe('pending');
  });

  it('ignore les entrées en attente d’un autre type (anime)', async () => {
    mocked.getPendingListEntries.mockResolvedValue([{ ...pendingEntry, mediaType: 'Anime' }]);

    expect((await resolve(detection())).match).toBeNull();
  });

  it('continue vers le catalogue quand la liste en attente est indisponible', async () => {
    mocked.getPendingListEntries.mockRejectedValue(new Error('indisponible'));
    mocked.searchByKind.mockResolvedValue([({ id: 'm1', title: { original: 'Mon Manga Proposé' } } as never)]);

    expect((await resolve(detection())).match).toEqual({ kind: 'media', id: 'm1', title: 'Mon Manga Proposé' });
  });

  it('associe automatiquement une œuvre validée au titre exact, sans la proposer', async () => {
    mocked.searchByKind.mockResolvedValue([
      ({ id: 'm1', title: { original: 'Mon Manga Proposé' } } as never),
      ({ id: 'm2', title: { original: 'Mon Manga Proposé 2' } } as never),
    ]);

    const result = await resolve(detection());

    expect(result.match).toMatchObject({ kind: 'media', id: 'm1' });
  });

  it('propose les candidats quand deux œuvres portent le même titre', async () => {
    mocked.searchByKind.mockResolvedValue([
      ({ id: 'm1', title: { original: 'Mon Manga Proposé' } } as never),
      ({ id: 'm2', title: { original: 'Mon Manga Proposé' } } as never),
    ]);

    const result = await resolve(detection());

    expect(result.match).toBeNull();
    expect(result.candidates.map((c) => c.id)).toEqual(['m1', 'm2']);
  });

  it('propose une proposition en attente d’un autre membre comme candidate', async () => {
    mocked.searchPendingProposals.mockResolvedValue([
      ({ id: 'p1', mainDependency: { title: { original: 'Mon Manga Proposé' } } } as never),
    ]);

    const result = await resolve(detection());

    expect(result.match).toBeNull();
    expect(result.candidates).toEqual([expect.objectContaining({ origin: 'proposal', id: 'p1' })]);
  });

  it('relit une association enregistrée par une ancienne version (sans `kind`)', async () => {
    // Le stockage réel normalise ; ici on vérifie seulement que l'association connue est renvoyée telle quelle.
    matches['manga|mon manga propose'] = { kind: 'media', id: 'm9', title: 'Mon Manga Proposé' };

    expect((await resolve(detection())).match).toMatchObject({ id: 'm9' });
    expect(mocked.getPendingListEntries).not.toHaveBeenCalled();
  });
});

describe('searchCandidates', () => {
  it('met mes œuvres en attente avant le catalogue', async () => {
    mocked.getPendingListEntries.mockResolvedValue([pendingEntry]);
    mocked.searchByKind.mockResolvedValue([({ id: 'm1', title: { original: 'Mon Manga' } } as never)]);

    const results = await searchCandidates('manga', 'mon manga');

    expect(results.map((c) => c.origin)).toEqual(['pending-entry', 'media']);
  });
});

describe('confirm', () => {
  it('ajoute une proposition à ma liste puis suit l’entrée créée', async () => {
    mocked.createListEntryFromProposal.mockResolvedValue(({ id: 'e42', status: 'READING' } as never));
    const candidate = {
      key: 'proposal:p1',
      origin: 'proposal' as const,
      id: 'p1',
      title: 'Mon Manga Proposé',
      aliases: [],
    };

    const match = await confirm(detection(), candidate);

    expect(mocked.createListEntryFromProposal).toHaveBeenCalledWith(
      expect.objectContaining({ proposalId: 'p1', mediaType: 'Manga', status: 'READING' }),
    );
    expect(match).toEqual({ kind: 'pending', id: 'e42', title: 'Mon Manga Proposé' });
    expect(matches['manga|mon manga propose']).toEqual(match);
  });
});

describe('pushProgress', () => {
  it('écrit sur l’entrée en attente et passe le statut en lecture', async () => {
    mocked.getPendingListEntries.mockResolvedValue([pendingEntry]);

    const result = await pushProgress(detection(), { kind: 'pending', id: 'e1', title: 'Mon Manga Proposé' });

    expect(result).toBe('updated');
    expect(mocked.updateListEntry).toHaveBeenCalledWith('e1', { chaptersRead: 7, status: 'READING' });
  });

  it('ne fait jamais reculer la progression d’une entrée en attente', async () => {
    mocked.getPendingListEntries.mockResolvedValue([{ ...pendingEntry, chaptersRead: 9 }]);

    expect(await pushProgress(detection(), { kind: 'pending', id: 'e1', title: 'x' })).toBe('unchanged');
    expect(mocked.updateListEntry).not.toHaveBeenCalled();
  });

  it('refuse d’écrire si l’entrée en attente n’est plus dans ma liste', async () => {
    await expect(pushProgress(detection(), { kind: 'pending', id: 'e1', title: 'x' })).rejects.toBeInstanceOf(
      StaleMatchError,
    );
  });

  it('crée l’entrée d’une œuvre validée absente de la liste', async () => {
    mocked.getListByMedia.mockRejectedValue(new ApiError(404, 'Not found'));

    expect(await pushProgress(detection(), { kind: 'media', id: 'm1', title: 'x' })).toBe('created');
    expect(mocked.createListEntry).toHaveBeenCalledWith(
      expect.objectContaining({ mediaId: 'm1', mediaType: 'Manga', chaptersRead: 7 }),
    );
  });

  it('met à jour une œuvre validée plus en retard, et laisse inchangée une plus avancée', async () => {
    mocked.getListByMedia.mockResolvedValue(({ id: 'e5', status: 'READING', chaptersRead: 3 } as never));
    expect(await pushProgress(detection(), { kind: 'media', id: 'm1', title: 'x' })).toBe('updated');

    mocked.getListByMedia.mockResolvedValue(({ id: 'e5', status: 'READING', chaptersRead: 7 } as never));
    expect(await pushProgress(detection(), { kind: 'media', id: 'm1', title: 'x' })).toBe('unchanged');
  });

  it('écrit les épisodes d’un anime dans `episodesWatched`', async () => {
    mocked.getListByMedia.mockResolvedValue(({ id: 'e6', status: 'WATCHING', episodesWatched: 1 } as never));

    await pushProgress(detection({ kind: 'anime', chapter: undefined, episode: 4 }), {
      kind: 'media',
      id: 'a1',
      title: 'x',
    });

    expect(mocked.updateListEntry).toHaveBeenCalledWith('e6', { episodesWatched: 4, status: 'WATCHING' });
  });

  it('remonte les erreurs autres que « introuvable »', async () => {
    mocked.getListByMedia.mockRejectedValue(new ApiError(500, 'boom'));

    await expect(pushProgress(detection(), { kind: 'media', id: 'm1', title: 'x' })).rejects.toThrow('boom');
  });
});

describe('currentProgress', () => {
  it('lit la progression d’une entrée en attente et renvoie undefined si elle est absente', async () => {
    mocked.getPendingListEntries.mockResolvedValue([pendingEntry]);
    expect(await currentProgress({ kind: 'manga' }, { kind: 'pending', id: 'e1', title: 'x' })).toBe(3);
    expect(await currentProgress({ kind: 'manga' }, { kind: 'pending', id: 'autre', title: 'x' })).toBeUndefined();
  });
});

describe('markPreviousSeen', () => {
  const entry = (chaptersRead: number): IListEntry => ({ ...pendingEntry, chaptersRead });
  const pending = { kind: 'pending' as const, id: 'e1', title: 'x' };

  it('compte le chapitre précédent quand il manque à la liste', async () => {
    mocked.getPendingListEntries.mockResolvedValue([entry(5)]);

    expect(await markPreviousSeen(detection({ chapter: 7 }), pending, 5)).toEqual({ from: 6, to: 6 });
    expect(mocked.updateListEntry).toHaveBeenCalledWith('e1', { chaptersRead: 6, status: 'READING' });
  });

  it('compte tout jusqu’au précédent après un saut', async () => {
    mocked.getPendingListEntries.mockResolvedValue([entry(3)]);

    expect(await markPreviousSeen(detection({ chapter: 12 }), pending, 3)).toEqual({ from: 4, to: 11 });
    expect(mocked.updateListEntry).toHaveBeenCalledWith('e1', { chaptersRead: 11, status: 'READING' });
  });

  it('ne touche à rien quand la liste est déjà à jour, ou plus loin', async () => {
    expect(await markPreviousSeen(detection({ chapter: 7 }), pending, 6)).toBeNull();
    expect(await markPreviousSeen(detection({ chapter: 7 }), pending, 9)).toBeNull();
    expect(mocked.updateListEntry).not.toHaveBeenCalled();
  });

  it('ne crée jamais d’entrée : œuvre absente de la liste ou premier chapitre', async () => {
    expect(await markPreviousSeen(detection({ chapter: 7 }), pending, undefined)).toBeNull();
    expect(await markPreviousSeen(detection({ chapter: 1 }), pending, 0)).toBeNull();
    expect(mocked.createListEntry).not.toHaveBeenCalled();
    expect(mocked.updateListEntry).not.toHaveBeenCalled();
  });

  it('suit le champ des épisodes pour un anime', async () => {
    mocked.getListByMedia.mockResolvedValue(({ id: 'e9', mediaType: 'Anime', status: 'WATCHING', episodesWatched: 2 } as never));

    expect(
      await markPreviousSeen(detection({ kind: 'anime', chapter: undefined, episode: 6 }), { kind: 'media', id: 'm1', title: 'x' }, 2),
    ).toEqual({ from: 3, to: 5 });
    expect(mocked.updateListEntry).toHaveBeenCalledWith('e9', { episodesWatched: 5, status: 'WATCHING' });
  });
});
