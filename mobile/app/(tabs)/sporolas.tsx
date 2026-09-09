import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/state/AppStore';
import { useTheme } from '../../src/theme/ThemeContext';
import { fonts } from '../../src/theme/tokens';
import { htntSaving } from '../../src/domain/savings';
import { fmt } from '../../src/domain/format';
import { Screen } from '../../src/components/Screen';
import { KpiBox } from '../../src/components/Savings';
import { Button, Card, Muted, NumberField, Section } from '../../src/components/ui';
import { LINKS, openLink } from '../../src/lib/links';

export default function SporolasScreen() {
  const { state, patch, refreshPrices } = useApp();
  const router = useRouter();
  const t = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const saving = htntSaving(state.htntKwh, state.htntPct);
  const subtitle = state.obsDone
    ? `A megadott ${state.obsDevices.length} eszközöd és tarifád alapján.`
    : 'Átlagos háztartás alapján — pontosítsd a saját eszközeiddel.';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPrices(true);
    setRefreshing(false);
  }, [refreshPrices]);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Section kicker="Megtakarítás" title="Mennyit takaríthatsz meg?">
        <KpiBox amount={state.savedAmt} subtitle={subtitle} />
      </Section>

      <Button title="Pontosítom a saját eszközeimmel →" variant="primary" block onPress={() => router.push('/onboarding')} />

      <Section title="Éjszakai áram kalkulátor" sub="Az éjszakai (vezérelt) áram a kedvezményes sávban kb. 37%-kal olcsóbb (36,4 vs. 23 Ft/kWh).">
        <Card style={{ paddingVertical: 16, paddingHorizontal: 14, gap: 14 }}>
          <NumberField label="Havi fogyasztás (kWh)" value={state.htntKwh} min={10} max={5000} onChange={(v) => patch({ htntKwh: v })} />
          <NumberField label="Ebből éjszakára áttehető (%)" value={state.htntPct} min={0} max={80} onChange={(v) => patch({ htntPct: v })} />
          <View style={{ borderTopWidth: 1, borderTopColor: t.divider, paddingTop: 12 }}>
            <Text style={{ fontFamily: fonts.heading, fontSize: 26, color: t.good700 }}>{fmt(saving)} Ft / év</Text>
            <Muted size={12}>havi {fmt(saving / 12)} Ft — ha a fogyasztás {Math.round(state.htntPct)}%-a éjszakára kerül</Muted>
          </View>
          <Muted size={10.5}>
            A mérőcsere ingyenes, az elosztó 1–3 hónapon belül elvégzi.{' '}
            <Text accessibilityRole="link" onPress={() => openLink(LINKS.mekh)} style={{ color: t.accent700, textDecorationLine: 'underline' }}>MEKH ↗</Text>
          </Muted>
        </Card>
      </Section>
    </Screen>
  );
}
