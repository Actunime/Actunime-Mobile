import { useQuery } from '@tanstack/react-query';

import { MemberScreen } from '@/components/member/member-screen';
import { ErrorState, Loading } from '@/components/states';
import { api } from '@/lib/api';
import type { MemberTab } from '@/lib/member';

/** Mon profil public ouvert sur un onglet : le pseudo vient du profil, pas de la session. */
export function MyMemberScreen({ tab }: Readonly<{ tab: MemberTab }>) {
  const me = useQuery({ queryKey: ['me', 'profile'], queryFn: () => api.getMyProfile() });
  if (me.isPending) return <Loading />;
  if (me.isError || !me.data?.username) return <ErrorState error={me.error ?? new Error('Profil introuvable')} onRetry={() => void me.refetch()} />;
  return <MemberScreen username={me.data.username} initialTab={tab} />;
}
