// Renders a FinanceForm from lib/finance.ts in a centred sheet (web and app).
import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { useWebTokens, TextField, Pill, Button, FONT } from '../web/WebKit';
import { FinanceForm, validateForm } from '../../lib/finance';
import { useToast } from '../../contexts/ToastContext';

export function FinanceFormSheet({ form, onClose, onDone }: {
  form: FinanceForm | null; onClose: () => void; onDone: () => void;
}) {
  const t = useWebTokens();
  const { showToast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setValues(form?.initial || {});
    setError(null);
  }, [form]);

  if (!form) return null;
  const set = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));

  const submit = async () => {
    const problem = validateForm(form, values);
    if (problem) { setError(problem); return; }
    setSaving(true);
    setError(null);
    try {
      await form.submit(values);
      showToast(form.success, 'success');
      onDone();
    } catch (e: any) {
      setError(e?.message || 'Xəta baş verdi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Bağla" />
        <View style={[styles.sheet, { backgroundColor: t.surface, borderColor: t.hairline }]}>
          <View style={styles.header}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.title, { color: t.text }]}>{form.title}</Text>
              {!!form.subtitle && <Text style={[styles.subtitle, { color: t.textSecondary }]}>{form.subtitle}</Text>}
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.close, { backgroundColor: t.fill }]} accessibilityLabel="Bağla">
              <X size={15} color={t.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {form.fields.map((f) => f.type === 'select' ? (
              <View key={f.key} style={{ gap: 6 }}>
                <Text style={[styles.label, { color: t.textSecondary }]}>{f.label}</Text>
                <View style={styles.pills}>
                  {(f.options || []).map((o) => (
                    <Pill key={o.value} label={o.label} active={values[f.key] === o.value} onPress={() => set(f.key, o.value)} />
                  ))}
                  {(f.options || []).length === 0 && <Text style={[styles.subtitle, { color: t.textSecondary }]}>Seçim yoxdur</Text>}
                </View>
              </View>
            ) : (
              <TextField
                key={f.key}
                label={f.label + (f.required ? ' *' : '')}
                hint={f.hint || (f.type === 'date' ? 'İİİİ-AA-GG' : undefined)}
                value={values[f.key] || ''}
                onChangeText={(v) => set(f.key, v)}
                placeholder={f.placeholder || (f.type === 'date' ? '2026-10-27' : undefined)}
                multiline={f.type === 'multiline'}
                keyboardType={f.type === 'money' ? 'decimal-pad' : f.type === 'number' ? 'number-pad' : f.type === 'phone' ? 'phone-pad' : 'default'}
              />
            ))}
            {!!error && <Text style={[styles.error, { color: t.accent }]}>{error}</Text>}
          </ScrollView>
          <View style={[styles.footer, { borderTopColor: t.hairline }]}>
            <Button title="İmtina" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
            <Button title={form.submitLabel} variant={form.destructive ? 'destructive' : 'primary'} onPress={submit} loading={saving} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { width: '100%', maxWidth: 480, maxHeight: '90%', borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 19, fontFamily: FONT.bold },
  subtitle: { fontSize: 13, fontFamily: FONT.regular, lineHeight: 18 },
  close: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: 20, paddingVertical: 12, gap: 14 },
  label: { fontSize: 13, fontFamily: FONT.medium },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  error: { fontSize: 13, fontFamily: FONT.semibold },
  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
