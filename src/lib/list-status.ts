import { CircleCheck, CirclePause, CircleX, Bookmark, BookOpen, Layers, Play, type LucideIcon } from 'lucide-react-native';

import { Tw } from '@/constants/theme';

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

/** `bg-*-600/90` des barres de progression et des pastilles d'amis. */
export const LIST_STATUS_BAR: Record<ListStatus, string> = {
  WATCHING: 'rgba(21, 93, 252, 0.9)',
  READING: 'rgba(21, 93, 252, 0.9)',
  COMPLETED: 'rgba(0, 166, 62, 0.9)',
  ON_HOLD: 'rgba(208, 135, 0, 0.9)',
  DROPPED: 'rgba(231, 0, 11, 0.9)',
  PLAN_TO_WATCH: 'rgba(152, 16, 250, 0.9)',
  PLAN_TO_READ: 'rgba(152, 16, 250, 0.9)',
};

/** Pastille de diffusion des cartes de recherche (`mediaStatusColorMap`). */
export const MEDIA_STATUS_BG: Record<string, string> = {
  AIRING: Tw.color.green600,
  PAUSED: Tw.color.yellow600,
  ENDED: Tw.color.blue600,
  STOPPED: Tw.color.red600,
  POSTONED: Tw.color.orange600,
  SOON: Tw.color.purple600,
  UNKNOWN: Tw.color.gray600,
};
