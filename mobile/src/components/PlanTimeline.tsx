import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import { PHASE_DESCS, planTimeStr, type PlanColor, type PlanModel, type PlanRow } from '../domain/plan';
import { Card, Muted } from './ui';

export function usePlanColor() {
  const t = useTheme();
  return (c: PlanColor) => t[c];
}

function BigCard({ kicker, r, accent }: { kicker: string; r: PlanRow | null; accent: boolean }) {
  const t = useTheme();
  const color = usePlanColor();
  if (!r) return null;
  return (
    <View style={{ backgroundColor: accent ? t.accent100 : t.neutral100, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 6, alignSelf: 'stretch', borderRadius: 3, backgroundColor: color(r.color) }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: fonts.heading, fontSize: 10, letterSpacing: 0.7, textTransform: 'uppercase', color: t.neutral600 }}>{kicker}</Text>
        <Text style={{ fontFamily: fonts.heading, fontSize: 15.5, color: t.text }}>{r.phase}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: t.neutral600 }}>{PHASE_DESCS[r.phase] ?? ''}</Text>
      </View>
      <Text style={{ fontFamily: fonts.heading, fontSize: 12.5, color: t.text }}>{planTimeStr(r)}</Text>
    </View>
  );
}

export function PlanTimeline({ plan }: { plan: PlanModel }) {
  const t = useTheme();
  const color = usePlanColor();
  return (
    <Card style={{ padding: 16 }}>
      <View style={{ position: 'relative', paddingTop: 12, marginBottom: 6 }}>
        <View style={{ position: 'absolute', top: 0, left: `${plan.nowPct}%`, transform: [{ translateX: -18 }] }}>
          <Text style={{ fontFamily: fonts.heading, fontSize: 9, letterSpacing: 0.5, color: t.accent800 }}>▼ MOST</Text>
        </View>
        <View style={{ flexDirection: 'row', height: 22, borderRadius: 8, overflow: 'hidden' }}>
          {plan.rows.map((r, i) => (
            <View key={i} style={{ flex: r.end - r.start, backgroundColor: color(r.color) }} accessibilityLabel={`${r.phase} ${planTimeStr(r)}`} />
          ))}
        </View>
        <View style={{ height: 14, marginTop: 3, position: 'relative' }}>
          {[0, 6, 12, 18, 24].map((h) => (
            <Text key={h} style={{ position: 'absolute', left: `${(h / 24) * 100}%`, fontFamily: fonts.body, fontSize: 9.5, color: t.neutral600, transform: [{ translateX: h === 24 ? -12 : h === 0 ? 0 : -4 }] }}>{h}</Text>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginBottom: 14 }}>
        {plan.legend.map((l) => (
          <View key={l.phase} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: color(l.color) }} />
            <Text style={{ fontFamily: fonts.body, fontSize: 11, color: t.text }}>{l.phase}</Text>
          </View>
        ))}
      </View>
      <BigCard kicker="Most" r={plan.cur} accent />
      <BigCard kicker="Következő" r={plan.next} accent={false} />
      <Muted style={{ marginTop: 12 }}>{plan.tip}</Muted>
    </Card>
  );
}
