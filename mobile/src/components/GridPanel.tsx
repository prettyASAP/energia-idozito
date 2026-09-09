import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import { MIX_GROUPS, mixShares, type GridState, type MixGroupKey } from '../domain/grid';
import { fmt, fmt1 } from '../domain/format';
import { Card, Muted, Section } from './ui';

function Stat({ label, value, unit, sub }: { label: string; value: number | null | undefined; unit: string; sub?: string }) {
  const t = useTheme();
  if (value == null) return null;
  return (
    <View style={{ width: '48%', flexGrow: 1, backgroundColor: t.neutral100, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 12 }}>
      <Text style={{ fontFamily: fonts.heading, fontSize: 10.5, letterSpacing: 0.5, textTransform: 'uppercase', color: t.neutral600 }}>{label}</Text>
      <Text style={{ fontFamily: fonts.heading, fontSize: 17, color: t.text }}>{fmt(value)} <Text style={{ fontFamily: fonts.body, fontSize: 11 }}>{unit}</Text></Text>
      {sub ? <Text style={{ fontFamily: fonts.body, fontSize: 10, color: t.neutral600, marginTop: 1 }}>{sub}</Text> : null}
    </View>
  );
}

export function GridPanel({ grid }: { grid: GridState }) {
  const t = useTheme();
  const mix = grid.mix;
  if (!mix) return null;
  const shares = mixShares(mix);
  const colors: Record<MixGroupKey, string> = { nuclear: '#7c6ff0', gas: '#e0a83c', _renew: t.good500, _other: t.neutral300 };
  const solarMW = grid.renewables?.solar?.latest_actual?.value;
  const windMW = grid.renewables?.wind?.latest_actual?.value;
  const netImp = grid.flows?.net_import?.actual?.value;
  return (
    <Section kicker="A hálózat most" title="Mi termeli az áramod?">
      <Card style={{ padding: 16 }}>
        <View style={{ flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 10 }}>
          {MIX_GROUPS.map((g) => <View key={g.key} style={{ flex: Math.max(0.01, shares[g.key]), backgroundColor: colors[g.key] }} />)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 6, marginBottom: 14 }}>
          {MIX_GROUPS.map((g) => (
            <View key={g.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: colors[g.key] }} />
              <Text style={{ fontFamily: fonts.body, fontSize: 11.5, color: t.text }}>{g.label} <Text style={{ fontFamily: fonts.bodyBold }}>{fmt1(shares[g.key])}%</Text></Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Stat label="Naptermelés" value={solarMW} unit="MW" sub="napelemek most" />
          <Stat label="Széltermelés" value={windMW} unit="MW" sub="szélerőművek most" />
          <Stat label={netImp != null && netImp >= 0 ? 'Import' : 'Export'} value={netImp != null ? Math.abs(netImp) : null} unit="MW" sub={netImp != null && netImp >= 0 ? 'külföldről vesszük' : 'külföldre adjuk'} />
          <Stat label="Hazai termelés" value={mix.total_mw} unit="MW" sub="összes erőmű együtt" />
        </View>
        <Muted size={10.5} style={{ marginTop: 10 }}>Forrás: MAVIR, 15 percenként frissül</Muted>
      </Card>
    </Section>
  );
}
