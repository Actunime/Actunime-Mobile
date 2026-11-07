import type {
  IAnime,
  ICharacter,
  ICharacterRelation,
  ICompany,
  ICompanyRelation,
  IFavoris,
  IFavorisTargetType,
  IFriendship,
  IListEntry as ILibListEntry,
  IListEntryVisibility,
  IListStatisticsResponse,
  IListStatus,
  IListEntryFriend,
  IManga,
  IMediaFollowerEntry as ILibMediaFollowerEntry,
  IMediaFollowersInfo,
  IActivity,
  IMediaRelationCarouselResponse,
  INotification,
  IMember,
  IMemberDetailStats as ILibMemberDetailStats,
  IMemberPublicProfile as ILibMemberPublicProfile,
  IMetadata as ILibMetadata,
  INewsArticle as ILibNewsArticle,
  IPaginationResponse,
  IPerson,
  IPersonGroup,
  IPersonRelation,
  IProfileVisibility,
  IProposal,
  IProposalEntityData,
  ISession as ILibSession,
  ITrack,
  ITrackRelation,
  IMediaRelation as ILibMediaRelation,
} from '@actunime/types';
import type { IReportCreateBody, IAnimePaginationBody, IListEntryCreateBody, IMangaPaginationBody, INotificationPreferencesBody } from '@actunime/validations';

import { ApiError } from './api-error';
import { api as client } from './client';
import type { ITokenResponse } from './session';

export { ApiError };

export type MediaKind = 'anime' | 'manga';

/** Types de l'API : ils viennent de `@actunime/types`, jamais recopiés ici (c'était la source des écarts). */
export type ListStatus = IListStatus;
export type ListVisibility = IListEntryVisibility;
export type ProfileVisibility = IProfileVisibility;
export type FavoriteType = IFavorisTargetType;

type KeysOfUnion<U> = U extends unknown ? keyof U : never;
/**
 * Union « élargie » : chaque membre garde ses champs (typés par `@actunime/types`) et reçoit en `undefined` ceux
 * des autres, pour lire `episodesInfo` ou `chaptersInfo` sur une œuvre sans connaître son type.
 */
export type Widen<T, All = T> = T extends unknown ? T & { [K in Exclude<KeysOfUnion<All>, keyof T>]?: undefined } : never;

/** Une œuvre : l'API renvoie un anime ou un manga selon le type demandé. */
export type IMedia = Widen<IAnime | IManga>;
export type IListEntry = ILibListEntry;
export type IPage<T> = IPaginationResponse<T>;
export type IListStatistics = IListStatisticsResponse;
export type IMediaFollowers = IMediaFollowersInfo;
export type IMetadata = ILibMetadata;
export type IMediaRelation = ILibMediaRelation;
export type IMemberPublicProfile = ILibMemberPublicProfile;
export type IMemberDetailStats = ILibMemberDetailStats;
export type IFavorite = IFavoris;
export type IMyProfile = IMember;
export type IFriendRequest = IFriendship;
export type ISession = ILibSession;
export type INewsArticle = ILibNewsArticle;
export type { INotification };
export type ISearchMedia = IMedia;
export type IGenre = ILibMetadata;
export type IPendingProposal = IProposal;
export type IFriendEntry = IListEntryFriend;
export type IMediaFollowerEntry = ILibMediaFollowerEntry;
export type IMemberProfile = ILibMemberPublicProfile['member'];
export type IListStats = ILibMemberDetailStats['animeListStats'];
/** Personnage, staff, musique ou société liés à une œuvre : la fiche liée est dans `data`. */
type WithEntityData<T> = T extends unknown ? Omit<T, 'data'> & { data?: IEntity | null } : never;
export type IMediaLink = Widen<WithEntityData<ICharacterRelation | IPersonRelation | ITrackRelation | ICompanyRelation>>;
/** Fiche d'une entité reliée aux œuvres. */
export type IEntity = Widen<ICharacter | IPerson | ITrack | ICompany>;
/** Élément d'une relation d'entité : une œuvre ou une entité. */
export type IRelated = Widen<IAnime | IManga | ICharacter | IPerson | ITrack | ICompany | IPersonGroup>;
/** Données d'une proposition (selon le type d'entité proposée, tous champs facultatifs). */
export type IProposalData = Widen<IProposalEntityData>;

