import { useLocalSearchParams } from 'expo-router';

import { EntityScreen } from '@/components/entity/entity-screen';

export default function CompanyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EntityScreen kind="company" id={id} />;
}
