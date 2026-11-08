import { perkUnlockLabel, type IMemberPerks, type IMemberSignature } from '@actunime/types';
import {
  DEFAULT_MEMBER_APPEARANCE,
  MemberAppearanceBody,
  requiresSupporter,
  themeRequirements,
  type IMemberAppearanceBody,
  type IThemePreset,
} from '@actunime/validations';

/**
 * Règles de l'éditeur de thème, les mêmes que celles de l'API (`themeRequirements`, `MemberAppearanceBody`) et du
 * site : l'app n'invente aucun avantage, elle lit `perks` renvoyé par `GET /billing/appearance`.
 */

type IColors = NonNullable<IMemberAppearanceBody['colors']>;
export type IColorKey = keyof IColors;

/** Couleurs de départ d'un thème complet : celles du site, à modifier. */
export const SITE_THEME_COLORS: IColors = {
  background: '#000616',
  foreground: '#f5f7fb',
  card: '#030a1d',
  cardForeground: '#f5f7fb',
  primary: '#3c7dff',
  border: '#1a2a55',
  sidebar: '#030a1d',
  sidebarForeground: '#f5f7fb',
};

/** Couleurs libres que l'éditeur propose (la barre latérale n'existe pas sur mobile : ses réglages restent ceux du site). */
export const COLOR_FIELDS: { key: IColorKey; label: string }[] = [
  { key: 'background', label: 'Fond de page' },
  { key: 'foreground', label: 'Texte' },
  { key: 'card', label: 'Fond des cartes' },
  { key: 'cardForeground', label: 'Texte des cartes' },
  { key: 'primary', label: 'Couleur principale' },
  { key: 'border', label: 'Bordures' },
];

export const isDraftDirty = (draft: IMemberAppearanceBody | null, saved: IMemberAppearanceBody | undefined): boolean => !!draft && !!saved && JSON.stringify(draft) !== JSON.stringify(saved);

/** Pseudo ou accent changés : demande au moins l'avantage « signature ». */
export const customizesSignature = (draft: IMemberAppearanceBody): boolean =>
  draft.nameColor !== DEFAULT_MEMBER_APPEARANCE.nameColor || draft.accentColor !== DEFAULT_MEMBER_APPEARANCE.accentColor;

/** Pourquoi le thème ne peut pas être enregistré (avantage manquant), ou `null`. Même ordre que le site. */
export function blockedReason(draft: IMemberAppearanceBody, perks: IMemberPerks | undefined, isSupporter: boolean): string | null {
  const needs = themeRequirements(draft);
  if (!perks?.signature) return `Enregistrement réservé aux Soutiens et aux contributeurs dès le palier ${perkUnlockLabel('signature')}.`;
  if (needs.themeAdvanced && !perks.themeAdvanced) return `Image de fond et transparence : avec l’offre Soutien ou au palier ${perkUnlockLabel('themeAdvanced')}.`;
  if (needs.theme && !perks.theme) return `Couleurs libres, police et effets : avec l’offre Soutien ou au palier ${perkUnlockLabel('theme')}.`;
  if (requiresSupporter(draft) && !isSupporter) return 'Les auras de Soutien (style, couleur libre, intensité) demandent l’offre Soutien : aucun palier ne les débloque.';
  return null;
}

/** Erreurs de validation par champ (contraste compris), vide quand le thème peut être enregistré. */
export function appearanceIssues(draft: IMemberAppearanceBody, perks: IMemberPerks | undefined): Record<string, string> {
  // Sans l'avantage avancé, l'image de fond n'est qu'un essai : elle n'est pas validée (l'enregistrement est refusé de toute façon).
  const parsed = MemberAppearanceBody.safeParse(perks?.themeAdvanced ? draft : { ...draft, background: null });
  return parsed.success ? {} : Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message]));
}

export const applyPreset = (draft: IMemberAppearanceBody, preset: IThemePreset): IMemberAppearanceBody => ({ ...draft, colors: preset.colors, accentColor: preset.accentColor });

export function setThemeColor(draft: IMemberAppearanceBody, key: IColorKey, value: string): IMemberAppearanceBody {
  return draft.colors ? { ...draft, colors: { ...draft.colors, [key]: value } } : draft;
}

/** `#rgb` ou `#rrggbb` saisi à la main, sans dièse ou en majuscules : la forme que l'API accepte, ou `null`. */
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(raw)) return `#${raw.split('').map((c) => c + c).join('')}`.toLowerCase();
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw}`.toLowerCase();
  return null;
}

/** Signature (pseudo, accent, aura) que le thème donnera au membre : sert à l'aperçu de l'éditeur, comme `appearanceToSignature` du site. */
export function appearanceToSignature(appearance: IMemberAppearanceBody): IMemberSignature {
  return {
    nameColor: appearance.nameColor,
    accentColor: appearance.accentColor,
    ...(appearance.colors ? { primaryColor: appearance.colors.primary, cardColor: appearance.colors.card } : {}),
    ...(appearance.aura?.source === 'tier' ? { auraSource: 'tier' as const } : {}),
    ...(appearance.aura?.style ? { auraStyle: appearance.aura.style } : {}),
    ...(appearance.aura?.color ? { auraColor: appearance.aura.color } : {}),
    ...(appearance.aura?.intensity ? { auraIntensity: appearance.aura.intensity } : {}),
  };
}