/** Champs d'une entrée que le membre peut saisir : le corps de création de l'API, sans l'œuvre visée. */
export type IListEntryFields = Omit<IListEntryCreateBody, 'mediaId' | 'mediaType'>;

/** Requête d'une page de recherche d'œuvres. */
export type IMediaSearchBody = IAnimePaginationBody;

/** Entités reliées aux œuvres : personnage, personne (staff, doubleur, artiste), musique, société. */
export type EntityKind = 'character' | 'person' | 'track' | 'company';

/** Relation d'une entité : œuvres où elle apparaît, personnes, personnages, musiques. */
export type EntityRelation = 'animes' | 'mangas' | 'actors' | 'artists' | 'characters' | 'tracks';

export const mediaId = (e: { id: string }): string => e.id;

/** Page d'œuvres d'un type : les corps de recherche d'anime et de manga ne se recoupent pas tout à fait. */
async function paginateMedia(kind: MediaKind, request: IMediaSearchBody): Promise<IPage<IMedia>> {
  const c = client();
  const res = kind === 'manga' ? await c.mangas.paginate(request as IMangaPaginationBody) : await c.animes.paginate(request);
  return res.data;
}

/** Quelques routes d'écriture de liste renvoient le document stocké (`_id`) au lieu de `id`. */
const withId = <T extends { id: string }>(doc: T): T => {
  const stored = doc as T & { _id?: string };
  return { ...doc, id: stored.id ?? stored._id } as T;
};

/** Les modules du client partagé enveloppent la réponse HTTP : l'app ne garde que le corps. */
const body = <R extends { data: unknown }>(response: R): R['data'] => response.data;

const mediaTypeOf = (kind: MediaKind) => (kind === 'manga' ? 'Manga' : 'Anime') as 'Manga' | 'Anime';

/** Une page de résultats entière d'un type donné, en suivant `hasNextPage` (bornée pour ne jamais boucler). */
async function allPages<T>(fetchPage: (page: number) => Promise<IPage<T>>, maxPages: number): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetchPage(page);
    all.push(...res.results);
    if (!res.hasNextPage) break;
  }
  return all;
}

