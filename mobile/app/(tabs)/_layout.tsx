import React from 'react';
import { Pressable, View, Text, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Zap, LayoutGrid, DollarSign, Calendar } from 'lucide-react-native';
import { useTheme } from '../../src/theme/ThemeContext';
import { fonts } from '../../src/theme/tokens';

const TABS = [
  { name: 'index', label: 'Ma', Icon: Zap },
  { name: 'arak', label: 'Árak', Icon: LayoutGrid },
  { name: 'sporolas', label: 'Megtakarítás', Icon: DollarSign },
  { name: 'tervek', label: 'Tervek', Icon: Calendar },
] as const;

interface TabBarProps {
  state: { index: number; routes: { key: string; name: string }[] };
  navigation: { navigate: (name: string) => void; emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean } };
}

function TabBar({ state, navigation }: TabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      flexDirection: 'row', borderTopWidth: 1, borderTopColor: t.divider,
      backgroundColor: Platform.OS === 'ios' ? (t.scheme === 'dark' ? 'rgba(20,22,25,0.92)' : 'rgba(242,242,243,0.92)') : t.bg,
      paddingHorizontal: 6, paddingTop: 0, paddingBottom: Math.max(22, insets.bottom),
    }}>
      {state.routes.map((route, i) => {
        const def = TABS.find((x) => x.name === route.name);
        if (!def) return null;
        const active = state.index === i;
        const color = active ? t.accent700 : t.neutral600;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={def.label}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!active && !e.defaultPrevented) navigation.navigate(route.name);
            }}
            style={({ pressed }) => ({
              flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 8,
              borderTopWidth: 2, borderTopColor: active ? t.accent500 : 'transparent', marginTop: -1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            })}
          >
            <def.Icon size={21} color={color} strokeWidth={1.5} />
            <Text style={{ fontFamily: fonts.heading, fontSize: 10, letterSpacing: 0.6, textTransform: 'uppercase', color }}>{def.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: t.bg }, lazy: false }}
      tabBar={(props) => <TabBar state={props.state} navigation={props.navigation} />}
    >
      {TABS.map((tb) => <Tabs.Screen key={tb.name} name={tb.name} options={{ title: tb.label }} />)}
    </Tabs>
  );
}
