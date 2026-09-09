import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Barlow_400Regular, Barlow_500Medium, Barlow_700Bold } from '@expo-google-fonts/barlow';
import { BarlowCondensed_600SemiBold } from '@expo-google-fonts/barlow-condensed';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { AppStoreProvider } from '../src/state/AppStore';
import { configureNotifications } from '../src/notifications/priceAlerts';

SplashScreen.preventAutoHideAsync().catch(() => undefined);
configureNotifications();

function Navigation() {
  const t = useTheme();
  return (
    <>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: t.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ presentation: 'modal', gestureEnabled: true }} />
        <Stack.Screen name="advisor" options={{ presentation: 'modal', gestureEnabled: true }} />
        <Stack.Screen name="adatvedelem" options={{ presentation: 'modal', gestureEnabled: true }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({ Barlow_400Regular, Barlow_500Medium, Barlow_700Bold, BarlowCondensed_600SemiBold });
  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded, error]);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppStoreProvider>
          <Navigation />
        </AppStoreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
