import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Bookmark, Clock, X } from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';

import { openMedia } from '@/components/media-row';
import { AuraAvatar } from '@/components/member/aura-avatar';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { api } from '@/lib/api';
import { useSaveEntry } from '@/lib/queries';
import { plannedStatus, RECOMMENDATION_REASONS, recommendationPoster, recommendationSender, recommendationTitle, type IRecommendation, type IRecommendationAnswer } from '@/lib/recommendations';
import { signatureNameColor } from '@/lib/signature';
import { Pill } from '@/components/media/detail-parts';

/** Recommandations reçues en attente de réponse, avec leurs trois réponses (`ReceivedRecommendations` du site). */
export const useReceivedRecommendations = () =>
  useQuery({ queryKey: ['recommendations', 'received'], queryFn: () => api.getReceivedRecommendations('PENDING'), staleTime: 60_000, retry: false });

function RecommendationCard({ rec }: Readonly<{ rec: IRecommendation }>) {
  const client = useQueryClient();
  const save = useSaveEntry();
  const respond = useMutation({
    mutationFn: (status: IRecommendationAnswer) => api.respondToRecommendation(rec.id, status),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['recommendations'] }),
  });
  const kind = rec.mediaType === 'Anime' ? 'anime' : 'manga';
  const poster = recommendationPoster(rec);
  const busy = respond.isPending || save.isPending;
  // « Ma liste » ajoute d'abord l'œuvre (à voir / à lire), puis répond : la réponse « ajoutée » ne se dit qu'une fois l'ajout fait.
  const addToList = async () => {
    await save.mutateAsync({ mediaId: rec.mediaId, mediaType: rec.mediaType, entry: null, fields: { status: plannedStatus(rec.mediaType) }, update: {} });
    respond.mutate('ACCEPTED');
  };
  return (
    <View style={styles.card}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Ouvrir ${recommendationTitle(rec)}`} onPress={() => openMedia(kind, rec.mediaId)} style={styles.poster}>
        {poster ? <Image source={{ uri: poster }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
      </Pressable>
      <View style={styles.body}>
        <View style={styles.sender}>
          {rec.from ? <AuraAvatar uri={rec.from.avatarUrl} name={recommendationSender(rec)} size={24} radius={12} signature={rec.from.signature} tier={rec.from.contributionTier} /> : null}
          <Txt size="sm" numberOfLines={2} style={styles.flex}>
            <Txt size="sm" weight="semibold" color={signatureNameColor(rec.from?.signature)}>
              {recommendationSender(rec)}
            </Txt>{' '}
            te recommande{' '}
            <Txt size="sm" weight="semibold" onPress={() => openMedia(kind, rec.mediaId)}>
              {recommendationTitle(rec)}
            </Txt>
          </Txt>
        </View>
        <Txt size="xs" color={Tw.color.mutedForeground}>
          {RECOMMENDATION_REASONS[rec.reason]}
        </Txt>
        {rec.message ? (
          <Txt size="sm" color={Tw.color.mutedForeground} style={styles.message}>
            « {rec.message} »
          </Txt>
        ) : null}
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => void addToList()} style={[styles.action, styles.primary, busy && styles.disabled]}>
            <Bookmark size={14} color={Tw.color.primaryForeground} />
            <Txt size="xs" weight="semibold" color={Tw.color.primaryForeground}>
              Ma liste
            </Txt>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => respond.mutate('LATER')} style={[styles.action, busy && styles.disabled]}>
            <Clock size={14} color={Tw.color.foreground} />
            <Txt size="xs" weight="medium">
              Plus tard
            </Txt>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={busy} onPress={() => respond.mutate('DECLINED')} style={[styles.action, busy && styles.disabled]}>
            <X size={14} color={Tw.color.mutedForeground} />
            <Txt size="xs" weight="medium" color={Tw.color.mutedForeground}>
              Pas pour moi
            </Txt>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

/** Carte « Recommandé par tes amis » : rien tant qu'il n'y en a pas (ou si l'API ne connaît pas encore les recommandations). */
export function ReceivedRecommendations() {
  const { data } = useReceivedRecommendations();
  const items = data?.results ?? [];
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.title}>
        <Txt size="lg" weight="semibold">
          Recommandé par tes amis
        </Txt>
        <Pill label={String(items.length)} color={Tw.color.primary} background="rgba(0,153,255,0.12)" border="rgba(0,153,255,0.35)" />
      </View>
      {items.map((rec) => (
        <RecommendationCard key={rec.id} rec={rec} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  section: { gap: 8 },
  title: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  card: { flexDirection: 'row', gap: 12, padding: 12, borderRadius: Tw.radius.xl, backgroundColor: Tw.color.card },
  poster: { width: 64, height: 96, borderRadius: Tw.radius.md, overflow: 'hidden', backgroundColor: Tw.color.muted },
  body: { flex: 1, gap: 6 },
  sender: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  message: { fontStyle: 'italic' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: Tw.radius.md, backgroundColor: Tw.color.input },
  primary: { backgroundColor: Tw.color.primary },
  disabled: { opacity: 0.5 },
});
