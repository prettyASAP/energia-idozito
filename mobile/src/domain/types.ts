export type Level = 'olcso' | 'atlagos' | 'draga';
export type Tariff = 'rezsi' | 'htnt' | 'piaci';
export type Flex = 'magas' | 'kozepes' | 'alacsony';

/** Egy óra ára — a korábbi /api/forecast válasz egy eleme. */
export interface PricePoint {
  /** ISO-8601 UTC időbélyeg, az óra kezdete */
  timestamp: string;
  price_eur_mwh: number;
  price_huf_mwh: number;
  price_huf_kwh: number;
  is_cheap: boolean;
  is_expensive: boolean;
  is_forecast: boolean;
  ci_lower_huf_kwh: number;
  ci_upper_huf_kwh: number;
}

/** Nyers óránkénti pont: t = az óra kezdete (ms, UTC), p = EUR/MWh */
export interface HourPoint {
  t: number;
  p: number;
}

export interface ModelAccuracy {
  mape_pct: number;
  validation_days: number;
  method: 'cv' | 'walkforward' | 'fallback';
}

export interface PricePayload {
  prices: PricePoint[];
  eur_huf_rate: number;
  model_accuracy: ModelAccuracy;
  fetchedAt: number;
}

export interface WeatherHour {
  timestamp: string;
  local_time: string;
  hour: number;
  temp_c: number | null;
  apparent_temp_c: number | null;
  humidity_pct: number | null;
  irradiance_wm2: number | null;
}

export interface PriceHour {
  timestamp: string;
  price_huf_kwh: number;
  is_cheap: boolean;
  is_expensive: boolean;
}

export interface Device {
  id: string;
  name: string;
  /** Egy futás fogyasztása kWh */
  kwh: number;
  /** Futásidő órában */
  dur: number;
  /** Éves megtakarítás Ft vezérelt/dinamikus tarifán */
  annual: number;
  /** SVG path (24x24 viewBox, 1.5 stroke) */
  icon: string;
  /** Csak az onboardingban/tanácsadóban választható (nincs időzítés-kártyája) */
  extra?: boolean;
}

export interface AdvisorAnswers {
  homeType: 'haz' | 'lakas_tegla' | 'lakas_panel';
  homeSize: 'small' | 'medium' | 'large' | 'xlarge';
  heating: 'gaz' | 'hoszivattyu' | 'elektromos' | 'tavfutes';
  devices: string[];
  bill: number;
  tariff: Tariff;
  budget: number;
  priority: 'megtakaritas' | 'gyors' | 'kornyezet' | 'kenyelem';
}
