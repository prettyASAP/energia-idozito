# Energia Időzítő

Webes alkalmazás magyar háztartásoknak: megmutatja, hogy a nap mely negyedóráiban olcsó az áram a HUPX másnapi piacán, mikor érdemes nagy fogyasztót (mosógép, mosogatógép, bojler, elektromosautó-töltő) indítani, és hogy egy adott fogyasztási mintával megéri-e a dinamikus (D) árszabásra váltani a rezsivédett ár helyett.

## Nézetek

| Nézet | Mit mutat |
|---|---|
| **Most** | Mikor indítsd: a következő órák legolcsóbb idősávjai eszközönként, a megtakarítás a legrosszabb sávhoz képest |
| **Árak** | Napi negyedórás árak, az elmúlt 30 nap, és a rendszer aktuális termelési mixe (honnan jön most az áram) |
| **Megéri?** | Tarifakalkulátor: rezsivédett ár és D árszabás összevetése havi, naparányos kerettel, 12 hónapos nézetben |

Csak ténylegesen közzétett negyedórás árakat jelenít meg; ahol még nincs ár, ott nem becsül.

## Szakmai alap

A felületen szereplő minden szám és szabály forrása a [`docs/szakmai-alapok.md`](docs/szakmai-alapok.md): a magyar lakossági villamosenergia-piac forrásolt tényanyaga (egyetemes szolgáltatás, rezsivédelem, D árszabás, mérés, HMKE, fogyasztóvédelem), jogszabályhelyekkel, forrásminősítéssel és változásnaplóval. Az alkalmazás állandói és a források közötti megfeleltetést a dokumentum 18. fejezete rögzíti.

## Adatforrások

| Adat | Forrás |
|---|---|
| Másnapi és negyedórás áramár (HU zóna) | ENTSO-E Transparency Platform, tartalékként energy-charts.info |
| Rendszerterhelés, megújuló előrejelzés, határkeresztező áramlások, termelési mix | MAVIR nyilvános adatexport |
| EUR/HUF árfolyam | Európai Központi Bank napi referenciaárfolyam |
| Időjárás (klíma- és napelem-tervezéshez) | Open-Meteo |

## Felépítés

```
backend/src/
  data/        ár-, árfolyam- és időjárás-letöltők
  services/    hálózati adatok (terhelés, mix, áramlások)
  analysis/    árelemzés, ajánlómotor, ár-előrejelzés, klíma- és napelem-tervező
  api/main.py  FastAPI, /api/* végpontok, IP-alapú rate limit
frontend/      statikus kliens (HTML, CSS, vanilla JS, service worker)
docs/          szakmai alapdokumentum
```

Stack: Python 3, FastAPI, pandas; a kliens keretrendszer nélküli JavaScript. Telepítés Railway-re (EU West régió), a `main` ágról.

## Helyi futtatás

```bash
./start.sh
```

A script létrehozza a virtuális környezetet, telepíti a függőségeket, és ha nincs `.env`, demo módban indul (szimulált árak, API kulcs nélkül). Valós adatokhoz ENTSO-E API kulcs kell (`ENTSO_E_API_KEY`) a `backend/.env` fájlba (lásd `backend/.env.example`). Az alkalmazás a `http://localhost:8000` címen érhető el.

## Korlátok

Az alkalmazás tájékoztató jellegű, nem kereskedői ajánlat. A D árszabás díjtételei a kereskedő hirdetményéhez kötöttek és negyedévente változhatnak; az aktuális értékeket és a felülvizsgálat rendjét a szakmai alapdokumentum tartalmazza.
