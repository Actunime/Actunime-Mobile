import { CircleCheck, CirclePause, CircleX, Bookmark, BookOpen, Layers, Play, type LucideIcon } from 'lucide-react-native';

import { Tw, alpha } from '@/constants/theme';

import type { ListStatus } from './api';

/**
 * Icône, couleur et libellé court de chaque statut de liste (`LIST_STATUS_META` de `ui/.../ListEntryBand.tsx`)
 * et couleur des barres et pastilles (`listStatusColorMap`, `mediaStatusColorMap` de `cardUtils.ts`).
 */
export const LIST_STATUS_META: Record<ListStatus, { icon: LucideIcon; color: string; short: string }> = {
  WATCHING: { icon: Play, color: Tw.color.primary, short: 'En cours' },
  READING: { icon: BookOpen, color: Tw.color.primary, short: 'En cours' },
  COMPLETED: { icon: CircleCheck, color: Tw.color.success, short: 'Terminé' },
  ON_HOLD: { icon: CirclePause, color: Tw.color.warning, short: 'En pause' },
  DROPPED: { icon: CircleX, color: Tw.color.destructive, short: 'Abandonné' },
  PLAN_TO_WATCH: { icon: Bookmark, color: Tw.color.purple500, short: 'Planifié' },
  PLAN_TO_READ: { icon: Bookmark, color: Tw.color.purple500, short: 'Planifié' },
};

export const ALL_STATUS_META = { icon: Layers, color: Tw.color.primary };

/** Barres de progression et pastilles d'amis : la couleur du statut (`LIST_STATUS_META`), jamais une autre nuance. */
export const LIST_STATUS_BAR = Object.fromEntries(
  Object.entries(LIST_STATUS_META).map(([status, meta]) => [status, alpha(meta.color, 0.9)]),
) as Record<ListStatus, string>;

/** Pastille de diffusion des cartes de recherche (`mediaStatusColorMap`). */
export const MEDIA_STATUS_BG: Record<string, string> = {
  AIRING: Tw.color.green600,
  PAUSED: Tw.color.yellow600,
  ENDED: Tw.color.input,
  STOPPED: Tw.color.red600,
  POSTONED: Tw.color.orange600,
  SOON: Tw.color.purple600,
  UNKNOWN: Tw.color.gray600,
};
