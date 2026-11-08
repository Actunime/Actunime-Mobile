import type { IMemberSignature } from '@actunime/types';

import { alpha, Tw } from '@/constants/theme';

type ISignature = IMemberSignature | null | undefined;

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Couleur `#rrggbb` valide, sinon rien : la signature a déjà passé le contraste côté API, on ne se fie qu'à sa forme. */
const safe = (color: string | undefined | null) => (color && HEX.test(color) ? color : undefined);

/** Couleur du pseudo d'un membre Soutien (E132), `undefined` pour tout autre membre : le texte garde alors sa couleur d'origine. */
export function signatureNameColor(signature: ISignature): string | undefined {
  return safe(signature?.nameColor);
}

/** Liseré d'accent autour de l'avatar (équivalent de `signatureAvatarStyle` du site). */
export function signatureRing(signature: ISignature): { borderColor: string; borderWidth: number } | undefined {
  const color = safe(signature?.accentColor);
  return color ? { borderColor: color, borderWidth: 2 } : undefined;
}

/** Mélange `top` (part `amount`) sur `base`, deux couleurs `#rrggbb` : fond opaque, la carte garde son relief. */
function mix(top: string, base: string, amount: number): string {
  const channel = (i: number) => Math.round(parseInt(top.slice(i, i + 2), 16) * amount + parseInt(base.slice(i, i + 2), 16) * (1 - amount));
  return `rgb(${channel(1)}, ${channel(3)}, ${channel(5)})`;
}

/** Teinte d'une carte de membre : bordure et fond légers à la couleur principale (ou d'accent) du membre. */
export function signatureCardTint(signature: ISignature): { borderColor: string; backgroundColor: string } | undefined {
  const tint = safe(signature?.primaryColor) ?? safe(signature?.accentColor);
  return tint ? { borderColor: alpha(tint, 0.45), backgroundColor: mix(tint, Tw.color.card, 0.12) } : undefined;
}
