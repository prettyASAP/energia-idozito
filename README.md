# Energia Időzítő

Mikor éri meg bekapcsolni a mosógépet, bojlert, autótöltőt? Élő magyar tőzsdei áramárak, eszköz-időzítés,
megtakarítás-kalkulátor és tervek.

| Mappa | Mi ez |
|---|---|
| `mobile/` | **iOS + Android alkalmazás** — Expo (React Native) + TypeScript, áruházi kiadásra előkészítve. Indítás és kiadás: [mobile/README.md](mobile/README.md), [mobile/store/CHECKLIST.md](mobile/store/CHECKLIST.md) |
| `frontend/` + `backend/` | Az eredeti webalkalmazás (vanilla JS + FastAPI), Railway-re telepítve |
| `design_handoff_energia_app/` | A mobil UI design referencia (tokenek, képernyők) |

A mobilapp önálló: nem használja a `backend/`-et, közvetlenül az energy-charts.info, EKB, MAVIR és Open-Meteo
nyilvános forrásokból dolgozik.
