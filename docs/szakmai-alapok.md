# Szakmai alapok: lakossági fogyasztók és szabályozás

A magyar lakossági villamosenergia-piac forrásolt tényanyaga az Energia Időzítő projekt számára. Minden szakmai állítás, szám és felületi szöveg ebből a dokumentumból induljon ki.

- **Állapot:** 2026. szeptember 29.
- **Hatókör:** lakossági és egyetemes szolgáltatásban lévő mikrovállalkozói fogyasztók; egyetemes szolgáltatás, rezsivédelem, D árszabás, mérés, HMKE, aggregálás, fogyasztóvédelem.
- **Jelölés:** **E** elsődleges forrás (jogszabály, MEKH, MAVIR, KSH, Eurostat, ACER, a szolgáltató vagy az elosztó saját dokumentuma, a szöveget ténylegesen megnéztük). **M** másodlagos forrás (sajtó, szakportál, iparági közlés, vagy csak összefoglalóból ismert). **Sz** saját számítás a megjelölt forrásokból.
- **Szabály:** ahol két forrás ellentmond, mindkettő szerepel. Ahol nincs adat, a dokumentum ezt kimondja. Becslést nem töltünk be hiányzó adat helyére.

A forrásjegyzék a dokumentum végén van, a hivatkozások `[S1]` formában mutatnak rá.

## Tartalom

