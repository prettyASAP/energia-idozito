import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PriceHour, PricePayload } from '../domain/types';
import { fetchDayAheadPrices } from './energyCharts';
import { fetchEurHuf } from './ecb';
import { combinedForecast, computeModelAccuracy, predictPrices } from '../domain/predictor';

// A korábbi /api/forecast végpont helyi megfelelője: energy-charts + EKB + előrejelző,
// az utolsó sikeres eredmény AsyncStorage-ban, hogy az app offline is azonnal nyíljon.

export const HISTORY_DAYS = 31;
export const FORECAST_DAYS = 2;
const DAY = 86400000;
const CACHE_KEY = 'energia.pricePayload.v1';

export async function fetchPricePayload(now: Date = new Date()): Promise<PricePayload> {
  const start = new Date(now.getTime() - HISTORY_DAYS * DAY);
  // A holnapi day-ahead árak 13:00 után már publikusak — kérjük le őket valósként.
  const end = new Date(now.getTime() + 2 * DAY);
  const [hist, eurHuf] = await Promise.all([fetchDayAheadPrices(start, end), fetchEurHuf()]);
  if (!hist.length) throw new Error('Nem érkezett áradat az energy-charts.info-ról.');
  const forecast = predictPrices(hist, FORECAST_DAYS);
  const prices = combinedForecast(hist, forecast, eurHuf, HISTORY_DAYS);
  return {
    prices,
    eur_huf_rate: eurHuf,
    model_accuracy: computeModelAccuracy(hist),
    fetchedAt: now.getTime(),
  };
}

export async function loadCachedPayload(): Promise<PricePayload | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PricePayload;
    if (!parsed || !Array.isArray(parsed.prices)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function savePayloadCache(payload: PricePayload): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
  } catch {
    // a cache csak kényelmi funkció
  }
}

/** A tervezőknek szükséges egyszerűsített óralista. */
export function toPriceHours(payload: PricePayload | null): PriceHour[] {
  if (!payload) return [];
  return payload.prices.map((p) => ({
    timestamp: p.timestamp,
    price_huf_kwh: p.price_huf_kwh,
    is_cheap: p.is_cheap,
    is_expensive: p.is_expensive,
  }));
}
