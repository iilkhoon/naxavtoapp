// Building blocks for the web admin panel, on top of WebKit: a page scaffold,
// toolbar, search field, data table and compact icon actions.
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { useWebTokens, useBreakpoints, Card, EmptyState, Loading, FONT } from './WebKit';

export function AdminPage({ title, subtitle, actions, children, maxWidth = 1200, scroll = true }: {
  title: string; subtitle?: string; actions?: React.ReactNode; children: React.ReactNode; maxWidth?: number; scroll?: boolean;
}) {
  const t = useWebTokens();
  const { isMobile } = useBreakpoints();
  const inner = (
    <View style={[styles.page, { maxWidth }, isMobile && { paddingHorizontal: 16, paddingTop: 20 }]}>
      <View style={[styles.header, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
        <View style={{ flexShrink: 1, gap: 4 }}>
          <Text role="heading" aria-level={1} style={[styles.title, { color: t.text }, isMobile && { fontSize: 26 }]}>{title}</Text>
          {!!subtitle && <Text style={[styles.subtitle, { color: t.textSecondary }]}>{subtitle}</Text>}
        </View>
        {!!actions && <View style={styles.actions}>{actions}</View>}
      </View>
      {children}
    </View>
  );
  if (!scroll) return <View style={{ flex: 1, backgroundColor: t.bg }}>{inner}</View>;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      {inner}
    </ScrollView>
  );
}

export function Toolbar({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.toolbar, style]}>{children}</View>;
}

export function SearchField({ value, onChangeText, placeholder = 'Axtar', style }: {
  value: string; onChangeText: (v: string) => void; placeholder?: string; style?: StyleProp<ViewStyle>;
}) {
  const t = useWebTokens();
  return (
    <View style={[styles.search, { backgroundColor: t.fill }, style]}>
      <Search size={15} color={t.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.placeholder}
        accessibilityLabel={placeholder}
        style={[styles.searchInput, { color: t.text }, { outlineStyle: 'none' } as any]}
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} accessibilityLabel="Təmizlə" style={{ cursor: 'pointer' } as any}>
          <X size={14} color={t.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Small round icon button for table rows. `label` doubles as the tooltip. */
export function IconAction({ icon: Icon, label, onPress, tone = 'neutral', disabled }: {
  icon: any; label: string; onPress: () => void; tone?: 'neutral' | 'accent' | 'success' | 'blue'; disabled?: boolean;
}) {
  const t = useWebTokens();
  const color = { neutral: t.text, accent: t.accent, success: t.success, blue: t.blue }[tone];
  const [hovered, setHovered] = useState(false);
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      {...({ title: label, onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) } as any)}
      style={[
        styles.iconAction,
        { backgroundColor: hovered ? `${color}22` : t.fill, opacity: disabled ? 0.4 : 1 },
        { cursor: disabled ? 'default' : 'pointer', transition: 'background-color 120ms ease' } as any,
      ]}
    >
      <Icon size={15} color={color} />
    </TouchableOpacity>
  );
}

export type Column<T> = {
  key: string;
  title: string;
  flex?: number;
  width?: number;
  align?: 'left' | 'right' | 'center';
  /** Hidden below 768px; the row keeps the remaining columns */
  hideOnMobile?: boolean;
  render: (item: T, index: number) => React.ReactNode;
};

/**
 * Hairline table inside a card. Below 768px columns marked `hideOnMobile`
 * drop out and the header row is hidden.
 */
export function DataTable<T>({ columns, data, keyExtractor, onRowPress, loading, emptyTitle = 'Heç nə tapılmadı', emptySubtitle, emptyIcon }: {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  onRowPress?: (item: T) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptySubtitle?: string;
  emptyIcon?: React.ReactNode;
}) {
  const t = useWebTokens();
  const { isMobile } = useBreakpoints();
  const visible = columns.filter((c) => !(isMobile && c.hideOnMobile));
  const cellStyle = (c: Column<T>) => [
    c.width ? { width: c.width } : { flex: c.flex ?? 1 },
    { minWidth: 0, alignItems: c.align === 'right' ? 'flex-end' : c.align === 'center' ? 'center' : 'flex-start' } as ViewStyle,
  ];

  if (loading) return <Loading />;
  if (data.length === 0) return <Card><EmptyState icon={emptyIcon} title={emptyTitle} subtitle={emptySubtitle} /></Card>;

  return (
    <Card padding={0} style={{ overflow: 'hidden' }}>
      {!isMobile && (
        <View style={[styles.tr, styles.thead, { borderBottomColor: t.hairline, backgroundColor: t.isDark ? 'rgba(255,255,255,0.02)' : '#FAFAFC' }]}>
          {visible.map((c) => (
            <View key={c.key} style={cellStyle(c)}>
              <Text style={[styles.th, { color: t.textSecondary }]} numberOfLines={1}>{c.title}</Text>
            </View>
          ))}
        </View>
      )}
      {data.map((item, i) => (
        <Row key={keyExtractor(item, i)} first={i === 0} onPress={onRowPress ? () => onRowPress(item) : undefined}>
          {visible.map((c) => (
            <View key={c.key} style={cellStyle(c)}>{c.render(item, i)}</View>
          ))}
        </Row>
      ))}
    </Card>
  );
}