1. [Kulcsszámok](#1-kulcsszámok)
2. [Fogyasztói bázis](#2-fogyasztói-bázis)
3. [Fogyasztás](#3-fogyasztás)
4. [Tarifák szerinti megoszlás](#4-tarifák-szerinti-megoszlás)
5. [Mérés és okosmérők](#5-mérés-és-okosmérők)
6. [Eszközállomány](#6-eszközállomány)
7. [Terhek, árszint, energiaszegénység](#7-terhek-árszint-energiaszegénység)
8. [Egyetemes szolgáltatás és rezsivédelem](#8-egyetemes-szolgáltatás-és-rezsivédelem)
9. [Árak 2026](#9-árak-2026)
10. [D árszabás, rugalmas árú szerződés](#10-d-árszabás-rugalmas-árú-szerződés)
11. [Mérési és elszámolási szabályok](#11-mérési-és-elszámolási-szabályok)
12. [HMKE, energiamegosztás, energiaközösség, tárolás](#12-hmke-energiamegosztás-energiaközösség-tárolás)
13. [Aggregálás és keresletoldali szabályozás](#13-aggregálás-és-keresletoldali-szabályozás)
14. [Fogyasztóvédelem és adatvédelem](#14-fogyasztóvédelem-és-adatvédelem)
15. [Várható változások](#15-várható-változások)
16. [Ellentmondások és ismert hibák a nyilvános forrásokban](#16-ellentmondások-és-ismert-hibák-a-nyilvános-forrásokban)
17. [Adathiányok](#17-adathiányok)
18. [Következmények az appra](#18-következmények-az-appra)
19. [Forrásjegyzék](#19-forrásjegyzék)

## 1. Kulcsszámok

| Mutató | Érték | Év | Forrás |
|---|---|---|---|
| Háztartási villamosenergia-felhasználási helyek | 5 334 855 | 2024 | KSH [S30] E |
| Háztartások | 4 044 811, átlagosan 2,3 fő | 2024 | KSH [S31] E |
| Háztartási fogyasztás | 12 626 GWh | 2024 | KSH [S30] E |
| Átlagos fogyasztás felhasználási helyenként | 2 419 kWh/év | 2024 | KSH [S30] E |
| Kedvezményes lakossági sávhatár | 2 523 kWh/év/mérési pont | hatályos | 4/2011. NFM r. 6. § (1) [S4] E |
| Keret felett fogyasztó helyek aránya | 19 és 25% között, forrásonként eltér | 2022 és 2026 között | lásd 3. fejezet, M |
| Okosmérők | kb. 670 ezer (2024. július); közel 750 ezer (2026. szeptember, forrás nélkül) | 2024, 2026 | [S40] M, [S41] M |
| Napelemes HMKE | 322 338 db, 2 913,4 MW | 2025. december 31. | MAVIR [S36] E |
| Lakossági áramár adókkal, 2 500 és 4 999 kWh/év sáv | 0,1082 EUR/kWh, az EU legalacsonyabbja (EU27: 0,2896) | 2025 második félév | Eurostat [S35] E |
| Rezsivédelmi kompenzáció 2026 első három negyedévében | 526,6 milliárd Ft | 2026 | [S44] M |
| D árszabás kereskedői díja | 13,70 Ft/kWh nettó | 2026. szeptember 10-től | MVM hirdetmény [S18] E |
| D árszabás indulása | igénylés 2026. szeptember 1-jétől, elszámolás legkorábban 2027. január 1-jétől | 2026 | [S19] [S22] E |

## 2. Fogyasztói bázis

| # | Állítás | Szám | Év | Forrás |
|---|---|---|---|---|
| 2.1 | Háztartási villamosenergia-felhasználási helyek (KSH) | 2019: 5 153 372; 2021: 5 225 807; 2022: 5 266 498; 2023: 5 304 486; 2024: 5 334 855 | 2019 és 2024 között | [S30] E |
| 2.2 | Háztartások száma és mérete | 4 044 811 háztartás, 9 381 986 fő, 2,3 fő/háztartás | 2024 | [S31] E |
| 2.3 | A felhasználási helyek száma kb. 1,29 millióval több a háztartásokénál (második otthon, üdülő, külön mért hely). A háztartásszám felszorzott mintavételes becslés, a felhasználási hely adminisztratív szám, a különbség ezért csak nagyságrendi. | kb. 1,29 millió | 2024 | Sz a 2.1 és 2.2 sorból |
| 2.4 | ACER: háztartási, illetve nem háztartási mérési pontok | 5,26 millió, illetve 0,45 millió | 2024 | [S32] E |
| 2.5 | Lakossági mérési pontok egy 2026-os sajtóforrás szerint | kb. 4,6 millió | 2026 | [S41b] M, ellentmond a 2.1 és 2.4 sornak |
| 2.6 | Áramfogyasztók az ITM 2022-es közlése szerint | 5,6 millió | 2022 | [S45] M |
| 2.7 | MVM Next egyetemes ügyfelei áramban és gázban együtt, plusz üzleti ügyfelek | 4,2 millió, továbbá több mint 55 ezer üzleti | 2024 és 2025 között, dátum nélkül | [S46] E |
| 2.8 | MVM Next egyetemes villamosenergia-ügyfelek; összes áram- és gázügyfél (energiahatékonysági jelentés) | több mint 2 millió; kb. 5,8 millió | 2024 | [S47] E, ellentmond a 2.7 sornak |
| 2.9 | Lakossági piac szerkezete (ACER): országos lakossági szolgáltatók száma, koncentráció, szabályozott áras szerződések aránya | 1 szolgáltató; HHI 10 000; 100% | 2024 | [S32] E |
| 2.10 | Szabadpiacon vásárló lakossági fogyasztók vétele | 0 GWh | 2023 és 2024 | MEKH és MAVIR statisztikai kiadvány, 8.3. tábla [S33] E |
| 2.11 | Nem lakossági egyetemes értékesítés; ebből a 20 MWh alatti felhasználóké | 362 GWh; 244 GWh | 2024 | [S33] 8.2. tábla E |
| 2.12 | Mikrovállalkozói jogosultság: kisfeszültség, összesen legfeljebb 3×63 A (VET 50. § (3)); kedvezményes sáv 4 606 kWh/év (4/2011. NFM r. 6. § (2)) | szabály | 2025. január 1-jétől | [S1] [S4] [S48] E |

Nincs adat: csak áramot vevő MVM ügyfelek száma, egyetemes szolgáltatásban lévő mikrovállalkozások száma, felhasználók megoszlása elosztónként.

## 3. Fogyasztás

### 3.1 Idősor

| # | Állítás | Szám | Év | Forrás |
|---|---|---|---|---|
| 3.1 | Háztartási villamos energia, KSH (GWh) | 2019: 11 162; 2020: 11 734; 2021: 12 284; 2022: 11 678; 2023: 12 442; 2024: 12 626 | 2019 és 2024 között | [S30] E |
| 3.2 | Egy háztartási felhasználási helyre jutó fogyasztás, KSH (kWh/év) | 2019: 2 171; 2020: 2 271; 2021: 2 361; 2022: 2 226; 2023: 2 371; 2024: 2 419 | 2019 és 2024 között | [S30] E |
| 3.3 | Háztartási nettó fogyasztás, MEKH (GWh) | 2019: 11 162; 2020: 11 734; 2021: 12 198; 2022: 11 678; 2023: 11 883; 2024: 11 788 | 2019 és 2024 között | [S33] 7.3. és 10.9. tábla E, 2021-től eltér a KSH-tól |
| 3.4 | Egyetemes szolgáltatásban lakossági fogyasztóknak eladott mennyiség (GWh) | 2021: 12 579; 2022: 12 401; 2023: 11 327; 2024: 11 516 | 2021 és 2024 között | [S33] 8.2. tábla E |
| 3.5 | ACER átlagos háztartási fogyasztás | 2,36 MWh/év | 2024 | [S32] E |
| 3.6 | 2022-es visszaesés | MEKH szerint −4,3%; KSH szerint −4,9%, egy helyre vetítve −5,7% | 2022 | Sz a 3.1 és 3.3 sorból |
| 3.7 | A profilos (háztartási jellegű) fogyasztás éves változása | 2022: +1,6%; 2023: −2,8%; 2024: −3,1% | 2022 és 2024 között | [S33] 7.2A ábra E |

A 2025-ös lakossági adat a KSH 2025. október 31-i frissítéséig nem jelent meg. A három hivatalos idősor (KSH, MEKH háztartási, MEKH egyetemes értékesítés) 2021-től eltér egymástól; az appban és az anyagokban a KSH idősort használjuk, és a forrást megnevezzük.

### 3.2 Eloszlás, keret feletti fogyasztók

| # | Állítás | Szám | Év | Forrás |
|---|---|---|---|---|
| 3.8 | Egyetemes lakossági GWh éves fogyasztási sávonként | 1 MWh alatt: 1 663; 1 és 2,5 MWh között: 2 926; 2,5 és 5 MWh között: 3 676; 5 és 15 MWh között: 2 828; 15 MWh felett: 423 | 2024 | [S33] 8.2. tábla E |
| 3.9 | A lakossági egyetemes mennyiség 2,5 MWh/év feletti sávokra jutó része | 60,2% | 2024 | Sz a 3.8 sorból; a 2023 és 2024 közötti ugrás módszertani változásra utalhat |
| 3.10 | ITM: 5,6 millió fogyasztóból 4,2 millió az átlagfogyasztáson vagy alatta, 1,4 millió felette | 75% alatta | 2022 | [S45] M |
| 3.11 | Kormányzati közlés: a háztartások ennyi százaléka van a 2 523 kWh-s keret alatt | 78% | 2023. augusztus 1. | [S49] M |
| 3.12 | MVM közlés: a fogyasztási helyek kb. 19%-a lépi túl a rezsicsökkentett mennyiséget | 81% alatta | 2026. szeptember | [S41] M, ellentmond a 3.10 és 3.11 sornak |
| 3.13 | Települések, ahol az átlagos háztartási fogyasztás meghaladja a 2 523 kWh-t | 1 430 település, a települések kb. fele | 2020-as KSH TEIR adat | [S50] M |
| 3.14 | Területi mintázat: magasabb fogyasztás középen és északnyugaton, alacsonyabb északkeleten és délnyugaton | leírás | 2020 | [S50] M |
| 3.15 | Havi átlagfogyasztás vármegyénként | Győr-Moson-Sopron 205,9 (legmagasabb), Zala 132,3 (legalacsonyabb), Budapest 173,5, országos 174,5 kWh/háztartás/hó | 2013, utolsó elérhető év | [S51] E |

A keret feletti arány a projekt anyagaiban így szerepeljen: „19 és 25 százalék között, forrásonként eltérően”. A három forrás bázisa is eltér (fogyasztó, háztartás, fogyasztási hely), mindhárom másodlagos. A 4 000 és az 5 000 kWh/év feletti helyek számáról nincs nyilvános adat.

### 3.3 Napi és éves profil

| # | Állítás | Szám | Év | Forrás |
|---|---|---|---|---|
| 3.16 | Szezonalitás: a profilos fogyasztás havi összege | januárban kb. 1 570 GWh, júniusban kb. 1 000 GWh (grafikonról leolvasva) | 2024 | [S33] 7.2B ábra E |
| 3.17 | Napi lakossági profil: esti csúcs 18 és 21 óra között, éjszakai minimum 2 és 5 óra között | leírás | 2026 | [S52] M |
| 3.18 | Időzítéssel elérhető lakossági csúcscsökkentés (mosógép, mosogatógép, szárító) | 2,2 és 3,6% között, télen 205 MW, nyáron 166 MW; költségcsökkenés legfeljebb 6,1% | modell, 2024 | Hartvig és Szabó, idézi a KSH Statisztikai Szemle [S53] M |

A lakossági fogyasztás mért árrugalmasságára Magyarországon nincs publikált adat.

## 4. Tarifák szerinti megoszlás

| # | Állítás | Szám | Év | Forrás |
|---|---|---|---|---|
| 4.1 | H vagy GEO tarifás előfizetések | 2021 végén kb. 45 ezer; 2024 végén több mint 111 ezer | 2021, 2024 | [S54] M |
| 4.2 | Külön mért (vezérelt) mérővel rendelkező háztartások | több mint 1 millió | 2026 | [S41b] M |
| 4.3 | A vezérelt áram aránya hosszú távon csökken, 2022 augusztusa óta enyhén nő; a H tarifás fogyasztás 2022-ben több mint 40%-kal nőtt | tendencia | 2022 és 2023 | [S55] M, a cikk számai nem hozzáférhetők |
| 4.4 | Előre fizetős mérők: E.ON területén több mint 73 ezer mérő kb. 50 ezer ügyfélnél; ELMŰ-ÉMÁSZ és E.ON területén együtt több mint 100 ezer | régi adat | kb. 2014 és 2017 között | [S56] M |
| 4.5 | Szociálisan rászoruló védendő ügyfél 2024. július 1-jétől előre fizetős mérőt kérhet az MVM Nextnél | szabály | 2024 | [S57] E |

Nincs adat: pontos B tarifás felhasználószám, A1 és A2 megoszlás, friss előre fizetős mérőszám.

## 5. Mérés és okosmérők

### 5.1 Állomány és programok

| # | Állítás | Szám | Év | Forrás |
|---|---|---|---|---|
| 5.1 | Okosmérők száma országosan | 670 ezer | 2024. július | [S40] M (MTI, E.ON) |
| 5.2 | Ebből az E.ON területén, a hazai állomány több mint kétharmada | 450 ezer | 2024 | [S40] M |
| 5.3 | Okosmérővel rendelkező háztartások aránya | 9% | 2024 | [S58] M |
| 5.4 | Okosmérők 2026 szeptemberében, forrásmegjelölés nélkül | közel 750 ezer | 2026 | [S41] M |
| 5.5 | Egy 2026-os cikk 2024 közepére kb. 450 ezer országos számot ír, valószínűleg az E.ON-os szám összecserélése | 450 ezer | 2026 | [S52] M, hibás |
| 5.6 | ACER: okosmérő-telepítési arány Magyarországon | nincs adat; kockázatként a korlátozott okosmérő-hozzáférést jelöli | 2024 | [S32] E |
| 5.7 | RRF első kör, E.ON | 165 ezer darab, 10,074 milliárd Ft, 2024 júniusáig telepítve | 2024 | [S40] M |
| 5.8 | RRF első kör, MVM: MVM Démász 47 480 és MVM Émász 41 623 darab, 2026 február végéig, több mint 5 milliárd Ft | 89 103 darab | 2024 és 2026 között | [S59] E |
| 5.9 | RRF első kör, OPUS TITÁSZ | 35 793 darab | 2024 és 2026 között | [S60] E, keresési kivonatból |
| 5.10 | RRF második kör: telepítendő okosmérők 2030. december 31-ig, 57 000 Ft/darab | 947 368 darab | 2026 | [S41b] M |
| 5.11 | A második kör keretösszege: két forrás két számot ad; pályázni 2026. július 2. és 15. között lehetett, 100% támogatással | 26,6 milliárd Ft, illetve több mint 54 milliárd Ft | 2026 | [S61] M, [S62] M |
| 5.12 | Támogatási szerződést a MAVIR, az E.ON és az MVM kötött, az ELMŰ és az OPUS TITÁSZ nem vett részt; a teljes RRF hálózati keret kb. 500 milliárd Ft | szerződő felek | 2026. augusztus | [S62] M |
| 5.13 | Idősoros elszámolásra átállt felhasználási helyek (feltétel: legalább 3×32 A, vagy 5 000 kWh/év feletti fogyasztás a mindennapszaki mérőn) | kb. 600 ezer | 2025. január 1. | [S63] M, [S64] E |

### 5.2 Szabályok

| # | Szabály | Jogszabályhely | Hatály | Forrás |
|---|---|---|---|---|
| 5.14 | Okosmérő: távlehívható mérő, amely távoli utasítást képes fogadni. Távlehívható mérő: a kiegyenlítő energia elszámolási mérési időintervallumának megfelelő gyakorisággal (ma negyedóra) tárol és továbbít adatot. | VET 3. § 48a., 56a. | hatályos | [S1] E |
| 5.15 | Az elosztó okosmérőt szerel fel 3×80 A-ig: új hely 3×32 A-tól; teljesítménybővítés 3×32 A fölé; új HMKE; HMKE mérő hitelességének lejárta; új külön mért, nem vezérelt áramkör | Vhr. 14/B. § (1) | hatályos | [S3] E |
| 5.16 | Kötelező csere 1 éven belül, ha a profilos kisfeszültségű fogyasztás az éves elszámolásban eléri a 4 000 kWh-t (korábban 5 000). A határidő az elszámolási időszak utolsó napjától fut; a 2026. január 1. és 2027. január 1. között lezárt időszakokra 2027. december 31. | Vhr. 14/B. § (2) a), 128/D. § (2), (3), módosította a 131/2026. Korm. r. 9. § | 2026. augusztus 29. | [S3] [S11] E |
| 5.17 | A felhasználó egy választott helyén, egy mérőre, egy alkalommal, nyilatkozat alapján okosmérőt kérhet, az elosztó 1 éven belül telepít. Feltételek: hatályos hálózathasználati szerződés, legfeljebb 3×80 A, nincs már okosmérő-kompatibilis elosztói mérő, és nem áll fenn a (2) bekezdés szerinti kötelező csere. Előre fizetős és indirekt mérésű helyen nem kérhető. Az elosztó igazolja, ha a jogot még nem használták fel. | Vhr. 14/B. § (2a), (2b) | 2026. augusztus 29. | [S3] [S11] E |
| 5.18 | A (2a) szerinti első okosmérő felszerelése vagy cseréje díjmentes | 10/2024. MEKH r. 33. § (1) 12., a 8/2026. MEKH r. 12. §-a iktatta be | 2026. augusztus 30. | [S11] E |
| 5.19 | Egyéb igény esetén a felszerelés határideje 4 hónap; a 131/2026. törölte a díjfizetésre utaló szövegrészt, a költségviselés nem egyértelmű | Vhr. 14/B. § (3) | 2026. augusztus 29. | [S3] [S11] E |
| 5.20 | Az (1) b), (2), (3) és (3a) bekezdés szerint felszerelt mérővel a mérőpont a felszerelés rögzítését követő második hónap 1. napjától minősül távlehívható mérővel rendelkezőnek; a (2a) szerinti kérésre felszerelt mérőt a szabály nem említi | Vhr. 14/B. § (7) | hatályos | [S3] E |
| 5.21 | A2 árszabású egyetemes pontot úgy kell kezelni, mintha nem lenne távlehívható mérője | Vhr. 14/B. § (3c) | hatályos | [S3] E |
| 5.22 | 2026. december 31-ig a 14/B. § (1) és (3) közötti szabályok nem alkalmazhatók külön mért áramkört mérő mérőre; az ilyen okosmérős pont nem távlehívhatóként kezelendő | Vhr. 125. § (2), (3) | hatályos | [S3] E |
| 5.23 | Új felhasználási hely csatlakozásakor a Vhr.-ben meghatározott esetekben okosmérőt kell szerelni | VET 45. § | 2026. július 31. | [S1] [S2] E |

## 6. Eszközállomány

| # | Állítás | Szám | Év | Forrás |
|---|---|---|---|---|
| 6.1 | Napelemes HMKE darabszám és teljesítmény | 2023 vége: 256 471 db, 2 329,5 MW; 2024 vége: 296 231 db, 2 690,0 MW; 2025 vége: 322 338 db, 2 913,4 MW | 2023 és 2025 között | MAVIR PV statisztika [S36] E |
| 6.2 | Legfrissebb napelemes HMKE állomány | 324 765 db, 2 938,7 MW | 2026. március 1. | [S36] E |
| 6.3 | MEKH: HMKE összes teljesítőképesség, ebből napenergia 2 690,02 MW | 2 692,27 MW | 2024 | [S33] 4.8A tábla E |
| 6.4 | ACER: termelő-fogyasztó (aktív felhasználó) háztartások aránya | 6,4% | 2024 | [S32] E |
| 6.5 | Szaldóból bruttó elszámolásba kerülők: a 2015-ben telepítettek közül 2025-ben 15 136, a 2016-osok közül 2026-ban kb. 20 500 | 15 136 és kb. 20 500 | 2025 és 2026 | [S65] M |
| 6.6 | A napelemes HMKE-állomány nettó növekedése 2024 és 2025 között. Benne vannak a Vhr. 5. § (5) szerinti szaldós kivételek (2023. szeptember 13-ig igényelt, 2026. január 1-jéig készre jelentett rendszerek) és a leszerelések is, ezért a bruttó elszámolásúak száma ennél kevesebb. | 65 867 db | 2024 és 2025 | Sz a 6.1 sorból |
| 6.7 | Otthoni Energiatároló Program nyertesei: eredetileg 42 ezer, majd további 15 ezer | kb. 57 ezer | 2026. szeptember | [S66] M |
| 6.8 | Otthoni Energiatároló Program: keret 105 milliárd Ft; támogatás 2,5 millió Ft, meglévő HMKE esetén 1,8 millió Ft; új feltétel a távolról vezérelhetőség; elszámolási határidő 2027. február 26. | szabály | 2026 | [S66] M |
| 6.9 | Kiadott zöld rendszámok (tisztán elektromos): összesen 101 534, ebből személyautó 94 009, teherautó 7 212, busz 282 | 101 534 | 2025. december 31. | [S67] M (BM adat) |
| 6.10 | Forgalomban lévő tisztán elektromos személyautók (a kiadott rendszámok kb. 8%-a már nincs forgalomban) | 86 348 | 2025. december 31. | [S68] M (Datahouse) |
| 6.11 | Tisztán elektromos személyautó-állomány (Datahouse) | 2022: 29 824; 2023: 41 182; 2024: 60 184 | 2022 és 2024 között | [S68] M |
| 6.12 | 2025-ben kiadott zöld rendszámok; a 2025-ös elektromos személyautók használtan behozott aránya | 31 475; 61,5% | 2025 | [S67] M |
| 6.13 | Tisztán elektromos autók aránya az új személyautó-regisztrációkban | 10% | 2026 első félév | [S69] M |
| 6.14 | Otthon tölt a villanyautósok 70%-a, saját parkolóhelye 92%-uknak van (GEVA) | 70%; 92% | 2024 | [S70] M |
| 6.15 | Rendszeresen otthon tölt (naponta 17%, két-három naponta 37%, hetente 35%), 2 815 válaszadó (GEVA) | 89% | 2025 | [S71] M |
| 6.16 | Levegő-levegő hőszivattyú (klíma) eladások; 2022 és 2025 között összesen kb. 1,4 millió | 2022: kb. 440 ezer; 2023: 280 ezer; 2024: 400 ezer; 2025: kb. 270 ezer (becslés) | 2022 és 2025 között | [S54] M |
| 6.17 | Levegő-víz hőszivattyú eladások | 2022: 12 ezer; 2023: 9 ezer; 2024: 6 ezer; 2025: kb. 7 ezer; összesen kb. 35 ezer | 2022 és 2025 között | [S54] M |
| 6.18 | Klímás lakások aránya: KSH népszámlálás, szakértő idézésében | 28% | 2022 | [S72] M |
| 6.19 | Klímás lakások egy másik forrás szerint | 1,5 millió a 4,6 millió lakásból, kb. 30% | 2025 | [S73] M |
| 6.20 | MAVIR előrejelzés: további klímák 2030-ig | 0,5 és 1 millió között, összesen kb. 2,4 millió | 2025 | [S72] M |
| 6.21 | Villanybojlerrel rendelkező háztartások aránya | 43% | 2004, régi adat | KSH [S74] E |
| 6.22 | Gázfűtés mellett villanybojlerrel melegítenek vizet, ebből 48,4% nappali áramon | 857 ezer háztartás | 2008, régi adat | KSH [S75] E |

Nincs adat: szaldó és bruttó elszámolású HMKE-k teljes megoszlása, ténylegesen telepített otthoni akkumulátorok, otthoni töltők száma, villanybojler aránya 2020 után.

## 7. Terhek, árszint, energiaszegénység

| # | Állítás | Szám | Év | Forrás |
|---|---|---|---|---|
| 7.1 | Közüzemi számlahátralék, a népesség %-a | 2019: 10,0; 2020: 10,3; 2021: 9,9; 2022: 8,5; 2023: 7,3; 2024: 7,1; 2025: 6,3 | 2019 és 2025 között | Eurostat ilc_mdes07 [S34] E |
| 7.2 | Ugyanez az EU27-ben; szegénységi küszöb alatt Magyarországon és az EU-ban | EU27: 7,0%; küszöb alatt HU 19,3%, EU 16,8% | 2025 | [S34] E |
| 7.3 | Nem tudja megfelelően fűteni a lakását, % | 2019: 5,4; 2020: 4,1; 2021: 5,4; 2022: 4,6; 2023: 7,1; 2024: 6,0; 2025: 5,8 | 2019 és 2025 között | Eurostat ilc_mdes01 [S34b] E |
| 7.4 | Ugyanez az EU27-ben; szegénységi küszöb alatt Magyarországon és az EU-ban | EU27: 8,8%; küszöb alatt HU 16,8%, EU 19,6% | 2025 | [S34b] E |
| 7.5 | Lakossági áramár adókkal, 2 500 és 4 999 kWh/év sáv, EUR/kWh | 2024 első félév 0,1094; második 0,1032; 2025 első félév 0,1040; második 0,1082 | 2024 és 2025 | Eurostat nrg_pc_204 [S35] E |
| 7.6 | Ugyanez forintban; EU27 átlag | HU: 42,06 Ft/kWh (2025 első félév), 42,31 Ft/kWh (második félév); EU27: 0,2879 és 0,2896 EUR/kWh | 2025 | [S35] E |
| 7.7 | Vásárlóerő-paritáson | HU 0,1510, EU27 0,2906 PPS/kWh | 2025 második félév | [S35] E |
| 7.8 | Magyarország az EU legolcsóbb tagállama; utána Málta (0,1282) és Bulgária (0,1355) | 0,1082 EUR/kWh | 2025 második félév | [S35] E |
| 7.9 | ACER: átlagos lakossági egységár; éves háztartási áramszámla | 9,0 eurócent/kWh (−7%); 212 EUR/év | 2024 | [S32] E |
| 7.10 | Rezsivédelem állami költsége gázban, áramban és távhőben együtt; 2022 és 2025 között közel 5 000 milliárd Ft | 2022: 0,8; 2023: 2,4; 2024: 1,3 ezer milliárd Ft | 2022 és 2024 között | [S76] M |
| 7.11 | Ebből az MVM-nek jutott 2022 októbere és 2025 januárja között | 2 437 milliárd Ft | 2022 és 2025 között | [S76] M |
| 7.12 | MVM-nek adott állami kompenzáció | 484 milliárd Ft | 2025 első félév | [S77] M |
| 7.13 | Rezsivédelmi kompenzáció 2026-ban negyedévenként | első: 314,5; második: 93,2; harmadik: 118,9; összesen 526,6 milliárd Ft | 2026 | [S44] M |
| 7.14 | MEKH bírság 3 szolgáltatónak a fogyasztói megkeresésekre adott késedelmes válasz miatt | 56 millió Ft | 2024. október | [S78] M |

Az áram és gáz szerinti kompenzáció bontása és a 2026-os Rezsivédelmi Alap előirányzata elsődleges forrásból nem igazolható. A MEKH panaszstatisztikája darabszámban nem publikus.

## 8. Egyetemes szolgáltatás és rezsivédelem

| # | Szabály | Jogszabályhely | Hatály | Forrás |
|---|---|---|---|---|
| 8.1 | Egyetemes szolgáltatásra jogosult a lakossági fogyasztó, valamint a kisfeszültségen vételező mikrovállalkozás, ha összes helyén legfeljebb 3×63 A a csatlakozási teljesítmény | VET 50. § (3) | hatályos | [S1] E |
| 8.2 | Lakossági fogyasztónak minősül egyetemes szolgáltatás szempontjából az önkormányzati és állami bérlakás üzemeltetője, a lakóépület közös fogyasztása, vallási közösség lakhatási célú helye | VET 50. § (4) | hatályos | [S1] E |
| 8.3 | Lakossági fogyasztó: saját háztartás, egy felhasználási hely, jövedelemszerző gazdasági tevékenység nélkül | VET 3. § 42. | hatályos | [S1] E |
| 8.4 | Az egyetemes szolgáltató szerződéskötésre köteles, határozatlan idejű szerződésre, ÁSZF szerint; ellenőrizheti a jogosulatlan igénybevételt | VET 48. §, 50. § (1a), (2) | hatályos | [S1] E |
| 8.5 | Rezsivédelmi szolgáltatás: állami közfeladat a 145. § (3), (3a) és (3b) szerinti áron; az egyetemes szolgáltató a nettó ráfordításáig ellentételezést kap | VET 50/B. § | hatályos | [S1] E |
| 8.6 | Villamos energiában a rezsivédelmi szolgáltatásra az országos engedélyes egyetemes szolgáltató van kijelölve, 2027. december 31-ig | 236/2025. (VII. 31.) Korm. r. 1. § (1) b) | 2026. március 6-i időállapot | [S14] E |
| 8.7 | Az ellentételezés módszertanában az MVM Next Zrt. szerepel: 2025-re és 2026-ra 10 855 335 MWh indokolt áras mennyiség | 4/2011. NFM r. 8. § és 4. melléklet | hatályos | [S4] E |
| 8.8 | Árszabások: A1 (egyzónás), A2 (kétzónás), B (időszakos, vezérelt), H (idényjellegű). Egyetemes szolgáltatói egyedi árszabás MEKH jóváhagyással lehet (B Komfort, B Geo). | NFM r. 4. § (1), 5. § (2); VET 145. § (4) | hatályos | [S4] [S1] E |
| 8.9 | A2 csak zónaidőnkénti méréssel választható; A1 mellé A2 akkor, ha a felhasználó évente igazolja, hogy elektromos autót tart üzemben | NFM r. 4. § (3), (5a), (5b) | hatályos | [S4] E |
| 8.10 | A2 zónaidők munkanapon: csúcs 6 és 22 óra között (nyári időszámításban 7 és 23 között), völgy 22 és 6 óra között (nyáron 23 és 7 között); nem munkanapon egész nap völgy | NFM r. 1. melléklet | hatályos | [S4] E |
| 8.11 | B árszabás: az elosztó által vezérelt, külön mért, nem dugaszolható, szakaszosan üzemeltethető berendezés; A1 vagy A2 mellé, H-val együtt is választható | NFM r. 4. § (5), 5. § (1), (3) | hatályos | [S4] E |
| 8.12 | Vezérelt (KIF II) ellátás: naponta legalább 8 óra, alkalmanként legalább 30 perc, ebből legalább 2 óra 8:30 és 18:30 között, legalább 4 óra 22:00 és 6:00 között | 10/2024. MEKH r. 26. § (4) | 2026. augusztus 30-i időállapot | [S5] E |
| 8.13 | H árszabás: legalább 3,4 SCOP hőszivattyú vagy megújuló hőt hasznosító berendezés külön mért áramkörön (2020. január 1-jéig üzembe helyezett hőszivattyúnál legalább 3). Fűtési idény: október 15. és április 15. között. Az idényes ár nem lehet magasabb a legalacsonyabb B Alap árnál. | NFM r. 5. § (4), (6), 10. § (3); MEKH r. 26. § (7) | hatályos | [S4] [S5] E |
| 8.14 | Sávhatár: A1, A2, B Alap és H esetén árszabásonként 2 523 kWh/év/mérési pont. H esetén a kedvezményes mennyiség a fűtési idényen kívül érvényes; a fűtési idényben H-ra nincs sávhatár, ott a rendeleti egységár alkalmazandó. | NFM r. 6. § (1), (6) | 2025. augusztus 1-jétől (20/2025. EM r.) | [S4] E |
| 8.15 | Rezsiév: a kedvezményes mennyiség augusztus 1. és július 31. közötti időszakra vonatkozik | NFM r. 6. § (3) | hatályos | [S4] E |
| 8.16 | Naparányos elszámolás: a sávhatár 1/365 része (szökőévben 1/366) szorozva a számlázási napokkal; a feletti mennyiség lakossági piaci áron, nem lakossági felhasználónál versenypiaci áron | NFM r. 6. § (4); VET 145. § (3a), (3b) | hatályos | [S4] [S1] E |
| 8.17 | Előre fizetős mérőnél a kedvezményes mennyiség kiosztása után jön a piaci ár | NFM r. 6. § (7) | hatályos | [S4] E |
| 8.18 | Mikrovállalkozói sáv: 4 606 kWh/év az összes felhasználási hely együttes fogyasztásáig; több árszabásnál a kiszámlázott mennyiségek arányában oszlik meg | NFM r. 6. § (2) | hatályos | [S4] E |
| 8.19 | A sávhatár feletti lakossági piaci árat a MEKH elnöke rendeletben állapítja meg; a mikrovállalkozói versenypiaci ár hirdetményben, nem lehet alacsonyabb a lakossági piaci árnál | VET 145. § (3a), (3b) | hatályos | [S1] E |
| 8.20 | Fogyatékossággal élők a sávhatár felett további kedvezményes mennyiségre jogosultak | VET 64. § (4a) | hatályos | [S1] E |
| 8.21 | Minden felhasználási helyre külön szerződés kell | Vhr. 2. melléklet 2.6. | hatályos | [S3] E |
| 8.22 | Az egyetemes szolgáltatási ár nem tartalmazza a rendszerhasználati díjat, a VET 147. § szerinti pénzeszközöket, az áfát és a jövedéki adót | NFM r. 3. § (2) | hatályos | [S4] E |

**Jogalapváltozás:** a 2 523 kWh-s keretet eredetileg a 259/2022. (VII. 21.) Korm. rendelet vezette be. Ezt a 2025. évi L. törvény 249. § (2) bekezdése 2025. augusztus 1-jével hatályon kívül helyezte; a keret ma a 4/2011. NFM rendelet 6. § (1) bekezdésében van [S4] E, [S15] M. A projekt anyagaiban a hatályos helyre hivatkozunk.

## 9. Árak 2026

### 9.1 Egyetemes szolgáltatói energiaár, nettó Ft/kWh

Forrás: 4/2011. NFM r. 2. melléklet [S4] E.

| Árszabás | MVM Démász | E.ON (DÉDÁSZ, ÉDÁSZ) és OPUS TITÁSZ | ELMŰ | MVM Émász |
|---|---|---|---|---|
| A1 lakossági | 5,25 | 4,39 | 5,11 | 4,94 |
| A2 lakossági, csúcs | 8,95 | 10,78 | 10,03 | 8,49 |
| A2 lakossági, völgy | 1,05 | 2,40 | 1,93 | 1,00 |
| B Alap lakossági (H fűtési idényben ugyanez, idényen kívül az A1 ár) | 1,90 | 2,34 | 2,05 | 1,68 |
| A1 nem lakossági | 23,02 | 23,27 | 23,04 | 22,80 |
| B Alap nem lakossági | 13,88 | 14,28 | 13,93 | 13,49 |

Lakossági piaci ár (sávhatár felett), nettó energiaár: 31,80 Ft/kWh [S23] E.

### 9.2 Rendszerhasználati díj (hálózati díj), 2026

Forrás: MEKH H 2995/2025. határozat, az E.ON kivonata alapján [S12] E; maga a határozat nem volt elérhető.

| Tétel | Érték |
|---|---|
| Átviteli forgalmi díj | 3,39 Ft/kWh |
| Elosztási forgalmi díj, KIF I (profilos) | 20,01 Ft/kWh, alapdíj 1 446 Ft/év |
| Elosztási forgalmi díj, KIF II (vezérelt) | 12,79 Ft/kWh, alapdíj 474 Ft/év |
| Elosztási forgalmi díj, KIF III (nem okosmérő távlehívható mérő) | 22,20 Ft/kWh, alapdíj 72 168 Ft/csatlakozási pont/év, lekötött teljesítménydíj 13 248 Ft/kW/év |
| Elosztási forgalmi díj, KIF IV (okosmérő) | 20,01 Ft/kWh nappal, csúcson és völgyben egyaránt, alapdíj 1 446 Ft/év, teljesítménydíj nincs |
| Összesen, A1 (KIF I) | 23,40 Ft/kWh |
| Összesen, vezérelt (KIF II) | 16,18 Ft/kWh |

- A KIF IV díj akkor jár, ha a Vhr. 14/B. § alapján felszerelt okosmérővel történik az elszámolás; nem okosmérő távlehívható mérőre KIF III jár [S5] E, 10/2024. MEKH r. 26. § (5), (6).
- A hálózati díj ma időben nem differenciált: az okosmérős felhasználónak sem olcsóbb éjjel.
- A D árszabáshoz távlehívható mérő kell. Ha ez nem a Vhr. 14/B. § szerinti okosmérő, a KIF III kategória a magas alapdíj és teljesítménydíj miatt lényegesen drágább; ezért a D árszabást okosmérővel (KIF IV) érdemes számolni.
- A 350/2025. (XI. 12.) Korm. rendelet 1. §-a annyit mondott ki, hogy a 2026-os díjmegállapítás nem növelheti a lakossági rendszerhasználati díjat. Konkrét Ft-értéket nem rögzít, és az 5. § szerint 2026. január 1-jén hatályát vesztette [S10] E. A 23,40 és a 16,18 Ft a H 2995/2025. határozat tételeiből adódik. A 2025-ös tételek (átviteli 4,84, KIF I 18,56, KIF II 11,34) ugyanezt az összeget adták.
- Az MVM lakossági árlapja az elosztói alapdíjat havi tételként közli: A1 120,50 Ft/hó, B 39,50 Ft/hó nettó [S16] E.

### 9.3 Bruttó végfelhasználói árak

| Ár | Levezetés | Bruttó | Forrás |
|---|---|---|---|
| A1 rezsivédett, MVM Démász | (5,25 + 23,40) × 1,27 | 36,386 Ft/kWh | [S16] E |
| A1 rezsivédett, E.ON és OPUS TITÁSZ | (4,39 + 23,40) × 1,27 | 35,29 Ft/kWh | Sz |
| A1 és A2 lakossági piaci ár, keret felett (a rendelet a bruttó értéket rögzíti) | (31,80 + 23,40) × 1,27 | 70,104 Ft/kWh | 20/2022. MEKH r. 2. § [S6] E |
| B Alap, MVM Démász | (1,90 + 16,18) × 1,27 | 22,962 Ft/kWh | [S16] E |
| B Alap és B Komfort lakossági piaci ár | (31,80 + 16,18) × 1,27 | 60,935 Ft/kWh | [S6] E |

A 20/2022. MEKH rendelet szövege még a hatályon kívül helyezett 259/2022. Korm. rendeletre hivatkozik [S6] E.

### 9.4 Adók és pénzeszközök

| # | Szabály | Jogszabályhely | Forrás |
|---|---|---|---|
| 9.1 | Áfa 27% | Áfa tv. 82. § (1) | árlap [S16] E, törvényszöveg M |
| 9.2 | Jövedéki adó: nem keletkezik adókötelezettség, ha a kereskedő lakossági energiafogyasztónak értékesít | 2016. évi LXVIII. tv. 111. § (1) a), 3. § 25. | [S13] E |
| 9.3 | Nem lakossági tételek 2026: kedvezményes árú villamos energia támogatása 0,08; kapcsolt termelésszerkezet-átalakítás 1,45 (áfamentes); jövedéki adó 0,415 Ft/kWh | MVM nem lakossági árlap | [S17] E |
| 9.4 | A VET 147. § szerinti pénzeszközöket csak nem lakossági fogyasztó után kell befizetni | VET 147. § (2) a) | [S1] E |
| 9.5 | A KÁT és METÁR pénzeszköz alapjába nem számít az egyetemes szolgáltató által értékesített mennyiség | VET 13. § (3) a) | [S1] E |
| 9.6 | Új díjak esetén az előre kibocsátott számlákat 30 napon belül helyesbíteni kell | NFM r. 8/A. § | [S4] E |

## 10. D árszabás, rugalmas árú szerződés

### 10.1 Törvényi keret

| # | Szabály | Jogszabályhely | Hatály | Forrás |
|---|---|---|---|---|
| 10.1 | Rugalmas villamosenergia-árat tartalmazó szerződés: az azonnali piacok (másnapi és napon belüli) árváltozását legalább a piaci elszámolás gyakoriságával azonos időközönként tükrözi | VET 3. § 52a. (módosította a 2026. évi XXXVI. tv. 5. §) | 2026. július 31. | [S1] [S2] E |
| 10.2 | A felhasználó ajánlattételi felhívására, távlehívható mérős ponton minden kereskedő köteles rugalmas árú ajánlatot tenni; ügyfélszám-küszöb nincs | VET 61/A. § (1) | a kötelezettség 2026. augusztus 31-től, VET 178. § (1) | [S1] [S2] E |
| 10.3 | Nincs ajánlattételi kötelezettség előre fizetős mérőnél, illetve szaldóban elszámolt ponton | VET 61/A. § (2) | 2026. július 31. | [S1] E |
| 10.4 | A 200 000-nél több felhasználót ellátó kereskedő (az egyetemes szolgáltatót nem ideértve) kérésre legalább egyéves fix áras ajánlatot köteles tenni; semmis az elosztói rugalmassági szolgáltatást kizáró kikötés | VET 61/A. § (3), (4) | 2026. július 31. | [S1] E |
| 10.5 | Tájékoztatás: teljes ellenérték díjelemenként, fix vagy rugalmas ár, egyszeri díjak, kedvezmények | VET 61. § (4) | hatályos | [S1] E |
| 10.6 | A szerződésben szerepelnie kell, hogy fix vagy rugalmas az ár, rugalmas árnál a képletnek vagy módszertannak is | VET 62. § (1) d) | hatályos | [S1] E |
| 10.7 | Az egyetemes szolgáltató a sávhatárig legfeljebb az A1 fix árat alkalmazhatja; az egységár akkor minősül rezsivédelmi árnak, ha az alkalmazandó fix árral azonos mértékű | VET 145. § (4a), (4b) | 2026. július 31. | [S1] E |
| 10.8 | A sávhatár D esetén is 2 523, illetve 4 606 kWh, naparányosan; a feletti rész rugalmas áron | NFM r. 7/A. § (1), (2), 1. § (1a), beiktatta a 4/2026. (VIII. 28.) GEM r. 2. és 3. § | 2026. augusztus 29. | [S4] [S11] E |
| 10.9 | Miniszteri felhatalmazás külön rugalmas sávhatár megállapítására | VET 170. § (2a) | hatályos | [S1] E |
| 10.10 | A kereskedő honlapján és ügyfélszolgálatán tájékoztat: lehetőség, igénylés módja, költségek, kockázatok, mérőfeltétel | Vhr. 27/F. § (1) | 2026. augusztus 29. | [S3] [S11] E |
| 10.11 | Rugalmas árra csak a felhasználó hozzájárulásával lehet áttérni | Vhr. 27/F. § (2) | 2026. augusztus 29. | [S3] E |
| 10.12 | A 116/2007. GKM r. szerinti munkavállalói kedvezmény rugalmas áron vételezett mennyiségre nem vehető igénybe | 116/2007. GKM r. 11. § (2) b), módosította a 4/2026. GEM r. 1. § | 2026. augusztus 29. | [S11] E |
| 10.13 | A MEKH évente jelentést tesz közzé a rugalmas árú szerződésekről: ajánlatok, számlahatás, áringadozás, visszaélések | VET 159. § (1) 12. | hatályos | [S1] [S2] E |
| 10.14 | Uniós alap: okosmérős felhasználó dinamikus árú szerződést kérhet legalább egy kereskedőtől és minden 200 000 ügyfél feletti kereskedőtől; kockázati tájékoztatás, hozzájárulás | 2019/944 irányelv 11. cikk, módosította a 2024/1711 | | [S24] [S25] M |

### 10.2 Az MVM Next D árszabása

Források: ajánlatminta új bekapcsolásra (M.2.2) [S19] E, ajánlatminta tarifamódosításra (M.2.3) [S20] E, ÁSZF (M.2.4) [S21] E, kereskedői díj hirdetmény [S18] E, D árszabás oldal [S22] E.

**Képlet, havonta** (M.2.2 4.2. pont; M.2.3 6.2. pont):

```
P_HUPX = Σ_i ( P_i / 1000 × P_X × Q_i ) / Q_N
P_P    = P_HUPX + P_SPREAD
S_N    = Q_K × P_A1 + Q_P × P_P

P_i       HUPX DAM negyedórás elszámolóár, EUR/MWh
P_X       MNB napi hivatalos EUR/HUF árfolyam
Q_i       az adott negyedórában vételezett kWh
Q_N       a hónap teljes vételezett kWh (Q_K + Q_P)
Q_K, Q_P  sáv alatti, illetve sáv feletti kWh
P_SPREAD  kereskedői díj, 13,70 Ft/kWh nettó
P_A1      A1 kedvezményes egységár
```

A súlyozott átlag a teljes havi fogyasztásra számolódik; a sáv feletti mennyiséghez nem rendelnek negyedórákat. A rugalmas ár csak az energiára vonatkozik; a rendszerhasználati díj, az adó és a pénzeszköz a rendes szabályok szerint jár [S22] E.

**Bruttó egységár a keret felett** (Sz): `(P_HUPX + 13,70 + 23,40) × 1,27`.

**Fedezeti pont** (Sz): a 20/2022. MEKH rendelet a lakossági piaci árat bruttó végfelhasználói árként rögzíti (A1 és A2: 70,104 Ft/kWh, hálózati díjjal és áfával együtt); a 31,80 Ft nettó energiaár ebből levezetett érték (MVM árlap). Ha a 2027-es hálózati díj változik és a rendeletet nem módosítják, a 31,80 és a fedezeti pont is változik. A mai értékekkel: a hálózati díj és az áfa a fix és a D áron azonos, ezért a D árszabás a keret felett akkor olcsóbb, ha `P_HUPX + 13,70 < 31,80`, vagyis a havi súlyozott tőzsdei átlag 18,10 Ft/kWh nettó alatt van. 363 Ft/EUR mellett ez kb. 50, 400 Ft/EUR mellett kb. 45 EUR/MWh.

| # | Szabály | Hely | Forrás |
|---|---|---|---|
| 10.15 | Negyedórás egységár = HUPX + kereskedői díj, két tizedesre kerekítve; a havi egységár a negyedórás összegek összege osztva a havi kWh-val; rövidebb elszámolási időszakra arányosan | M.2.2 4.3. a) és h) között | [S19] E |
| 10.16 | Kereskedői díj 13,70 Ft/kWh nettó, egységes; közzétéve 2026. szeptember 10., „2026. szeptember 10. napjától alkalmazandó” | hirdetmény HVEKD1 | [S18] E |
| 10.17 | Az ÁSZF és a hirdetmény szerint a kereskedői díj minden változását legalább 60 nappal előre hirdetményben kell közzétenni; az ajánlatminta 9.3. pontja csak „haladéktalan” közzétételt ír, a 60 napot a 9.4. pont emelésre írja elő. Negyedéves felülvizsgálat, a MEKH tájékoztatása, jóváhagyás nem kell. | ÁSZF 16.4.; M.2.2 9.3., 9.4.; hirdetmény | [S21] [S19] E |
| 10.18 | A hirdetmény fenntartja a jogot, hogy a díj „akár a közzétételt követően, de az alkalmazás megkezdése előtt” módosuljon | hirdetmény | [S18] E |
| 10.19 | Díjemelés esetén a felhasználó 30 napon belül felmondhat (legalább 30 napos felmondási idővel), vagy visszaléphet A1-re | M.2.2 9.4. | [S19] E |
| 10.20 | A képletet az MVM egyoldalúan módosíthatja, ha az index vagy a platform legalább 30 napig nem áll rendelkezésre, vagy megszűnik | ÁSZF 16.5.; M.2.2 9.5. | [S21] E |
| 10.21 | Feltételek: egyetemes jogosultság; hálózathasználati szerződés; a POD-lap szerint távlehívható mérő vagy okosmérő és havi idősoros elszámolás; nem ideiglenes csatlakozás; nincs előre fizetős mérő; nincs tartozás a folyószámlán; nincs C tarifa | ÁSZF 16.1. a)-tól e)-ig, valamint i) és j) | [S21] E |
| 10.22 | Kizáró ok: a felhasználási helyen nem lehet B vezérelt mérő, sem külön mért, nem vezérelt (H) eszköz | ÁSZF 16.1. f), g) | [S21] E |
| 10.23 | HMKE esetén csak bruttó elszámolással kérhető | ÁSZF 16.1. h), 6.37. | [S21] E |
| 10.24 | A szerződés az aláírás napján lép hatályba, ha az MVM határidőben kézhez vette, és a 16.1. a) és j) közötti feltételek egyszerre teljesülnek; a feltételeket az MVM a teljes időtartam alatt ellenőrzi | ÁSZF 16.2., 16.3. | [S21] E |
| 10.25 | Kezdés: ha az aláírt ajánlat a hónap 1. és 15. napja között érkezik vissza, a második hónap 1. napján, ha később, a harmadik hónap 1. napján indul, de legkorábban 2027. január 1-jén; addig A1 és lakossági piaci ár szerint számolnak | M.2.2 5.4.1., 5.4.2. | [S19] [S22] E |
| 10.26 | Visszalépés: ha a felhasználó az 5.4.2. pont szerinti időponttól (a forrás szövege a szerződés létrejöttét és a rugalmas ár kezdetét is említi, a kezdőpont kétértelmű) számított 12 hónapon belül felmond, a szerződés megszűnik vagy A1-re vált, ugyanarra a helyre 12 hónapig nem köthet újra D árszabást. A1-re váltás: 5-éig beadott kérelemnél a következő hónap 1. napján | M.2.2 9.1. | [S19] E |
| 10.27 | Negatív havi energiadíj esetén a számlán 0 szerepel; a lakossági felhasználó a szerződésben választ: kifizetést kér vagy beszámítást. Nem lakossági felhasználónak számlát kell kiállítania. | ÁSZF 6.34. és 6.36. között; M.2.2 8.3. és 8.8. között | [S21] [S19] E |
| 10.28 | D esetén csak elszámoló számla és végszámla van, részszámla nincs; elszámolási időszak a naptári hónap, a negyedórás elosztói adatokból | ÁSZF 6.11.; M.2.2 8.1., 8.2. | [S21] [S19] E |
| 10.29 | Az MVM közzétette a 2025. szeptember 1. és 2026. augusztus 31. közötti negyedórás rugalmas egységárakat (35 040 érték, nettó, a kereskedői díjjal) | D árszabás oldal, letölthető lista | [S22] E |
| 10.30 | A 12 havi listából: átlag 59,08 Ft/kWh nettó (tőzsdei rész 45,38); a negyedórák 11,0%-a volt a 31,80-as fedezeti szint alatt; nyáron 17,1%, télen 1,2%; legolcsóbb óra (13 óra) átlaga 37,4, legdrágább (19 óra) 89,1; esti csúcsú háztartási profil súlyozott tőzsdei átlaga 51,14, a nap legolcsóbb 4 órájáé 19,72 | a 10.29 sor listájából | Sz, független újraszámolással ellenőrizve |

