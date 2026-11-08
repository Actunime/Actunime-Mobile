import { Image } from 'expo-image';
import { router, type Href } from 'expo-router';
import { Sparkles, Users } from 'lucide-react-native';
import { ScrollView, StyleSheet, View } from 'react-native';

import { openMedia } from '@/components/media-row';
import { SectionCard } from '@/components/media/detail-parts';
import { AuraAvatar } from '@/components/member/aura-avatar';
import { openMember } from '@/components/member/open-member';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Tw } from '@/constants/theme';
import { useAffinity, useMemberFriends } from '@/lib/queries';

/**
 * Bloc Social d'un profil (`ProfileSocial` du site) : compatibilité avec moi (score, œuvres en commun) et amis du
 * membre. Rien n'est affiché quand il n'y a ni affinité ni ami à montrer.
 */
export function ProfileSocial({ memberId, isOwner, signedIn, friendsVisible }: Readonly<{ memberId: string; isOwner: boolean; signedIn: boolean; friendsVisible: boolean }>) {
  const affinity = useAffinity(memberId, signedIn && !isOwner).data;
  const friendsData = useMemberFriends(memberId, friendsVisible).data;
  const friends = friendsData?.friends ?? [];
  const hasAffinity = !isOwner && !!affinity?.available && affinity.commonCount > 0;
  if (!hasAffinity && friends.length === 0) return null;
  const total = Math.max(friendsData?.total ?? 0, friends.length);

  return (
    <SectionCard title="Social" icon={Users} count={total > 0 ? total : undefined}>
      <View style={styles.stack}>
        {hasAffinity && affinity ? (
          <View style={styles.stack}>
            <View style={styles.row}>
              <Sparkles size={16} color={Tw.color.primary} />
              <Txt size="sm" weight="semibold" color={Tw.color.primary}>
                {affinity.score} % compatible avec toi
              </Txt>
            </View>
            <Txt size="xs" color={Tw.color.mutedForeground}>
              {affinity.commonCount > 1 ? `${affinity.commonCount} œuvres en commun` : '1 œuvre en commun'}
            </Txt>
            {affinity.topCommon.length > 0 ? (
              <View style={styles.row}>
                {affinity.topCommon.map((media) => (
                  <Pressable key={`${media.mediaType}:${media.mediaId}`} accessibilityRole="button" accessibilityLabel={media.title ?? 'Œuvre en commun'} onPress={() => openMedia(media.mediaType === 'Manga' ? 'manga' : 'anime', media.mediaId)} style={styles.poster}>
                    {media.posterUrl ? <Image source={{ uri: media.posterUrl }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
        {friends.length > 0 ? (
          <View style={styles.stack}>
            <Txt size="xs" weight="medium" color={Tw.color.mutedForeground}>
              {isOwner ? 'Tes amis' : 'Amis'}
            </Txt>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
              {friends.map((friend) => (
                <Pressable key={friend.id} accessibilityRole="button" accessibilityLabel={friend.displayName || friend.username} onPress={() => openMember(friend.username)} style={styles.friend}>
                  <AuraAvatar uri={friend.avatarUrl} name={friend.displayName || friend.username} size={40} radius={20} signature={friend.signature} tier={friend.contributionTier} />
                </Pressable>
              ))}
            </ScrollView>
            {isOwner ? (
              <Pressable accessibilityRole="button" onPress={() => router.push('/settings/amis' as Href)}>
                <Txt size="sm" weight="medium" color={Tw.color.primary}>
                  Gérer mes amis
                </Txt>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  poster: { width: 40, height: 56, borderRadius: Tw.radius.md, overflow: 'hidden', backgroundColor: Tw.color.muted },
  friend: { padding: 6 },
});
