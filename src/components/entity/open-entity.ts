import { router, type Href } from 'expo-router';

import type { EntityKind, EntityRelation, MediaKind } from '@/lib/api';

/** Fiche d'un personnage, d'une personne, d'une musique ou d'une société : un écran de l'app, jamais le site. */
export function openEntity(kind: EntityKind, id: string): void {
  router.push(`/${kind}/${encodeURIComponent(id)}` as Href);
}

/** Liste complète (« Voir tout ») d'une relation d'une œuvre : personnages, staff, musiques, sociétés. */
export function openMediaRelations(kind: MediaKind, id: string, what: 'characters' | 'staffs' | 'tracks' | 'companies'): void {
  router.push({ pathname: '/relations', params: { scope: 'media', kind, id, what } });
}

/** Liste complète (« Voir tout ») d'une relation d'une entité : œuvres, personnes, personnages, musiques. */
export function openEntityRelations(kind: EntityKind, id: string, what: EntityRelation): void {
  router.push({ pathname: '/relations', params: { scope: 'entity', kind, id, what } });
}