A D árszabás iránti érdeklődésről (igénylők száma) 2026. szeptember 29-ig nincs nyilvános MVM közlés.

## 11. Mérési és elszámolási szabályok

| # | Szabály | Jogszabályhely | Forrás |
|---|---|---|---|
| 11.1 | Leolvasás legalább évente; havinál ritkább leolvasásnál kérésre negyedévente; alkalmazásos fotós leolvasás is lehet; a mérési adat díjmentesen hozzáférhető | VET 40. § (4), (5) | [S1] E |
| 11.2 | Idősoros elszámolás: a zónánkénti mennyiségek összege egyezik a kezdő és a záró mérőállás különbségével; sikertelen távlehívásnál becslés, a különbözet a következő számlában | Vhr. 21/A. § (2), (2a) | [S3] E |
| 11.3 | Egyetemes szolgáltatás: az elszámolási időszak hónapjainál eggyel kevesebb részszámla lehet, egyszerre legfeljebb 3, köztük legalább 30 nap, fizetésre legalább 8 nap; végszámla; visszautalás 8 napon belül | Vhr. 2. melléklet 4.2. és 4.9. között | [S3] E |
| 11.4 | Diktálás: a mérőállás bejelentését biztosítani kell; becsült részszámla csak diktálás hiányában; szaldónál mindig becsült | Vhr. 2. melléklet 4.11., 4.12. | [S3] E |
| 11.5 | Számlakifogás: halasztó hatálya akkor van, ha a mennyiség meghaladja az előző év azonos időszakának 150%-át; válaszhatáridő 15 nap | Vhr. 2. melléklet 5.1., 5.2. | [S3] E |
| 11.6 | Számlán kötelező tájékoztatás: vitarendezés, MEKH összehasonlító eszköz, fogyasztás-összehasonlítás | Vhr. 21/A. § (3b), (5) | [S3] E |
| 11.7 | Az MVM a nem távlehívható mérős és a nem havi szaldós HMKE-s helyeken évente számol el | MVM egyetemes üzletszabályzat 8.3. | [S23] E |

