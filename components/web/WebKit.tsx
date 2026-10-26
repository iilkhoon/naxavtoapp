// Shared building blocks for the web site and the web admin panel.
//
// Visual language (matches the redesigned mobile app): Apple-like large titles,
// hairline cards with a soft shadow, iOS segmented controls and a single accent
// colour (#FF3B30). No gradients, glows or neon.
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,
  useWindowDimensions, StyleProp, ViewStyle, TextStyle, TextInputProps, LayoutChangeEvent,
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export const ACCENT = '#FF3B30';
export const HEADER_HEIGHT = { desktop: 64, mobile: 56 };
export const CONTENT_MAX_WIDTH = 1200;

export const FONT = {
  regular: 'RethinkSans_400Regular',
  medium: 'RethinkSans_500Medium',
  semibold: 'RethinkSans_600SemiBold',
  bold: 'RethinkSans_700Bold',
  heavy: 'RethinkSans_800ExtraBold',
};

export type WebTokens = ReturnType<typeof useWebTokens>;

export function useWebTokens() {
  const { colors, isDark } = useTheme();
  return {
    isDark,
    bg: isDark ? '#000000' : '#F5F5F7',
    surface: isDark ? '#1C1C1E' : '#FFFFFF',
    surfaceRaised: isDark ? '#2C2C2E' : '#FFFFFF',
    hairline: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
    hairlineStrong: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)',
    text: isDark ? '#F5F5F7' : '#1D1D1F',
    textSecondary: isDark ? '#98989D' : '#6E6E73',
    textTertiary: isDark ? '#6C6C70' : '#A1A1A6',
    fill: isDark ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.12)',
    fillStrong: isDark ? 'rgba(118,118,128,0.36)' : 'rgba(118,118,128,0.2)',
    accent: ACCENT,
    accentSoft: isDark ? 'rgba(255,59,48,0.16)' : 'rgba(255,59,48,0.08)',
    success: colors.success,
    warning: colors.warning,
    blue: '#007AFF',
    shadow: isDark
      ? '0px 1px 2px rgba(0,0,0,0.5), 0px 8px 24px rgba(0,0,0,0.35)'
      : '0px 1px 2px rgba(0,0,0,0.04), 0px 8px 24px rgba(0,0,0,0.06)',
    shadowHover: isDark
      ? '0px 2px 4px rgba(0,0,0,0.5), 0px 16px 40px rgba(0,0,0,0.45)'
      : '0px 2px 4px rgba(0,0,0,0.05), 0px 16px 40px rgba(0,0,0,0.10)',
    placeholder: isDark ? '#636366' : '#A1A1A6',
  };
}

export function useBreakpoints() {
  const { width } = useWindowDimensions();
  return { width, isMobile: width < 768, isTablet: width < 1024 };
}

const web = (style: Record<string, any>) => style as any;

/* ─── Layout ──────────────────────────────────────────────── */

export function Container({ children, style, maxWidth = CONTENT_MAX_WIDTH }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; maxWidth?: number;
}) {
  const { isMobile } = useBreakpoints();
  return (
    <View style={[{ width: '100%', maxWidth, alignSelf: 'center', paddingHorizontal: isMobile ? 16 : 32 }, style]}>
      {children}
    </View>
  );
}

/** Scrollable page that clears the fixed WebHeader and ends with `footer`. */
export function WebScreen({ children, footer, contentStyle, maxWidth }: {
  children: React.ReactNode; footer?: React.ReactNode; contentStyle?: StyleProp<ViewStyle>; maxWidth?: number;
}) {
  const t = useWebTokens();
  const { isMobile } = useBreakpoints();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ flexGrow: 1, paddingTop: isMobile ? HEADER_HEIGHT.mobile : HEADER_HEIGHT.desktop }}
      showsVerticalScrollIndicator={false}
    >
      <Container maxWidth={maxWidth} style={[{ paddingTop: isMobile ? 24 : 48, paddingBottom: isMobile ? 40 : 72, flexGrow: 1 }, contentStyle]}>
        {children}
      </Container>
      {footer}
    </ScrollView>
  );
}

/* ─── Typography ──────────────────────────────────────────── */

