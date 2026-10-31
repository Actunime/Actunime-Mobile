import { useLocalSearchParams } from 'expo-router';

import { MemberScreen } from '@/components/member/member-screen';

export default function MemberRoute() {
  const { username } = useLocalSearchParams<{ username: string }>();
  return <MemberScreen username={username} />;
}
