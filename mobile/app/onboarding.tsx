import React, { useMemo, useState } from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../src/state/AppStore';
import { useTheme } from '../src/theme/ThemeContext';
import { fonts, radius } from '../src/theme/tokens';
import type { Flex, Tariff } from '../src/domain/types';
import { ALL_DEV } from '../src/domain/devices';
import { calcOnboardingSavings, compareTariffs, FLEX_OPTIONS, RESULT_DESCS, spotAverage, TARIFF_INFO, TARIFF_OPTIONS } from '../src/domain/savings';
import { fmt } from '../src/domain/format';
import { useCountUp } from '../src/hooks/useCountUp';
import { SheetTop } from '../src/components/Screen';
import { TariffCompare } from '../src/components/Savings';
import { Button, Chip, ChipGrid, ChipGrid2, DeviceIcon, Heading, Kicker, Muted, NumberField } from '../src/components/ui';
import { LINKS, openLink } from '../src/lib/links';

const STEP_LABELS = ['1 / 3 · Eszközök', '2 / 3 · Tarifa', '3 / 3 · Eredmény'];

function ResultAmount({ amount }: { amount: number }) {
  const t = useTheme();
  const v = useCountUp(amount, 1000);
  return (
    <View style={{ backgroundColor: t.accent900, borderColor: t.heroBorder, borderWidth: 1, borderRadius: radius.card, padding: 20, alignItems: 'center' }}>
      <Text style={{ fontFamily: fonts.heading, fontSize: 40, lineHeight: 42, color: t.good300 }}>{fmt(v)}</Text>
      <Text style={{ fontFamily: fonts.heading, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: t.heroText, opacity: 0.75, marginTop: 6 }}>Ft / év becsült megtakarítás</Text>
    </View>
  );
}

export default function OnboardingScreen() {
  const { state, patch } = useApp();
  const router = useRouter();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [devices, setDevices] = useState<string[]>(state.obsDevices);
  const [tariff, setTariff] = useState<Tariff>(state.obsTariff);
  const [flex, setFlex] = useState<Flex>(state.obsFlex);
  const [kwh, setKwh] = useState(state.obsKwh);

  const amount = useMemo(() => calcOnboardingSavings(devices, tariff, flex), [devices, tariff, flex]);
  const cmp = useMemo(() => compareTariffs(kwh, flex, tariff, spotAverage(state.payload?.prices ?? [])), [kwh, flex, tariff, state.payload]);

  const close = () => router.back();
  const toggleDevice = (id: string) => setDevices((d) => (d.includes(id) ? d.filter((x) => x !== id) : [...d, id]));
  const finish = () => {
    patch({ obsDevices: devices, obsTariff: tariff, obsFlex: flex, obsKwh: kwh, obsDone: true, savedAmt: amount });
    router.dismissTo('/');
  };
  const next = () => {
    if (step === 1) patch({ obsDevices: devices, obsTariff: tariff, obsFlex: flex, obsKwh: kwh, savedAmt: amount });
    setStep((s) => Math.min(2, s + 1));
  };

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18 + (insets.top ? 4 : 0), paddingBottom: Math.max(40, insets.bottom + 20), gap: 14 }} keyboardShouldPersistTaps="handled">
        <SheetTop label={STEP_LABELS[step]} onClose={close} />

        {step === 0 ? (
          <>
            <Heading size={21}>Milyen eszközeid vannak?</Heading>
            <ChipGrid2>
              {ALL_DEV.map((d) => (
                <Chip key={d.id} label={d.name} selected={devices.includes(d.id)} onPress={() => toggleDevice(d.id)}
                  icon={<DeviceIcon path={d.icon} size={17} color={devices.includes(d.id) ? '#fff' : t.text} />} />
              ))}
            </ChipGrid2>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
              <Button title="Kihagyom" style={{ flex: 1 }} onPress={close} />
              <Button title="Tovább" variant="primary" style={{ flex: 1 }} onPress={next} disabled={!devices.length} />
            </View>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <Heading size={21}>Milyen tarifán vagy?</Heading>
            <ChipGrid>
              {TARIFF_OPTIONS.map((o) => <Chip key={o.id} label={o.label} selected={tariff === o.id} onPress={() => setTariff(o.id)} />)}
            </ChipGrid>
            <Muted size={11.5}>{TARIFF_INFO[tariff]}</Muted>
            <Kicker style={{ marginTop: 6 }}>Havi fogyasztás</Kicker>
            <NumberField value={kwh} min={50} max={2000} onChange={setKwh} unit="kWh / hó (a számládon találod)" />
            <Kicker style={{ marginTop: 6 }}>Rugalmasság</Kicker>
            <ChipGrid2>
              {FLEX_OPTIONS.map((o) => <Chip key={o.id} label={o.label} selected={flex === o.id} onPress={() => setFlex(o.id)} />)}
            </ChipGrid2>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
              <Button title="Vissza" style={{ flex: 1 }} onPress={() => setStep(0)} />
              <Button title="Számítsd ki" variant="primary" style={{ flex: 1 }} onPress={next} />
            </View>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Heading size={21}>Becsült megtakarítás</Heading>
            <ResultAmount amount={amount} />
            <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19.5, color: t.text }}>{RESULT_DESCS[tariff]}</Text>
            <TariffCompare cmp={cmp} myTariff={tariff} kwhMonth={Math.max(50, kwh)} />
            <Muted size={11}>
              Becslés energy-charts.info (Fraunhofer ISE, SMARD) és MEKH adatok alapján.{' '}
              <Text accessibilityRole="link" onPress={() => openLink(LINKS.mekh)} style={{ color: t.accent700, textDecorationLine: 'underline' }}>mekh.hu</Text>
              {' · '}
              <Text accessibilityRole="link" onPress={() => openLink(LINKS.mvmDynamic)} style={{ color: t.accent700, textDecorationLine: 'underline' }}>mvmnext.hu/aram/dinamikus</Text>
            </Muted>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: 4 }}>
              <Button title="Vissza" style={{ flex: 1 }} onPress={() => setStep(1)} />
              <Button title="Mutasd az időpontokat" variant="primary" style={{ flex: 1 }} onPress={finish} />
            </View>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
