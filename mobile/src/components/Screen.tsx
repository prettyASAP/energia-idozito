import React from 'react';
import { RefreshControl, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeContext';
import { fonts } from '../theme/tokens';
import { Heading, Tag, BOLT_PATH, DeviceIcon } from './ui';
import { Text } from 'react-native';

export const TAB_BAR_HEIGHT = 58;
export const CONTENT_MAX_WIDTH = 600;

export function AppHeader({ right }: { right?: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{
      paddingTop: Math.max(12, insets.top), paddingHorizontal: 16, paddingBottom: 10,
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      borderBottomWidth: 1, borderBottomColor: t.divider, backgroundColor: t.bg,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <DeviceIcon path={BOLT_PATH} size={20} color={t.accent500} />
        <Heading size={19}>Energia Időzítő</Heading>
      </View>
      {right ?? <Tag outline size={10}>Élő tőzsdei árak</Tag>}
    </View>
  );
}

export function Screen({ children, refreshing, onRefresh, style, header = true }: { children: React.ReactNode; refreshing?: boolean; onRefresh?: () => void; style?: StyleProp<ViewStyle>; header?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      {header ? <AppHeader /> : null}
      <ScrollView
        contentContainerStyle={[{ paddingHorizontal: 14, paddingTop: 16, paddingBottom: TAB_BAR_HEIGHT + insets.bottom + 40, gap: 24, maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' }, style]}
        keyboardShouldPersistTaps="handled"
        refreshControl={onRefresh ? <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={t.accent500} /> : undefined}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** Modal (bottom sheet) képernyő fejléce: lépésszámláló + bezárás */
export function SheetTop({ label, onClose, progress }: { label: string; onClose: () => void; progress?: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <Text style={{ fontFamily: fonts.heading, fontSize: 11, letterSpacing: 1.1, textTransform: 'uppercase', color: t.textMuted }}>{label}</Text>
      {progress != null ? (
        <View style={{ flex: 1, height: 3, backgroundColor: t.neutral200 }}>
          <View style={{ width: `${Math.round(progress * 100)}%`, height: '100%', backgroundColor: t.accent500 }} />
        </View>
      ) : <View style={{ flex: 1 }} />}
      <Text onPress={onClose} accessibilityRole="button" accessibilityLabel="Bezárás" style={{ fontFamily: fonts.heading, fontSize: 18, color: t.accent700, paddingHorizontal: 8, paddingVertical: 4 }}>✕</Text>
    </View>
  );
}
