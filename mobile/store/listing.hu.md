# Áruházi szövegek (magyar) — Energia Időzítő

## Alapadatok

| Mező | Érték |
|---|---|
| App neve | Energia Időzítő |
| Alcím (App Store, max 30) | Mikor olcsó az áram? |
| Rövid leírás (Play, max 80) | Élő tőzsdei áramárak — mikor éri meg bekapcsolni a mosógépet, bojlert, autót. |
| Kategória | Utilities (App Store) · Tools / Eszközök (Play) |
| Ár | Ingyenes, nincs app-on belüli vásárlás |
| Korhatár | 4+ (App Store) · Mindenki / PEGI 3 (Play) |
| Bundle ID / package | hu.energiaidozito.app |
| Support URL | [KITÖLTENDŐ — pl. GitHub repo vagy weboldal] |
| Adatvédelmi URL | [KITÖLTENDŐ — a store/privacy-policy.md nyilvános címe] |
| Kulcsszavak (App Store, max 100 karakter) | áram,villany,ár,rezsi,tőzsde,megtakarítás,energia,napelem,klíma,mavir,tarifa |

## Teljes leírás (App Store max 4000, Play max 4000 karakter)

Az Energia Időzítő 3 másodperc alatt megmutatja, **mikor éri meg bekapcsolni** az otthoni gépeidet a magyar tőzsdei áramárak alapján.

**Mit tud az app?**

⚡ **Élő ár** — az aktuális órás tőzsdei ár forintban (energy-charts.info + EKB árfolyam), színkódolva: olcsó, átlagos, drága.

🕒 **Mikor kapcsoljam be?** — mosógép, mosogatógép, bojler, klíma, e-autó töltő és szárítógép: a következő 24 óra legolcsóbb sávja minden eszközhöz, a várható megtakarítással.

🌱 **Zöld órák** — a MAVIR nap-előrejelzése alapján megmutatjuk, mikor termel sokat a napenergia: olcsó ÉS zöld.

▦ **Napi hőtérkép és 72 órás grafikon** — tegnap, ma, holnap óránként; 30 napos áralakulás.

💰 **Megtakarítás-kalkulátor** — eszközeid, tarifád és rugalmasságod alapján éves becslés; melyik tarifa éri meg neked: rezsivédett, vezérelt (éjszakai) vagy a 2027-től induló dinamikus D tarifa.

🗓 **Tervek** — klíma előhűtési terv és napelemes önfogyasztási terv az időjárás-előrejelzés (Open-Meteo) és az árak alapján, a te városodra.

🧭 **Személyes energiaterv** — 4 kérdés az otthonodról, és rangsorolt, költséggel ellátott javaslatok.

🔔 **Értesítés** — kérj jelzést, amikor olcsó sáv kezdődik. Helyi értesítés, nincs regisztráció, nincs szerver.

**Adatforrások:** energy-charts.info (Bundesnetzagentur | SMARD.de, CC BY 4.0), Európai Központi Bank, MAVIR, MEKH, Open-Meteo. A becslések tájékoztató jellegűek.

**Adatvédelem:** az app nem gyűjt személyes adatot, nincs benne hirdetés vagy analitika. A beállításaid csak a készülékeden tárolódnak.

## Újdonságok (1.0.0)

Első kiadás: élő árak, eszköz-időzítés, hőtérkép, megtakarítás-kalkulátor, tervek, értesítések.

## Képernyőképek (kötelező méretek)

Készítsd a képernyőképeket az EAS build-ből vagy szimulátorból, magyar felülettel, valós adatokkal (ne demó):

| Áruház | Méret | Darab |
|---|---|---|
| App Store — iPhone 6,9" (iPhone 16 Pro Max) | 1320 × 2868 | 3–10 |
| App Store — iPhone 6,5" (iPhone 11 Pro Max / XS Max) | 1284 × 2778 vagy 1242 × 2688 | 3–10 |
| Google Play — telefon | 1080 × 1920 (16:9 vagy 9:16, min 320 px, max 3840 px) | 2–8 |
| Google Play — feature graphic | 1024 × 500 (`store/feature-graphic.png`) | 1 |
| Google Play — app ikon | 512 × 512 (az `assets/icon.png` kicsinyítve) | 1 |

Javasolt sorrend: 1) Ma fül hero + eszközkártyák, 2) Árak hőtérkép, 3) Megtakarítás KPI, 4) Tervek idősáv, 5) Onboarding eredmény tarifa-összehasonlítással, 6) Értesítés.

## App Privacy (App Store Connect) válaszok

- **Data Not Collected** — az app nem gyűjt adatot. (Minden kategóriánál „No”.)
- Tracking: **No**.
- A privacy manifest (PrivacyInfo.xcprivacy) az app.json-ból generálódik: UserDefaults hozzáférés, ok: CA92.1.

## Data safety (Google Play Console) válaszok

- Gyűjt vagy megoszt az app felhasználói adatot? **Nem.**
- Titkosított továbbítás: **Igen** (minden forrás HTTPS).
- Adattörlés kérhető: **Nem alkalmazható** (nincs gyűjtött adat).
- Engedélyek: `POST_NOTIFICATIONS` (helyi értesítések), `INTERNET`.

## EU kereskedői státusz (DSA)

Ingyenes, monetizáció nélküli app: magánszemély fejlesztőként **nem kereskedő** (non-trader) státusz választható mindkét áruházban. Cégként kereskedő státusz + kötelező elérhetőségek megadása.
