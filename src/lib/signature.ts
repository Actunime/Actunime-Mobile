import type { IMemberSignature } from '@actunime/types';

import { alpha } from '@/constants/theme';

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

/** Teinte d'une carte de membre : bordure et fond légers à la couleur principale (ou d'accent) du membre. */
export function signatureCardTint(signature: ISignature): { borderColor: string; backgroundColor: string } | undefined {
  const tint = safe(signature?.primaryColor) ?? safe(signature?.accentColor);
  return tint ? { borderColor: alpha(tint, 0.45), backgroundColor: alpha(tint, 0.1) } : undefined;
}
