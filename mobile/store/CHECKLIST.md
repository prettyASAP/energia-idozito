# Kiadási ellenőrzőlista — App Store és Google Play

Ez a lista lépésről lépésre végigvisz a `mobile/` Expo projekt áruházi kiadásán. A ✅ jelöltek már
készen vannak a repóban; a ☐ pontok a te (fiók-, jog- és eszközfüggő) teendőid.

## 0. Ami már kész a repóban

- ✅ Expo (React Native + TypeScript) projekt, expo-router navigáció, 4 fül + modálok
- ✅ Bundle ID / package: `hu.energiaidozito.app` (`app.json` — cseréld, ha saját domained van)
- ✅ App-ikon, adaptív Android-ikon, monokróm ikon, splash, értesítési ikon (`assets/`, generálás: `npm run assets`)
- ✅ Play feature graphic (`store/feature-graphic.png`)
- ✅ Adatvédelmi tájékoztató (`store/privacy-policy.md`) + appon belüli nézet (Ma fül alján)
- ✅ Áruházi szövegek, App Privacy / Data safety válaszok (`store/listing.hu.md`)
- ✅ EAS build/submit profilok (`eas.json`)
- ✅ Helyi értesítések (nincs push-szerver, nincs VAPID kulcs)
- ✅ Nincs backend-függés: az app közvetlenül a nyilvános forrásokból dolgozik, offline cache-sel
- ✅ Egységtesztek (`npm test`), típusellenőrzés (`npm run typecheck`), CI workflow (`.github/workflows/mobile-ci.yml`)

## 1. Fiókok és eszközök

- ☐ Apple Developer Program (99 USD/év) — https://developer.apple.com/programs/
- ☐ Google Play Console fejlesztői fiók (25 USD egyszer) — https://play.google.com/console
- ☐ Expo-fiók (ingyenes) — https://expo.dev — az EAS build a felhőben fordít, **Mac nélkül is készül iOS build**
- ☐ Támogatási e-mail-cím és nyilvános URL az adatvédelmi tájékoztatónak (pl. GitHub Pages: a `store/privacy-policy.md` tartalma)

## 2. Helyi előkészítés

```bash
cd mobile
npm install
npm run typecheck && npm test
npx expo start            # fejlesztői szerver; Expo Go-val telefonon azonnal kipróbálható
```

- ☐ Töltsd ki `store/privacy-policy.md`-ben a fejlesztő nevét és e-mail-címét
- ☐ Ellenőrizd/cseréld az `app.json`-ban: `name`, `ios.bundleIdentifier`, `android.package`
- ☐ (Opcionális) `src/lib/links.ts` → `LINKS.privacy` mutasson a nyilvános tájékoztatóra

## 3. EAS beállítás (egyszer)

```bash
npm install -g eas-cli
eas login
eas init                  # létrehozza az EAS projektet, beírja az extra.eas.projectId-t az app.json-ba
eas credentials           # iOS: tanúsítvány + provisioning profil; Android: upload keystore (EAS generálja és tárolja)
```

## 4. Belső teszt build

```bash
npm run build:android:preview     # APK, telefonra telepíthető
eas build --platform ios --profile preview   # ad-hoc/TestFlight-előkészítő build
```

- ☐ Végigkattintani minden fület, onboardingot, tanácsadót, értesítés opt-int sötét és világos módban
- ☐ Repülő módban megnyitni: a cache-elt árak jelenjenek meg, a hibaüzenet legyen érthető
- ☐ Ellenőrizni, hogy a MAVIR panel megjelenik-e a készüléken (ha a MAVIR tanúsítványlánca miatt nem, az app elrejti — nem hiba)

## 5. Éles buildek

```bash
npm run build:android     # AAB (Play kötelezően app bundle-t kér)
npm run build:ios         # App Store build
```

## 6. Google Play

- ☐ Play Console → Create app: név, alapértelmezett nyelv magyar, ingyenes
- ☐ **Store listing**: `store/listing.hu.md` szövegei, 512×512 ikon, feature graphic, ≥2 telefon-képernyőkép
- ☐ **App content**: adatvédelmi URL, Data safety (nem gyűjt adatot), tartalmi besorolás kérdőív (Mindenki), célközönség (18+ vagy 13+ — nem gyerekeknek), hirdetések: nincs, kormányzati app: nem, hírek: nem
- ☐ **Kereskedői státusz** (EU): magánszemély, monetizáció nélkül → non-trader
- ☐ Feltöltés: `npm run submit:android` (Google service account JSON kell: Play Console → Setup → API access; a fájl `google-service-account.json` néven, **soha ne commitold**)
- ☐ **Új magánszemély-fiók esetén kötelező zárt teszt**: legalább 12 tesztelő, 14 egymást követő napon keresztül, csak utána kérhető production hozzáférés
- ☐ Production release → felülvizsgálat (jellemzően 1–7 nap)

Cél API-szint: az Expo SDK 57 az aktuális Play-követelménynek megfelelő Android célverzióra fordít; kiadás előtt nézd meg a Play Console figyelmeztetéseit.

## 7. App Store

- ☐ App Store Connect → New App: név, elsődleges nyelv magyar, bundle ID, SKU (pl. `energia-idozito`)
- ☐ **App Information**: alcím, kategória Utilities, adatvédelmi URL, kereskedői státusz (DSA)
- ☐ **App Privacy**: Data Not Collected
- ☐ **Version**: leírás, kulcsszavak, support URL, képernyőképek 6,9" és 6,5" méretben, „Újdonságok”
- ☐ **Age rating** kérdőív → 4+
- ☐ **Review notes**: „Az app nyilvános energiaadatokat jelenít meg, nincs bejelentkezés. Az értesítés a főképernyő csengő ikonjával kapcsolható be.” + a támogatási e-mail
- ☐ Feltöltés: `npm run submit:ios` (kitöltve az `eas.json` submit.production.ios mezőit) — vagy Transporter appból
- ☐ TestFlight belső teszt, majd Submit for Review (jellemzően 1–3 nap)

### Elutasítás-kockázatok és a beépített válaszok

| Irányelv | Kockázat | Mit csinál az app |
|---|---|---|
| 4.2 Minimum functionality | „becsomagolt weboldal” | Natív UI (RN), helyi értesítések, offline cache, natív modálok, rendszer sötét mód |
| 2.1 Completeness | nem működik a bírálónál | Nincs backend: a források nyilvánosak; hiba esetén cache + világos hibaüzenet + újrapróbálás |
| 5.1.1 Privacy | hiányzó tájékoztató | Appon belüli és külső adatvédelmi oldal, Data Not Collected |
| 4.0 Design | kis érintési célok | Minden gomb/chip ≥44 pt |
| 5.1.2 Data use | értesítési engedély indoklás | A csengő csak a felhasználó kérésére kér engedélyt, letiltásnál a beállításokba irányít |

## 8. Kiadás után

- ☐ Verziószám emelése: `app.json` → `version` (a build számot az EAS `autoIncrement` kezeli)
- ☐ Tarifakonstansok évenkénti frissítése: `src/domain/savings.ts` (`TARIFFS`), MEKH határozatok szerint
- ☐ Play és App Store célverzió-követelmények éves ellenőrzése (Expo SDK frissítés)
