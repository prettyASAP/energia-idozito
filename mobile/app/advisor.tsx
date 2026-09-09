import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../src/state/AppStore';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts, radius } from '../src/theme/tokens';
import type { AdvisorAnswers } from '../src/domain/types';
import { ALL_DEV } from '../src/domain/devices';
import { ADV_TARIFF_OPTIONS, BUDGET_OPTIONS, buildAdvisorResults, HEAT_OPTIONS, HOME_OPTIONS, PRIORITY_OPTIONS, SIZE_OPTIONS } from '../src/domain/advisor';
import { costTag, fmt } from '../src/domain/format';
import { SheetTop } from '../src/components/Screen';
import { Button, Chip, ChipGrid, ChipGrid2, DeviceIcon, Heading, Kicker, Muted, NumberField, Tag } from '../src/components/ui';

export default function AdvisorScreen() {
  const { state, patch } = useApp();
  const router = useRouter();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(1);
  const [a, setA] = useState<AdvisorAnswers>(state.adv);
  const set = <K extends keyof AdvisorAnswers>(k: K, v: AdvisorAnswers[K]) => setA((s) => ({ ...s, [k]: v }));
  const toggleDevice = (id: string) => set('devices', a.devices.includes(id) ? a.devices.filter((x) => x !== id) : [...a.devices, id]);
  const result = useMemo(() => (step === 5 ? buildAdvisorResults(a) : null), [step, a]);

  const close = () => {
    patch({ adv: a });
    router.back();
  };
  const nav = (back: number, next: number | null, nextLabel: string) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
      <Button title={step === 1 ? 'Mégsem' : 'Vissza'} style={{ flex: 1 }} onPress={() => (step === 1 ? close() : setStep(back))} />
      <Button title={nextLabel} variant="primary" style={{ flex: 1 }} onPress={() => (next == null ? close() : setStep(next))} />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18 + (insets.top ? 4 : 0), paddingBottom: Math.max(40, insets.bottom + 20), gap: 12 }} keyboardShouldPersistTaps="handled">
        <SheetTop label={`${step} / 5`} progress={step / 5} onClose={close} />

        {step === 1 ? (
          <>
            <Heading size={21}>Az otthonodról</Heading>
            <Kicker>Ingatlantípus</Kicker>
            <ChipGrid>{HOME_OPTIONS.map((o) => <Chip key={o.id} label={o.label} selected={a.homeType === o.id} onPress={() => set('homeType', o.id)} />)}</ChipGrid>
            <Kicker style={{ marginTop: 6 }}>Alapterület</Kicker>
            <ChipGrid>{SIZE_OPTIONS.map((o) => <Chip key={o.id} label={o.label} selected={a.homeSize === o.id} onPress={() => set('homeSize', o.id)} />)}</ChipGrid>
            <Kicker style={{ marginTop: 6 }}>Fűtés</Kicker>
            <ChipGrid>{HEAT_OPTIONS.map((o) => <Chip key={o.id} label={o.label} selected={a.heating === o.id} onPress={() => set('heating', o.id)} />)}</ChipGrid>
            {nav(1, 2, 'Tovább')}
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Heading size={21}>Eszközeid</Heading>
            <ChipGrid2>
              {ALL_DEV.map((d) => (
                <Chip key={d.id} label={d.name} selected={a.devices.includes(d.id)} onPress={() => toggleDevice(d.id)}
                  icon={<DeviceIcon path={d.icon} size={17} color={a.devices.includes(d.id) ? '#fff' : t.text} />} />
              ))}
            </ChipGrid2>
            {nav(1, 3, 'Tovább')}
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Heading size={21}>Számla és tarifa</Heading>
            <NumberField label="Havi villanyszámla (Ft)" value={a.bill} min={0} max={1000000} onChange={(v) => set('bill', v)} unit="Ft" />
            <Kicker style={{ marginTop: 6 }}>Tarifa</Kicker>
            <ChipGrid>{ADV_TARIFF_OPTIONS.map((o) => <Chip key={o.id} label={o.label} selected={a.tariff === o.id} onPress={() => set('tariff', o.id)} />)}</ChipGrid>
            {nav(2, 4, 'Tovább')}
          </>
        ) : null}

        {step === 4 ? (
          <>
            <Heading size={21}>Befektetési keret</Heading>
            <ChipGrid2>{BUDGET_OPTIONS.map((o) => <Chip key={o.val} label={o.label} sub={o.sub} selected={a.budget === o.val} onPress={() => set('budget', o.val)} />)}</ChipGrid2>
            <Kicker style={{ marginTop: 6 }}>Prioritás</Kicker>
            <ChipGrid>{PRIORITY_OPTIONS.map((o) => <Chip key={o.id} label={o.label} selected={a.priority === o.id} onPress={() => set('priority', o.id)} />)}</ChipGrid>
            {nav(3, 5, 'Eredmények')}
          </>
        ) : null}

        {step === 5 && result ? (
          <>
            <Heading size={21}>Ajánlásaid</Heading>
            <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19.5, color: t.text, marginBottom: 4 }}>{result.summary}</Text>
            <View style={{ gap: 10 }}>
              {result.recs.map((r, i) => (
                <View key={r.t} style={{ borderWidth: 1, borderColor: t.divider, borderRadius: radius.card, padding: 12, gap: 5 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <Text style={{ flex: 1, fontFamily: fonts.heading, fontSize: 15, color: t.text }}>{i + 1}. {r.t}</Text>
                    <Tag bg={t.accent100} fg={t.accent800} size={10}>{costTag(r.cost)}</Tag>
                  </View>
                  <Muted>{r.d}</Muted>
                  <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 12.5, color: t.good700 }}>~{fmt(Math.round(r.save))} Ft megtakarítás / év</Text>
                </View>
              ))}
            </View>
            {nav(4, null, 'Bezárás')}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
