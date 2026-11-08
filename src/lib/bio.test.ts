import { describe, expect, it } from 'vitest';

import { parseBio, parseInline } from './bio';

describe('parseInline', () => {
  it('gras, italique, spoiler et imbrication', () => {
    expect(parseInline('a **b** c')).toEqual([{ text: 'a ' }, { text: 'b', bold: true }, { text: ' c' }]);
    expect(parseInline('*x* et _y_')).toEqual([{ text: 'x', italic: true }, { text: ' et ' }, { text: 'y', italic: true }]);
    expect(parseInline('||fin||')).toEqual([{ text: 'fin', spoiler: true }]);
    expect(parseInline('**gras *et italique***')[1]).toEqual({ text: 'et italique', bold: true, italic: true });
  });

  it('laisse le reste en texte, liens compris', () => {
    expect(parseInline('[lien](http://x) 2*3')).toEqual([{ text: '[lien](http://x) 2*3' }]);
  });
});

describe('parseBio', () => {
  it('titres, citation, listes et paragraphes', () => {
    const blocks = parseBio('## Salut\n\nUn *mot*.\n> citation\n\n- un\n- deux\n\n1. a\n2. b\n\n### Fin');
    expect(blocks.map((b) => b.type)).toEqual(['h2', 'p', 'quote', 'ul', 'ol', 'h3']);
    expect(blocks[3]).toMatchObject({ type: 'ul', items: [[{ text: 'un' }], [{ text: 'deux' }]] });
    expect(blocks[4]).toMatchObject({ type: 'ol' });
  });

  it('une bio vide ne donne rien', () => {
    expect(parseBio('')).toEqual([]);
    expect(parseBio('   \n\n')).toEqual([]);
  });
});
