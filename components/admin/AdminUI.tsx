// Building blocks for the admin screens in the app (they also render inside the
// web admin layout). Same language as the rest of the redesign: large titles,
// inset grouped lists, hairline cards, iOS segmented controls, one accent colour.
import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Platform, Modal, FlatList,
  StyleProp, ViewStyle, TextStyle, TextInputProps, ScrollViewProps,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useScreenTopPadding } from '../../hooks/useScreenTopPadding';
import { HapticRefreshControl } from '../ui/HapticRefreshControl';
import { haptics } from '../../utils/haptics';

export const F = {
  regular: 'RethinkSans_400Regular',
  medium: 'RethinkSans_500Medium',
  semibold: 'RethinkSans_600SemiBold',
  bold: 'RethinkSans_700Bold',
  heavy: 'RethinkSans_800ExtraBold',
};

export function useAdminColors() {
  const { colors, isDark } = useTheme();
  return {
    ...colors,
    isDark,
    hairline: isDark ? colors.border : 'rgba(0,0,0,0.08)',
    fill: isDark ? 'rgba(118,118,128,0.24)' : 'rgba(118,118,128,0.12)',
    accentSoft: isDark ? 'rgba(255,69,58,0.18)' : 'rgba(255,59,48,0.1)',
    tertiary: isDark ? '#6C6C70' : '#C7C7CC',
  };
}
export type AdminColors = ReturnType<typeof useAdminColors>;

/* ─── Screen scaffold ─────────────────────────────────────── */

/**
 * Header with a back button, a large title and optional actions on the right.
 * Top spacing comes from useScreenTopPadding (safe area aware).
 */
export function AdminHeader({ title, subtitle, backLabel = 'Geri', onBack, right, hideBack, modal }: {
  title: string; subtitle?: string; backLabel?: string; onBack?: () => void; right?: React.ReactNode; hideBack?: boolean; modal?: boolean;
}) {
  const c = useAdminColors();
  const router = useRouter();
  const top = useScreenTopPadding(modal);
  const goBack = onBack || (() => (router.canGoBack() ? router.back() : router.replace('/menu' as any)));
  return (
    <View style={{ paddingTop: top, paddingHorizontal: 16, backgroundColor: c.background }}>
      <View style={styles.headerBar}>
        {!hideBack ? (
          <TouchableOpacity
            onPress={() => { haptics.tap(); goBack(); }}
            hitSlop={10}
            style={styles.back}
            accessibilityRole="button"
            accessibilityLabel={backLabel}
          >
            <ChevronLeft size={24} color={c.primary} strokeWidth={2.4} />
            <Text style={[styles.backText, { color: c.primary }]} numberOfLines={1}>{backLabel}</Text>
          </TouchableOpacity>
        ) : <View />}
        <View style={styles.headerRight}>{right}</View>
      </View>
      <Text style={[styles.largeTitle, { color: c.text }]} accessibilityRole="header" numberOfLines={2}>{title}</Text>
      {!!subtitle && <Text style={[styles.subtitle, { color: c.textSecondary }]}>{subtitle}</Text>}
    </View>
  );
}

/** Round icon button for header actions */
export function HeaderAction({ icon: Icon, onPress, label, tint }: { icon: any; onPress: () => void; label: string; tint?: string }) {
  const c = useAdminColors();
  return (
    <TouchableOpacity
      onPress={() => { haptics.tap(); onPress(); }}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.headerAction, { backgroundColor: c.fill }]}
    >
      <Icon size={18} color={tint || c.primary} strokeWidth={2.2} />
    </TouchableOpacity>
  );
}

export function AdminScroll({ children, refreshing, onRefresh, contentStyle, ...props }: ScrollViewProps & {
  children: React.ReactNode; refreshing?: boolean; onRefresh?: () => void; contentStyle?: StyleProp<ViewStyle>;
}) {
  const c = useAdminColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={[{ padding: 16, paddingBottom: insets.bottom + 32 }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <HapticRefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={c.primary} /> : undefined}
      {...props}
    >
      {children}
    </ScrollView>
  );
}

/* ─── Grouped lists ───────────────────────────────────────── */

