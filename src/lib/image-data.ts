/**
 * Images envoyées à l'API en « data URL » base64, comme le site (`ImageInput`) : photo de profil, bannière et image de
 * fond du thème. Ici la partie pure (conversion, limites) ; le sélecteur natif est dans `image-picker.ts`.
 */

export type IProfileImageType = 'AVATAR' | 'BANNER';

/** Formes acceptées par l'API pour le fond du thème (`ThemeBackgroundUploadBody`). */
const BACKGROUND_MIME = ['image/webp', 'image/png', 'image/jpeg'];

/** Taille maximale d'une image du profil (15 Mo côté API) et du fond de thème (10 Mo). */
export const MAX_PROFILE_BYTES = 15 * 1024 * 1024;
export const MAX_BACKGROUND_BYTES = 10 * 1024 * 1024;

/** Cadrage proposé au recadrage : photo carrée, bannière large (2560×1024 sur le site), fond libre. */
export const IMAGE_ASPECT: Record<IProfileImageType | 'BACKGROUND', [number, number] | undefined> = {
  AVATAR: [1, 1],
  BANNER: [5, 2],
  BACKGROUND: undefined,
};

export const toDataUrl = (base64: string, mimeType?: string | null): string => `data:${mimeType && mimeType.startsWith('image/') ? mimeType : 'image/jpeg'};base64,${base64}`;

/** Octets d'une data URL base64 (sans la décoder). */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = payload.endsWith('==') ? 2 : payload.endsWith('=') ? 1 : 0;
  return Math.floor((payload.length * 3) / 4) - padding;
}

/** Message d'erreur en français si l'image ne peut pas être envoyée, sinon `null`. */
export function imageProblem(dataUrl: string, kind: IProfileImageType | 'BACKGROUND'): string | null {
  const mime = /^data:(image\/[a-z+]+);base64,/.exec(dataUrl)?.[1];
  if (!mime) return 'Format d’image invalide.';
  if (kind === 'BACKGROUND' && !BACKGROUND_MIME.includes(mime)) return 'Format non pris en charge (WebP, PNG ou JPEG).';
  const max = kind === 'BACKGROUND' ? MAX_BACKGROUND_BYTES : MAX_PROFILE_BYTES;
  if (dataUrlBytes(dataUrl) > max) return `Image trop lourde (${Math.round(max / 1024 / 1024)} Mo maximum).`;
  return null;
}
