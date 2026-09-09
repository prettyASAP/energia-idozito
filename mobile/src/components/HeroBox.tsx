import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow } from '../theme/tokens';
import type { HeroModel } from '../domain/prices';
import { fmt1 } from '../domain/format';
import { useCountUp } from '../hooks/useCountUp';
import { Text } from 'react-native';

function LiveDot() {
  const t = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, { toValue: 2.4, duration: 1100, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 1100, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 1100, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 1100, useNativeDriver: true }),
      ]),
    ]));
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);
  return (
    <View style={{ width: 7, height: 7, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ position: 'absolute', width: 7, height: 7, borderRadius: 4, backgroundColor: t.accent300, transform: [{ scale }], opacity }} />
      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: t.accent300 }} />
    </View>
  );
}

export interface HeroBoxProps {
  hero: HeroModel | null;
  error: string | null;
  loading: boolean;
  fetchedAt: number | null;
  now: Date;
  pushActive: boolean;
  onTogglePush: () => void;
}

export function HeroBox({ hero, error, loading, fetchedAt, now, pushActive, onTogglePush }: HeroBoxProps) {
  const t = useTheme();
  const animated = useCountUp(hero?.cur ?? 0, 900, !!hero);

  const lvl = hero?.lvl;
  const pillBg = lvl === 'olcso' ? t.good500 : lvl === 'draga' ? t.bad500 : lvl ? '#d6ebff' : 'transparent';
  const pillFg = lvl === 'atlagos' ? '#2c455d' : '#fff';
  const priceColor = lvl === 'olcso' ? t.good300 : lvl === 'draga' ? t.bad300 : '#d6ebff';
  const mins = fetchedAt ? Math.floor((now.getTime() - fetchedAt) / 60000) : null;
  const freshness = mins == null ? 'frissítés…' : mins <= 0 ? 'frissítve most' : `frissítve ${mins} perce`;
  const statusLabel = hero ? hero.statusLabel : error ? 'Nincs adat' : 'Betöltés…';

  return (
    <View style={[{ backgroundColor: t.accent900, borderColor: t.heroBorder, borderWidth: 1, borderRadius: radius.card, padding: 16, gap: 12, overflow: 'hidden' }, shadow.md]}>
      {/* finom rácsminta */}
      <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
        {Array.from({ length: 14 }).map((_, i) => (
          <View key={`h${i}`} style={{ position: 'absolute', left: 0, right: 0, top: i * 22, height: 1, backgroundColor: 'rgba(181,217,253,0.06)' }} />
        ))}
        {Array.from({ length: 30 }).map((_, i) => (
          <View key={`v${i}`} style={{ position: 'absolute', top: 0, bottom: 0, left: i * 22, width: 1, backgroundColor: 'rgba(181,217,253,0.06)' }} />
        ))}
        <View style={{ position: 'absolute', right: -60, top: -90, width: 260, height: 200, borderRadius: 130, backgroundColor: 'rgba(116,157,196,0.22)' }} />
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.pill, backgroundColor: pillBg, borderWidth: lvl ? 0 : 1, borderColor: 'rgba(214,235,255,0.35)' }}>
          <Text style={{ fontFamily: fonts.heading, fontSize: 10, letterSpacing: 0.6, color: lvl ? pillFg : '#d6ebff' }}>{statusLabel}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.7 }}>
            <LiveDot />
            <Text style={{ fontFamily: fonts.heading, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: t.heroText }}>Élő ár</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Értesítés olcsó áram esetén"
            accessibilityState={{ checked: pushActive }}
            onPress={onTogglePush}
            hitSlop={8}
            style={({ pressed }) => ({
              width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
              borderWidth: 1, borderColor: pushActive ? t.good500 : 'rgba(214,235,255,0.35)',
              backgroundColor: pushActive ? t.good500 : 'rgba(214,235,255,0.08)', opacity: pressed ? 0.7 : pushActive ? 1 : 0.7,
            })}
          >
            <Bell size={13} color={pushActive ? '#fff' : '#d6ebff'} strokeWidth={1.8} />
          </Pressable>
        </View>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9 }}>
        <Text style={{ fontFamily: fonts.heading, fontSize: 62, lineHeight: 58, color: priceColor }}>{hero ? fmt1(animated) : '—'}</Text>
        <Text style={{ fontFamily: fonts.heading, fontSize: 13, letterSpacing: 1, color: t.heroText, opacity: 0.7 }}>FT / KWH</Text>
        {hero ? (
          <Text style={{ marginLeft: 'auto', fontFamily: fonts.heading, fontSize: 15, color: hero.deltaPct >= 0 ? t.good300 : t.bad300 }}>
            {hero.deltaPct >= 0 ? '▲ +' : '▼ −'}{Math.abs(hero.deltaPct).toFixed(1).replace('.', ',')}%
          </Text>
        ) : null}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: -6 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 11, color: '#d6ebff', opacity: 0.6 }}>Mai átlag</Text>
        <Text style={{ fontFamily: fonts.bodyMedium, fontSize: 11, color: '#d6ebff' }}>{hero ? `${fmt1(hero.avg24)} Ft/kWh` : '—'}</Text>
        <Text style={{ color: '#d6ebff', opacity: 0.3, fontSize: 10 }}>·</Text>
        <Text style={{ fontFamily: fonts.body, fontSize: 10, color: '#d6ebff', opacity: 0.45 }}>{freshness}</Text>
      </View>

      <View style={{ borderTopWidth: 1, borderTopColor: 'rgba(181,217,253,0.22)', paddingTop: 10 }}>
        <Text style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 19.5, color: t.heroText, opacity: 0.85 }}>
          {hero ? hero.sub : error ? 'Nem sikerült áradatot betölteni. Húzd le a frissítéshez, vagy próbáld újra pár perc múlva.' : loading ? 'Árak betöltése…' : 'Nincs elérhető áradat.'}
        </Text>
        {hero ? <Text style={{ fontFamily: fonts.body, fontSize: 11.5, lineHeight: 16.5, color: '#d6ebff', opacity: 0.55, marginTop: 4 }}>{hero.why}</Text> : null}
      </View>
    </View>
  );
}
