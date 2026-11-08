import type { TrackingState } from './use-tracking';

export type BarMode = 'panel' | 'pill' | 'icon';

/**
 * Mode d'ouverture de la barre de suivi selon l'état. Le grand panneau ne s'ouvre d'office que la première fois qu'on
 * voit une œuvre à identifier : ensuite, chaque chapitre ne montre qu'une pastille, qu'on ouvre si on le souhaite. Une
 * œuvre ou un site mis de côté se réduit au seul logo.
 */
export function initialMode(tracking: TrackingState): BarMode {
  if (tracking.kind === 'confirm') return tracking.announce ? 'panel' : 'pill';
  return tracking.kind === 'ignored' || tracking.kind === 'skipped' ? 'icon' : 'pill';
}
