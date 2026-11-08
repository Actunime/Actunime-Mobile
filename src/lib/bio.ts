/**
 * Bio d'un membre : le Markdown limité du site (`BioContent`) : gras, italique, titres, citation, listes et spoilers
 * `||texte||`. Ni lien, ni image, ni HTML : tout autre signe reste du texte. Ici seulement l'analyse ; le dessin est
 * dans `components/member/bio-content.tsx`.
 */

export interface IBioSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  spoiler?: boolean;
}

export type IBioBlock =
  | { type: 'p' | 'h2' | 'h3' | 'quote'; spans: IBioSpan[] }
  | { type: 'ul' | 'ol'; items: IBioSpan[][] };

const INLINE = /(\*\*((?:[^*\n]|\*(?!\*)|\*(?=\*\*(?!\*)))+?)\*\*(?!\*)|\|\|([^|\n]+?)\|\||\*([^*\n]+?)\*|_([^_\n]+?)_)/;

/** Texte en tronçons mis en forme ; les marques s'imbriquent (un gras peut contenir un italique). */
export function parseInline(source: string, base: Omit<IBioSpan, 'text'> = {}): IBioSpan[] {
  const found = INLINE.exec(source);
  if (!found || found.index === undefined) return source ? [{ text: source, ...base }] : [];
  const before = source.slice(0, found.index);
  const after = source.slice(found.index + found[0].length);
  const inner = found[2] !== undefined ? parseInline(found[2], { ...base, bold: true }) : found[3] !== undefined ? parseInline(found[3], { ...base, spoiler: true }) : parseInline(found[4] ?? found[5] ?? '', { ...base, italic: true });
  return [...(before ? [{ text: before, ...base }] : []), ...inner, ...parseInline(after, base)];
}

const BULLET = /^\s*[-*]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;

export function parseBio(source: string): IBioBlock[] {
  const blocks: IBioBlock[] = [];
  let paragraph: string[] = [];
  let quote: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: 'p', spans: parseInline(paragraph.join('\n')) });
    if (quote.length) blocks.push({ type: 'quote', spans: parseInline(quote.join('\n')) });
    paragraph = [];
    quote = [];
  };
  for (const line of source.replace(/\r\n?/g, '\n').split('\n')) {
    const bullet = BULLET.exec(line);
    const ordered = ORDERED.exec(line);
    if (!line.trim()) flush();
    else if (line.startsWith('### ')) {
      flush();
      blocks.push({ type: 'h3', spans: parseInline(line.slice(4).trim()) });
    } else if (line.startsWith('## ')) {
      flush();
      blocks.push({ type: 'h2', spans: parseInline(line.slice(3).trim()) });
    } else if (line.startsWith('>')) {
      if (paragraph.length) flush();
      quote.push(line.replace(/^>\s?/, ''));
    } else if (bullet || ordered) {
      flush();
      const type = bullet ? 'ul' : 'ol';
      const item = parseInline((bullet ?? ordered)![1]);
      const last = blocks[blocks.length - 1];
      if (last && last.type === type) last.items.push(item);
      else blocks.push({ type, items: [item] });
    } else {
      if (quote.length) flush();
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}
