import React from 'react';
import { View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useTheme } from '../src/theme/ThemeContext';
import { Body, Heading } from '../src/components/ui';

export default function NotFound() {
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: 'Nincs ilyen oldal' }} />
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: t.bg }}>
        <Heading>Nincs ilyen oldal</Heading>
        <Link href="/" style={{ color: t.accent700 }}><Body color={t.accent700}>Vissza a főképernyőre</Body></Link>
      </View>
    </>
  );
}
