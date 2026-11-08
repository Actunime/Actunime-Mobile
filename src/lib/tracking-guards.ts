import type { PageDetection } from '@/detection/messages';

import { skipModeOf } from './skipped-works';
import { matchKey } from './sync';

/**
 * Une progression (début ou fin de chapitre) ne s'écrit que pour la page affichée et pour une œuvre qu'on suit : celle
 * d'une page déjà quittée ou d'une œuvre mise de côté est ignorée.
 */
export async function progressAllowed(detection: PageDetection, shown: PageDetection | null): Promise<boolean> {
  if (shown && matchKey(shown) !== matchKey(detection)) return false;
  return (await skipModeOf(matchKey(detection))) === null;
}
