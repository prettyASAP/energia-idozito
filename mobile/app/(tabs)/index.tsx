import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Linking, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/state/AppStore';
import { useNow } from '../../src/hooks/useNow';
import { useTheme } from '../../src/theme/ThemeContext';
import { fonts } from '../../src/theme/tokens';
import { deviceCards, deviceSummary, heroModel, indexPrices } from '../../src/domain/prices';
import { gridContext, isGreenWindow } from '../../src/domain/grid';
import { cancelPriceAlerts, getPermissionState, requestPermission, syncPriceAlerts } from '../../src/notifications/priceAlerts';
import { Screen } from '../../src/components/Screen';
import { HeroBox } from '../../src/components/HeroBox';
import { GridPanel } from '../../src/components/GridPanel';
import { DeviceGrid, DeviceSummaryBanner } from '../../src/components/DeviceGrid';
import { Button, Muted, Section } from '../../src/components/ui';

export default function MaScreen() {
  const { state, refreshPrices, refreshGrid, patch } = useApp();
  const now = useNow();
  const router = useRouter();
  const t = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const prices = state.payload?.prices ?? [];
  const idx = useMemo(() => indexPrices(prices), [prices]);
  const hero = useMemo(() => (prices.length ? heroModel(idx, now, gridContext(state.grid)) : null), [idx, prices.length, now, state.grid]);
  const solarMap = state.grid.solarForecastByHour;
  const isGreen = useCallback((s: number, d: number) => isGreenWindow(solarMap, s, d, now), [solarMap, now]);
  const cards = useMemo(() => (hero ? deviceCards(hero, isGreen) : []), [hero, isGreen]);
  const summary = useMemo(() => (hero ? deviceSummary(hero, isGreen) : null), [hero, isGreen]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshPrices(true), refreshGrid()]);
    setRefreshing(false);
  }, [refreshPrices, refreshGrid]);

  const togglePush = useCallback(async () => {
    if (state.pushOptIn) {
      patch({ pushOptIn: false });
      await cancelPriceAlerts();
      return;
    }
    const st = await getPermissionState();
    if (st === 'denied') {
      Alert.alert('Értesítések letiltva', 'Engedélyezd az értesítéseket a rendszer beállításaiban, hogy szólhassunk az olcsó órákról.', [
        { text: 'Mégsem', style: 'cancel' },
        { text: 'Beállítások', onPress: () => Linking.openSettings().catch(() => undefined) },
      ]);
      return;
    }
    const ok = st === 'granted' || (await requestPermission());
    if (!ok) return;
    patch({ pushOptIn: true });
    if (prices.length) await syncPriceAlerts(prices, new Date());
  }, [state.pushOptIn, patch, prices]);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <HeroBox
        hero={hero}
        error={state.error}
        loading={state.loading}
        fetchedAt={state.payload?.fetchedAt ?? null}
        now={now}
        pushActive={state.pushOptIn}
        onTogglePush={togglePush}
      />

      {!hero && state.error ? (
        <Button title="Újrapróbálom" variant="primary" block onPress={() => refreshPrices(true)} />
      ) : null}

      <GridPanel grid={state.grid} />

      <Section kicker="Ajánlás" title="Mikor kapcsoljam be?">
        <DeviceSummaryBanner summary={summary} />
        {cards.length ? <DeviceGrid cards={cards} /> : <Muted>Az ajánlások az árak betöltése után jelennek meg.</Muted>}
        <Muted size={11} style={{ marginTop: 10, marginHorizontal: 2 }}>
          A 🌱 jel azt mutatja, hogy a sávban sok a napenergia — olcsó <Text style={{ fontStyle: 'italic' }}>és</Text> zöld. A zöld kártya: most érdemes indítani.
        </Muted>
      </Section>

      <Button title="Mennyit takaríthatok meg? →" variant="primary" block onPress={() => router.push('/onboarding')} />

      <View style={{ alignItems: 'center', gap: 4 }}>
        <Text onPress={() => router.push('/adatvedelem')} accessibilityRole="link" style={{ fontFamily: fonts.body, fontSize: 11, color: t.accent700, textDecorationLine: 'underline' }}>
          Adatvédelmi tájékoztató és adatforrások
        </Text>
      </View>
    </Screen>
  );
}
