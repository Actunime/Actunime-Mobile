import { useEffect, useRef } from 'react';

import { airedFor } from '@/components/cards/media-cards';
import { ListEntrySheet } from '@/components/list/list-entry-sheet';
import { openMedia } from '@/components/media-row';
import { mediaId, type IListEntry, type IMedia, type MediaKind } from '@/lib/api';
import { MEDIA_STATUS_LABELS } from '@/lib/list-form';
import { mediaTitle, totalOf } from '@/lib/media';
import { useIsFavorite, usePatchEntry, useRemoveEntry, useSaveEntry, useToggleFavorite } from '@/lib/queries';

interface IManageEntryProps {
  kind: MediaKind;
  media: IMedia | null;
  /** Mon entrée pour l'œuvre (cache de ma liste), `null` si elle n'y est pas encore. */
  entry: IListEntry | null;
  open: boolean;
  onClose: () => void;
  /** Noms des genres de l'œuvre, pour les petites pastilles du haut. */
  genres?: string[];
  /** Le bouton « Voir la fiche » n'a pas de sens depuis la fiche elle-même. */
  hideViewEntity?: boolean;
}

/**
 * Gestion d'une œuvre dans ma liste sur téléphone (`ManageListEntry` du site) : « ajouter » crée l'entrée
 * « Planifié » puis ouvre le tiroir pour l'ajuster ; « Retirer » dans le tiroir l'annule.
 */
export function ManageEntry({ kind, media, entry, open, onClose, genres, hideViewEntity }: Readonly<IManageEntryProps>) {
  const save = useSaveEntry();
  const patch = usePatchEntry();
  const remove = useRemoveEntry();
  const creating = useRef(false);
  const mediaType = kind === 'anime' ? 'Anime' : 'Manga';
  const id = media ? mediaId(media) : undefined;
  const favorite = useIsFavorite(open ? id : undefined, mediaType);
  const toggleFavorite = useToggleFavorite(id, mediaType);

  useEffect(() => {
    if (!open) {
      creating.current = false;
      return;
    }
    if (entry || creating.current || !id) return;
    creating.current = true;
    save
      .mutateAsync({
        mediaId: id,
        mediaType,
        fields: { status: kind === 'anime' ? 'PLAN_TO_WATCH' : 'PLAN_TO_READ' },
        update: {},
      })
      .catch(onClose);
  }, [open, entry, id, kind, mediaType, save, onClose]);

  const total = totalOf(kind, media);
  return (
    <ListEntrySheet
      open={open && !!entry}
      onClose={onClose}
      entry={entry}
      kind={kind}
      title={mediaTitle(media)}
      posterUrl={media?.posterUrl}
      subtitle={total ? `${total} ${kind === 'anime' ? 'épisodes' : 'chapitres'}` : undefined}
      infoBadges={[
        media?.format,
        media?.status ? MEDIA_STATUS_LABELS[media.status] : undefined,
        media?.episodesInfo?.durationMinutes ? `${media.episodesInfo.durationMinutes} min` : undefined,
        ...(genres ?? []).slice(0, 3),
      ].filter((label): label is string => !!label)}
      total={total}
      available={airedFor(kind, media)}
      onViewEntity={
        id && !hideViewEntity
          ? () => {
              onClose();
              openMedia(kind, id);
            }
          : undefined
      }
      onChange={(p) => entry && patch.mutate({ entry, patch: p })}
      isFavorite={!!favorite.data}
      onToggleFavorite={id ? () => toggleFavorite.mutate() : undefined}
      onRemove={entry ? () => remove.mutate({ entry, mediaId: id ?? '' }) : undefined}
    />
  );
}