export const api = {
  /** Échange le code de connexion (PKCE) contre le jeton de l'app. */
  async exchangeCode(code: string, codeVerifier: string) {
    const res = await client().auth.exchangeExtensionCode({ code, codeVerifier });
    return res.data as ITokenResponse & {
      user: { id: string; username: string; displayName?: string; avatarUrl?: string | null };
    };
  },

  async searchByKind(kind: MediaKind, search: string, limit = 6) {
    return (await paginateMedia(kind, { query: { search }, limit, page: 1 })).results;
  },

  /** Recherche paginée pour l'écran Recherche (œuvres vérifiées, publique). */
  async searchMedia(kind: MediaKind, search: string, page = 1, limit = 20) {
    return paginateMedia(kind, { query: { search }, limit, page });
  },

  /** Page de recherche avec filtres et tri, comme la page Animes / Mangas du site. */
  async searchCatalog(kind: MediaKind, request: IMediaSearchBody) {
    return paginateMedia(kind, request);
  },

  /** Métadonnées d'un type (genres, thèmes, démographies, tags) pour le tiroir des filtres. */
  async searchMetadata(type: string, search = '') {
    return body(await client().metadata.search({ type, search }));
  },

  /** Aperçu des personnages, du staff, des musiques ou des sociétés d'une œuvre. */
  async getMediaLinks(kind: MediaKind, id: string, what: 'characters' | 'staffs' | 'tracks' | 'companies', limit = 12, page = 1) {
    const c = client();
    const request = { page, limit };
    // Les mangas n'ont pas de musiques : seuls les animes en exposent.
    if (what === 'tracks') return body(await c.animes.paginateTracks(id, request)) as IPage<IMediaLink>;
    const media = kind === 'manga' ? c.mangas : c.animes;
    const res =
      what === 'characters'
        ? await media.paginateCharacters(id, request)
        : what === 'staffs'
          ? await media.paginateStaffs(id, request)
          : await media.paginateCompanies(id, request);
    return body(res) as IPage<IMediaLink>;
  },

  /** Actualités publiées reliées à une fiche (publiques). */
  async getMediaNews(id: string) {
    return body(await client().news.getByMedia(id));
  },

  async getMyProfile() {
    return body(await client().profile.get());
  },

  async updateMyProfile(data: { displayName?: string; description?: string }) {
    return body(await client().profile.update(data));
  },

  async getMyPrivacy() {
    return body(await client().members.getMyPrivacy());
  },

  async setMyPrivacy(profileVisibility: ProfileVisibility) {
    return body(await client().members.setMyPrivacy(profileVisibility));
  },

  async listMyBlocks() {
    return body(await client().userBlocks.listMine());
  },

  async unblockMember(memberId: string) {
    return body(await client().userBlocks.unblock(memberId));
  },

  async listFriendRequests(direction: 'incoming' | 'outgoing') {
    const friendships = client().friendships;
    return body(await (direction === 'incoming' ? friendships.listIncoming() : friendships.listOutgoing()));
  },

  async answerFriendRequest(id: string, action: 'accept' | 'reject' | 'cancel') {
    return body(await client().friendships[action](id));
  },

  async listMySessions() {
    return body(await client().auth.sessions());
  },

  async deleteSession(id: string) {
    return body(await client().auth.deleteSession(id));
  },

  /** Animes en cours ou à venir (pour l'agenda), toutes pages : l'agenda ne doit perdre aucune sortie. */
  async getAgendaAnimes() {
    const all = [];
    for (const status of ['AIRING', 'SOON'] as const) {
      all.push(
        ...(await allPages(
          async (page) =>
            body(
              await client().animes.paginate({
                page,
                limit: 100,
                query: { verified: true, status },
                sort: { 'date.start': 'asc' },
              }),
            ),
          20,
        )),
      );
    }
    return all;
  },

  /** Animes de la saison en cours (`current`) ou suivante (`next`), par date de début. */
  async getSeasonAnimes(period: 'current' | 'next') {
    const res = await client().animes.paginate({
      page: 1,
      limit: 20,
      query: { verified: true, seasonPeriod: period },
      sort: { 'date.start': 'asc' },
    });
    return body(res).results;
  },

  async getMemberProfile(username: string) {
    return body(await client().profile.getPublicProfile(username));
  },

  async getMemberStats(username: string) {
    return body(await client().members.detailStats(username));
  },

  /** Une page de la liste d'un membre (celle d'un autre membre ne montre que ce qu'il laisse voir). */
  async getMemberList(memberId: string, mediaType: 'Anime' | 'Manga', status: ListStatus | undefined, page = 1, limit = 30) {
    return body(
      await client().lists.paginateMember(memberId, {
        page,
        limit,
        query: { mediaType, ...(status ? { status } : {}) },
        sort: { updatedAt: 'desc' },
      }),
    );
  },

  async getMemberFavorites(memberId: string, type: FavoriteType | undefined, page = 1, limit = 30) {
    return body(
      await client().favoris.paginateMember(memberId, {
        page,
        limit,
        query: type ? { targetType: type } : {},
        sort: { createdAt: 'desc' },
      }),
    );
  },

  async getEntity(kind: EntityKind, id: string) {
    const c = client();
    const res =
      kind === 'character'
        ? await c.characters.get({ id })
        : kind === 'person'
          ? await c.persons.get({ id })
          : kind === 'track'
            ? await c.tracks.get({ id })
            : await c.companies.get({ id });
    return body(res) as IEntity;
  },

  /** Une page d'une relation de l'entité (œuvres, personnes, personnages, musiques). */
  async getEntityRelation(kind: EntityKind, id: string, relation: EntityRelation, page = 1, limit = 12) {
    const c = client();
    const request = { page, limit };
    const pick = () => {
      switch (`${kind}:${relation}`) {
        case 'character:animes': return c.characters.paginateAnimes(id, request);
        case 'character:mangas': return c.characters.paginateMangas(id, request);
        case 'character:actors': return c.characters.paginateActors(id, request);
        case 'person:animes': return c.persons.paginateAnimes(id, request);
        case 'person:mangas': return c.persons.paginateMangas(id, request);
        case 'person:characters': return c.persons.paginateCharacters(id, request);
        case 'person:tracks': return c.persons.paginateTracks(id, request);
        case 'track:animes': return c.tracks.paginateAnimes(id, request);
        case 'track:artists': return c.tracks.paginateArtists(id, request);
        case 'company:animes': return c.companies.paginateAnimes(id, request);
        case 'company:mangas': return c.companies.paginateMangas(id, request);
        default: throw new ApiError(400, `Relation ${relation} inconnue pour ${kind}`);
      }
    };
    return body(await pick()) as IPage<IRelated>;
  },

  async getMediaFollowers(kind: MediaKind, id: string) {
    return body(await client().community.getMediaFollowers(mediaTypeOf(kind), id));
  },

  async getRelations(kind: MediaKind, id: string): Promise<IMediaRelationCarouselResponse> {
    return body(await client().mediaRelations.getCarousel({ mediaId: id, mediaType: mediaTypeOf(kind) }));
  },

  /** Tendances d'une période (`useTrendingAnimes` du site) : fiches vérifiées dans l'ordre du classement. */
  async getTrending(kind: MediaKind, period: '24h' | '7d' | '30d') {
    const res = body(await client().trending.get({ period, type: mediaTypeOf(kind), limit: 20 }));
    const medias = await Promise.all(
      (res.entities ?? []).map((e) => api.getMedia(kind, e.entityId).catch(() => null)),
    );
    return medias.filter((m): m is IMedia => m?.verified === true);
  },

  async getMedia(kind: MediaKind, id: string) {
    const c = client();
    return body(kind === 'manga' ? await c.mangas.get({ id }) : await c.animes.get({ id })) as IMedia;
  },

  async getGenres(ids: (string | number)[]) {
    if (ids.length === 0) return [];
    return body(await client().metadata.getByIds(ids.map(Number)));
  },

  async getListByMedia(id: string) {
    // 200 sans corps quand l'œuvre n'est pas dans ma liste : le client le rend en texte vide.
    return (body(await client().lists.getByMedia(id)) || null) as IListEntry | null;
  },

  /** Ma liste, une page à la fois, filtrée par type et statut (œuvres peuplées). */
  async getMyList(params: { mediaType: 'Anime' | 'Manga'; status?: ListStatus; page?: number; limit?: number }) {
    const { mediaType, status, page = 1, limit = 30 } = params;
    return body(await client().lists.paginate({ page, limit, query: { mediaType, ...(status ? { status } : {}) } }));
  },

  /** Toute ma liste d'un type, tous statuts (pages de 200 enchaînées, comme `useMyList` du site). */
  getAllMyEntries(mediaType: 'Anime' | 'Manga') {
    return allPages(async (page) => body(await client().lists.paginate({ page, limit: 200, query: { mediaType } })), 50);
  },

  /** Toutes les entrées de ma liste pour un type et un statut (pages de 100 enchaînées), œuvres peuplées. */
  getAllMyList(mediaType: 'Anime' | 'Manga', status: ListStatus) {
    return allPages(async (page) => body(await client().lists.paginate({ page, limit: 100, query: { mediaType, status } })), 20);
  },

  async getListStatistics() {
    return body(await client().lists.statistics);
  },

  async createListEntry(request: { mediaId: string; mediaType: 'Anime' | 'Manga' } & IListEntryFields) {
    return body(await client().lists.create(request));
  },

  /** Entrées de ma liste dont l'œuvre est encore en attente de validation. */
  async getPendingListEntries() {
    // Absent du client partagé : appel direct sur son instance HTTP en attendant qu'il l'expose.
    return (await client().getHttp().get<IListEntry[]>('/lists/pending')).data;
  },

  /** Propositions d'ajout en attente (celles de tous les membres) dont le titre correspond. */
  async searchPendingProposals(kind: MediaKind, search: string, limit = 5) {
    const res = await client().proposals.paginate({
      query: { search, status: 'PENDING', mode: 'CREATION', entityType: mediaTypeOf(kind) },
      limit,
      page: 1,
    });
    return body(res).results;
  },

  /**
   * Ajout rapide d'une œuvre absente du catalogue : crée (ou rejoint) une proposition « Ajout rapide »
   * et l'entrée de liste correspondante, sans activité publique. Un jeton Bearer n'a pas besoin de Turnstile.
   */
  async quickAdd(request: {
    mediaType: 'Anime' | 'Manga';
    title: string;
    format: string;
    status?: ListStatus;
    aliases?: string[];
  }) {
    const result = body(await client().lists.quickAdd(request));
    // Cette route renvoie l'entrée telle que stockée (`_id`), contrairement aux autres routes de liste (`id`).
    return { ...result, entry: result.entry ? withId(result.entry) : null } as typeof result;
  },

  /** Ajoute à ma liste une œuvre proposée mais pas encore validée. */
  async createListEntryFromProposal(request: {
    proposalId: string;
    mediaType: 'Anime' | 'Manga';
    status: string;
    preview: { title: string; coverImage?: string };
  }) {
    return withId((await client().getHttp().post<IListEntry>('/lists/from-proposal', request)).data);
  },

  /** L'œuvre est-elle dans mes favoris ? */
  async isFavorite(targetId: string, targetType: 'Anime' | 'Manga') {
    return body(await client().favoris.check(targetId, targetType));
  },

  async toggleFavorite(targetId: string, targetType: 'Anime' | 'Manga') {
    return body(await client().favoris.toggle({ targetId, targetType }));
  },

  async updateListEntry(id: string, patch: Partial<IListEntryFields>) {
    return body(await client().lists.update(id, patch));
  },

  async deleteListEntry(id: string) {
    return body(await client().lists.delete(id));
  },

  /** Mes notifications, les plus récentes d'abord. */
  async listNotifications(page = 1, limit = 20) {
    const res = await client().notifications.paginate({ page, limit });
    return body(res) as IPage<INotification>;
  },

  async notificationStats() {
    return body(await client().notifications.stats());
  },

  async markNotificationsRead(ids: string[]) {
    return body(await client().notifications.markAsRead({ notificationIds: ids }));
  },

  async markAllNotificationsRead() {
    return body(await client().notifications.markAllAsRead());
  },

  async deleteReadNotifications() {
    return body(await client().notifications.deleteReadAll());
  },

  async getNotificationPreferences() {
    return body(await client().notifications.getMyPreferences());
  },

  async setNotificationPreferences(preferences: INotificationPreferencesBody['preferences']) {
    return body(await client().notifications.setMyPreferences({ preferences }));
  },

  /** Mon compte (`hasPassword` : faux pour un compte créé avec Discord, qui n'a pas de mot de passe à saisir). */
  async getAccount() {
    return body(await client().auth.getMe());
  },

  async changePassword(request: { currentPassword: string; newPassword: string }) {
    return body(await client().auth.changePassword(request));
  },

  async requestAccountDeletion(request: { reason: string; confirmPassword?: string }) {
    return body(await client().auth.requestAccountDeletion(request));
  },

  async cancelAccountDeletion() {
    return body(await client().auth.cancelAccountDeletion());
  },

  async getAccountDeletionStatus() {
    return (body(await client().auth.getAccountDeletionStatus()) || null) as Awaited<ReturnType<ReturnType<typeof client>['auth']['getAccountDeletionStatus']>>['data'];
  },

  /** Statistiques de la fiche : répartition des listes, favoris, activité. */
  async getMediaStats(kind: MediaKind, id: string) {
    const c = client();
    return body(kind === 'manga' ? await c.mangas.detailStats(id) : await c.animes.detailStats(id));
  },

  /** Activités récentes liées à une fiche. */
  async getMediaActivities(kind: MediaKind, id: string, page = 1, limit = 20) {
    const res = await client().activities.paginate({
      page,
      limit,
      sort: { createdAt: -1 },
      query: { targetId: id, targetType: mediaTypeOf(kind) },
    } as never);
    return body(res) as IPage<IActivity>;
  },

  /** Épisodes diffusés sur Crunchyroll pour un anime. */
  async getAnimeEpisodes(id: string) {
    return body(await client().crunchyroll.getAnimeEpisodes(id)) ?? [];
  },

  /** Une page de personnages, personnes, musiques ou sociétés, filtrée par un texte (annuaire « Découvrir »). */
  async searchEntities(kind: EntityKind, search: string, page = 1, limit = 20) {
    const c = client();
    const request = { page, limit, query: search ? { search } : {} };
    const res =
      kind === 'character'
        ? await c.characters.paginate(request)
        : kind === 'person'
          ? await c.persons.paginate(request)
          : kind === 'track'
            ? await c.tracks.paginate(request)
            : await c.companies.paginate(request);
    return body(res) as IPage<IEntity>;
  },

  /** Chiffres de la communauté sur une période (hub Communauté du site). */
  async getCommunityStats(period: '7d' | '30d' | 'season' = '7d') {
    return body(await client().community.getStats(period));
  },

  /** Œuvres regardées en ce moment par la communauté. */
  async getCommunityNowWatching(limit = 10) {
    return body(await client().community.getNowWatching(limit));
  },

  /** Œuvres les plus ajoutées ou en hausse sur la période. */
  async getCommunityRankings(metric: 'most-added' | 'rising', period: '7d' | '30d' | 'season' = '7d', limit = 10) {
    return body(await client().community.getRankings(metric, { period, limit }));
  },

  /** Une page de l'annuaire des membres (les profils privés n'y apparaissent pas ou sont anonymisés par l'API). */
  async searchMembers(search: string, page = 1, limit = 20) {
    const res = await client().members.paginate({ page, limit, query: search ? { search } : {}, sort: { createdAt: 'desc' } } as never);
    return body(res) as IPage<IMember>;
  },

  /** Classement des contributeurs (propositions validées, points, palier). */
  async getContributorsLeaderboard(period: 'week' | 'month' | 'all' = 'month', limit = 20) {
    return body(await client().proposals.leaderboard({ period, limit }));
  },

  /** Une page de propositions, les plus récentes d'abord ; `status` filtre sur un statut. */
  async listProposals(status: string | undefined, page = 1, limit = 20) {
    const res = await client().proposals.paginate({
      page,
      limit,
      query: status ? { status } : {},
      sort: { createdAt: -1 },
    } as never);
    return body(res) as IPage<IProposal>;
  },

  /** Motifs de signalement proposés (selon qu'on signale une fiche ou un membre). */
  async getReportSubjects(target: 'media' | 'member') {
    return body(await client().metadata.search({ type: target === 'member' ? 'REPORT_MEMBER_SUBJECT' : 'REPORT_MEDIA_SUBJECT' } as never));
  },

  async sendReport(request: IReportCreateBody) {
    return body(await client().reports.create(request));
  },

  /** Où en est l'amitié entre moi et un membre (aucune, demande reçue ou envoyée, amis, bloqué). */
  async friendshipStatus(memberId: string) {
    const map = body(await client().friendships.statusBatch({ ids: [memberId] }));
    return map[memberId] ?? { status: 'NONE' as const };
  },

  async sendFriendRequest(memberId: string) {
    return body(await client().friendships.request(memberId));
  },

  async removeFriend(memberId: string) {
    return body(await client().friendships.remove(memberId));
  },

  async blockMember(memberId: string) {
    return body(await client().userBlocks.block(memberId));
  },

  /** Propose une correction de fiche (mise à jour) : la modération la vérifie avant qu'elle soit appliquée. */
  async proposeMediaUpdate(kind: MediaKind, id: string, changes: Record<string, unknown>) {
    return body(
      await client().proposals.create({
        mode: 'UPDATE',
        entityType: mediaTypeOf(kind),
        targetEntityId: id,
        mainDependency: changes,
        dependencies: [],
      } as never),
    );
  },

  /** Propose d'ajouter une relation (musique, société) à une fiche : la modération la vérifie avant de l'appliquer. */
  async proposeRelationAdd(kind: MediaKind, id: string, relation: Record<string, unknown>) {
    return body(
      await client().proposals.create({
        mode: 'UPDATE',
        entityType: mediaTypeOf(kind),
        targetEntityId: id,
        mainDependency: {},
        ...relation,
        dependencies: [],
      } as never),
    );
  },
};
