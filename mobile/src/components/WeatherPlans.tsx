import React, { useEffect, useMemo } from 'react';
import { ScrollView, View, Text, ActivityIndicator } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import { useApp } from '../state/AppStore';
import { HUNGARIAN_CITIES, cityByKey } from '../data/openMeteo';
import { toPriceHours } from '../data/priceService';
import { buildCoolingPlan, type CoolingAction } from '../domain/cooling';
import { buildSolarPlan, type SolarAction } from '../domain/solar';
import type { PlanTab } from '../domain/plan';
import { fmt } from '../domain/format';
import { Card, Chip, Muted, NumberField, Section } from './ui';

const COOL_COLORS: Record<CoolingAction, 'accent500' | 'accent200' | 'neutral800' | 'neutral200'> = {
  precool: 'accent500', run: 'accent200', coast: 'neutral800', off: 'neutral200',
};
const SOLAR_COLORS: Record<SolarAction, 'accent500' | 'accent200' | 'accent100' | 'bad500' | 'neutral200'> = {
  solar_peak: 'accent500', solar_mild: 'accent200', cheap_grid: 'accent100', avoid: 'bad500', night: 'neutral200', neutral: 'neutral200',
};

interface RowData {
  key: string;
  time: string;
  label: string;
  detail: string;
  color: string;
  extra: string;
}

function Rows({ rows }: { rows: RowData[] }) {
  const t = useTheme();
  return (
    <View>
      {rows.map((r, i) => (
        <View key={r.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 2, borderBottomWidth: i === rows.length - 1 ? 0 : 1, borderBottomColor: t.divider }}>
          <View style={{ width: 12, height: 38, borderRadius: 5, backgroundColor: r.color }} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontFamily: fonts.heading, fontSize: 15, color: t.text }}>{r.label}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16, color: t.textMuted }}>{r.detail}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontFamily: fonts.heading, fontSize: 15, color: t.accent700 }}>{r.time}</Text>
            <Text style={{ fontFamily: fonts.body, fontSize: 10.5, color: t.textMuted }}>{r.extra}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Időjárás-alapú részletes klíma- és napelemterv (Open-Meteo + tőzsdei árak). */
export function WeatherPlans({ tab }: { tab: PlanTab }) {
  const t = useTheme();
  const { state, loadWeather, patch } = useApp();
  const city = cityByKey(state.cityKey);

  useEffect(() => {
    void loadWeather(state.cityKey);
  }, [state.cityKey, loadWeather]);

  const priceHours = useMemo(() => toPriceHours(state.payload), [state.payload]);
  const weatherHours = state.weather?.cityKey === state.cityKey ? state.weather.hours : [];
  const nowMs = Date.now() - 3600000;
  const upcoming = useMemo(() => weatherHours.filter((h) => new Date(h.timestamp).getTime() >= nowMs), [weatherHours, nowMs]);

  const cooling = useMemo(() => (tab === 'klima' && upcoming.length ? buildCoolingPlan(upcoming, priceHours, city.name) : null), [tab, upcoming, priceHours, city.name]);
  const solar = useMemo(() => (tab === 'napelem' && upcoming.length ? buildSolarPlan(upcoming, priceHours, city.name, state.solarKwp) : null), [tab, upcoming, priceHours, city.name, state.solarKwp]);

  const rows: RowData[] = useMemo(() => {
    if (cooling) {
      return cooling.hours.slice(0, 12).map((h) => ({
        key: h.timestamp, time: `${String(h.hour).padStart(2, '0')}:00`, label: h.action_label, detail: h.action_detail,
        color: t[COOL_COLORS[h.action]], extra: `${Math.round(h.outdoor_temp_c)}°C · ${h.price_huf_kwh.toFixed(0)} Ft`,
      }));
    }
    if (solar) {
      return solar.hours.slice(0, 12).map((h) => ({
        key: h.timestamp, time: `${String(h.hour).padStart(2, '0')}:00`, label: h.action_label, detail: h.action_detail,
        color: t[SOLAR_COLORS[h.action]], extra: `${h.irradiance_wm2} W/m² · ${h.price_huf_kwh.toFixed(0)} Ft`,
      }));
    }
    return [];
  }, [cooling, solar, t]);

  const summary = cooling?.summary ?? solar?.summary ?? null;
  const tip = cooling?.tip ?? solar?.tip ?? null;
  const headline = cooling
    ? `${fmt(cooling.saving_huf)} Ft megtakarítás 48 óra alatt (${cooling.saving_pct}%)`
    : solar
      ? `~${solar.total_production_kwh_48h} kWh termelés · ${fmt(solar.total_savings_huf_48h)} Ft spórolás 48 óra alatt`
      : null;

  return (
    <Section kicker="Időjárás + árak" title={tab === 'klima' ? 'Részletes hűtési terv' : 'Részletes napelemterv'} sub="Open-Meteo előrejelzés és a tőzsdei árak alapján, a választott városra.">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
        {HUNGARIAN_CITIES.map((c) => (
          <Chip key={c.key} label={c.name} selected={c.key === state.cityKey} onPress={() => patch({ cityKey: c.key })} />
        ))}
      </ScrollView>
      {tab === 'napelem' ? (
        <NumberField label="Napelemes rendszer mérete (kWp)" value={state.solarKwp} min={0.5} max={50} unit="kWp" onChange={(v) => patch({ solarKwp: v })} style={{ marginBottom: 12 }} />
      ) : null}
      <Card style={{ padding: 16 }}>
        {state.weatherLoading && !upcoming.length ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ActivityIndicator color={t.accent500} />
            <Muted>Időjárás betöltése ({city.name})…</Muted>
          </View>
        ) : !upcoming.length ? (
          <Muted>Nem sikerült időjárás-adatot lekérni. Ellenőrizd a hálózatot, és húzd le a képernyőt a frissítéshez.</Muted>
        ) : !rows.length ? (
          <Muted>Nincs közös időszak az árak és az időjárás között.</Muted>
        ) : (
          <View style={{ gap: 12 }}>
            {headline ? <Text style={{ fontFamily: fonts.heading, fontSize: 18, color: t.good700 }}>{headline}</Text> : null}
            {summary ? <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19.5, color: t.text }}>{summary}</Text> : null}
            <Rows rows={rows} />
            {tip ? <Muted>{tip}</Muted> : null}
          </View>
        )}
      </Card>
    </Section>
  );
}
