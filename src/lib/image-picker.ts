import * as ImagePicker from 'expo-image-picker';

import { IMAGE_ASPECT, imageProblem, toDataUrl, type IProfileImageType } from './image-data';

export type IPickKind = IProfileImageType | 'BACKGROUND';

/**
 * Ouvre le sélecteur de photos du téléphone (sélecteur système : aucune autorisation d'accès à la galerie) et rend
 * l'image en data URL, recadrée à la forme voulue. `null` si l'utilisateur annule ; une erreur au message lisible si
 * l'image est refusée.
 */
export async function pickImage(kind: IPickKind): Promise<string | null> {
  const aspect = IMAGE_ASPECT[kind];
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: !!aspect,
    aspect,
    quality: kind === 'BACKGROUND' ? 0.7 : 0.85,
    base64: true,
    exif: false,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (!asset?.base64) throw new Error('Impossible de lire cette image.');
  const dataUrl = toDataUrl(asset.base64, asset.mimeType);
  const problem = imageProblem(dataUrl, kind);
  if (problem) throw new Error(problem);
  return dataUrl;
}
