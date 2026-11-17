import {
  PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold, useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import { Stack } from 'expo-router/stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';

import { AppStoreProvider } from '../store/AppStore';
import { colors } from '../theme';

export default function RootLayout() {
  const [loaded] = useFonts({
    PlusJakartaSans_400Regular, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
  });

  if (!loaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.orange, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.white} size="large" />
      </View>
    );
  }

  return (
    <AppStoreProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="exercise-picker" options={{ presentation: 'modal' }} />
      </Stack>
    </AppStoreProvider>
  );
}