## 12. HMKE, energiamegosztás, energiaközösség, tárolás

| # | Szabály | Jogszabályhely | Hatály | Forrás |
|---|---|---|---|---|
| 12.1 | Éves szaldó 10 évig (a hónap végéig) azoknál, akik 2023. szeptember 13-ig igényt nyújtottak be és 2026. január 1-jéig készre jelentettek | Vhr. 5. § (5) | hatályos | [S3] E |
| 12.2 | Havi szaldó az (5b) szerinti körben, kivéve a 14/B. § szerinti okosmérőseket | Vhr. 5. § (5b) | hatályos | [S3] E |
| 12.3 | Bruttó (irányonkénti) elszámolás: 2023. szeptember 13. utáni igénynél, 2026 utáni készre jelentésnél, a 10 év lejárta után, 2024. január 1-jétől a lejárt eseteknél, kérésre, és társasházi energiaközösségnél | Vhr. 5. § (5c) a) és i) között | hatályos | [S3] E |
| 12.4 | A szaldó jog legfeljebb a 2026. január 1-jét követő 10 év végéig tart | Vhr. 126. § | hatályos | [S3] E |
| 12.5 | Nem szünteti meg a szaldót: tároló telepítése lekötött teljesítmény növelése nélkül; meghibásodás miatti invertercsere azonos vagy kisebb teljesítménnyel és legalább azonos fázisszámmal; invertercsere az Otthoni Energiatároló Programban legfeljebb 1 kW növeléssel | Vhr. 5. § (5d) | hatályos | [S3] E |
| 12.6 | Lakossági átvételi ár: az egyetemes szolgáltató a betáplálást a 4/2011. NFM r. 2. mellékletének táblázata szerint számolja el; az MVM az A1 elosztói árat (4,39 és 5,25 Ft/kWh között) alkalmazza. A Vhr. a táblázat „4. sorára” hivatkozik, a jogtári táblázatban az A1 a 3. sor, a hivatkozás nem egyértelmű. | Vhr. 5. § (5e); MVM üzletszabályzat | hatályos | [S3] [S23] E |
| 12.7 | Szaldótöbbletnél a kereskedő átlagos termékárán, egyetemes szolgáltatónál az egyetemes áron kell elszámolni; kifizetés 45 napon belül | Vhr. 5. § (6), (9) és (11) között | hatályos | [S3] E |
| 12.8 | Szaldós HMKE-s pontra nincs kötelező rugalmas árú ajánlat; az MVM kizárja a D árszabásból; bruttóra áttéréssel a kizáró ok megszűnik | VET 61/A. § (2); ÁSZF 16.1. h) | hatályos | [S1] [S21] E |
| 12.9 | HMKE-s csatlakozási ponton az üzletszabályzat 8.5.2. szerint A árszabás választható, B és H nem; a D árszabás ÁSZF-je (6.37.) szigorúbb: az M.1. mellékletben meghatározott esetekben csak egyzónaidős árszabás, vagyis A2 sem | MVM üzletszabályzat 8.5.2.; ÁSZF 6.37. | hatályos | [S23] [S21] E |
| 12.10 | Távlehívható mérős, bruttó elszámolású HMKE a betáplálást bármely piaci szereplőnek eladhatja, aggregátoron keresztül is | Vhr. 4. § | 2026. augusztus 29. | [S3] [S11] E |
| 12.11 | Betáplálás ideiglenes felfüggesztése lehetséges; zárolt kisfeszültségű áramkörök: félévente vizsgálat, MEKH-lista, feloldási terv, visszwatt-védelem | Vhr. 5. § (6a) és (6r) között | hatályos | [S3] E |
| 12.12 | 10,8 kVA feletti, legfeljebb 50 kVA-s HMKE bekapcsolási határideje a készre jelentéstől 2 hónap, helyszíni ellenőrzés 30 napon belül | Vhr. 13/J. § (4), (6) | 2026. augusztus 29. | [S11] E |
| 12.13 | 2 kWh feletti helyhez kötött tárolót be kell jelenteni, és távvezérelhetőnek kell lennie; meglévő tárolóknál a határidő 2027. június 30. | Vhr. 13/K. §, 128/D. § (4) | 2026. augusztus 29. | [S11] E |
| 12.14 | Aktív felhasználó és villamosenergia-megosztás fogalma; a megosztási hozzárendelés negyedórás adatokon alapul | VET 3. § 17a., 69a., 69b. | hatályos | [S1] E |
| 12.15 | Energiaközösség: egyesület, szövetkezet vagy nonprofit gazdasági társaság; MEKH-nyilvántartás, a bejegyzéstől minősül annak; megosztási hozzárendelést végezhet | VET 66/B. §, 66/C. § | hatályos | [S1] E |
| 12.16 | Társasházi energiaközösség: nem jogalany; díjvisszatérítéses vagy korrigált idősoros elszámolás; egyetemes szolgáltatásban külön szabály | VET 66/B. § (7) és (10) között; Vhr. 21/A. § (2c), 2. melléklet 4.13. | hatályos | [S1] [S3] E |
| 12.17 | A megosztott megújuló energia mentes a KÁT és METÁR pénzeszköz alól | VET 13. § (3) c) | 2026. július 31. | [S2] E |
| 12.18 | Az energiamegosztás uniós szabályának (15a. cikk) átültetési határideje 2026. július 17. volt; 2026. szeptember 25-én a Bizottság felszólító levelet küldött Magyarországnak, 2 hónapos válaszhatáridővel | 2024/1711 irányelv | | [S26] E |

