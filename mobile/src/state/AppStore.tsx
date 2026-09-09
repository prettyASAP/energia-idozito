import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { AppState as RNAppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AdvisorAnswers, Flex, PricePayload, Tariff, WeatherHour } from '../domain/types';
import { EMPTY_GRID, type GridState } from '../domain/grid';
import { DEFAULT_ADVISOR } from '../domain/advisor';
import { calcOnboardingSavings } from '../domain/savings';
import type { PlanTab } from '../domain/plan';
import { fetchPricePayload, loadCachedPayload, savePayloadCache } from '../data/priceService';
import { loadGridState } from '../data/mavir';
import { cityByKey, fetchWeatherForecast } from '../data/openMeteo';
import { syncPriceAlerts } from '../notifications/priceAlerts';

// ── Állapot ────────────────────────────────────────────────────────────

export interface PersistedState {
  obsDevices: string[];
  obsTariff: Tariff;
  obsFlex: Flex;
  obsKwh: number;
  obsDone: boolean;
  savedAmt: number;
  adv: AdvisorAnswers;
  pushOptIn: boolean;
  cityKey: string;
  htntKwh: number;
  htntPct: number;
  solarKwp: number;
  privacyAccepted: boolean;
}

export interface AppStateShape extends PersistedState {
  hydrated: boolean;
  payload: PricePayload | null;
  loading: boolean;
  error: string | null;
  grid: GridState;
  planTab: PlanTab;
  selHour: number | null;
  weather: { cityKey: string; hours: WeatherHour[]; fetchedAt: number } | null;
  weatherLoading: boolean;
}

const PERSIST_KEY = 'energia.appState.v1';

const DEFAULT_PERSISTED: PersistedState = {
  obsDevices: ['mosogep', 'bojler', 'klima'],
  obsTariff: 'htnt',
  obsFlex: 'magas',
  obsKwh: 200,
  obsDone: false,
  savedAmt: calcOnboardingSavings(['mosogep', 'bojler', 'klima'], 'htnt', 'magas'),
  adv: DEFAULT_ADVISOR,
  pushOptIn: false,
  cityKey: 'budapest',
  htntKwh: 200,
  htntPct: 40,
  solarKwp: 4,
  privacyAccepted: false,
};

const INITIAL: AppStateShape = {
  ...DEFAULT_PERSISTED,
  hydrated: false,
  payload: null,
  loading: true,
  error: null,
  grid: EMPTY_GRID,
  planTab: 'klima',
  selHour: null,
  weather: null,
  weatherLoading: false,
};

type Action =
  | { type: 'hydrate'; persisted: Partial<PersistedState>; payload: PricePayload | null }
  | { type: 'pricesLoading' }
  | { type: 'pricesLoaded'; payload: PricePayload }
  | { type: 'pricesFailed'; error: string }
  | { type: 'gridLoaded'; grid: GridState }
  | { type: 'setPlanTab'; tab: PlanTab }
  | { type: 'setSelHour'; hour: number | null }
  | { type: 'weatherLoading' }
  | { type: 'weatherLoaded'; cityKey: string; hours: WeatherHour[] }
  | { type: 'weatherFailed' }
  | { type: 'patch'; patch: Partial<PersistedState> };

function reducer(s: AppStateShape, a: Action): AppStateShape {
  switch (a.type) {
    case 'hydrate':
      return { ...s, ...a.persisted, payload: a.payload ?? s.payload, hydrated: true, loading: a.payload ? false : s.loading };
    case 'pricesLoading':
      return { ...s, loading: !s.payload, error: null };
    case 'pricesLoaded':
      return { ...s, payload: a.payload, loading: false, error: null };
    case 'pricesFailed':
      return { ...s, loading: false, error: a.error };
    case 'gridLoaded':
      return { ...s, grid: a.grid };
    case 'setPlanTab':
      return { ...s, planTab: a.tab };
    case 'setSelHour':
      return { ...s, selHour: a.hour };
    case 'weatherLoading':
      return { ...s, weatherLoading: true };
    case 'weatherLoaded':
      return { ...s, weatherLoading: false, weather: { cityKey: a.cityKey, hours: a.hours, fetchedAt: Date.now() } };
    case 'weatherFailed':
      return { ...s, weatherLoading: false };
    case 'patch':
      return { ...s, ...a.patch };
    default:
      return s;
  }
}

const PERSISTED_KEYS = Object.keys(DEFAULT_PERSISTED) as (keyof PersistedState)[];

function pickPersisted(s: AppStateShape): PersistedState {
  const out = {} as PersistedState;
  for (const k of PERSISTED_KEYS) (out as unknown as Record<string, unknown>)[k] = s[k];
  return out;
}

// ── Context ────────────────────────────────────────────────────────────

