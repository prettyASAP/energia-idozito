import React from 'react';
import { ScrollView, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { useTheme } from '../src/theme/ThemeContext';
import { SheetTop } from '../src/components/Screen';
import { Body, Heading, Kicker, Muted } from '../src/components/ui';
import { LINKS, openLink } from '../src/lib/links';

function Link({ url, children }: { url: string; children: string }) {
  const t = useTheme();
  return <Text accessibilityRole="link" onPress={() => openLink(url)} style={{ color: t.accent700, textDecorationLine: 'underline' }}>{children}</Text>;
}

export default function PrivacyScreen() {
  const router = useRouter();
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 18 + (insets.top ? 4 : 0), paddingBottom: Math.max(40, insets.bottom + 20), gap: 12 }}>
        <SheetTop label="Adatvédelem" onClose={() => router.back()} />
        <Heading size={21}>Adatvédelmi tájékoztató</Heading>
        <Body size={13}>
          Az Energia Időzítő nem gyűjt személyes adatot, nem kér regisztrációt, és nem tartalmaz analitikát vagy hirdetést.
          Minden beállításod (eszközök, tarifa, város, kalkulátor-értékek) kizárólag a készülékeden tárolódik, és az app törlésével megszűnik.
        </Body>
        <Kicker>Hálózati kapcsolatok</Kicker>
        <Body size={13}>
          Az app közvetlenül nyilvános adatforrásokat kérdez le. Ezek a szolgáltatók a kérés technikai adatait (IP-cím) a saját adatkezelési szabályaik szerint kezelhetik:
        </Body>
        <Body size={13}>
          • <Link url={LINKS.energyCharts}>energy-charts.info</Link> — tőzsdei áramárak (Bundesnetzagentur | SMARD.de, CC BY 4.0){'\n'}
          • <Link url={LINKS.ecb}>Európai Központi Bank</Link> — EUR/HUF árfolyam{'\n'}
          • <Link url={LINKS.mavir}>MAVIR</Link> — magyar hálózati adatok (termelési mix, nap- és széltermelés, import){'\n'}
          • <Link url="https://open-meteo.com">Open-Meteo</Link> — időjárás-előrejelzés a választott városra
        </Body>
        <Kicker>Értesítések</Kicker>
        <Body size={13}>
          Az olcsó-áram értesítések a készüléken helyben ütemeződnek a letöltött árakból. Nincs push-szerver, nem küldünk eszközazonosítót sehova. Az értesítéseket a csengő ikonnal bármikor kikapcsolhatod.
        </Body>
        <Kicker>Helyadatok</Kicker>
        <Body size={13}>
          Az app nem használ helymeghatározást. Az időjárás-alapú tervekhez te választasz várost egy listából.
        </Body>
        <Kicker>Felelősség</Kicker>
        <Body size={13}>
          A megtakarítási becslések tájékoztató jellegűek, nyilvános tarifaadatokon (MEKH, MVM Next) és tőzsdei árakon alapulnak. Tarifaváltás vagy beruházás előtt egyeztess a szolgáltatóddal.
        </Body>
        <Muted size={11}>
          Teljes tájékoztató: <Link url={LINKS.privacy}>privacy-policy.md</Link> · Verzió: {version}
        </Muted>
      </ScrollView>
    </View>
  );
}