export function LargeTitle({ eyebrow, title, subtitle, right, style }: {
  eyebrow?: string; title: string; subtitle?: string; right?: React.ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const t = useWebTokens();
  const { isMobile } = useBreakpoints();
  return (
    <View style={[styles.titleRow, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }, style]}>
      <View style={{ flexShrink: 1, gap: 6 }}>
        {!!eyebrow && <Text style={[styles.eyebrow, { color: t.accent }]}>{eyebrow}</Text>}
        <Text
          role="heading"
          aria-level={1}
          style={[styles.largeTitle, { color: t.text }, isMobile && { fontSize: 32, lineHeight: 38 }]}
        >
          {title}
        </Text>
        {!!subtitle && (
          <Text style={[styles.subtitle, { color: t.textSecondary }, isMobile && { fontSize: 15, lineHeight: 22 }]}>
            {subtitle}
          </Text>
        )}
      </View>
      {right}
    </View>
  );
}

export function SectionHeader({ title, subtitle, actionLabel, onAction, right, style }: {
  title: string; subtitle?: string; actionLabel?: string; onAction?: () => void; right?: React.ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const t = useWebTokens();
  const { isMobile } = useBreakpoints();
  return (
    <View style={[styles.sectionHeader, style]}>
      <View style={{ flexShrink: 1, gap: 2 }}>
        <Text role="heading" aria-level={2} style={[styles.sectionTitle, { color: t.text }, isMobile && { fontSize: 22 }]}>
          {title}
        </Text>
        {!!subtitle && <Text style={[styles.sectionSubtitle, { color: t.textSecondary }]}>{subtitle}</Text>}
      </View>
      {right}
      {!!actionLabel && (
        <TouchableOpacity onPress={onAction} style={web({ cursor: 'pointer' })}>
          <Text style={[styles.link, { color: t.accent }]}>{actionLabel} ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Small uppercase caption above a grouped list (iOS style) */
export function GroupCaption({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const t = useWebTokens();
  return <Text style={[styles.groupCaption, { color: t.textSecondary }, style]}>{children}</Text>;
}

/* ─── Surfaces ────────────────────────────────────────────── */

export function Card({ children, style, padding = 20, hoverable, onPress }: {
  children: React.ReactNode; style?: StyleProp<ViewStyle>; padding?: number; hoverable?: boolean; onPress?: () => void;
}) {
  const t = useWebTokens();
  const [hovered, setHovered] = useState(false);
  const base = [
    styles.card,
    { backgroundColor: t.surface, borderColor: t.hairline, padding, boxShadow: hovered ? t.shadowHover : t.shadow },
    hoverable && hovered && web({ transform: 'translateY(-2px)' }),
    style,
  ];
  const hoverProps = hoverable ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) } : {};
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[base, web({ cursor: 'pointer' })]} {...(hoverProps as any)}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={base} {...(hoverProps as any)}>{children}</View>;
}

/** Lifts its child slightly on hover; used around the shared CarCard/PlateCard */
export function HoverLift({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const [hovered, setHovered] = useState(false);
  return (
    <View
      style={[web({ transition: 'transform 180ms ease', transform: hovered ? 'translateY(-3px)' : 'none' }), style]}
      {...({ onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) } as any)}
    >
      {children}
    </View>
  );
}

/* ─── Controls ────────────────────────────────────────────── */

export function Segmented<T extends string>({ options, value, onChange, style, fullWidth }: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
  fullWidth?: boolean;
}) {
  const t = useWebTokens();
  return (
    <View
      role="tablist"
      style={[styles.segTrack, { backgroundColor: t.fill }, fullWidth ? { alignSelf: 'stretch' } : { alignSelf: 'flex-start' }, style]}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            role="tab"
            aria-selected={active}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
            style={[
              styles.segItem,
              fullWidth && { flex: 1 },
              active && { backgroundColor: t.isDark ? '#636366' : '#FFFFFF', boxShadow: '0px 3px 8px rgba(0,0,0,0.12), 0px 3px 1px rgba(0,0,0,0.04)' },
              web({ cursor: 'pointer', transition: 'background-color 150ms ease' }),
            ]}
          >
            <Text style={[styles.segText, { color: t.text, fontFamily: active ? FONT.semibold : FONT.medium }]} numberOfLines={1}>
              {opt.label}
              {opt.count != null && <Text style={{ color: t.textSecondary }}> {opt.count}</Text>}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'plain' | 'destructive' | 'dark';

export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, size = 'md', style, fullWidth }: {
  title: string; onPress?: () => void; variant?: ButtonVariant; icon?: React.ReactNode; loading?: boolean;
  disabled?: boolean; size?: 'sm' | 'md' | 'lg'; style?: StyleProp<ViewStyle>; fullWidth?: boolean;
}) {
  const t = useWebTokens();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border: string }> = {
    primary: { bg: t.accent, fg: '#FFFFFF', border: 'transparent' },
    dark: { bg: t.isDark ? '#F5F5F7' : '#1D1D1F', fg: t.isDark ? '#000000' : '#FFFFFF', border: 'transparent' },
    secondary: { bg: t.surface, fg: t.text, border: t.hairlineStrong },
    plain: { bg: 'transparent', fg: t.accent, border: 'transparent' },
    destructive: { bg: t.accentSoft, fg: t.accent, border: 'transparent' },
  };
  const p = palette[variant];
  const height = size === 'sm' ? 32 : size === 'lg' ? 50 : 42;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      role="button"
      style={[
        styles.button,
        { height, backgroundColor: p.bg, borderColor: p.border, paddingHorizontal: size === 'sm' ? 12 : 18, opacity: disabled ? 0.45 : 1 },
        fullWidth && { alignSelf: 'stretch' },
        web({ cursor: disabled ? 'not-allowed' : 'pointer', transition: 'opacity 150ms ease, transform 150ms ease' }),
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={p.fg} />
      ) : (
        <>
          {icon}
          <Text style={[styles.buttonText, { color: p.fg, fontSize: size === 'sm' ? 13 : size === 'lg' ? 16 : 15 }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function IconButton({ children, onPress, label, style }: {
  children: React.ReactNode; onPress?: () => void; label: string; style?: StyleProp<ViewStyle>;
}) {
  const t = useWebTokens();
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityLabel={label}
      style={[styles.iconButton, { backgroundColor: t.fill }, web({ cursor: 'pointer' }), style]}
    >
      {children}
    </TouchableOpacity>
  );
}

export function Pill({ label, active, onPress, icon }: {
  label: string; active?: boolean; onPress?: () => void; icon?: React.ReactNode;
}) {
  const t = useWebTokens();
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      aria-pressed={active}
      style={[
        styles.pill,
        active
          ? { backgroundColor: t.isDark ? '#F5F5F7' : '#1D1D1F', borderColor: 'transparent' }
          : { backgroundColor: t.surface, borderColor: t.hairlineStrong },
        web({ cursor: 'pointer' }),
      ]}
    >
      {icon}
      <Text style={[styles.pillText, { color: active ? (t.isDark ? '#000' : '#FFF') : t.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'blue' }) {
  const t = useWebTokens();
  const color = { neutral: t.textSecondary, accent: t.accent, success: t.success, warning: t.warning, blue: t.blue }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: `${color}${t.isDark ? '2E' : '1A'}` }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

/* ─── Forms ───────────────────────────────────────────────── */

export function TextField({ label, hint, error, style, inputStyle, left, right, multiline, ...props }: TextInputProps & {
  label?: string; hint?: string; error?: string | null; style?: StyleProp<ViewStyle>; inputStyle?: StyleProp<TextStyle>;
  left?: React.ReactNode; right?: React.ReactNode;
}) {
  const t = useWebTokens();
  const [focused, setFocused] = useState(false);
  return (
    <View style={[{ gap: 6 }, style]}>
      {!!label && <Text style={[styles.fieldLabel, { color: t.textSecondary }]}>{label}</Text>}
      <View
        style={[
          styles.field,
          { backgroundColor: t.fill, borderColor: error ? t.accent : focused ? t.accent : 'transparent' },
          multiline && { height: undefined, minHeight: 96, alignItems: 'flex-start', paddingVertical: 10 },
          focused && web({ boxShadow: `0 0 0 3px ${t.accentSoft}` }),
        ]}
      >
        {left}
        <TextInput
          placeholderTextColor={t.placeholder}
          multiline={multiline}
          {...props}
          onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
          style={[styles.fieldInput, { color: t.text }, multiline && { minHeight: 76, textAlignVertical: 'top' }, web({ outlineStyle: 'none' }), inputStyle]}
        />
        {right}
      </View>
      {!!(error || hint) && (
        <Text style={[styles.fieldHint, { color: error ? t.accent : t.textSecondary }]}>{error || hint}</Text>
      )}
    </View>
  );
}

/** iOS-style inset grouped list */
export function GroupedList({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useWebTokens();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.grouped, { backgroundColor: t.surface, borderColor: t.hairline, boxShadow: t.shadow }, style]}>
      {items.map((child, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={[styles.groupSeparator, { backgroundColor: t.hairline }]} />}
          {child}
        </React.Fragment>
      ))}
    </View>
  );
}

export function ListRow({ icon, iconBg, title, subtitle, value, onPress, right, destructive }: {
  icon?: React.ReactNode; iconBg?: string; title: string; subtitle?: string; value?: string;
  onPress?: () => void; right?: React.ReactNode; destructive?: boolean;
}) {
  const t = useWebTokens();
  const [hovered, setHovered] = useState(false);
  const content = (
    <>
      {icon && <View style={[styles.rowIcon, { backgroundColor: iconBg || t.fill }]}>{icon}</View>}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: destructive ? t.accent : t.text }]} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={[styles.rowSubtitle, { color: t.textSecondary }]} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {!!value && <Text style={[styles.rowValue, { color: t.textSecondary }]} numberOfLines={1}>{value}</Text>}
      {right}
      {onPress && !right && <Text style={[styles.chevron, { color: t.textTertiary }]}>›</Text>}
    </>
  );
  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[styles.row, hovered && { backgroundColor: t.fill }, web({ cursor: 'pointer' })]}
      {...({ onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) } as any)}
    >
      {content}
    </TouchableOpacity>
  );
}

