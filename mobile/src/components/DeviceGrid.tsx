import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow } from '../theme/tokens';
import type { DeviceCardModel, DeviceSummary } from '../domain/prices';
import { fmt } from '../domain/format';
import { DeviceIcon, Muted } from './ui';

export function DeviceSummaryBanner({ summary }: { summary: DeviceSummary | null }) {
  const t = useTheme();
  if (!summary) return null;
  return (
    <View style={{ backgroundColor: t.good100, borderWidth: 1, borderColor: 'rgba(52,157,98,0.35)', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 12 }}>
      <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19, color: t.text }}>
        💡 A legtöbb gépet <Text style={{ fontFamily: fonts.bodyBold }}>{summary.day} {summary.hour} körül</Text> éri meg indítani{summary.green ? ' — olcsó és 🌱 zöld' : ''}.
      </Text>
    </View>
  );
}

function DeviceCard({ m }: { m: DeviceCardModel }) {
  const t = useTheme();
  const { dev, nowOk } = m;
  return (
    <View style={[{
      width: '48%', flexGrow: 1, borderWidth: 1, borderColor: nowOk ? t.good500 : t.divider, borderRadius: radius.card,
      paddingVertical: 12, paddingHorizontal: 11, gap: 7, backgroundColor: nowOk ? t.good100 : t.bg,
    }, shadow.sm]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
        <View style={{ width: 32, height: 32, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: nowOk ? t.good500 : t.accent500 }}>
          <DeviceIcon path={dev.icon} size={19} color="#fff" />
        </View>
        <View style={{ paddingVertical: 2, paddingHorizontal: 7, borderRadius: radius.pill, backgroundColor: nowOk ? t.good500 : t.accent200 }}>
          <Text numberOfLines={1} style={{ fontFamily: fonts.heading, fontSize: 9.5, letterSpacing: 0.5, textTransform: 'uppercase', color: nowOk ? '#fff' : t.accent800 }}>{m.tag}</Text>
        </View>
      </View>
      <Text style={{ fontFamily: fonts.heading, fontSize: 16, color: t.text }}>{dev.name}</Text>
      <View>
        <Muted size={11}>Legolcsóbb sáv</Muted>
        <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: t.accent700 }}>{m.winStr}{m.greenBest ? ' 🌱' : ''}</Text>
      </View>
      {m.showDay && m.dayStr ? (
        <View style={{ opacity: 0.65, marginTop: -4 }}>
          <Muted size={11}>Napközben</Muted>
          <Text style={{ fontFamily: fonts.bodyBold, fontSize: 14, color: t.accent700 }}>{m.dayStr}{m.greenDay ? ' 🌱' : ''}</Text>
        </View>
      ) : null}
      <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 10.5, lineHeight: 15, color: t.good700, borderTopWidth: 1, borderTopColor: t.divider, paddingTop: 6 }}>
        ~{fmt(m.savePerRun)} Ft alkalmanként (tőzsdei áron) · {fmt(dev.annual)} Ft évente vezérelt/dinamikus tarifán
      </Text>
    </View>
  );
}

export function DeviceGrid({ cards }: { cards: DeviceCardModel[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
      {cards.map((m) => <DeviceCard key={m.dev.id} m={m} />)}
    </View>
  );
}