## 13. Aggregálás és keresletoldali szabályozás

| # | Szabály | Jogszabályhely | Hatály | Forrás |
|---|---|---|---|---|
| 13.1 | Távlehívható mérős felhasználó a kereskedője és a mérlegkör-felelős jóváhagyása nélkül köthet aggregálási szerződést (független aggregátor) | VET 66/D. § (1) | 2026. július 31. | [S2] E |
| 13.2 | Az aggregátor előzetesen teljes körűen tájékoztat, és értesíti a kereskedőt, az elosztót és a mérlegkör-felelőst; a kereskedő nem alkalmazhat hátrányos megkülönböztetést | VET 66/D. § (2) és (4) között | 2026. július 31. | [S2] E |
| 13.3 | Kompenzáció csak akkor, ha a vásárlási szerződés tartalmaz módszertant; legfeljebb az igazoltan módosult mennyiség, legfeljebb a szerződéses áron; előny esetén a felhasználót illeti; csak 2026. augusztus 31. utáni ajánlatokra | VET 66/D. § (5) és (9) között, 178. § (5) | 2026. július 31. | [S2] E |
| 13.4 | HMKE-s aktív felhasználóra is vonatkozik | VET 66/D. § (10) | 2026. július 31. | [S2] E |
| 13.5 | Kiegyenlítő szabályozásban a mérlegkör-felelős és az aggregátor felelőssége korlátozott; az aggregátor több mérlegkört is aggregálhat; külön mérő adatait az elosztó továbbítja | VET 20/A. §, 21. § (8), 41. § (5), 43. § (1a) | 2026. július 31. | [S2] E |
| 13.6 | MEKH aggregátor-nyilvántartás; díjmentes aggregátorváltás | VET 66/E. §, 66/F. § | hatályos | [S1] E |
| 13.7 | A MEKH 2027. július 31-ig javaslatot tesz az aggregálás közvetlen MAVIR-elszámolására, 2028. január 1-jétől alkalmazandó módszertannal | VET 159. § (1) 17., 178/B. § (5) | 2026. július 31. | [S2] E |