/* ─── Collections ─────────────────────────────────────────── */

/**
 * Grid with equal columns and equal-height rows. Items are chunked into flex
 * rows (stretch) and the last row is padded with empty cells, so every cell has
 * a definite width — PlateCard renders at `width: '100%'` on web and needs one.
 */
export function WebGrid<T>({ data, renderItem, keyExtractor, minItemWidth = 220, gap = 16, maxColumns = 5, minColumns = 2 }: {
  data: T[]; renderItem: (item: T, index: number) => React.ReactNode; keyExtractor: (item: T, index: number) => string;
  minItemWidth?: number; gap?: number; maxColumns?: number; minColumns?: number;
}) {
  const [width, setWidth] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const columns = width
    ? Math.max(minColumns, Math.min(maxColumns, Math.floor((width + gap) / (minItemWidth + gap))))
    : minColumns;

  const rows: T[][] = [];
  for (let i = 0; i < data.length; i += columns) rows.push(data.slice(i, i + columns));

  return (
    <View onLayout={onLayout} style={{ width: '100%' }}>
      {rows.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row', gap, alignItems: 'stretch' }}>
          {row.map((item, c) => (
            <View key={keyExtractor(item, r * columns + c)} style={{ flex: 1, minWidth: 0 }}>
              {renderItem(item, r * columns + c)}
            </View>
          ))}
          {Array.from({ length: columns - row.length }).map((_, i) => (
            <View key={`pad-${i}`} style={{ flex: 1, minWidth: 0 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

export function EmptyState({ icon, title, subtitle, action }: {
  icon?: React.ReactNode; title: string; subtitle?: string; action?: React.ReactNode;
}) {
  const t = useWebTokens();
  return (
    <View style={styles.empty}>
      {icon && <View style={[styles.emptyIcon, { backgroundColor: t.fill }]}>{icon}</View>}
      <Text style={[styles.emptyTitle, { color: t.text }]}>{title}</Text>
      {!!subtitle && <Text style={[styles.emptySubtitle, { color: t.textSecondary }]}>{subtitle}</Text>}
      {action}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const t = useWebTokens();
  return (
    <View style={{ paddingVertical: 80, alignItems: 'center', gap: 12 }}>
      <ActivityIndicator color={t.textSecondary} />
      {!!label && <Text style={{ color: t.textSecondary, fontFamily: FONT.medium, fontSize: 14 }}>{label}</Text>}
    </View>
  );
}

/** Key figure tile (dashboards, loan summaries) */
export function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: string }) {
  const t = useWebTokens();
  return (
    <Card padding={18} style={{ flex: 1, minWidth: 160 }}>
      <Text style={[styles.statLabel, { color: t.textSecondary }]}>{label}</Text>
      <Text style={[styles.statValue, { color: tone || t.text }]} numberOfLines={1}>{value}</Text>
      {!!hint && <Text style={[styles.statHint, { color: t.textSecondary }]}>{hint}</Text>}
    </Card>
  );
}

/* ─── Formatting ──────────────────────────────────────────── */

/** 95 000 ₼ */
export const formatMoney = (value: number | string | null | undefined, currency = 'AZN') => {
  const n = Math.round(Number(value) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${n} ${currency === 'AZN' || !currency ? '₼' : currency}`;
};

/** Props for the shared CarCard from a `listings` row */
export const carCardProps = (car: any) => ({
  id: car.id,
  title: car.title || `${car.make} ${car.model}`,
  price: car.price,
  currency: car.currency || 'AZN',
  image: car.image_url,
  images: Array.isArray(car.images) ? car.images : [],
  location: car.location,
  date: car.created_at,
  mileage: car.mileage,
  engine: car.engine,
  year: car.year,
  isCredit: car.is_credit,
  isBarter: car.is_barter,
  isVip: car.is_vip,
  isNew: car.is_new,
  isUrgent: car.is_urgent,
});

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 32 },
  eyebrow: { fontSize: 13, fontFamily: FONT.semibold, letterSpacing: 0.2 },
  largeTitle: { fontSize: 44, lineHeight: 50, fontFamily: FONT.heavy, letterSpacing: -1.2 },
  subtitle: { fontSize: 17, lineHeight: 26, fontFamily: FONT.regular, maxWidth: 620 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  sectionTitle: { fontSize: 26, fontFamily: FONT.heavy, letterSpacing: -0.6 },
  sectionSubtitle: { fontSize: 14, fontFamily: FONT.regular },
  link: { fontSize: 15, fontFamily: FONT.semibold },
  groupCaption: { fontSize: 12, fontFamily: FONT.semibold, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginLeft: 4 },
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, ...web({ transition: 'box-shadow 180ms ease, transform 180ms ease' }) },
  segTrack: { flexDirection: 'row', borderRadius: 10, padding: 2, height: 36 },
  segItem: { paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  segText: { fontSize: 14 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  buttonText: { fontFamily: FONT.semibold },
  iconButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 14, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  pillText: { fontSize: 13, fontFamily: FONT.semibold },
  badge: { paddingHorizontal: 8, height: 22, borderRadius: 6, justifyContent: 'center', alignSelf: 'flex-start' },
  badgeText: { fontSize: 12, fontFamily: FONT.semibold },
  fieldLabel: { fontSize: 13, fontFamily: FONT.semibold, marginLeft: 2 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 44, borderRadius: 10, paddingHorizontal: 12, borderWidth: 1 },
  fieldInput: { flex: 1, height: '100%', fontSize: 15, fontFamily: FONT.medium, padding: 0 },
  fieldHint: { fontSize: 12, fontFamily: FONT.medium, marginLeft: 2 },
  grouped: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  groupSeparator: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16, paddingVertical: 10 },
  rowIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { fontSize: 15, fontFamily: FONT.semibold },
  rowSubtitle: { fontSize: 13, fontFamily: FONT.regular, marginTop: 1 },
  rowValue: { fontSize: 15, fontFamily: FONT.medium, maxWidth: '50%' },
  chevron: { fontSize: 22, fontFamily: FONT.medium, marginTop: -2 },
  empty: { alignItems: 'center', paddingVertical: 72, paddingHorizontal: 24, gap: 10 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 20, fontFamily: FONT.bold, textAlign: 'center' },
  emptySubtitle: { fontSize: 15, fontFamily: FONT.regular, textAlign: 'center', maxWidth: 380, lineHeight: 22, marginBottom: 8 },
  statLabel: { fontSize: 13, fontFamily: FONT.medium, marginBottom: 6 },
  statValue: { fontSize: 26, fontFamily: FONT.heavy, letterSpacing: -0.5 },
  statHint: { fontSize: 12, fontFamily: FONT.medium, marginTop: 4 },
});
