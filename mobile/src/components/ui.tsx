import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type PressableProps, type StyleProp, type TextProps, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../theme/ThemeContext';
import { fonts, radius, shadow } from '../theme/tokens';

// ── Szöveg ─────────────────────────────────────────────────────────────

type TxtProps = TextProps & { size?: number; color?: string; style?: StyleProp<TextStyle> };

export function Body({ size = 15, color, style, ...rest }: TxtProps) {
  const t = useTheme();
  return <Text {...rest} style={[{ fontFamily: fonts.body, fontSize: size, lineHeight: size * 1.5, color: color ?? t.text }, style]} />;
}

export function Medium({ size = 15, color, style, ...rest }: TxtProps) {
  const t = useTheme();
  return <Text {...rest} style={[{ fontFamily: fonts.bodyMedium, fontSize: size, lineHeight: size * 1.45, color: color ?? t.text }, style]} />;
}

export function Muted({ size = 12.5, color, style, ...rest }: TxtProps) {
  const t = useTheme();
  return <Text {...rest} style={[{ fontFamily: fonts.body, fontSize: size, lineHeight: size * 1.5, color: color ?? t.textMuted }, style]} />;
}

/** Barlow Condensed 600 — címek, számok, címkék */
export function Heading({ size = 22, color, style, ...rest }: TxtProps) {
  const t = useTheme();
  return <Text {...rest} style={[{ fontFamily: fonts.heading, fontSize: size, lineHeight: size * 1.12, letterSpacing: -0.015 * size, color: color ?? t.text }, style]} />;
}

/** 11px UPPERCASE accent-700 szekció-kicker */
export function Kicker({ size = 11, color, style, ...rest }: TxtProps) {
  const t = useTheme();
  return <Text {...rest} style={[{ fontFamily: fonts.heading, fontSize: size, lineHeight: size * 1.4, letterSpacing: 0.14 * size, textTransform: 'uppercase', color: color ?? t.accent700 }, style]} />;
}

// ── Szekció ────────────────────────────────────────────────────────────

export function Section({ kicker, title, sub, children, style }: { kicker?: string; title?: string; sub?: string; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ gap: 0 }, style]}>
      {kicker ? <Kicker style={{ marginBottom: 2 }}>{kicker}</Kicker> : null}
      {title ? <Heading style={{ marginBottom: sub ? 4 : 12 }}>{title}</Heading> : null}
      {sub ? <Muted style={{ marginBottom: 12 }}>{sub}</Muted> : null}
      {children}
    </View>
  );
}

// ── Kártya ─────────────────────────────────────────────────────────────

export function Card({ children, style, surface = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; surface?: boolean }) {
  const t = useTheme();
  return (
    <View style={[{ backgroundColor: surface ? t.surface : 'transparent', borderColor: t.divider, borderWidth: 1, borderRadius: radius.card, padding: 12 }, shadow.sm, style]}>
      {children}
    </View>
  );
}

// ── Címke (pill) ───────────────────────────────────────────────────────

export function Tag({ children, bg, fg, outline, size = 11, style }: { children: React.ReactNode; bg?: string; fg?: string; outline?: boolean; size?: number; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View style={[{
      alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, borderRadius: radius.pill,
      backgroundColor: outline ? 'transparent' : bg ?? t.accent200,
      borderWidth: outline ? 1 : 0, borderColor: t.accent500,
    }, style]}>
      <Text style={{ fontFamily: fonts.body, fontSize: size, letterSpacing: 0.02 * size, color: outline ? t.accent700 : fg ?? t.accent800 }}>{children}</Text>
    </View>
  );
}

// ── Gomb ───────────────────────────────────────────────────────────────

type BtnProps = Omit<PressableProps, 'style'> & {
  title: string;
  variant?: 'primary' | 'default' | 'ghost';
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
};