A lakossági részvétel a MAVIR rendszerszintű termékeiben (aFRR, mFRR) üzletszabályzati és kereskedelmi szabályzati kérdés, a kutatás ezt nem ellenőrizte.

## 14. Fogyasztóvédelem és adatvédelem

| # | Szabály | Jogszabályhely | Forrás |
|---|---|---|---|
| 14.1 | Védendő fogyasztó: szociálisan rászoruló (részletfizetés, haladék, előre fizetős mérő) vagy fogyatékossággal élő; akinek életét vagy egészségét veszélyezteti, nem kapcsolható ki | VET 64. § (1) és (4) között | [S1] E |
| 14.2 | Kikapcsolás: több mint 60 nap késedelem, sikertelen egyeztetés, két írásbeli értesítés (a második tértivevényes); kezdeményezés legkorábban a határidő utáni 63. napon; a védendővé nyilvánítás iránti kérelem felfüggeszti | VET 47. § (7), (7a); Vhr. 24. § (3), (3a) | [S1] [S3] E |
| 14.3 | Nem lehet kikapcsolni munkaszüneti napon, ünnepnapon, az előtte lévő munkanapon és pihenőnapon. Általános téli kikapcsolási tilalom a VET-ben és a Vhr.-ben nem szerepel. | VET 47. § (8) | [S1] E |
| 14.4 | Visszakapcsolást 24 órán belül kell kezdeményezni a tartozás és a külön díj rendezése után | VET 47. § (9) | [S1] E |
| 14.5 | Előre fizetős mérő minden igénylő szociálisan rászorulónak jár; részletfizetés 4, 10, illetve 12 hónap, kamatmentesen | Vhr. 32. § körüli rész (2) és (6) között | [S3] E |
| 14.6 | Panasz: előbb az engedélyeshez; lakossági ügyben a számlázás, mérés és kikapcsolás a fogyasztóvédelmi hatósághoz, egyéb ügy a MEKH-hez; elévülés 5 év; panasz alatt nincs kikapcsolás | VET 57. § (1) és (10) között | [S1] E |
| 14.7 | Békéltető testület a fogyasztóvédelmi törvény 18. §-a szerint; a számlán fel kell tüntetni a bíróságon kívüli vitarendezés elérhetőségét | Vhr. 21/A. § (3b) c) | [S3] E, a Fgytv. M |
| 14.8 | Egyoldalú szerződésmódosítás: egyetemes szolgáltatásban MEKH előzetes hozzájárulással, lényeges hátrány nélkül; értesítés 30 nappal (egyetemes szolgáltató), illetve 14 nappal (kereskedő) előtte, felmondási joggal | VET 73. § (2), (3), 62. § (2) | [S1] E |
| 14.9 | Árváltozás: közzététel 3 munkanapon belül; személyre szóló tájékoztatás legkésőbb az új áras számlán | VET 145. § (6), (7) | [S1] E |
| 14.10 | Kereskedőváltás díjmentes; szerződésmegszüntetési díj lakossággal és kisvállalkozással szemben nem alkalmazható | VET 47/B. § (1) és (4) között | [S1] E |
| 14.11 | Okosmérő-adatok: az elosztó díjmentesen hozzáférhetővé teszi a hitelesített negyedórás és a közel valós idejű adatokat a felhasználónak és meghatalmazott harmadik félnek, interfészen keresztül | Vhr. 14/C. § (3), (4) | [S3] E |
| 14.12 | Kereskedőnek csak a rendszerhasználó hozzájáruló nyilatkozatával adhatók át mérési adatok; az adatkezelést az elosztói és a kereskedelmi szabályzat külön fejezete rendezi | VET 33/B. §; Vhr. 14/C. § (2) | [S1] [S3] E |
| 14.13 | Az energetikai adatszolgáltató platform hozzáfér a mérési adatokhoz, az aktív felhasználó együttműködik vele | VET 43. § (4), 45/A. § | [S1] E |
| 14.14 | Adatvédelem: GDPR 6. cikk; uniós adatkezelés és interoperabilitás: 2019/944 irányelv 23. cikk, (EU) 2023/1162 végrehajtási rendelet | uniós jog | [S25] M |

## 15. Várható változások

| # | Állítás | Forrás |
|---|---|---|
| 15.1 | A lakossági hálózati díj befagyasztása csak 2026-ra szólt; a 350/2025. rendelet 2026. január 1-jén megszűnt. 2027-re jogszabályi befagyasztás nem található. Az új díjmódszertan 2026. augusztus 31-től hatályos (7/2026. MEKH r.). | [S10] [S11] E |
| 15.2 | A rezsivédelmi kijelölés 2027. december 31-ig szól. A rezsicsökkentés megszüntetéséről hivatalos tervezet nem található; a Pénzügyminisztérium 2026 szeptemberében érdemben nem nyilatkozott. | [S14] E, [S29] M |
| 15.3 | Az MVM D árszabása 2027. január 1-jén indul. A díjváltozás 60 napos közzétételi szabálya miatt 2026. november 1. után közölt díj legkorábban 2027 januárjában alkalmazható. | [S18] [S21] E, a következtetés Sz |
| 15.4 | Uniós átültetés: a 2024/1711 irányelv általános határideje 2025. január 17.; a kereskedőválasztási és energiamegosztási rendelkezéseké 2026. július 17.; energiamegosztás ügyében kötelezettségszegési eljárás indult | [S24] M, [S26] E |
| 15.5 | 2 kWh feletti meglévő tárolók bejelentési és távvezérelhetőségi határideje 2027. június 30. | [S11] E |
| 15.6 | A 4 000 kWh feletti helyek okosmérő-cseréjének határideje a 2026-ban lezárt elszámolásoknál 2027. december 31. | [S11] E |
| 15.7 | Aggregálás közvetlen MAVIR-elszámolási javaslat 2027. július 31-ig, alkalmazás 2028. január 1-jétől | [S2] E |

