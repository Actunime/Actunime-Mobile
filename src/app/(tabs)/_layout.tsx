import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { Colors } from '@/constants/theme';

/** Les écrans sont des onglets Expo Router sans barre propre : la navigation du bas (`MobileNav`, E114) les pilote. */
export default function TabsLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Tabs
        tabBar={() => null}
        screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: Colors.background } }}
      />
    </View>
  );
}
