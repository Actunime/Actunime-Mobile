import { useLocalSearchParams } from 'expo-router';

import { EntityScreen } from '@/components/entity/entity-screen';

export default function TrackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EntityScreen kind="track" id={id} />;
}
