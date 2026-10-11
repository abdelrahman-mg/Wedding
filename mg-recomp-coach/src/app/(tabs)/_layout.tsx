import { Redirect, Tabs } from 'expo-router';
import { useApp } from '../../store/useApp';
import { Icon, type IconName } from '../../ui/Icon';
import { fonts, useTheme } from '../../ui/theme';

const TABS: { name: string; title: string; icon: IconName }[] = [
  { name: 'index', title: 'Today', icon: 'today' },
  { name: 'log', title: 'Log', icon: 'plus' },
  { name: 'train', title: 'Train', icon: 'train' },
  { name: 'progress', title: 'Progress', icon: 'progress' },
  { name: 'coach', title: 'Coach', icon: 'coach' },
];

export default function TabLayout() {
  const { c } = useTheme();
  const onboarded = useApp((s) => s.data.profile.onboarded);
  if (!onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.textMuted,
        tabBarStyle: { backgroundColor: c.surface, borderTopColor: c.border, minHeight: 64, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.bodySemi, fontSize: 12 },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarAccessibilityLabel: t.title,
            tabBarIcon: ({ color }) => <Icon name={t.icon} color={color as string} size={24} />,
          }}
        />
      ))}
    </Tabs>
  );
}
