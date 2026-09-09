import React from 'react';
import { Pressable, View, Text, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius } from '../theme/tokens';
import type { Level } from '../domain/types';
import type { BarModel, HeatCell, TrendModel } from '../domain/prices';
import { fmt1 } from '../domain/format';
import { Card, Muted } from './ui';

// ── Hőtérkép (6×4 rács, 24 óra) ────────────────────────────────────────

export function Heatmap({ cells, detail, selHour, onSelect }: { cells: HeatCell[]; detail: string; selHour: number | null; onSelect: (h: number | null) => void }) {
  const t = useTheme();
  const colors: Record<Level, [string, string]> = {
    olcso: [t.good500, '#fff'],
    atlagos: [t.accent200, t.accent900],
    draga: [t.bad500, '#fff'],
  };
  return (
    <Card>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
        {cells.map((c) => {
          const [bg, fg] = colors[c.lvl];
          const sel = selHour === c.h;
          return (
            <Pressable
              key={c.h}
              accessibilityRole="button"
              accessibilityLabel={`${c.h} óra, ${fmt1(c.p)} forint per kilowattóra`}
              onPress={() => onSelect(sel ? null : c.h)}
              style={{
                width: '15.5%', flexGrow: 1, aspectRatio: 1.15, borderRadius: radius.cell, alignItems: 'center', justifyContent: 'center', gap: 1,
                backgroundColor: bg,
                borderWidth: sel || c.isCur ? 2 : 0, borderColor: t.accent900, borderStyle: sel ? 'solid' : 'dashed',
              }}
            >
              <Text style={{ fontFamily: fonts.heading, fontSize: 13, color: fg }}>{c.h}</Text>
              <Text style={{ fontFamily: fonts.body, fontSize: 9, color: fg, opacity: 0.75 }}>{fmt1(c.p)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.textMuted, marginTop: 10 }}>{detail}</Text>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        {([['Olcsó', t.good500], ['Átlagos', t.accent300], ['Drága', t.bad500]] as const).map(([l, c]) => (
          <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <View style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: c }} />
            <Muted size={10.5}>{l}</Muted>
          </View>
        ))}
      </View>
    </Card>
  );
}

// ── 72 órás oszlopdiagram ──────────────────────────────────────────────

export function BarChart72({ bars, maxP }: { bars: BarModel[]; maxP: number }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const W = 720;
  const H = 140;
  const fills: Record<Level, string> = { olcso: t.good500, atlagos: t.accent300, draga: t.bad500 };
  const dayLabels: Record<number, string> = { 0: 'Tegnap', 24: 'Ma', 48: 'Holnap' };
  const scale = Math.min(1, (width - 28 - 24) / W);
  return (
    <Card style={{ paddingVertical: 14, paddingHorizontal: 12 }}>
      <Svg width="100%" height={170 * Math.max(0.6, scale)} viewBox={`0 0 ${W} 170`} preserveAspectRatio="none">
        {bars.map((b) => {
          const barH = Math.max(2, (b.p / maxP) * H);
          const x = b.i * 10;
          const y = 155 - barH;
          const fill = b.isYesterday ? t.neutral600 : fills[b.lvl];
          const op = b.missing ? 0.15 : b.isYesterday ? 0.4 : b.isTomorrow ? 0.45 : 1;
          return (
            <React.Fragment key={b.i}>
              {dayLabels[b.i] ? <SvgText x={x} y={10} fontSize={10} fontWeight="600" fill={t.neutral600} fontFamily={fonts.body}>{dayLabels[b.i]}</SvgText> : null}
              <Rect x={x} y={y} width={8} height={barH} fill={fill} opacity={op} rx={1} />
              {b.h % 6 === 0 ? <SvgText x={x} y={168} fontSize={10} fill={t.neutral600} fontFamily={fonts.body}>{b.h}h</SvgText> : null}
            </React.Fragment>
          );
        })}
      </Svg>
    </Card>
  );
}

// ── 30 napos trend ─────────────────────────────────────────────────────

export function TrendChart({ model }: { model: TrendModel | null }) {
  const t = useTheme();
  if (!model) {
    return (
      <Card style={{ paddingVertical: 14, paddingHorizontal: 12 }}>
        <Muted>Még nincs elég napi adat a trendhez.</Muted>
      </Card>
    );
  }
  const { days, avgs, maxA, minA, trendUp } = model;
  const range = Math.max(1, maxA - minA);
  const W = 480;
  const H = 110;
  const TOP = 14;
  const stepX = W / (days.length - 1);
  const pts = avgs.map((a, i) => [i * stepX, TOP + H - ((a - minA) / range) * H] as const);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${path} L${pts[pts.length - 1][0].toFixed(1)},${TOP + H + 8} L0,${TOP + H + 8} Z`;
  const lbl = (i: number) => {
    const [, m, d] = days[i].split('-');
    return `${parseInt(m, 10)}.${parseInt(d, 10)}.`;
  };
  const mid = Math.floor(days.length / 2);
  const lastAvg = avgs[avgs.length - 1];
  const last = pts[pts.length - 1];
  return (
    <Card style={{ paddingVertical: 14, paddingHorizontal: 12 }}>
      <Svg width="100%" height={150} viewBox={`0 0 ${W} 150`} preserveAspectRatio="none">
        <Path d={area} fill={t.accent200} opacity={0.35} />
        <Path d={path} fill="none" stroke={t.accent500} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <Circle cx={last[0]} cy={last[1]} r={3.5} fill={t.accent500} />
        <SvgText x={0} y={TOP + H + 22} fontSize={10} fill={t.neutral600} fontFamily={fonts.body}>{lbl(0)}</SvgText>
        <SvgText x={mid * stepX} y={TOP + H + 22} fontSize={10} fill={t.neutral600} fontFamily={fonts.body} textAnchor="middle">{lbl(mid)}</SvgText>
        <SvgText x={W} y={TOP + H + 22} fontSize={10} fill={t.neutral600} fontFamily={fonts.body} textAnchor="end">{lbl(days.length - 1)}</SvgText>
        <SvgText x={0} y={10} fontSize={10} fill={t.neutral600} fontFamily={fonts.body}>havi csúcs: {fmt1(maxA)} Ft</SvgText>
        <SvgText x={W} y={10} fontSize={10} fontWeight="600" fill={trendUp ? t.bad500 : t.good500} fontFamily={fonts.body} textAnchor="end">
          tegnapi átlag: {fmt1(lastAvg)} Ft {trendUp ? '▲ emelkedő' : '▼ csökkenő'}
        </SvgText>
      </Svg>
    </Card>
  );
}

// ── KPI gyűrű ──────────────────────────────────────────────────────────

export function Ring({ ratio, label, sub }: { ratio: number; label: string; sub: string }) {
  const t = useTheme();
  const C = 2 * Math.PI * 37; // ≈ 232
  return (
    <View style={{ width: 88, height: 88 }}>
      <Svg width={88} height={88} viewBox="0 0 88 88">
        <Circle cx={44} cy={44} r={37} fill="none" stroke="rgba(181,217,253,0.18)" strokeWidth={6} />
        <Circle cx={44} cy={44} r={37} fill="none" stroke={t.good300} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={`${C}`} strokeDashoffset={C * (1 - ratio)} transform="rotate(-90 44 44)" />
      </Svg>
      <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: fonts.heading, fontSize: 19, lineHeight: 20, color: t.good300 }}>{label}</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 9, color: 'rgba(245,245,248,0.72)' }}>{sub}</Text>
      </View>
    </View>
  );
}