export function Button({ title, variant = 'default', block, style, textColor, ...rest }: BtnProps) {
  const t = useTheme();
  const bg = variant === 'primary' ? t.accent500 : 'transparent';
  const border = variant === 'primary' ? t.accent500 : variant === 'ghost' ? 'transparent' : t.divider;
  const fg = textColor ?? (variant === 'primary' ? '#fff' : variant === 'ghost' ? t.accent700 : t.text);
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      style={({ pressed }) => [{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: bg, borderColor: border, borderWidth: 1, borderRadius: radius.btn,
        paddingVertical: block ? 12 : 7, paddingHorizontal: 14, minHeight: block ? 48 : 36,
        width: block ? '100%' : undefined, transform: [{ scale: pressed ? 0.96 : 1 }], opacity: rest.disabled ? 0.5 : 1,
      }, style]}
    >
      <Text style={{ fontFamily: fonts.heading, fontSize: 14, color: fg }}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ children, onPress, accessibilityLabel, style }: { children: React.ReactNode; onPress?: () => void; accessibilityLabel: string; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} hitSlop={8}
      style={({ pressed }) => [{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 8, transform: [{ scale: pressed ? 0.96 : 1 }] }, style]}>
      {children}
    </Pressable>
  );
}

// ── Chip (választó) ────────────────────────────────────────────────────

export function Chip({ label, sub, selected, onPress, icon, style }: { label: string; sub?: string; selected: boolean; onPress: () => void; icon?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress}
      style={({ pressed }) => [{
        minHeight: sub ? 52 : 44, flexDirection: sub ? 'column' : 'row', alignItems: sub ? 'flex-start' : 'center', justifyContent: 'center', gap: sub ? 1 : 8,
        paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.btn, borderWidth: 1,
        borderColor: selected ? t.accent500 : t.divider, backgroundColor: selected ? t.accent500 : 'transparent',
        transform: [{ scale: pressed ? 0.96 : 1 }],
      }, style]}>
      {icon}
      <Text style={{ fontFamily: sub ? fonts.bodyMedium : fonts.body, fontSize: 13, color: selected ? '#fff' : t.text }}>{label}</Text>
      {sub ? <Text style={{ fontFamily: fonts.body, fontSize: 10.5, color: selected ? 'rgba(255,255,255,0.8)' : t.textSoft }}>{sub}</Text> : null}
    </Pressable>
  );
}

export function ChipGrid({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}

/** 2 oszlopos chip-rács (onboarding eszközválasztó) */
export function ChipGrid2({ children }: { children: React.ReactNode[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {React.Children.map(children, (c, i) => (
        <View key={i} style={{ width: '48%', flexGrow: 1 }}>{c}</View>
      ))}
    </View>
  );
}

// ── Szegmens kapcsoló ──────────────────────────────────────────────────

export function Segment<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: t.divider, borderRadius: radius.input, overflow: 'hidden' }}>
      {options.map((o, i) => {
        const active = o.id === value;
        return (
          <Pressable key={o.id} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => onChange(o.id)}
            style={{ flex: 1, alignItems: 'center', paddingVertical: 8, backgroundColor: active ? t.accent500 : 'transparent', borderLeftWidth: i ? 1 : 0, borderLeftColor: t.divider }}>
            <Text style={{ fontFamily: fonts.heading, fontSize: 13, color: active ? '#fff' : t.text }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ── Számbeviteli mező ──────────────────────────────────────────────────

export function NumberField({ label, value, onChange, min = 0, max = 1e9, step, unit, style }: { label?: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; unit?: string; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const [text, setText] = React.useState(String(value));
  React.useEffect(() => {
    if (parseFloat(text) !== value) setText(String(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return (
    <View style={style}>
      {label ? <Text style={{ fontFamily: fonts.body, fontSize: 12, color: t.textSoft, marginBottom: 5 }}>{label}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <TextInput
          value={text}
          onChangeText={(s) => {
            setText(s);
            const n = parseFloat(s.replace(',', '.'));
            if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n)));
          }}
          keyboardType="numeric"
          inputMode="decimal"
          accessibilityLabel={label}
          style={{
            flex: 1, minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, fontFamily: fonts.body, fontSize: 14, color: t.text,
            backgroundColor: t.surface, borderColor: t.divider, borderWidth: 1, borderRadius: radius.input,
          }}
        />
        {unit ? <Muted size={13}>{unit}</Muted> : null}
      </View>
      {step ? null : null}
    </View>
  );
}

// ── Eszköz ikon (a design SVG path-jai) ────────────────────────────────

export function DeviceIcon({ path, size = 19, color = '#fff' }: { path: string; size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d={path} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export const BOLT_PATH = 'M13 2L3 14h7l-1 8 10-12h-7l1-8';

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: t.divider }, style]} />;
}

export function Row({ children, style, gap = 8 }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}
