import type { IPalette } from './palette';

/**
 * Thème global : la charte Actunime est écrite en dur dans une soixantaine de fichiers (`Tw.color.card`…). Plutôt que de
 * tous les recopier, React Native est branché ici (voir `metro.config.js` et `normalize-colors-remap.ts`) : chaque
 * couleur de la charte qui part à l'écran est remplacée par celle du thème du membre. Une couleur qui n'est pas de la
 * charte (statuts, photos, couleurs du thème lui-même) n'est jamais touchée.
 */

/** Couleurs de la charte (`Tw.color`), par rôle. L'alpha de la couleur d'origine est conservé. */
const CHARTE = {
  background: 0x000616,
  card: 0x14244f,
  muted: 0x102866,
  input: 0x2b4587,
  accent: 0x174283,
  ring: 0x3c5aa6,
  primary: 0x0099ff,
  foreground: 0xf9fafb,
  mutedForeground: 0xbed5ff,
} as const;

/** `#rrggbb`, `#rrggbbaa`, `rgb()` ou `rgba()` → `0xrrggbb`, sinon `null`. */
export function toRgb(color: string): number | null {
  const hex = /^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/i.exec(color.trim());
  if (hex) return parseInt(hex[1]!, 16);
  const fn = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i.exec(color.trim());
  if (fn) return (Math.min(255, +fn[1]!) << 16) | (Math.min(255, +fn[2]!) << 8) | Math.min(255, +fn[3]!);
  return null;
}

const mix = (top: number, base: number, amount: number): number => {
  const channel = (shift: number) => Math.round(((top >> shift) & 0xff) * amount + ((base >> shift) & 0xff) * (1 - amount));
  return (channel(16) << 16) | (channel(8) << 8) | channel(0);
};

/**
 * Table « couleur de la charte → couleur du thème » d'une palette, ou `null` pour la charte d'origine. Un fond
 * transparent (image de fond) ou des cartes transparentes retombent sur une couleur pleine : ces tables ne portent pas d'alpha.
 */
export function remapTable(palette: IPalette): ReadonlyMap<number, number> | null {
  if (palette.isDefault) return null;
  const pick = (color: string, fallback: number): number => toRgb(color) ?? fallback;
  const background = palette.backgroundImage ? 0x000000 : pick(palette.background, CHARTE.background);
  const solid = (color: string, fallback: number) => (/^rgba\(0,\s*0,\s*0,\s*0\)$/.test(color) ? background : pick(color, fallback));
  const primary = pick(palette.primary, CHARTE.primary);
  const entries: [number, number][] = [
    [CHARTE.background, background],
    [CHARTE.card, solid(palette.card, CHARTE.card)],
    [CHARTE.muted, solid(palette.muted, CHARTE.muted)],
    [CHARTE.input, pick(palette.input, CHARTE.input)],
    [CHARTE.accent, pick(palette.accent, CHARTE.accent)],
    [CHARTE.ring, mix(primary, background, 0.6)],
    [CHARTE.primary, primary],
    [CHARTE.foreground, pick(palette.foreground, CHARTE.foreground)],
    [CHARTE.mutedForeground, pick(palette.mutedForeground, CHARTE.mutedForeground)],
  ];
  const table = new Map(entries.filter(([from, to]) => from !== to));
  return table.size > 0 ? table : null;
}

/** Couleur React Native normalisée (`0xrrggbbaa`) remplacée selon la table, alpha conservé. */
export function applyRemap(rgba: number, table: ReadonlyMap<number, number>): number {
  const to = table.get(rgba >>> 8);
  return to === undefined ? rgba : (((to << 8) | (rgba & 0xff)) >>> 0);
}

const SLOT = '__actunimeColorRemap';

/** Installe (ou retire, avec `null`) la table lue par le branchement de React Native. */
export function installColorRemap(table: ReadonlyMap<number, number> | null): void {
  (globalThis as Record<string, unknown>)[SLOT] = table ?? undefined;
}

export const currentColorRemap = (): ReadonlyMap<number, number> | undefined => (globalThis as Record<string, unknown>)[SLOT] as ReadonlyMap<number, number> | undefined;
