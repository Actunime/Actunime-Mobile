import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { Colors, Fonts } from '@/constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; title: string; icon: IconName; iconActive: IconName }[] = [
  { name: 'index', title: 'Accueil', icon: 'home-outline', iconActive: 'home' },
  { name: 'search', title: 'Recherche', icon: 'search-outline', iconActive: 'search' },
  { name: 'list', title: 'Ma liste', icon: 'bookmark-outline', iconActive: 'bookmark' },
  { name: 'reading', title: 'Lecture', icon: 'book-outline', iconActive: 'book' },
  { name: 'profile', title: 'Profil', icon: 'person-outline', iconActive: 'person' },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: { backgroundColor: Colors.backgroundElement, borderTopColor: Colors.border },
        tabBarLabelStyle: { fontFamily: Fonts.medium, fontSize: 11 },
        sceneStyle: { backgroundColor: Colors.background },
      }}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={size} color={color} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
