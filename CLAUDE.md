# Energia Időzítő

## Telepítés
- Railway, projekt: lucid-prosperity, szolgáltatás: energia-idozito, automatikus deploy a main ágról.
- Régió: EU West (Amszterdam, `europe-west4-drams3a`), a `railway.toml` rögzíti. Minden projektnél európai régió az alap, csak akkor más, ha az európai régió drágább.
- Az `ENTSOE_API_KEY` csak Railway környezeti változó. Soha nem kerülhet gitbe (`backend/.env` és `.env` a `.gitignore`-ban).
- A projekt Redis és Postgres szolgáltatása nincs használatban a kódban.

## Szakmai alapok
- D árszabás képlete és díjai: MVM Next ajánlatminta M.2.2., hirdetmény 2026.09.10 (kereskedői díj 13,70 Ft/kWh nettó), lakossági RHD 23,40 Ft/kWh, áfa 27%.
- Nyelv a felületen és az anyagokban: nincs gondolatjel, nincs emoji az új szövegekben, tömör magyar.
