import type { EntityKind, EntityRelation, IEntity } from './api';
import { formatLongDate } from './media';

/** Libellés français des champs d'un personnage, d'une musique, d'une société (`*Obj` des types partagés). */
export const CHARACTER_ROLE_LABELS: Record<string, string> = {
  PRINCIPAL: 'Principal',
  SECONDAIRE: 'Secondaire',
  FIGURANT: 'Figurant',
  ANTAGONISTE: 'Antagoniste',
  SOUTIEN: 'Soutien',
};
export const CHARACTER_GENDER_LABELS: Record<string, string> = {
  MASCULIN: 'Masculin',
  FEMININ: 'Féminin',
  NEUTRE: 'Neutre',
  TRANSGENRE: 'Transgenre',
  NON_BINAIRE: 'Non binaire',
  GENRE_FLUIDE: 'Genre fluide',
  AUTRE: 'Autre',
};
export const CHARACTER_SPECIES_LABELS: Record<string, string> = {
  HUMAIN: 'Humain',
  ELFE: 'Elfe',
  NAIN: 'Nain',
  LEZARD: 'Lézard',
  DRAGON: 'Dragon',
  ORC: 'Orc',
  AUTRE: 'Autre',
};
export const TRACK_TYPE_LABELS: Record<string, string> = { OPENING: 'Opening', ENDING: 'Ending', BGM: 'BGM', INSERT: 'INSERT' };
export const COMPANY_TYPE_LABELS: Record<string, string> = {
  STUDIO: 'Studio',
  PRODUCER: 'Producteur',
  PUBLISHER: 'Editeur',
  LABEL: 'Label',
};

export const entityId = (entity: { id?: string; _id?: string }): string => (entity.id ?? entity._id) as string;

export const entityName = (entity?: IEntity | null): string => entity?.name?.original?.trim() || 'Sans nom';

/** Visuel d'une entité : avatar (personnage, personne), pochette (musique) ou logo (société). */
export const entityImage = (entity?: IEntity | null): string | null =>
  entity?.avatarUrl ?? entity?.coverUrl ?? entity?.logoUrl ?? null;

/** Pastille sous le nom : rôle d'un personnage, type d'une musique ou d'une société. */
export function entityBadge(kind: EntityKind, entity?: IEntity | null): string | undefined {
  if (!entity) return undefined;
  if (kind === 'character') return entity.role ? (CHARACTER_ROLE_LABELS[entity.role] ?? entity.role) : undefined;
  if (kind === 'track') return entity.type ? (TRACK_TYPE_LABELS[entity.type] ?? entity.type) : undefined;
  if (kind === 'company') return entity.type ? (COMPANY_TYPE_LABELS[entity.type] ?? entity.type) : undefined;
  return undefined;
}

export interface IEntityRow {
  label: string;
  value: string;
}

/** Lignes d'informations de la fiche (colonne latérale du site) : espèce, genre, âge, naissance, sortie, fondation. */
export function entityInfoRows(kind: EntityKind, entity?: IEntity | null): IEntityRow[] {
  if (!entity) return [];
  const rows: (IEntityRow | null)[] = [];
  if (kind === 'character') {
    rows.push(
      entity.species ? { label: 'Espèce', value: CHARACTER_SPECIES_LABELS[entity.species] ?? entity.species } : null,
      entity.gender ? { label: 'Genre', value: CHARACTER_GENDER_LABELS[entity.gender] ?? entity.gender } : null,
      entity.age !== undefined && entity.age !== null ? { label: 'Âge', value: String(entity.age) } : null,
    );
  } else if (kind === 'person') {
    const born = formatLongDate(entity.birthDate);
    const died = formatLongDate(entity.deathDate);
    rows.push(born ? { label: 'Naissance', value: born } : null, died ? { label: 'Décès', value: died } : null);
  } else if (kind === 'track') {
    const released = entity.releaseDate ? new Date(entity.releaseDate).toLocaleDateString('fr-FR') : null;
    rows.push(released ? { label: 'Sortie', value: released } : null);
  } else {
    const year = entity.createdDate ? new Date(entity.createdDate).getFullYear() : null;
    rows.push(year && Number.isFinite(year) ? { label: 'Fondée', value: String(year) } : null);
  }
  return rows.filter((row): row is IEntityRow => row !== null);
}

export type RelatedKind = 'anime' | 'manga' | EntityKind;

export interface IEntitySection {
  relation: EntityRelation;
  title: string;
  /** Nature des éléments, pour savoir où ils mènent. */
  itemKind: RelatedKind;
}

/** Sections d'une fiche d'entité, dans l'ordre et avec les titres du site. */
export const ENTITY_SECTIONS: Record<EntityKind, IEntitySection[]> = {
  character: [
    { relation: 'animes', title: 'Apparaît dans (animes)', itemKind: 'anime' },
    { relation: 'mangas', title: 'Apparaît dans (mangas)', itemKind: 'manga' },
    { relation: 'actors', title: 'Doubleurs', itemKind: 'person' },
  ],
  person: [
    { relation: 'animes', title: 'Animes', itemKind: 'anime' },
    { relation: 'mangas', title: 'Mangas', itemKind: 'manga' },
    { relation: 'characters', title: 'Personnages doublés', itemKind: 'character' },
    { relation: 'tracks', title: 'Musiques', itemKind: 'track' },
  ],
  track: [
    { relation: 'animes', title: 'Diffusée dans', itemKind: 'anime' },
    { relation: 'artists', title: 'Artistes', itemKind: 'person' },
  ],
  company: [
    { relation: 'animes', title: 'Animes', itemKind: 'anime' },
    { relation: 'mangas', title: 'Mangas', itemKind: 'manga' },
  ],
};

/** Libellé de l'écran de liste « Voir tout » d'une relation d'une œuvre. */
export const MEDIA_RELATION_TITLES: Record<'characters' | 'staffs' | 'tracks' | 'companies', string> = {
  characters: 'Personnages',
  staffs: 'Staff',
  tracks: 'Musiques',
  companies: 'Sociétés',
};
