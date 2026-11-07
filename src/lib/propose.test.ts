import { describe, expect, it } from 'vitest';

import { buildMediaUpdate, type IMediaDraft } from './propose';

const base: IMediaDraft = { synopsis: 'Un synopsis.', total: 12, status: 'AIRING', start: '2026-01-05T12:00:00.000Z', end: null };

describe('buildMediaUpdate', () => {
  it('ne renvoie rien sans changement', () => {
    expect(buildMediaUpdate('anime', base, { ...base })).toEqual({});
  });
  it('ne garde que les champs modifiés', () => {
    expect(buildMediaUpdate('anime', base, { ...base, synopsis: ' Nouveau. ', total: 24 })).toEqual({ synopsis: 'Nouveau.', episodesInfo: { total: 24 } });
  });
  it('un manga change ses chapitres', () => {
    expect(buildMediaUpdate('manga', base, { ...base, total: 100 })).toEqual({ chaptersInfo: { total: 100 } });
  });
  it('compare les dates au jour près', () => {
    expect(buildMediaUpdate('anime', base, { ...base, start: '2026-01-05T00:00:00.000Z' })).toEqual({});
    expect(buildMediaUpdate('anime', base, { ...base, end: '2026-03-30T12:00:00.000Z' })).toEqual({ date: { end: '2026-03-30' } });
  });
  it('le statut change seul', () => {
    expect(buildMediaUpdate('anime', base, { ...base, status: 'ENDED' })).toEqual({ status: 'ENDED' });
  });
});