export function Group({ title, footer, children, style }: {
  title?: string; footer?: string; children: React.ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const c = useAdminColors();
  const items = React.Children.toArray(children).filter(Boolean);
  return (
    <View style={[{ marginBottom: 24 }, style]}>
      {!!title && <Text style={[styles.groupTitle, { color: c.textSecondary }]}>{title}</Text>}
      <View style={[styles.group, { backgroundColor: c.card, borderColor: c.hairline }]}>
        {items.map((child, i) => (
          <React.Fragment key={i}>
            {i > 0 && <View style={[styles.separator, { backgroundColor: c.hairline }]} />}
            {child}
          </React.Fragment>
        ))}
      </View>
      {!!footer && <Text style={[styles.groupFooter, { color: c.textSecondary }]}>{footer}</Text>}
    </View>
  );
}

export function GroupRow({ icon: Icon, tint, title, subtitle, value, onPress, right, destructive, chevron = !!onPress, badge }: {
  icon?: any; tint?: string; title: string; subtitle?: string; value?: string; onPress?: () => void;
  right?: React.ReactNode; destructive?: boolean; chevron?: boolean; badge?: number;
}) {
  const c = useAdminColors();
  const body = (
    <>
      {Icon && (
        <View style={[styles.rowIcon, { backgroundColor: tint || c.fill }]}>
          <Icon size={16} color={tint ? '#FFF' : c.text} strokeWidth={2.2} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.rowTitle, { color: destructive ? c.primary : c.text }]} numberOfLines={1}>{title}</Text>
        {!!subtitle && <Text style={[styles.rowSubtitle, { color: c.textSecondary }]} numberOfLines={2}>{subtitle}</Text>}
      </View>
      {!!value && <Text style={[styles.rowValue, { color: c.textSecondary }]} numberOfLines={1}>{value}</Text>}
      {!!badge && badge > 0 && (
        <View style={[styles.badge, { backgroundColor: c.primary }]}><Text style={styles.badgeText}>{badge}</Text></View>
      )}
      {right}
      {chevron && <ChevronRight size={18} color={c.tertiary} />}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={() => { haptics.tap(); onPress(); }}
      activeOpacity={0.6}
      accessibilityRole="button"
    >
      {body}
    </TouchableOpacity>
  );
}

/* ─── Controls ────────────────────────────────────────────── */

export function Segmented<T extends string>({ options, value, onChange, style }: {
  options: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void; style?: StyleProp<ViewStyle>;
}) {
  const c = useAdminColors();
  return (
    <View style={[styles.segTrack, { backgroundColor: c.fill }, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => { if (!active) { haptics.tap(); onChange(o.value); } }}
            activeOpacity={0.8}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={[styles.segItem, active && { backgroundColor: c.isDark ? '#636366' : '#FFFFFF', boxShadow: '0px 2px 6px rgba(0,0,0,0.12)' }]}
          >
            <Text style={[styles.segText, { color: c.text, fontFamily: active ? F.semibold : F.medium }]} numberOfLines={1}>
              {o.label}{o.count != null ? <Text style={{ color: c.textSecondary }}> {o.count}</Text> : null}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Horizontally scrolling single-choice chips (for more options than a segmented control fits) */
export function Chips<T extends string>({ options, value, onChange, style }: {
  options: { value: T; label: string; icon?: any }[]; value: T; onChange: (v: T) => void; style?: StyleProp<ViewStyle>;
}) {
  const c = useAdminColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={style} contentContainerStyle={styles.chips}>
      {options.map((o) => {
        const active = o.value === value;
        const Icon = o.icon;
        const fg = active ? (c.isDark ? '#000' : '#FFF') : c.text;
        return (
          <TouchableOpacity
            key={o.value}
            onPress={() => { if (!active) { haptics.tap(); onChange(o.value); } }}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={[styles.chip, { backgroundColor: active ? (c.isDark ? '#F5F5F7' : '#1D1D1F') : c.fill }]}
          >
            {Icon && <Icon size={14} color={fg} />}
            <Text style={[styles.chipText, { color: fg }]}>{o.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'destructive' | 'plain';

export function AdminButton({ title, onPress, variant = 'primary', icon, loading, disabled, style, small }: {
  title: string; onPress: () => void; variant?: ButtonVariant; icon?: React.ReactNode; loading?: boolean;
  disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean;
}) {
  const c = useAdminColors();
  const palette = {
    primary: { bg: c.primary, fg: '#FFF' },
    secondary: { bg: c.fill, fg: c.text },
    destructive: { bg: c.accentSoft, fg: c.primary },
    plain: { bg: 'transparent', fg: c.primary },
  }[variant];
  return (
    <TouchableOpacity
      onPress={() => { haptics.tap(); onPress(); }}
      disabled={disabled || loading}
      activeOpacity={0.8}
      accessibilityRole="button"
      style={[styles.button, { backgroundColor: palette.bg, height: small ? 34 : 50, paddingHorizontal: small ? 14 : 20, opacity: disabled ? 0.45 : 1 }, style]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : (
        <>
          {icon}
          <Text style={[styles.buttonText, { color: palette.fg, fontSize: small ? 14 : 16 }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

export function SearchBar({ value, onChangeText, placeholder = 'Axtar', style }: {
  value: string; onChangeText: (v: string) => void; placeholder?: string; style?: StyleProp<ViewStyle>;
}) {
  const c = useAdminColors();
  return (
    <View style={[styles.search, { backgroundColor: c.fill }, style]}>
      <Search size={16} color={c.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textSecondary}
        style={[styles.searchInput, { color: c.text }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any)]}
        returnKeyType="search"
        autoCorrect={false}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Təmizlə">
          <X size={15} color={c.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Label on the left, input on the right — one row of a grouped form */
export function FieldRow({ label, inputStyle, ...props }: TextInputProps & { label: string; inputStyle?: StyleProp<TextStyle> }) {
  const c = useAdminColors();
  return (
    <View style={styles.fieldRow}>
      <Text style={[styles.fieldLabel, { color: c.text }]} numberOfLines={1}>{label}</Text>
      <TextInput
        placeholderTextColor={c.tertiary}
        {...props}
        style={[styles.fieldInput, { color: c.text }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any), inputStyle]}
      />
    </View>
  );
}

/** Full-width multi-line input inside a group */
export function TextArea(props: TextInputProps) {
  const c = useAdminColors();
  return (
    <TextInput
      multiline
      placeholderTextColor={c.tertiary}
      textAlignVertical="top"
      {...props}
      style={[styles.textArea, { color: c.text }, Platform.OS === 'web' && ({ outlineStyle: 'none' } as any), props.style]}
    />
  );
}

export type PickerOption = { label: string; value: string };

/** Full-height sheet with a search field and a list to pick one option */
export function PickerSheet({ visible, title, options, selected, onSelect, onClose }: {
  visible: boolean; title: string; options: PickerOption[]; selected?: string;
  onSelect: (option: PickerOption) => void; onClose: () => void;
}) {
  const c = useAdminColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = React.useState('');
  const q = query.trim().toLowerCase();
  const list = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const close = () => { setQuery(''); onClose(); };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : undefined} onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: c.background, paddingTop: Platform.OS === 'ios' ? 12 : insets.top + 8 }}>
        <View style={styles.sheetHead}>
          <Text style={[styles.sheetTitle, { color: c.text }]}>{title}</Text>
          <TouchableOpacity onPress={close} hitSlop={10} accessibilityRole="button">
            <Text style={[styles.sheetDone, { color: c.primary }]}>Bağla</Text>
          </TouchableOpacity>
        </View>
        <SearchBar value={query} onChangeText={setQuery} style={{ marginHorizontal: 16, marginBottom: 8 }} />
        <FlatList
          data={list}
          keyExtractor={(o) => o.value}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: c.hairline }]} />}
          ListEmptyComponent={<Text style={[styles.emptySubtitle, { color: c.textSecondary, marginTop: 32 }]}>Nəticə tapılmadı</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.sheetRow}
              onPress={() => { haptics.tap(); onSelect(item); close(); }}
              accessibilityRole="button"
            >
              <Text style={[styles.rowTitle, { color: c.text, fontFamily: F.medium, flex: 1 }]}>{item.label}</Text>
              {selected === item.value && <Text style={[styles.sheetDone, { color: c.primary }]}>✓</Text>}
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

/** Grouped-form row that opens a picker */
export function SelectRow({ label, value, placeholder, onPress }: { label: string; value?: string; placeholder: string; onPress: () => void }) {
  const c = useAdminColors();
  return (
    <TouchableOpacity style={styles.fieldRow} onPress={() => { haptics.tap(); onPress(); }} activeOpacity={0.6} accessibilityRole="button">
      <Text style={[styles.fieldLabel, { color: c.text }]} numberOfLines={1}>{label}</Text>
      <Text style={[styles.fieldInput, { color: value ? c.text : c.tertiary, lineHeight: 50 }]} numberOfLines={1}>{value || placeholder}</Text>
      <ChevronRight size={18} color={c.tertiary} />
    </TouchableOpacity>
  );
}

/* ─── Display ─────────────────────────────────────────────── */

export function StatTile({ label, value, tone, style }: { label: string; value: string | number; tone?: string; style?: StyleProp<ViewStyle> }) {
  const c = useAdminColors();
  return (
    <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.hairline }, style]}>
      <Text style={[styles.statValue, { color: tone || c.text }]} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={[styles.statLabel, { color: c.textSecondary }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export function Pill({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'blue' }) {
  const c = useAdminColors();
  const color = { neutral: c.textSecondary, accent: c.primary, success: c.success, warning: c.warning, blue: '#007AFF' }[tone];
  return (
    <View style={[styles.pill, { backgroundColor: `${color}${c.isDark ? '33' : '1A'}` }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function EmptyView({ icon: Icon, title, subtitle }: { icon?: any; title: string; subtitle?: string }) {
  const c = useAdminColors();
  return (
    <View style={styles.empty}>
      {Icon && (
        <View style={[styles.emptyIcon, { backgroundColor: c.fill }]}>
          <Icon size={28} color={c.textSecondary} />
        </View>
      )}
      <Text style={[styles.emptyTitle, { color: c.text }]}>{title}</Text>
      {!!subtitle && <Text style={[styles.emptySubtitle, { color: c.textSecondary }]}>{subtitle}</Text>}
    </View>
  );
}

export function LoadingView() {
  const c = useAdminColors();
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60, backgroundColor: c.background }}>
      <ActivityIndicator color={c.textSecondary} />
    </View>
  );
}

/** Unique storage path for an upload, e.g. `banners/home_1717171717_k3j9.jpg` */
export const uploadPath = (prefix: string, ext = 'jpg') =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;

/** Whole days since an ISO date (0 for future dates) */
export const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));

/** 95 000 ₼ */
export const money = (value: number | string | null | undefined, currency = 'AZN') => {
  const n = Math.round(Number(value) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${n} ${currency === 'AZN' || !currency ? '₼' : currency}`;
};

const styles = StyleSheet.create({
  headerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  back: { flexDirection: 'row', alignItems: 'center', marginLeft: -8, maxWidth: '55%' },
  backText: { fontSize: 17, fontFamily: F.medium },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerAction: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  largeTitle: { fontSize: 32, fontFamily: F.heavy, letterSpacing: -0.6, marginTop: 6 },
  subtitle: { fontSize: 15, fontFamily: F.medium, marginTop: 2, marginBottom: 4 },
  groupTitle: { fontSize: 13, fontFamily: F.semibold, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8, marginLeft: 16 },
  groupFooter: { fontSize: 13, fontFamily: F.regular, marginTop: 8, marginHorizontal: 16, lineHeight: 18 },
  group: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 16, paddingVertical: 10 },
  rowIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { fontSize: 16, fontFamily: F.semibold },
  rowSubtitle: { fontSize: 13, fontFamily: F.medium, marginTop: 1 },
  rowValue: { fontSize: 15, fontFamily: F.medium, maxWidth: '45%' },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFF', fontSize: 12, fontFamily: F.bold },
  segTrack: { flexDirection: 'row', borderRadius: 10, padding: 2, height: 34 },
  segItem: { flex: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  segText: { fontSize: 13 },
  chips: { gap: 8, paddingHorizontal: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 34, paddingHorizontal: 14, borderRadius: 17 },
  chipText: { fontSize: 14, fontFamily: F.semibold },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14 },
  buttonText: { fontFamily: F.semibold },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 38, borderRadius: 11, paddingHorizontal: 10 },
  searchInput: { flex: 1, height: '100%', fontSize: 16, fontFamily: F.medium, padding: 0 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 16, gap: 12 },
  fieldLabel: { width: 120, fontSize: 15, fontFamily: F.semibold },
  fieldInput: { flex: 1, minHeight: 50, fontSize: 16, fontFamily: F.medium, textAlign: 'right', padding: 0 },
  textArea: { minHeight: 110, padding: 16, fontSize: 16, fontFamily: F.medium },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  sheetTitle: { fontSize: 20, fontFamily: F.bold },
  sheetDone: { fontSize: 17, fontFamily: F.semibold },
  sheetRow: { flexDirection: 'row', alignItems: 'center', minHeight: 50, paddingHorizontal: 16 },
  stat: { flex: 1, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, minWidth: 96 },
  statValue: { fontSize: 24, fontFamily: F.heavy, letterSpacing: -0.5 },
  statLabel: { fontSize: 12, fontFamily: F.medium, marginTop: 2 },
  pill: { paddingHorizontal: 8, height: 22, borderRadius: 6, justifyContent: 'center', alignSelf: 'flex-start' },
  pillText: { fontSize: 12, fontFamily: F.semibold },
  empty: { alignItems: 'center', paddingVertical: 56, paddingHorizontal: 32, gap: 8 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  emptyTitle: { fontSize: 18, fontFamily: F.bold, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, fontFamily: F.medium, textAlign: 'center', lineHeight: 20 },
});
