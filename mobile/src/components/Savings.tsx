import React, { useEffect, useRef } from 'react';
import { Animated, View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow } from '../theme/tokens';
import { fmt } from '../domain/format';
import { kpiRatio, type TariffComparison } from '../domain/savings';
import { useCountUp } from '../hooks/useCountUp';
import { Ring } from './Charts';
import { Muted } from './ui';

export function KpiBox({ amount, subtitle }: { amount: number; subtitle: string }) {
  const t = useTheme();
  const year = useCountUp(amount, 900);
  const month = useCountUp(Math.round(amount / 12), 900);
  const ratio = kpiRatio(amount);
  return (
    <View style={{ gap: 12 }}>
      <Muted style={{ marginTop: -8 }}>{subtitle}</Muted>
      <View style={{ backgroundColor: t.accent900, borderColor: t.heroBorder, borderWidth: 1, borderRadius: radius.card, paddingVertical: 18, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: fonts.heading, fontSize: 40, lineHeight: 42, color: t.good300 }}>{fmt(year)}</Text>
          <Text style={{ fontFamily: fonts.heading, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: t.heroText, opacity: 0.75, marginTop: 5 }}>Ft / év becsült megtakarítás</Text>
        </View>
        <Ring ratio={ratio} label={`${Math.round(ratio * 100)}%`} sub="becsült potenciál" />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={[{ flex: 1, backgroundColor: t.accent100, borderColor: t.divider, borderWidth: 1, borderRadius: radius.card, padding: 14 }, shadow.sm]}>
          <Text style={{ fontFamily: fonts.heading, fontSize: 26, color: t.good700 }}>{fmt(month)}</Text>
          <Text style={{ fontFamily: fonts.heading, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase', color: t.textMuted }}>Ft / hó</Text>
        </View>
        <View style={[{ flex: 1, backgroundColor: t.accent100, borderColor: t.divider, borderWidth: 1, borderRadius: radius.card, padding: 14 }, shadow.sm]}>
          <Text style={{ fontFamily: fonts.heading, fontSize: 26, color: t.good700 }}>{Math.round(ratio * 100)}%</Text>
          <Text style={{ fontFamily: fonts.heading, fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase', color: t.textMuted }}>a 180e Ft-os potenciálból</Text>
        </View>
      </View>
    </View>
  );
}

function Bar({ pct, best, delay }: { pct: number; best: boolean; delay: number }) {
  const t = useTheme();
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(w, { toValue: pct, duration: 1000, delay, useNativeDriver: false }).start();
  }, [pct, delay, w]);
  return (
    <View style={{ height: 14, borderRadius: 7, backgroundColor: t.neutral200, overflow: 'hidden' }}>
      <Animated.View style={{ height: '100%', borderRadius: 7, backgroundColor: best ? t.good500 : t.accent300, width: w.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] }) }} />
    </View>
  );
}

function Count({ target, delay }: { target: number; delay: number }) {
  const t = useTheme();
  const v = useCountUp(target, 1000 + delay);
  return <Text style={{ fontFamily: fonts.heading, fontSize: 15, color: t.text }}>{fmt(v)}</Text>;
}

/** "Melyik tarifa éri meg?" — a három opció éves számlája sávokkal. */
export function TariffCompare({ cmp, myTariff, kwhMonth }: { cmp: TariffComparison; myTariff: string; kwhMonth: number }) {
  const t = useTheme();
  return (
    <View style={{ marginTop: 10 }}>
      <View style={{ backgroundColor: t.accent100, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 14 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19.5, color: t.text }}>{cmp.verdict}</Text>
      </View>
      <Text style={{ fontFamily: fonts.heading, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase', color: t.neutral600, marginBottom: 8 }}>
        Éves villanyszámla havi {fmt(kwhMonth)} kWh fogyasztással
      </Text>
      {cmp.opts.map((o, i) => {
        const isBest = o === cmp.best;
        const mine = o.key === myTariff;
        const diff = Math.round(o.bill - cmp.best.bill);
        return (
          <View key={o.key} style={{ paddingVertical: 7 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4, gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: isBest ? fonts.bodyBold : fonts.body, fontSize: 12.5, color: t.text }}>
                {isBest ? '🏆 ' : ''}{o.name}{mine ? <Text style={{ fontSize: 10, color: t.accent800 }}> — a tiéd</Text> : null}
                {o.key === 'piaci' && cmp.annualKwh <= 2523 ? <Text style={{ fontSize: 10, color: t.neutral600 }}> ({cmp.annualKwh} kWh/év — kereten belül, teljes fogyasztás rezsivédett áron)</Text> : null}
              </Text>
              <View style={{ alignItems: 'flex-end' }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2 }}>
                  <Count target={Math.round(o.bill)} delay={i * 150} />
                  <Text style={{ fontFamily: fonts.body, fontSize: 11, color: t.neutral600 }}> Ft/év</Text>
                </View>
                {!isBest ? <Text style={{ fontFamily: fonts.bodyBold, fontSize: 10.5, color: t.bad500 }}>+{fmt(diff)} Ft drágább</Text> : null}
              </View>
            </View>
            <Bar pct={(o.bill / cmp.maxBill) * 100} best={isBest} delay={300 + i * 150} />
          </View>
        );
      })}
      <Muted size={11} style={{ marginTop: 10 }}>{cmp.footnote}</Muted>
    </View>
  );
}
