import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { SpaceGrotesk_500Medium } from '@expo-google-fonts/space-grotesk/500Medium';
import { SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk/700Bold';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useApp } from '../store/useApp';
import { AppEffects } from '../ui/AppEffects';
import { CelebrationOverlay, RestTimerPill } from '../ui/Overlays';
import { fonts, useTheme } from '../ui/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  const hydrated = useApp((s) => s.hydrated);
  const { c, mode } = useTheme();
  const ready = (fontsLoaded || !!fontError) && hydrated;

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(c.bg).catch(() => {});
  }, [c.bg]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  const navTheme = {
    ...(mode === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(mode === 'dark' ? DarkTheme : DefaultTheme).colors,
      background: c.bg,
      card: c.surface,
      text: c.text,
      border: c.border,
      primary: c.primary,
    },
  };

  return (
    <SafeAreaProvider>
      <ThemeProvider value={navTheme}>
        <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: c.bg },
            headerTintColor: c.text,
            headerTitleStyle: { fontFamily: fonts.display },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: c.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="checkin" options={{ title: 'Check-in', presentation: 'modal' }} />
          <Stack.Screen name="edit-meals" options={{ title: 'Weekly meal plan' }} />
          <Stack.Screen name="edit-workouts" options={{ title: 'Workouts' }} />
          <Stack.Screen name="targets" options={{ title: 'Targets' }} />
          <Stack.Screen name="shopping" options={{ title: 'Shopping list' }} />
          <Stack.Screen name="prep" options={{ title: 'Meal prep' }} />
          <Stack.Screen name="guides" options={{ title: 'Guides' }} />
          <Stack.Screen name="reminders" options={{ title: 'Reminders' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="safety" options={{ title: 'Safety and disclaimers' }} />
          <Stack.Screen name="health" options={{ title: 'Health checks' }} />
          <Stack.Screen name="badges" options={{ title: 'Badges' }} />
          <Stack.Screen name="photos" options={{ title: 'Progress photos' }} />
          <Stack.Screen name="history" options={{ title: 'Workout history' }} />
          <Stack.Screen name="strength-test" options={{ title: 'Strength test' }} />
        </Stack>
        <AppEffects />
        <RestTimerPill />
        <CelebrationOverlay />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
