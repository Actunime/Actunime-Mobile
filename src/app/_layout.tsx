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

import { Colors } from '@/constants/theme';
import { useAuth } from '@/lib/auth-store';
import { queryClient } from '@/lib/query-client';

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

  // Les données en cache appartiennent au membre connecté : on les vide à la déconnexion.
  useEffect(() => {
    if (loaded && !auth) queryClient.clear();
  }, [auth, loaded]);

  useEffect(() => {
    // Une police qui ne charge pas ne doit pas bloquer l'app sur l'écran de démarrage.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if ((!fontsLoaded && !fontError) || !loaded) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
          <Stack.Protected guard={!auth}>
            <Stack.Screen name="login" />
          </Stack.Protected>
          <Stack.Protected guard={!!auth}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="media/[kind]/[id]" />
            <Stack.Screen name="edit/[kind]/[id]" options={{ presentation: 'modal' }} />
            <Stack.Screen name="browser" />
          </Stack.Protected>
          <Stack.Screen name="auth/callback" />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
