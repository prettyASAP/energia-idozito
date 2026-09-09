import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { PricePoint } from '../domain/types';
import { cheapBands, heroModel } from '../domain/prices';
import { fmt1 } from '../domain/format';
import { zonedParts } from '../domain/time';

// Helyi (készüléken ütemezett) értesítések az olcsó áramsávok kezdetére.
// Nem kell hozzá push-szerver: az app a letöltött árakból előre beütemezi a riasztásokat,
// és minden frissítéskor újratervezi őket.

export const CHANNEL_ID = 'price-alert';
const MAX_SCHEDULED = 8;
const TITLE = 'Energia Időzítő';

let configured = false;
let lastImmediateKey: string | null = null;

export function configureNotifications(): void {
  if (configured) return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Olcsó áram értesítés',
      description: 'Jelzés, amikor olcsó sáv kezdődik a tőzsdei áramárban.',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250],
      lightColor: '#749dc4',
    }).catch(() => undefined);
  }
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermissionState(): Promise<PermissionState> {
  try {
    const s = await Notifications.getPermissionsAsync();
    if (s.granted || s.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
    return s.canAskAgain ? 'undetermined' : 'denied';
  } catch {
    return 'undetermined';
  }
}

export async function requestPermission(): Promise<boolean> {
  try {
    const s = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    });
    return s.granted || s.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
  } catch {
    return false;
  }
}

export async function cancelPriceAlerts(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // nincs teendő
  }
}

/** Beütemezi a következő 48 óra olcsó sávjainak kezdetét (max. 8), és szól, ha most olcsó. */
export async function syncPriceAlerts(prices: PricePoint[], now: Date = new Date()): Promise<number> {
  await cancelPriceAlerts();
  const bands = cheapBands(prices, now).slice(0, MAX_SCHEDULED);
  let scheduled = 0;
  for (const b of bands) {
    if (b.start.getTime() <= now.getTime()) continue;
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: TITLE,
          body: `Most olcsó az áram (${fmt1(b.price)} Ft/kWh) — indítsd a mosógépet, bojlert, autótöltést!`,
          data: { kind: 'cheap-band', idx: b.idx },
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: b.start, ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}) },
      });
      scheduled++;
    } catch {
      // egy sikertelen ütemezés ne állítsa le a többit
    }
  }
  await notifyNowIfCheap(prices, now);
  return scheduled;
}

/** Ha az aktuális óra olcsó, azonnali értesítés — óránként legfeljebb egyszer. */
export async function notifyNowIfCheap(prices: PricePoint[], now: Date = new Date()): Promise<boolean> {
  const hero = heroModel(prices, now);
  if (hero.lvl !== 'olcso') return false;
  const p = zonedParts(now);
  const key = `${p.year}-${p.month}-${p.day}-${p.hour}`;
  if (lastImmediateKey === key) return false;
  lastImmediateKey = key;
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: TITLE,
        body: `Most olcsó — ${fmt1(hero.cur)} Ft/kWh. Indítsd a mosógépet!`,
        data: { kind: 'cheap-now' },
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}
