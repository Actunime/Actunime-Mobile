import { describe, expect, it } from 'vitest';

import { buildMediaUpdate, buildRelationAdd, buildRelationCreate, newTempId, type IMediaDraft } from './propose';

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

describe('buildRelationAdd', () => {
  it('ajoute une société par son identifiant', () => {
    expect(buildRelationAdd('companies', { id: 'c1' })).toEqual({ companies: [{ id: 'c1' }] });
  });
  it('ajoute une musique avec ses épisodes quand ils sont donnés', () => {
    expect(buildRelationAdd('tracks', { id: 't1', startEpisode: 1, endEpisode: 12 })).toEqual({ tracks: [{ id: 't1', startEpisode: 1, endEpisode: 12 }] });
    expect(buildRelationAdd('tracks', { id: 't1' })).toEqual({ tracks: [{ id: 't1' }] });
    expect(buildRelationAdd('tracks', { id: 't1', startEpisode: 0, endEpisode: 0 })).toEqual({ tracks: [{ id: 't1' }] });
  });
});

describe('personnages', () => {
  it('ajoute un personnage existant avec son rôle', () => {
    expect(buildRelationAdd('characters', { id: 'p1', role: 'PRINCIPAL' })).toEqual({ characters: [{ id: 'p1', role: 'PRINCIPAL' }] });
  });
  it('crée un personnage (nom, genre facultatif) avec son rôle sur la relation, sans artistes', () => {
    expect(buildRelationCreate('characters', { name: ' Maya ', role: 'SECONDAIRE', gender: 'FEMININ' }, 'temp_z')).toEqual({
      characters: [{ id: 'temp_z', role: 'SECONDAIRE' }],
      dependencies: [{ tempId: 'temp_z', entityType: 'Character', mainDependency: { name: { original: 'Maya' }, gender: 'FEMININ' } }],
    });
  });
});

describe('buildRelationCreate', () => {
  it('crée une musique avec son nom et son type, rattachée par un identifiant provisoire', () => {
    expect(buildRelationCreate('tracks', { name: '  Mon opening ', type: 'OPENING', startEpisode: 1 }, 'temp_x')).toEqual({
      tracks: [{ id: 'temp_x', startEpisode: 1 }],
      dependencies: [{ tempId: 'temp_x', entityType: 'Track', mainDependency: { name: { original: 'Mon opening' }, type: 'OPENING' } }],
    });
  });
  it('crée une société', () => {
    expect(buildRelationCreate('companies', { name: 'Studio Test', type: 'STUDIO' }, 'temp_y')).toEqual({
      companies: [{ id: 'temp_y' }],
      dependencies: [{ tempId: 'temp_y', entityType: 'Company', mainDependency: { name: { original: 'Studio Test' }, type: 'STUDIO' } }],
    });
  });
  it("l'identifiant provisoire commence par temp_", () => {
    expect(newTempId()).toMatch(/^temp_[a-z0-9]+$/);
  });
});
