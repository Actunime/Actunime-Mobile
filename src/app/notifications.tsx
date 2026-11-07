import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Bell, CheckCheck } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { SettingsPage } from '@/components/settings/settings-ui';
import { EmptyState, ErrorState, Loading } from '@/components/states';
import { Pressable } from '@/components/tap';
import { Txt } from '@/components/tw';
import { Tw, alpha } from '@/constants/theme';
import { api, type INotification } from '@/lib/api';
import { notificationRoute, timeAgo } from '@/lib/notifications';

const KEY = ['notifications'] as const;

/** Notifications (`/notifications` du site) : la liste, « tout marquer lu », et les demandes d'ami traitables sur place. */
export default function NotificationsScreen() {
  const client = useQueryClient();
  const list = useInfiniteQuery({
    queryKey: [...KEY, 'list'],
    queryFn: ({ pageParam }) => api.listNotifications(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
  });
  const stats = useQuery({ queryKey: [...KEY, 'stats'], queryFn: () => api.notificationStats() });
  const refresh = () => void client.invalidateQueries({ queryKey: KEY });

  const read = useMutation({ mutationFn: (id: string) => api.markNotificationsRead([id]), onSuccess: refresh });
  const readAll = useMutation({ mutationFn: () => api.markAllNotificationsRead(), onSuccess: refresh });
  const clean = useMutation({ mutationFn: () => api.deleteReadNotifications(), onSuccess: refresh });
  const respond = useMutation({
    mutationFn: async ({ notification, accept }: { notification: INotification; accept: boolean }) => {
      await api.answerFriendRequest(String(notification.metadata?.friendshipId), accept ? 'accept' : 'reject');
      await api.markNotificationsRead([notification.id]);
    },
    onSuccess: () => {
      refresh();
      void client.invalidateQueries({ queryKey: ['friendships'] });
    },
  });

  const items = useMemo(() => list.data?.pages.flatMap((page) => page.results) ?? [], [list.data]);
  const unread = stats.data?.unreadCount ?? 0;

  const open = (notification: INotification) => {
    if (!notification.read) read.mutate(notification.id);
    const route = notificationRoute(notification.link);
    if (route) router.push(route as Href);
  };

  return (
    <SettingsPage title="Notifications" description={unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est à jour.'}>
      <View style={styles.bar}>
        <Button label="Tout marquer lu" variant="outline" disabled={unread === 0 || readAll.isPending} onPress={() => readAll.mutate()} />
        <Button label="Effacer les lues" variant="outline" disabled={clean.isPending} onPress={() => clean.mutate()} />
        <Pressable accessibilityRole="button" accessibilityLabel="Réglages des notifications" onPress={() => router.push('/settings/notifications' as Href)} style={styles.gear}>
          <Txt size="sm">Réglages</Txt>
        </Pressable>
      </View>

      {list.isPending ? (
        <Loading />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState title="Aucune notification" hint="Les demandes d'ami, sorties d'épisodes et réponses à tes propositions arrivent ici." />
      ) : (
        <View style={styles.list}>
          {items.map((notification) => {
            const isFriendRequest = notification.type === 'FRIEND_REQUEST_RECEIVED' && !notification.read && !!notification.metadata?.friendshipId;
            const actor = notification.actor;
            return (
              <Pressable
                key={notification.id}
                accessibilityRole="button"
                onPress={() => open(notification)}
                style={[styles.item, !notification.read && styles.unread]}
              >
                <View style={styles.icon}>
                  {notification.read ? <CheckCheck size={18} color={Tw.color.mutedForeground} /> : <Bell size={18} color={Tw.color.primary} />}
                </View>
                <View style={styles.flex}>
                  <Txt size="sm" weight={notification.read ? 'medium' : 'bold'}>
                    {notification.title}
                  </Txt>
                  <Txt size="xs" color={Tw.color.mutedForeground}>
                    {notification.description}
                  </Txt>
                  <Txt size="xs" color={Tw.color.mutedForeground}>
                    {actor?.displayName ? `${actor.displayName} · ` : ''}
                    {timeAgo(notification.createdAt)}
                  </Txt>
                  {isFriendRequest ? (
                    <View style={styles.actions}>
                      <Button label="Accepter" disabled={respond.isPending} onPress={() => respond.mutate({ notification, accept: true })} />
                      <Button label="Refuser" variant="outline" disabled={respond.isPending} onPress={() => respond.mutate({ notification, accept: false })} />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
          {list.hasNextPage ? (
            <Button label={list.isFetchingNextPage ? 'Chargement…' : 'Voir plus'} variant="outline" disabled={list.isFetchingNextPage} onPress={() => void list.fetchNextPage()} />
          ) : null}
        </View>
      )}
    </SettingsPage>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 3 },
  bar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  gear: { minHeight: 44, paddingHorizontal: 12, justifyContent: 'center' },
  list: { gap: 10 },
  item: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: Tw.radius.lg, borderWidth: 1, borderColor: Tw.color.border, backgroundColor: Tw.color.card },
  unread: { borderColor: alpha(Tw.color.primary, 0.5), backgroundColor: alpha(Tw.color.primary, 0.08) },
  icon: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 6 },
});
