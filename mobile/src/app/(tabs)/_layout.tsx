import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '../../components/chrome';
import { useApp } from '../../store/AppStore';
import { colors } from '../../theme';

export default function TabsLayout() {
  const { ready, profile } = useApp();
  if (ready && !profile) return <Redirect href="/onboarding" />;
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="workout" options={{ title: 'Workout' }} />
      <Tabs.Screen name="history" options={{ title: 'History' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
