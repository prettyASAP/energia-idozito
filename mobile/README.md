# Energia Időzítő — mobilalkalmazás (iOS + Android)

A webes Energia Időzítő teljes újraírása **Expo (React Native) + TypeScript** alapon, áruházi kiadásra
előkészítve. Az app önálló: nem függ a Python backendtől, közvetlenül a nyilvános adatforrásokból dolgozik.

## Gyors indítás

```bash
cd mobile
npm install
npx expo start          # QR-kód → Expo Go (iOS/Android) vagy szimulátor
npm run typecheck       # TypeScript
npm test                # Jest egységtesztek
```

Áruházi kiadás lépésről lépésre: **[store/CHECKLIST.md](store/CHECKLIST.md)**.

## Felépítés

```
app/                    expo-router képernyők
  _layout.tsx           betűtípusok, splash, providerek, Stack (fülek + modálok)
  (tabs)/               Ma · Árak · Megtakarítás · Tervek (egyedi tab bar a design szerint)
  onboarding.tsx        3 lépéses megtakarítás-kalkulátor (modál)
  advisor.tsx           5 lépéses személyes energiaterv (modál)
  adatvedelem.tsx       appon belüli adatvédelmi tájékoztató
src/
  domain/               tiszta üzleti logika (a régi app.js + backend/analysis portja)
    prices.ts           árszintek, legjobb sávok, hero/eszközkártya/hőtérkép/oszlop/trend modellek
    predictor.ts        előrejelző (hét napja × óra minta + trend), kvantilisek, MAPE visszateszt
    savings.ts          onboarding becslés, tarifa-összehasonlítás (rezsivédett / vezérelt / D tarifa)
    advisor.ts          tanácsadó szabályok
    plan.ts             napi klíma/napelem idősáv
    cooling.ts          klíma előhűtési tervező (cooling_planner.py portja)
    solar.ts            napelem önfogyasztási tervező (solar_planner.py portja)
    grid.ts             MAVIR-alapú hálózati modellek, zöld órák
    time.ts             Európa/Budapest időzóna (Intl), a készülék zónájától függetlenül
  data/                 hálózati réteg (a FastAPI backend helyett)
    energyCharts.ts     day-ahead árak (energy-charts.info, kulcs nélkül)
    ecb.ts              EUR/HUF árfolyam
    openMeteo.ts        időjárás, városlista
    mavir.ts + xlsx.ts  MAVIR RTDW XLSX-export letöltés és feldolgozás (fflate)
    priceService.ts     a régi /api/forecast megfelelője + AsyncStorage cache
  state/AppStore.tsx    globális állapot, perzisztencia, percenkénti frissítés
  notifications/        helyi értesítések az olcsó sávok kezdetére (expo-notifications)
  components/           UI komponensek a design tokenekkel (Barlow / Barlow Condensed)
  theme/                világos/sötét tokenek (oklch → hex konvertálva)
assets/                 ikonok, splash (generálás: npm run assets)
store/                  adatvédelmi tájékoztató, áruházi szövegek, ellenőrzőlista, feature graphic
```

## Miben más, mint a webes app?

- **Nincs szerver.** Árak, árfolyam, hálózati adatok és időjárás közvetlenül a forrásból; az utolsó
  sikeres árcsomag a készüléken cache-elődik, így offline is azonnal nyílik.
- **A holnapi árak valósak**, ha a day-ahead aukció már publikálta őket (13:00 után); csak azon túl
  jön előrejelzés. A web mindig előrejelzést mutatott holnapra.
- **Helyi értesítések** Web Push helyett: az app előre beütemezi a következő 48 óra olcsó sávjainak
  kezdetét. Nincs VAPID kulcs, nincs push-szerver.
- **Időjárás-alapú részletes tervek** a Tervek fülön (klíma előhűtés, napelem) — a backend tervezői
  eddig nem voltak elérhetők a felületen.
- **Időzóna-biztos**: minden óra magyar idő szerint számolódik, külföldön is.

## Konfiguráció áruházhoz

- `app.json` — név, bundle ID (`hu.energiaidozito.app`), ikonok, splash, engedélyek, privacy manifest
- `eas.json` — build/submit profilok (a submit mezőket a saját Apple/Google adataiddal töltsd ki)
- `locales/hu.json` — iOS magyar megjelenítési név

## Ismert korlátok

- A MAVIR rtdwweb szervere hiányos tanúsítványlánccal válaszol; ha a készülék TLS-e elutasítja, a
  „Mi termeli az áramod?” panel egyszerűen nem jelenik meg (az app többi része működik).
- Az Android helyi értesítések nem „exact alarm” módban ütemeződnek (Play-irányelv miatt), ezért
  néhány perces csúszás előfordulhat.
- Expo Go-ban az értesítések működnek, de a végleges viselkedéshez development/production build kell.
