import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/state/AppStore';
import { useNow } from '../../src/hooks/useNow';
import { buildDayPlan, type PlanTab } from '../../src/domain/plan';
import { indexPrices } from '../../src/domain/prices';
import { Screen } from '../../src/components/Screen';
import { PlanTimeline } from '../../src/components/PlanTimeline';
import { WeatherPlans } from '../../src/components/WeatherPlans';
import { Button, Muted, Section, Segment } from '../../src/components/ui';

const PLAN_OPTIONS: { id: PlanTab; label: string }[] = [
  { id: 'klima', label: 'Klíma' },
  { id: 'napelem', label: 'Napelem' },
];

export default function TervekScreen() {
  const { state, setPlanTab, refreshPrices, loadWeather } = useApp();
  const now = useNow();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const prices = state.payload?.prices ?? [];
  const idx = useMemo(() => indexPrices(prices), [prices]);
  const plan = useMemo(() => (prices.length ? buildDayPlan(idx, now, state.planTab) : null), [idx, prices.length, now, state.planTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshPrices(true), loadWeather()]);
    setRefreshing(false);
  }, [refreshPrices, loadWeather]);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Section kicker="Napi terv" title={state.planTab === 'klima' ? 'Klíma hűtési terv' : 'Napelemes terv'}>
        <Segment options={PLAN_OPTIONS} value={state.planTab} onChange={setPlanTab} />
      </Section>

      {plan ? <PlanTimeline plan={plan} /> : <Muted>{state.error ?? 'Árak betöltése…'}</Muted>}

      <WeatherPlans tab={state.planTab} />

      <Section title="Személyes energiaterv" sub="4 kérdés — személyes ajánlások az otthonodhoz.">
        <Button title="Kérem a tervemet →" variant="primary" block onPress={() => router.push('/advisor')} />
      </Section>
    </Screen>
  );
}