function Row({ children, first, onPress }: { children: React.ReactNode; first: boolean; onPress?: () => void }) {
  const t = useWebTokens();
  const [hovered, setHovered] = useState(false);
  const style = [
    styles.tr,
    !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.hairline },
    hovered && { backgroundColor: t.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.018)' },
  ];
  const hover = { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) } as any;
  if (!onPress) return <View style={style} {...hover}>{children}</View>;
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress} style={[style, { cursor: 'pointer' } as any]} {...hover}>
      {children}
    </TouchableOpacity>
  );
}

export type PickerItem = { label: string; value: string };

/** Centred sheet with a search field and a tappable list */
export function PickerModal({ visible, title, items, onSelect, onClose }: {
  visible: boolean; title: string; items: PickerItem[]; onSelect: (item: PickerItem) => void; onClose: () => void;
}) {
  const t = useWebTokens();
  const [query, setQuery] = useState('');
  if (!visible) return null;
  const q = query.trim().toLowerCase();
  const list = q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
  const close = () => { setQuery(''); onClose(); };
  return (
    <View style={styles.modalOverlay}>
      <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={close} accessibilityLabel="Bağla" />
      <View style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.hairline }]}>
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: t.text }]}>{title}</Text>
          <TouchableOpacity onPress={close} style={[styles.sheetClose, { backgroundColor: t.fill }]} accessibilityLabel="Bağla">
            <X size={15} color={t.text} />
          </TouchableOpacity>
        </View>
        <SearchField value={query} onChangeText={setQuery} style={{ marginHorizontal: 16, marginBottom: 8, flexBasis: 'auto', flexGrow: 0 }} />
        <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 8 }}>
          {list.length === 0 && <Text style={[styles.cellSub, { color: t.textSecondary, textAlign: 'center', padding: 24 }]}>Nəticə tapılmadı</Text>}
          {list.map((item) => (
            <TouchableOpacity
              key={item.value}
              onPress={() => { onSelect(item); close(); }}
              style={[styles.pickRow, { cursor: 'pointer' } as any]}
            >
              <Text style={[styles.cellTitle, { color: t.text, fontFamily: FONT.medium }]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

/** Primary + secondary line inside a table cell */
export function CellText({ title, subtitle, strong }: { title: string; subtitle?: string; strong?: boolean }) {
  const t = useWebTokens();
  return (
    <View style={{ minWidth: 0, maxWidth: '100%' }}>
      <Text style={[styles.cellTitle, { color: t.text }, strong && { fontFamily: FONT.bold }]} numberOfLines={1}>{title}</Text>
      {!!subtitle && <Text style={[styles.cellSub, { color: t.textSecondary }]} numberOfLines={1}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', alignSelf: 'center', paddingHorizontal: 32, paddingTop: 32, paddingBottom: 56 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24 },
  title: { fontSize: 32, fontFamily: FONT.heavy, letterSpacing: -0.8 },
  subtitle: { fontSize: 15, fontFamily: FONT.regular },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 36, borderRadius: 10, paddingHorizontal: 10, minWidth: 200, flexGrow: 1, flexBasis: 220 },
  searchInput: { flex: 1, height: '100%', fontSize: 14, fontFamily: FONT.medium, padding: 0 },
  iconAction: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18, minHeight: 60, paddingVertical: 10 },
  thead: { minHeight: 40, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  th: { fontSize: 12, fontFamily: FONT.semibold },
  cellTitle: { fontSize: 14, fontFamily: FONT.semibold },
  cellSub: { fontSize: 12, fontFamily: FONT.regular, marginTop: 2 },
  modalOverlay: { position: 'fixed' as any, top: 0, left: 0, right: 0, bottom: 0, zIndex: 3000, justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { width: '100%', maxWidth: 440, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', boxShadow: '0px 24px 64px rgba(0,0,0,0.25)' as any },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 10 },
  sheetTitle: { fontSize: 18, fontFamily: FONT.bold },
  sheetClose: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', cursor: 'pointer' as any },
  pickRow: { paddingHorizontal: 12, paddingVertical: 11, borderRadius: 8 },
});
