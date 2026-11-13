import { describe, expect, it } from 'vitest';

import { buildReleaseNotes, groupSubjects } from '../../scripts/release-notes.mjs';

describe('notes de version', () => {
  const subjects = [
    'feat(navigateur): mode diagnostic, journal copiable',
    'fix(suivi): une œuvre à jour n’apparaît plus dans Reprendre',
    'chore(deps): bump types 1.13.0',
    'refactor(profil): une seule page profil',
    'docs: readme',
    'fix(suivi): une œuvre à jour n’apparaît plus dans Reprendre',
  ];

  it('garde les nouveautés et les corrections, écarte le reste, sans doublon', () => {
    expect(groupSubjects(subjects)).toEqual([
      { title: 'Nouveautés', items: ['Mode diagnostic, journal copiable'] },
      { title: 'Corrections', items: ['Une œuvre à jour n’apparaît plus dans Reprendre'] },
    ]);
  });

  it('écrit le markdown de la page GitHub et le texte de l’app', () => {
    const { markdown, text, count } = buildReleaseNotes(subjects);
    expect(count).toBe(2);
    expect(markdown).toBe('### Nouveautés\n- Mode diagnostic, journal copiable\n\n### Corrections\n- Une œuvre à jour n’apparaît plus dans Reprendre');
    expect(text).toBe('Nouveautés\n• Mode diagnostic, journal copiable\n\nCorrections\n• Une œuvre à jour n’apparaît plus dans Reprendre');
  });

  it('résume le surplus dans le texte de l’app mais le garde sur GitHub', () => {
    const many = Array.from({ length: 13 }, (_, i) => `feat(x): changement ${i + 1}`);
    const { markdown, text } = buildReleaseNotes(many, { maxText: 10 });
    expect(markdown.split('\n').filter((line) => line.startsWith('- '))).toHaveLength(13);
    expect(text.split('\n').filter((line) => line.startsWith('• '))).toHaveLength(10);
    expect(text).toContain('… et 3 autres changements');
  });

  it('dit quelque chose quand rien n’est visible pour un membre', () => {
    expect(buildReleaseNotes(['chore: ci', 'test: x']).text).toBe('Améliorations internes et petites corrections.');
  });
});
