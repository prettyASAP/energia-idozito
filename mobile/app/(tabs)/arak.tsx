import React, { useCallback, useMemo, useState } from 'react';
import { Text } from 'react-native';
import { useApp } from '../../src/state/AppStore';
import { useNow } from '../../src/hooks/useNow';
import { useTheme } from '../../src/theme/ThemeContext';
import { fonts } from '../../src/theme/tokens';
import { barChartModel, heatmapModel, indexPrices, trendModel } from '../../src/domain/prices';
import { Screen } from '../../src/components/Screen';
import { BarChart72, Heatmap, TrendChart } from '../../src/components/Charts';
import { Muted, Section } from '../../src/components/ui';
import { LINKS, openLink } from '../../src/lib/links';

function Link({ url, children }: { url: string; children: string }) {
  const t = useTheme();
  return <Text accessibilityRole="link" onPress={() => openLink(url)} style={{ color: t.accent700, textDecorationLine: 'underline' }}>{children}</Text>;
}

export default function ArakScreen() {
  const { state, refreshPrices, setSelHour } = useApp();
  const now = useNow();
  const [refreshing, setRefreshing] = useState(false);
  const prices = state.payload?.prices ?? [];
  const idx = useMemo(() => indexPrices(prices), [prices]);
  const heat = useMemo(() => (prices.length ? heatmapModel(idx, now, state.selHour) : null), [idx, prices.length, now, state.selHour]);
  const bars = useMemo(() => (prices.length ? barChartModel(idx, now) : null), [idx, prices.length, now]);
  const trend = useMemo(() => (prices.length ? trendModel(prices, now) : null), [prices, now]);
  const acc = state.payload?.model_accuracy;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshPrices(true);
    setRefreshing(false);
  }, [refreshPrices]);

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <Section kicker="Napi hőtérkép" title="Óránkénti árak">
        {heat ? <Heatmap cells={heat.cells} detail={heat.detail} selHour={state.selHour} onSelect={setSelHour} /> : <Muted>{state.error ?? 'Árak betöltése…'}</Muted>}
      </Section>

      <Section kicker="Tegnap · ma · holnap" title="72 órás grafikon" sub="Tegnap (szürke) · ma (élénk) · holnap (halvány). Zöld = olcsó óra, piros = drága.">
        {bars ? <BarChart72 bars={bars.bars} maxP={bars.maxP} /> : null}
      </Section>

      <Section kicker="Merre tart a piac?" title="30 napos áralakulás" sub="Napi átlagárak az elmúlt hónapban.">
        <TrendChart model={trend} />
        {acc ? (
          <Muted size={11} style={{ marginTop: 8 }}>
            {acc.method === 'walkforward'
              ? `A holnaputáni előrejelzés pontossága: ±${acc.mape_pct.toFixed(1).replace('.', ',')}% (7 napos visszateszt). A holnapi árak a tőzsdei day-ahead aukcióból jönnek, ha már publikusak.`
              : `Előrejelzési bizonytalanság: ±${acc.mape_pct.toFixed(1).replace('.', ',')}% (kevés historikus adat).`}
            {state.payload ? ` EUR/HUF: ${state.payload.eur_huf_rate.toFixed(1).replace('.', ',')} (EKB).` : ''}
          </Muted>
        ) : null}
      </Section>

      <Text style={{ fontFamily: fonts.body, fontSize: 10.5, lineHeight: 17, color: useTheme().textMuted, marginTop: -8 }}>
        Forrás: <Link url={LINKS.energyCharts}>energy-charts.info</Link> (Bundesnetzagentur | SMARD.de, CC BY 4.0) tőzsdei árak ·{' '}
        <Link url={LINKS.ecb}>EKB</Link> EUR/HUF árfolyam · <Link url={LINKS.mekh}>MEKH</Link> rezsivédett tarifák ·{' '}
        <Link url={LINKS.mavir}>MAVIR</Link> hálózati adatok
      </Text>
    </Screen>
  );
}
