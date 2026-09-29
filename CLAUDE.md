# Energia Időzítő

## Telepítés
- Railway, projekt: lucid-prosperity, szolgáltatás: energia-idozito, automatikus deploy a main ágról.
- Régió: EU West (Amszterdam, `europe-west4-drams3a`), a `railway.toml` rögzíti. Minden projektnél európai régió az alap, csak akkor más, ha az európai régió drágább.
- Az `ENTSOE_API_KEY` csak Railway környezeti változó. Soha nem kerülhet gitbe (`backend/.env` és `.env` a `.gitignore`-ban).
- A projekt Redis és Postgres szolgáltatása nincs használatban a kódban.

## Szakmai alapok
- **Minden szakmai állítás, szám és felületi szöveg forrása a `docs/szakmai-alapok.md`** (fogyasztók, szabályozás, árak, D árszabás, mérés, HMKE, fogyasztóvédelem, jogszabályhelyekkel és forrásokkal). Új szám vagy szabály csak forrással kerülhet bele; ellentmondásnál a 16. fejezet dönt.
- D árszabás képlete és díjai: MVM Next ajánlatminta M.2.2., hirdetmény 2026.09.10 (kereskedői díj 13,70 Ft/kWh nettó), lakossági RHD 23,40 Ft/kWh, áfa 27%. A rugalmas árú szerződés fogalma: VET 3. § 52a.; a 2 523 kWh-s keret: 4/2011. NFM r. 6. § (1).
- Nyelv a felületen és az anyagokban: nincs gondolatjel, nincs emoji az új szövegekben, tömör magyar.
