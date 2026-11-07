import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
  useFonts,
} from '@expo-google-fonts/outfit';
import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';
import { ReduceMotion, ReducedMotionConfig } from 'react-native-reanimated';

import { MobileNav } from '@/components/nav/mobile-nav';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth-store';
import { useSyncPhoneNotifications } from '@/lib/phone-notifications';
import { queryClient } from '@/lib/query-client';
import { runLaunchCheck } from '@/lib/update-store';

SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.background,
    card: Colors.backgroundElement,
    text: Colors.text,
    primary: Colors.primary,
    border: Colors.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  const { auth, loaded } = useAuth();
  useSyncPhoneNotifications();

  // Les données en cache appartiennent au membre connecté : on les vide à la déconnexion.
  useEffect(() => {
    if (loaded && !auth) queryClient.clear();
  }, [auth, loaded]);

  useEffect(() => {
    // Une police qui ne charge pas ne doit pas bloquer l'app sur l'écran de démarrage.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  // Mise à jour automatique : une recherche au lancement, en arrière-plan, pour un membre connecté.
  useEffect(() => {
    if (loaded && auth) void runLaunchCheck().catch(() => undefined);
  }, [loaded, auth]);

  if ((!fontsLoaded && !fontError) || !loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <ReducedMotionConfig mode={ReduceMotion.System} />
        <StatusBar style="light" />
        {/* La navigation du bas est posée ici, une seule fois : elle est sur toutes les pages (rien sans connexion). */}
        <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
          <Stack.Protected guard={!auth}>
            <Stack.Screen name="login" />
          </Stack.Protected>
          <Stack.Protected guard={!!auth}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="media/[kind]/[id]" />
            <Stack.Screen name="edit/[kind]/[id]" />
            <Stack.Screen name="propose/[kind]/[id]" />
            <Stack.Screen name="browser-settings" />
            <Stack.Screen name="character/[id]" />
            <Stack.Screen name="person/[id]" />
            <Stack.Screen name="track/[id]" />
            <Stack.Screen name="company/[id]" />
            <Stack.Screen name="relations" />
            <Stack.Screen name="member/[username]" />
            <Stack.Screen name="agenda" />
            <Stack.Screen name="settings/index" />
            <Stack.Screen name="settings/profile" />
            <Stack.Screen name="settings/confidentialite" />
            <Stack.Screen name="settings/blocages" />
            <Stack.Screen name="settings/amis" />
            <Stack.Screen name="settings/appareils" />
            <Stack.Screen name="settings/notifications" />
            <Stack.Screen name="settings/security" />
            <Stack.Screen name="settings/delete-account" />
            <Stack.Screen name="notifications" />
            <Stack.Screen name="favoris" />
            <Stack.Screen name="communaute" />
            <Stack.Screen name="contributeurs" />
            <Stack.Screen name="propositions" />
            <Stack.Screen name="membres" />
            <Stack.Screen name="discover/[kind]" />
            <Stack.Screen name="statistiques" />
          </Stack.Protected>
          <Stack.Screen name="auth/callback" />
        </Stack>
        <MobileNav />
        </View>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
