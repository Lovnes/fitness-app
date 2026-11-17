import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { EmptyState } from '../components/visuals';
import { T } from '../components/ui';
import { useApp } from '../store/AppStore';
import { colors } from '../theme';

/** Entry: wait for storage, then go to onboarding (first launch) or the main tabs. */
export default function Index() {
  const { ready, profile, loadError, resetAll } = useApp();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white }}>
        <ActivityIndicator color={colors.orange} size="large" />
        <T v="caption" style={{ marginTop: 12 }}>Loading…</T>
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: colors.white }}>
        <EmptyState icon="cloud-offline-outline" title="Data unavailable"
          message={`${loadError}. You can reset the app to start fresh.`} actionLabel="Reset app" onAction={resetAll} />
      </View>
    );
  }

  return <Redirect href={profile ? '/(tabs)' : '/onboarding'} />;
}