interface AppApi {
  state: AppStateShape;
  refreshPrices: (force?: boolean) => Promise<void>;
  refreshGrid: () => Promise<void>;
  loadWeather: (cityKey?: string) => Promise<void>;
  setPlanTab: (tab: PlanTab) => void;
  setSelHour: (hour: number | null) => void;
  patch: (patch: Partial<PersistedState>) => void;
}

const AppContext = createContext<AppApi | null>(null);

const PRICE_REFRESH_MS = 60 * 1000;
const GRID_REFRESH_MS = 15 * 60 * 1000;
const WEATHER_TTL_MS = 60 * 60 * 1000;

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL);
  const stateRef = useRef(state);
  stateRef.current = state;
  const lastPriceFetch = useRef(0);
  const lastGridFetch = useRef(0);
  const lastAlertSync = useRef<string | null>(null);

  const refreshPrices = useCallback(async (force = false) => {
    if (!force && Date.now() - lastPriceFetch.current < PRICE_REFRESH_MS / 2) return;
    lastPriceFetch.current = Date.now();
    dispatch({ type: 'pricesLoading' });
    try {
      const payload = await fetchPricePayload();
      dispatch({ type: 'pricesLoaded', payload });
      void savePayloadCache(payload);
      // Az értesítéseket csak óránként (vagy új árcsomagnál) tervezzük újra, hogy a percenkénti
      // frissítés ne törölje ki a néhány másodperc múlva esedékes riasztást.
      const syncKey = `${new Date().getHours()}:${payload.prices.length}:${payload.prices[payload.prices.length - 1]?.timestamp ?? ''}`;
      if (stateRef.current.pushOptIn && lastAlertSync.current !== syncKey) {
        lastAlertSync.current = syncKey;
        void syncPriceAlerts(payload.prices);
      }
    } catch (e) {
      dispatch({ type: 'pricesFailed', error: e instanceof Error ? e.message : 'Ismeretlen hiba' });
    }
  }, []);

  const refreshGrid = useCallback(async () => {
    if (Date.now() - lastGridFetch.current < GRID_REFRESH_MS / 2) return;
    lastGridFetch.current = Date.now();
    const grid = await loadGridState();
    dispatch({ type: 'gridLoaded', grid });
  }, []);

  const loadWeather = useCallback(async (cityKey?: string) => {
    const key = cityKey ?? stateRef.current.cityKey;
    const w = stateRef.current.weather;
    if (w && w.cityKey === key && Date.now() - w.fetchedAt < WEATHER_TTL_MS) return;
    dispatch({ type: 'weatherLoading' });
    try {
      const c = cityByKey(key);
      const hours = await fetchWeatherForecast(c.lat, c.lon, 3);
      dispatch({ type: 'weatherLoaded', cityKey: key, hours });
    } catch {
      dispatch({ type: 'weatherFailed' });
    }
  }, []);

  // Hidratálás: mentett beállítások + utolsó árcsomag, majd friss lekérés
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let persisted: Partial<PersistedState> = {};
      try {
        const raw = await AsyncStorage.getItem(PERSIST_KEY);
        if (raw) persisted = JSON.parse(raw) as Partial<PersistedState>;
      } catch {
        persisted = {};
      }
      const payload = await loadCachedPayload();
      if (cancelled) return;
      dispatch({ type: 'hydrate', persisted, payload });
      void refreshPrices(true);
      void refreshGrid();
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshPrices, refreshGrid]);

  // Beállítások mentése
  useEffect(() => {
    if (!state.hydrated) return;
    const persisted = pickPersisted(state);
    AsyncStorage.setItem(PERSIST_KEY, JSON.stringify(persisted)).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, PERSISTED_KEYS.map((k) => state[k]).concat(state.hydrated));

  // Percenkénti frissítés előtérben + visszatéréskor
  useEffect(() => {
    const timer = setInterval(() => {
      if (RNAppState.currentState === 'active') {
        void refreshPrices();
        void refreshGrid();
      }
    }, PRICE_REFRESH_MS);
    const sub = RNAppState.addEventListener('change', (st) => {
      if (st === 'active') {
        void refreshPrices();
        void refreshGrid();
      }
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refreshPrices, refreshGrid]);

  const api = useMemo<AppApi>(() => ({
    state,
    refreshPrices,
    refreshGrid,
    loadWeather,
    setPlanTab: (tab) => dispatch({ type: 'setPlanTab', tab }),
    setSelHour: (hour) => dispatch({ type: 'setSelHour', hour }),
    patch: (patch) => dispatch({ type: 'patch', patch }),
  }), [state, refreshPrices, refreshGrid, loadWeather]);

  return <AppContext.Provider value={api}>{children}</AppContext.Provider>;
}

export function useApp(): AppApi {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp csak AppStoreProvider-en belül használható');
  return ctx;
}
