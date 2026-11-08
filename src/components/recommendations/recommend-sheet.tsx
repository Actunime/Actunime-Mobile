import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Button } from '@/components/button';
import { Chip } from '@/components/chip';
import { Field } from '@/components/form-fields';
import { AuraAvatar } from '@/components/member/aura-avatar';
import { StatusNote } from '@/components/settings/settings-ui';
import { Loading } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { BottomSheet } from '@/components/ui/bottom-sheet';
import { Colors, Fonts, Radius, Spacing, Tw } from '@/constants/theme';
import { api, type MediaKind } from '@/lib/api';
import { RECOMMENDATION_MESSAGE_MAX, RECOMMENDATION_REASONS, REASON_KEYS, recommendationBody, recommendationError, recommendationProblem, type IRecommendationReason } from '@/lib/recommendations';
import { signatureNameColor } from '@/lib/signature';

/** Recommander une fiche à un ami (`RecommendButton` du site) : un ami, un motif, un message libre facultatif. */
export function RecommendSheet({ open, onClose, kind, mediaId, title }: Readonly<{ open: boolean; onClose: () => void; kind: MediaKind; mediaId: string; title: string }>) {
  const [toId, setToId] = useState('');
  const [reason, setReason] = useState<IRecommendationReason | null>(null);
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const me = useQuery({ queryKey: ['me', 'profile'], queryFn: () => api.getMyProfile(), enabled: open });
  const friends = useQuery({ queryKey: ['me', 'friends-picker', me.data?.id], queryFn: () => api.getMemberFriends(me.data!.id, 50), enabled: open && !!me.data?.id });
  const mediaType = kind === 'anime' ? 'Anime' : 'Manga';
  const send = useMutation({ mutationFn: () => api.recommend(recommendationBody({ toId, mediaId, mediaType, reason, message })) });

  // Le formulaire repart à zéro à chaque ouverture.
  useEffect(() => {
    if (!open) return;
    setToId('');
    setReason(null);
    setMessage('');
    setProblem(null);
    send.reset();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps -- `send` change à chaque rendu

  const submit = () => {
    const found = recommendationProblem({ toId, mediaId, mediaType, reason, message });
    setProblem(found);
    if (!found) send.mutate();
  };
  const list = friends.data?.friends ?? [];

  return (
    <BottomSheet open={open} onClose={onClose} title={`Recommander « ${title} »`}>
      <View style={styles.stack}>
        {send.isSuccess ? (
          <>
            <StatusNote tone="success">Recommandation envoyée.</StatusNote>
            <Button label="Fermer" onPress={onClose} />
          </>
        ) : (
          <>
            <Field label="À quel ami ?">
              {me.isPending || friends.isPending ? (
                <Loading />
              ) : list.length === 0 ? (
                <Txt size="sm" color={Tw.color.mutedForeground}>
                  Tu n’as pas encore d’ami à qui recommander.
                </Txt>
              ) : (
                <ScrollView style={styles.friends} nestedScrollEnabled>
                  {list.map((friend) => {
                    const on = friend.id === toId;
                    return (
                      <Pressable key={friend.id} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setToId(friend.id)} style={[styles.friend, on && styles.friendOn]}>
                        <AuraAvatar uri={friend.avatarUrl} name={friend.displayName || friend.username} size={36} signature={friend.signature} tier={friend.contributionTier} />
                        <Txt size="sm" weight="medium" numberOfLines={1} style={styles.flex} color={signatureNameColor(friend.signature)}>
                          {friend.displayName || friend.username}
                        </Txt>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              )}
            </Field>
            <Field label="Pourquoi ?">
              <View style={styles.reasons}>
                {REASON_KEYS.map((key) => (
                  <Chip key={key} label={RECOMMENDATION_REASONS[key]} active={reason === key} onPress={() => setReason(key)} />
                ))}
              </View>
            </Field>
            <Field label="Un mot (facultatif)" hint={`${message.length} / ${RECOMMENDATION_MESSAGE_MAX}`}>
              <TextInput value={message} onChangeText={setMessage} maxLength={RECOMMENDATION_MESSAGE_MAX} multiline style={styles.input} placeholder="Dis-lui ce que tu en as aimé" placeholderTextColor={Colors.textSecondary} />
            </Field>
            {problem ? <StatusNote tone="error">{problem}</StatusNote> : null}
            {send.isError ? <StatusNote tone="error">{recommendationError(send.error)}</StatusNote> : null}
            <Button label={send.isPending ? 'Envoi…' : 'Envoyer'} disabled={send.isPending || list.length === 0} onPress={submit} />
          </>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: Spacing.three, padding: Spacing.three },
  friends: { maxHeight: 220 },
  friend: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 8, borderRadius: Tw.radius.lg },
  friendOn: { backgroundColor: Tw.color.input },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { minHeight: 80, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Radius.medium, backgroundColor: Tw.color.input, color: Colors.text, fontFamily: Fonts.medium, fontSize: 14, textAlignVertical: 'top' },
});
