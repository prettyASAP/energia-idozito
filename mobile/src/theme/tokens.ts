// Design tokenek — a design handoff (design_handoff_energia_app/README.md) alapján.
// Az oklch színek sRGB hex-re konvertálva, hogy natívan is pixelpontosak legyenek.

export type Scheme = 'light' | 'dark';

export interface Tokens {
  scheme: Scheme;
  bg: string;
  surface: string;
  text: string;
  textMuted: string;
  textSoft: string;
  divider: string;
  accent: string;
  neutral100: string;
  neutral200: string;
  neutral300: string;
  neutral600: string;
  neutral800: string;
  neutral900: string;
  accent100: string;
  accent200: string;
  accent300: string;
  accent500: string;
  accent600: string;
  accent700: string;
  accent800: string;
  accent900: string;
  good100: string;
  good300: string;
  good500: string;
  good600: string;
  good700: string;
  bad100: string;
  bad300: string;
  bad500: string;
  bad700: string;
  /** Sötét mezős dobozok (hero, KPI) szövege — témafüggetlen */
  heroText: string;
  heroSoft: string;
  heroBorder: string;
  sheetOverlay: string;
}

export const light: Tokens = {
  scheme: 'light',
  bg: '#f2f2f3',
  surface: '#e9e9ea',
  text: '#1d1f20',
  textMuted: 'rgba(29,31,32,0.55)',
  textSoft: 'rgba(29,31,32,0.70)',
  divider: 'rgba(29,31,32,0.16)',
  accent: '#749dc4',
  neutral100: '#f5f5f8',
  neutral200: '#e7e7ea',
  neutral300: '#d4d4d7',
  neutral600: '#7a7a7d',
  neutral800: '#424244',
  neutral900: '#2b2b2d',
  accent100: '#eef6ff',
  accent200: '#d6ebff',
  accent300: '#b5d9fd',
  accent500: '#749dc4',
  accent600: '#597ea3',
  accent700: '#416180',
  accent800: '#2c455d',
  accent900: '#1d2d3d',
  good100: '#d5f9e0',
  good300: '#98e2b1',
  good500: '#349d62',
  good600: '#4ebe7d',
  good700: '#006e3b',
  bad100: '#ffe5e1',
  bad300: '#fdb1aa',
  bad500: '#cb4644',
  bad700: '#9a2929',
  heroText: '#f5f5f8',
  heroSoft: '#d6ebff',
  heroBorder: '#2c455d',
  sheetOverlay: 'rgba(43,43,45,0.5)',
};

export const dark: Tokens = {
  ...light,
  scheme: 'dark',
  bg: '#141619',
  surface: '#1e2126',
  text: '#e8e9eb',
  textMuted: 'rgba(232,233,235,0.55)',
  textSoft: 'rgba(232,233,235,0.70)',
  divider: 'rgba(232,233,235,0.14)',
  accent100: '#1d2d3d',
  accent200: '#2c455d',
  accent500: '#749dc4',
  accent700: '#94bce3',
  accent800: '#b5d9fd',
  neutral100: '#26282b',
  neutral200: '#35383c',
  neutral600: '#98989b',
  neutral800: '#d4d4d7',
  good100: '#173523',
  good700: '#81d39f',
  bad100: '#402624',
  bad700: '#f19e97',
  sheetOverlay: 'rgba(0,0,0,0.6)',
};

export const fonts = {
  heading: 'BarlowCondensed_600SemiBold',
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodyBold: 'Barlow_700Bold',
} as const;

export const radius = {
  card: 16,
  btn: 12,
  pill: 999,
  input: 10,
  cell: 9,
  sheet: 22,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#2b2b2d',
    shadowOpacity: 0.14,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  md: {
    shadowColor: '#2b2b2d',
    shadowOpacity: 0.16,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
} as const;