Nyitott pontok: a H 2995/2025. határozat teljes szövege; a MEKH 2026-os lakossági konzultációi (lakossági érintettségű tervezet nem található); a 2027-es lakossági piaci ár változatlansága; a B Komfort és B Geo feltételei (MVM üzletszabályzat M.1. melléklet).

## 16. Ellentmondások és ismert hibák a nyilvános forrásokban

| # | Ellentmondás | Mit használjunk |
|---|---|---|
| 16.1 | Az MVM D árszabás oldala szerint a külön mért áramkörök „változatlanul működnek tovább”, az ÁSZF 16.1. f) és g) pontja szerint B vezérelt mérő vagy H eszköz a helyen kizárja a D árszabást [S22] [S21] | Az ÁSZF-et: vezérelt vagy H mellett a D nem választható. Bemutatón kérdésként is érdemes felvetni. |
| 16.2 | Az MVM D árszabás oldala még 5 000 kWh-s okosmérő-küszöböt ír, a Vhr. 14/B. § (2) a) 2026. augusztus 29-től 4 000 kWh-t [S22] [S3] | A Vhr.-t: 4 000 kWh. |
| 16.3 | A rugalmas árú szerződés fogalmát több másodlagos forrás a VET 3. § 52b. pontjára teszi, a hatályos szöveg szerint 52a. [S1] | 52a. |
| 16.4 | A 2 523 kWh-s keretet sok forrás még a 259/2022. Korm. rendeletre vezeti vissza, amely 2025. augusztus 1. óta nem hatályos [S15] | 4/2011. NFM r. 6. § (1). |
| 16.5 | A 350/2025. Korm. rendeletet több forrás a 23,40 Ft forrásaként idézi; a rendelet konkrét díjat nem rögzít és 2026. január 1-jén megszűnt [S10] | H 2995/2025. MEKH határozat: 3,39 + 20,01 = 23,40. |
| 16.6 | Keret felett fogyasztó helyek aránya: 25% (ITM 2022), 22% (kormány 2023), 19% (MVM 2026) [S45] [S49] [S41] | „19 és 25 százalék között, forrásonként eltérően”. |
| 16.7 | Okosmérő-állomány: 670 ezer (2024), közel 750 ezer (2026, forrás nélkül), 450 ezer (2026-os cikk, valószínűleg E.ON-os szám) | 670 ezer, 2024. július, forrásmegjelöléssel. |
| 16.8 | Lakossági mérési pontok: 5,33 millió (KSH felhasználási hely), 5,26 millió (ACER), kb. 4,6 millió (sajtó 2026) | KSH, a bázis megnevezésével. |
| 16.9 | Lakossági fogyasztás 2023 és 2024: KSH 12 442 és 12 626 GWh; MEKH háztartási 11 883 és 11 788 GWh | KSH, a forrás megnevezésével. |
| 16.10 | MVM ügyfélszám: 4,2 millió (áram és gáz egyetemes, weboldal), több mint 2 millió egyetemes áram és kb. 5,8 millió összes (energiahatékonysági jelentés) | Konkrét számot ne állítsunk forrás nélkül. |
| 16.11 | Az RRF második okosmérő-kör keretösszege: 26,6 milliárd Ft, illetve több mint 54 milliárd Ft | Mindkettőt forrással, vagy csak a darabszámot (947 368). |
| 16.12 | Elektromos autók: 101 534 kiadott zöld rendszám, 86 348 forgalomban lévő tisztán elektromos személyautó (2025 vége) | Forgalomban lévő állományra a 86 348-at, kiadott rendszámra a 101 534-et. |
| 16.13 | A Villanylap „kötelező” D árszabás-bevezetést ír 2027. január 1-jére; az MVM szerint önkéntes [S79] [S19] | Önkéntes. |
| 16.14 | A Vhr. 5. § (5e) a 4/2011. NFM r. 2. melléklet „4. sorára” hivatkozik a HMKE átvételi árnál, a táblázatban az A1 a 3. sor | Az MVM gyakorlata: A1 elosztói ár. |
| 16.15 | HMKE-s ponton választható árszabás: az üzletszabályzat 8.5.2. szerint A árszabás, B és H nem; a D árszabás ÁSZF 6.37. szerint csak egyzónaidős, tehát A2 sem [S23] [S21] | D árszabásnál az ÁSZF-et. |
| 16.16 | Kereskedői díj módosítása: az ÁSZF 16.4. és a hirdetmény minden változásra 60 napot ír, az ajánlatminta 9.3. csak „haladéktalan” közzétételt, 60 napot csak emelésre (9.4.) [S21] [S19] [S18] | A szigorúbbat: 60 nap. |
| 16.17 | Az M.2.2 ajánlatminta a 4/2011. NFM rendeletet „(I. 29.)” dátummal idézi (helyesen I. 31.), és a képletmagyarázatban „XY rendelet” helyőrző maradt [S19] | A helyes jogszabályhely: 4/2011. (I. 31.) NFM r. 7/A. §. |

## 17. Adathiányok

Nyilvános forrásban 2026. szeptember 29-ig nem található:

- csak áramot vevő MVM ügyfelek száma; egyetemes szolgáltatásban lévő mikrovállalkozások száma; felhasználók megoszlása elosztónként;
- 2025-ös lakossági fogyasztás; 4 000 és 5 000 kWh/év feletti helyek száma; fogyasztás háztartásméret és településtípus szerint (utolsó KSH kiadvány 2006);
- B tarifás felhasználók pontos száma; A1 és A2 megoszlás; friss előre fizetős mérőszám;
- a 4 000 kWh-s okosmérő-cserekötelezettség érintettjeinek száma;
- szaldó és bruttó HMKE-k teljes megoszlása; telepített otthoni akkumulátorok; otthoni töltők; villanybojler aránya 2020 után;
- rezsivédelmi kompenzáció áram és gáz szerinti bontása; a 2026-os Rezsivédelmi Alap előirányzata; MEKH panaszstatisztika; mért lakossági árrugalmasság;
- védendő fogyasztók száma;
- D árszabás iránti érdeklődők és igénylők száma.

## 18. Következmények az appra

A jelenlegi app (frontend/static/js/app.js) ezekkel a pontokkal egyezik, és ezeket kell megtartani:

- **Tarifaállandók:** A1 36,4 Ft/kWh (elosztónként 35,3 és 36,4 között, a felületen jelölve), keret felett 70,1; vezérelt 23,0 és 60,9; kereskedői díj 13,70; hálózati díj 23,40; áfa 27%; lakossági piaci energiaár 31,80; fedezeti pont 18,10.
- **D árszabás képlete:** a teljes havi fogyasztás súlyozott tőzsdei átlaga plusz kereskedői díj, a keret feletti mennyiségre.
- **Vezérelt és D:** a D árszabás vezérelt (B) vagy H mérő mellett nem választható (ÁSZF 16.1. f), g)).
- **Okosmérő:** 4 000 kWh/év felett kötelező csere, kérésre egyszer ingyen (Vhr. 14/B. § (2) a), (2a); 10/2024. MEKH r. 33. § (1) 12.).
- **Indulás:** igénylés 2026. szeptember 1-jétől, legkorábban 2027. január 1-jétől él; első 12 hónapon belüli visszalépés után 12 hónapig nem köthető újra.
- **Hálózati díj:** ma nem függ a napszaktól, ezért az időzítés hatása kizárólag az energiaáron keresztül jelentkezik.

Figyelni kell, és változás esetén az appot frissíteni:

- a kereskedői díj hirdetményeit (negyedéves felülvizsgálat, 60 napos előzetes közzététel);
- a 2027-es rendszerhasználati díjat (a 2026-os befagyasztás megszűnt);
- a rezsivédelmi keret és a lakossági piaci ár sorsát 2027. december 31. után;
- a MEKH éves jelentését a rugalmas árú szerződésekről (VET 159. § (1) 12.);
- időben differenciált hálózati díj esetleges bevezetését a KIF IV kategóriában.

## 19. Forrásjegyzék

Megtekintve: 2026. szeptember 23. és 29. között.

**Jogszabályok és hivatalos közlemények**

- [S1] 2007. évi LXXXVI. törvény a villamos energiáról (VET), 2026. július 31. és szeptember 30. közötti időállapot. https://net.jogtar.hu/jogszabaly?docid=a0700086.tv
- [S2] Magyar Közlöny 2026/102. (2026. július 30.), 2026. évi XXXVI. törvény. https://www.magyarkozlony.hu/hivatalos-lapok/II4qavV14uUUFMxsMkPD6a6394ffb8e81/dokumentumok/0d5f80ec06f807d7a5f83a87bb3d91ef5f39534f/letoltes
- [S3] 273/2007. (X. 19.) Korm. rendelet a VET végrehajtásáról (Vhr.), 2026. augusztus 29. és szeptember 30. közötti időállapot. https://net.jogtar.hu/jogszabaly?docid=a0700273.kor
- [S4] 4/2011. (I. 31.) NFM rendelet a villamos energia egyetemes szolgáltatás árképzéséről, 2026. augusztus 29-től. https://net.jogtar.hu/jogszabaly?docid=a1100004.nfm
- [S5] 10/2024. (XI. 14.) MEKH rendelet a rendszerhasználati díjak alkalmazási szabályairól. https://net.jogtar.hu/jogszabaly?docid=a2400010.mek
- [S6] 20/2022. (XII. 21.) MEKH rendelet a lakossági piaci árról. https://net.jogtar.hu/jogszabaly?docid=a2200020.mek
- [S10] Magyar Közlöny 2025/131., 350/2025. (XI. 12.) Korm. rendelet. https://magyarkozlony.hu/dokumentumok/bede3d9373fac34d1a25c882184097331fccab2d/letoltes
- [S11] Magyar Közlöny 2026/120. (2026. augusztus 28.): 131/2026. Korm. r., 7/2026. és 8/2026. MEKH r., 4/2026. GEM r. https://magyarkozlony.hu/dokumentumok/6eb523e0bd643b2b165248273963f11c321d7299/letoltes
- [S12] E.ON: rendszerhasználati díjak 2026. január 1-jétől (MEKH H 2995/2025.). https://www.eon.hu/content/dam/eon/eon-hungary/documents/hatarozatok-szabalyzatok-aram/arak-tarifak/Aram_RHD_EON_20260101.pdf
- [S13] 2016. évi LXVIII. törvény a jövedéki adóról. https://net.jogtar.hu/jogszabaly?docid=a1600068.tv
- [S14] 236/2025. (VII. 31.) Korm. rendelet. https://net.jogtar.hu/jogszabaly?docid=a2500236.kor
- [S15] 2025. évi L. törvény. https://net.jogtar.hu/jogszabaly?docid=a2500050.tv
- [S24] (EU) 2024/1711 irányelv. https://eur-lex.europa.eu/eli/dir/2024/1711/oj/eng
- [S25] (EU) 2019/944 irányelv, egységes szerkezetben. https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02019L0944-20240716
- [S26] Európai Bizottság, 2026. szeptember 25.: kötelezettségszegési döntések energiaügyben. https://energy.ec.europa.eu/news/commission-takes-action-ensure-complete-and-timely-transposition-eu-directives-key-decisions-energy-2026-09-25_en

