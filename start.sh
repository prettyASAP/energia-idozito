#!/bin/bash
set -e

cd "$(dirname "$0")/backend"

if [ ! -d ".venv" ]; then
  echo "Virtuális környezet létrehozása..."
  python3 -m venv .venv
fi

source .venv/bin/activate

echo "Csomagok telepítése..."
pip install -q -r requirements.txt

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "Demo mód: .env fájl létrehozva (DEMO_MODE=true)"
fi

echo ""
echo "========================================"
echo " Energia Optimalizáló indítása..."
echo " http://localhost:8000"
echo "========================================"
echo ""

uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload
