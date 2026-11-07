import { describe, expect, it } from 'vitest';

import { ENTITY_SECTIONS, entityBadge, entityImage, entityInfoRows, entityName } from './entity';

describe('entityName / entityImage', () => {
  it('prend le nom d’origine, ou « Sans nom »', () => {
    expect(entityName(({ name: { original: ' Youngwoo Shin ' } } as never))).toBe('Youngwoo Shin');
    expect(entityName(({} as never))).toBe('Sans nom');
    expect(entityName(null)).toBe('Sans nom');
  });

  it('prend l’avatar, puis la pochette, puis le logo', () => {
    expect(entityImage({ avatarUrl: 'a', coverUrl: 'c', logoUrl: 'l' } as never)).toBe('a');
    expect(entityImage({ avatarUrl: null, coverUrl: 'c', logoUrl: 'l' } as never)).toBe('c');
    expect(entityImage(({ logoUrl: 'l' } as never))).toBe('l');
    expect(entityImage(({} as never))).toBeNull();
  });
});

describe('entityBadge', () => {
  it('rôle d’un personnage, type d’une musique ou d’une société, rien pour une personne', () => {
    expect(entityBadge('character', ({ role: 'PRINCIPAL' } as never))).toBe('Principal');
    expect(entityBadge('track', ({ type: 'ENDING' } as never))).toBe('Ending');
    expect(entityBadge('company', ({ type: 'PRODUCER' } as never))).toBe('Producteur');
    expect(entityBadge('person', ({ role: 'PRINCIPAL' } as never))).toBeUndefined();
    expect(entityBadge('character', ({} as never))).toBeUndefined();
  });
});

describe('entityInfoRows', () => {
  it('personnage : espèce, genre, âge (0 compris)', () => {
    expect(entityInfoRows('character', ({ species: 'ELFE', gender: 'FEMININ', age: 0 } as never))).toEqual([
      { label: 'Espèce', value: 'Elfe' },
      { label: 'Genre', value: 'Féminin' },
      { label: 'Âge', value: '0' },
    ]);
  });

  it('personne : naissance et décès en dates longues', () => {
    const rows = entityInfoRows('person', ({ birthDate: '1980-05-03T00:00:00.000Z' } as never));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.label).toBe('Naissance');
    expect(rows[0]!.value).toMatch(/1980/);
  });

  it('société : année de fondation ; rien sans donnée', () => {
    expect(entityInfoRows('company', ({ createdDate: '1999-04-01T00:00:00.000Z' } as never))).toEqual([{ label: 'Fondée', value: '1999' }]);
    expect(entityInfoRows('track', ({} as never))).toEqual([]);
    expect(entityInfoRows('person', null)).toEqual([]);
  });
});

describe('ENTITY_SECTIONS', () => {
  it('suit les sections du site pour chaque entité', () => {
    expect(ENTITY_SECTIONS.character.map((s) => s.title)).toEqual(['Apparaît dans (animes)', 'Apparaît dans (mangas)', 'Doubleurs']);
    expect(ENTITY_SECTIONS.person.map((s) => s.relation)).toEqual(['animes', 'mangas', 'characters', 'tracks']);
    expect(ENTITY_SECTIONS.track.map((s) => s.title)).toEqual(['Diffusée dans', 'Artistes']);
    expect(ENTITY_SECTIONS.company.map((s) => s.relation)).toEqual(['animes', 'mangas']);
  });
});
