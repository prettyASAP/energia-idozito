import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';

/** Külső hivatkozás appon belüli böngészőben (App Store irányelv: ne dobjon ki az appból). */
export async function openLink(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url, { presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET });
  } catch {
    Linking.openURL(url).catch(() => undefined);
  }
}

export const LINKS = {
  energyCharts: 'https://energy-charts.info',
  ecb: 'https://www.ecb.europa.eu',
  mekh: 'https://mekh.hu',
  mavir: 'https://www.mavir.hu',
  mvmDynamic: 'https://www.mvmnext.hu/aram/dinamikus',
  privacy: 'https://github.com/prettyASAP/energia-idozito/blob/main/mobile/store/privacy-policy.md',
} as const;