**MVM Next dokumentumok**

- [S16] Lakossági árlap, 2022. augusztus 1-jétől, ma is aktuálisként közölve. https://www.mvmnext.hu/aram/servlet/download?type=file&id=16214
- [S17] Nem lakossági árlap 2026. https://www.mvmnext.hu/aram/servlet/download?type=file&id=16516
- [S18] Hirdetmény a D árszabás kereskedői díjáról, 2026. szeptember 10. https://www.mvmnext.hu/aram/servlet/download?type=file&id=16704
- [S19] Rugalmas árú szerződéses ajánlatminta, új bekapcsolás (M.2.2). https://www.mvmnext.hu/aram/servlet/download?type=file&id=16726
- [S20] Rugalmas árú szerződéses ajánlatminta, tarifamódosítás (M.2.3). https://www.mvmnext.hu/aram/servlet/download?type=file&id=16725
- [S21] Általános Szerződési Feltételek, D árszabás (M.2.4). https://www.mvmnext.hu/aram/servlet/download?type=file&id=16696
- [S22] D árszabás oldal, a 12 havi negyedórás árlistával. https://www.mvmnext.hu/aram/pages/aloldal.jsp?id=16455187
- [S23] Egyetemes villamosenergia-szolgáltatói üzletszabályzat, 2026. március 1. https://www.mvmnext.hu/aram/servlet/download?type=file&id=16547
- [S46] Egyetemes szolgáltatás. https://www.mvmnext.hu/ee/egyetemes-szolgaltatas/
- [S47] Energiahatékonysági összefoglaló jelentés 2024. https://mvmnext.hu/contents/kapcsolodo-dokumentumok/energiahatekonysag/2024-evi-osszefoglalo-jelentes-MVM-Next-Energiakereskedelmi-Zrt.pdf
- [S48] Mikrovállalkozói jogosultság, 2024. november 20. https://www.mvmnext.hu/vallalati-informaciok/hirek-aktualitasok/aktualis/2024/11-20
- [S57] Előre fizetős mérő védendő ügyfeleknek. https://www.mvmnext.hu/aram/pages/aloldal.jsp?id=16419530
- [S64] Idősoros elszámolás. https://www.mvmnext.hu/aram/pages/aloldal.jsp?id=14750307

**Statisztika**

- [S30] KSH STADAT 15.1.1.44, háztartási villamosenergia-fogyasztók és fogyasztás. https://www.ksh.hu/stadat_files/kor/hu/kor0044.html
- [S31] KSH háztartások száma és mérete. https://www.ksh.hu/stadat_files/jov/hu/jov0042.html
- [S32] ACER 2025 Retail Monitoring Report, Country Sheets, Electricity, Magyarország (19. o.). https://www.acer.europa.eu/sites/default/files/documents/Publications/2025-Retail-Monitoring-Report-Country-Sheets-Electricity.pdf
- [S33] MEKH és MAVIR: A magyar villamosenergia-rendszer 2024. évi statisztikai adatai. https://mavir.hu/documents/10258/0/MEKH_statisztikai_kiadvany_VILLAMOSENERGIA_2024_A4_10.pdf
- [S34] Eurostat ilc_mdes07, közüzemi számlahátralék. https://ec.europa.eu/eurostat/databrowser/view/ilc_mdes07/default/table
- [S34b] Eurostat ilc_mdes01, a lakás megfelelő fűtése. https://ec.europa.eu/eurostat/databrowser/view/ilc_mdes01/default/table
- [S35] Eurostat nrg_pc_204, lakossági áramár (frissítve 2026. szeptember 24.). https://ec.europa.eu/eurostat/databrowser/view/nrg_pc_204/default/table
- [S36] MAVIR PV statisztika, 2026. március 1-ig. https://www.mavir.hu/documents/10258/337780125/PV+STATISZTIKA_HU_20260301_ig_v1.pdf
- [S51] KSH havi átlagfogyasztás vármegyénként (2013). https://www.ksh.hu/docs/hun/xstadat/xstadat_eves/i_zrk007b.html
- [S53] KSH Statisztikai Szemle 2025/7. https://www.ksh.hu/statszemle_archive/all/2025/2025_07/2025_07_648.pdf
- [S59] MVM okosmérő projekt, 2024. június 26. https://mvm.hu/hu-HU/Media/MediaTartalmak/Hirek/20240626_MVM_Okosmerok
- [S60] OPUS TITÁSZ RRF projekt. https://www.palyazat.gov.hu/eredmenyek/tamogatott-projektek/3736370201
- [S74] KSH: háztartások villamosenergia-felhasználása (2004 adat). https://www.ksh.hu/docs/hun/xftp/idoszaki/pdf/haztvillenergia.pdf
- [S75] KSH: háztartások energiafelhasználása 2008. https://www.ksh.hu/docs/hun/xftp/idoszaki/pdf/haztartenergia08.pdf

**Másodlagos források**

- [S29] Magyar Nemzet, 2026. szeptember. https://magyarnemzet.hu/gazdasag/2026/09/provokacio-penzugyminiszterium-rezsicsokkentes-karman-vedett-ar
- [S40] Infostart, 2024. július 1.: minden tizedik mérőóra okos. https://infostart.hu/belfold/2024/07/01/minden-tizedik-meroora-mar-okos
- [S41] Világgazdaság, 2026. szeptember: D tarifa, okosmérő, átlagfogyasztás. https://www.vg.hu/vilaggazdasag-magyar-gazdasag/2026/09/d-tarifa-mvm-rezsi-okosmero-atlagfogyasztas
- [S41b] Origo, 2026. június: okosmérő pályázat. https://www.origo.hu/gazdasag/2026/06/okosmero-palyazat-egyeztetes
- [S44] Világgazdaság, 2026. szeptember: rezsikompenzáció. https://www.vg.hu/vilaggazdasag-magyar-gazdasag/2026/09/rezsi-kompenzal-aram-gaz
- [S45] Telex, 2022. július 24. https://telex.hu/gazdasag/2022/07/24/rezsicsokkentes-gaz-aram-fogyasztok
- [S49] Index, 2023. augusztus 1. https://index.hu/gazdasag/2023/08/01/rezsicsokkentes-energia-veszelyhelyzet-energiavalsag-energiaarak-rezsi-rezsiharc-rezsiszamla-rezsicsokkentes-valtozas/
- [S50] Átlátszó, 2022. október 28.: 1 430 település. https://atlatszo.hu/adat/2022/10/28/1430-telepulesen-a-rezsivedett-mennyisegnel-tobb-aramot-fogyaszt-egy-atlagos-haztartas/
- [S52] NRG Report, 2026. június 17. https://nrgreport.com/cikk/2026/06/17/okosmeres-a-magyar-energiarendszerben-johet-a-dinamikus-arazas/
- [S54] Daikin, 2026 és Portfolio, 2025. november 18.: hőszivattyú-átállás. https://www.daikin.hu/hu_hu/pr-es-sajto/2026/haromeves-az-energiavalsag-hoszivattyu-atallas.html ; https://www.portfolio.hu/gazdasag/20251118/haromeves-az-energiavalsag-a-magyar-lakossag-jelentos-resze-hoszivattyus-futesre-allt-at-800444
- [S55] Portfolio, 2023. január 29.: B és H tarifa. https://www.portfolio.hu/uzlet/20230129/b-es-h-tarifa-igy-allunk-az-ejszakai-es-hoszivattyus-aram-fogyasztasaval-593310
- [S56] Magyar Idők: százezer feltöltős mérő. https://www.magyaridok.hu/gazdasag/szazezer-feltoltos-mero-mukodik-1407031/
- [S58] Telex G7, 2026. augusztus 6.: ingyenes okosmérő. https://telex.hu/g7/kozelet/2026/08/06/ingyen-okosmero-igenyles-felhasznalas-okos-otthon-mavir
- [S61] Infostart, 2026. június 25.: okosmérő és hálózatfejlesztési pályázat. https://infostart.hu/belfold/2026/06/25/okosmerokre-es-halozatfejlesztesre-nyilik-oriasi-palyazat-unios-penzekbol
- [S62] 444, 2026. augusztus 22.: RRF hálózati keret. https://444.hu/2026/08/22/kiosztottak-500-milliard-forintot-a-helyreallitasi-tervbol
- [S63] Adózóna: idősoros elszámolás 2025. https://adozona.hu/altalanos/Uj_tipusu_elszamolasi_mod_2025_elejetol_az__T9Z41W
- [S65] HVG, 2025. június 15.: szaldó elszámolás vége. https://hvg.hu/gazdasag/20250615_haztartas-napelem-megujulo-energia-szaldo-elszamolas-napenergia
- [S66] Világgazdaság, 2026. szeptember: Otthoni Energiatároló Program. https://www.vg.hu/vilaggazdasag-magyar-gazdasag/2026/09/otthoni-energiatarolo-program-vezerelheto
- [S67] Villanyautósok, 2026. január 7.: 101 534 villanyautó. https://villanyautosok.hu/2026/01/07/101-534-villanyautoval-zartuk-2025-ot/
- [S68] Villanyautósok, 2026. március 3.: forgalomban lévő állomány. https://villanyautosok.hu/2026/03/03/eveken-at-becsaptunk-benneteket/
- [S69] Villanyautósok, 2026. szeptember 3.: V4 összevetés. https://villanyautosok.hu/2026/09/03/magyarorszag-vezeti-a-v4-eket-2026-elso-feleben-minden-tizedik-uj-auto-elektromos-volt/
- [S70] Autószektor: otthoni töltés 70%. https://www.autoszektor.hu/hu/content/otthon-tolt-magyar-villanyautosok-70-szazaleka
- [S71] Villanyautósok, 2025. november 18.: GEVA felmérés. https://villanyautosok.hu/2025/11/18/keves-a-nyilvanos-tolto-de-ugyis-otthon-toltenek-a-magyar-villanyautosok/
- [S72] IoT Magazin, 2025. július 2.: klímák száma. https://iotmagazin.hu/gazdasag/2025/07/02/egymillioval-nohet-a-lakossagi-klimak-szama-magyarorszagon-igy-valasszunk-okosan/
- [S73] Economx: lakóingatlanok és klímák. https://www.economx.hu/belfold/magyarorszag-lakoingatlanok-energiahatekonysag-klimaberendezesek-novekedes.819826.html
- [S76] Telex, 2025. február 17.: rezsivédelem költsége. https://telex.hu/gazdasag/2025/02/17/rezsivedelem-foldgaz-aram-tavho
- [S77] Telex, 2025. szeptember 15.: MVM kompenzáció. https://telex.hu/gazdasag/2025/09/15/rezsicsokkentes-500-milliard-magyar-allam-mvm
- [S78] Index, 2024. október 22.: MEKH bírság. https://index.hu/gazdasag/2024/10/22/villamos-energia-foldgaz-szolgaltato-szolgaltatas-birsag-figyelmeztetes-fogyasztovedelmi-vizsgalat/
- [S79] Villanylap, 2026. szeptember: dinamikus áramtarifa. https://www.villanylap.hu/hirek/7074-jon-a-dinamikus-aramtarifa-de-a-legtobben-nem-allnak-ra-keszen
