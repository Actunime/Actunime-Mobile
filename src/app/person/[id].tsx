import { useLocalSearchParams } from 'expo-router';

import { EntityScreen } from '@/components/entity/entity-screen';

export default function PersonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EntityScreen kind="person" id={id} />;
}
