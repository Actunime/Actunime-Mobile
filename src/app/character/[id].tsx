import { useLocalSearchParams } from 'expo-router';

import { EntityScreen } from '@/components/entity/entity-screen';

export default function CharacterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EntityScreen kind="character" id={id} />;
}
