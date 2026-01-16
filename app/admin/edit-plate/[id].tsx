import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image as RNImage
} from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Colors } from '../../../constants/Colors';
import { supabase } from '../../../lib/supabase';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Save, X } from 'lucide-react-native';
import { useToast } from '../../../contexts/ToastContext';
import { useTheme } from '../../../contexts/ThemeContext';

export default function EditPlateScreen() {
  const { id } = useLocalSearchParams();
  const plateId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  const { showToast } = useToast();
  const { colors } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [region, setRegion] = useState('');
  const [series, setSeries] = useState('');
  const [number, setNumber] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [isVip, setIsVip] = useState(false);

  const ImageComponent = Platform.OS === 'web' ? RNImage : ExpoImage;
  const flagImageProps = Platform.OS === 'web' 
    ? { source: { uri: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Flag_of_Azerbaijan.svg' }, resizeMode: 'cover' as const }
    : { source: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Flag_of_Azerbaijan.svg', contentFit: 'cover' as const };

  useEffect(() => {
    if (plateId) {
        fetchPlate();
    }
  }, [plateId]);

  const fetchPlate = async () => {
    try {
      const { data, error } = await supabase
        .from('plates')
        .select('*')
        .eq('id', plateId)
        .single();

      if (error) throw error;

      setRegion(data.region);
      setSeries(data.series);
      setNumber(data.number);
      setPrice(data.price.toString());
      setDescription(data.description || '');
      setSellerName(data.seller_name || '');
      setIsVip(data.is_vip);
    } catch (error: any) {
      console.error(error);
      showToast('Nömrə məlumatları yüklənə bilmədi', 'error');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!plateId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('plates')
        .update({
          region,
          series: series.toUpperCase(),
          number,
          price: parseFloat(price) || 0,
          description,
          seller_name: sellerName,
          is_vip: isVip
        })
        .eq('id', plateId);

      if (error) throw error;

      showToast('Nömrə uğurla yeniləndi', 'success');
      router.back();
      
    } catch (error: any) {
      showToast('Xəta: ' + error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
            <ActivityIndicator size="large" color={colors.primary} />
        </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Nömrəni Redaktə Et</Text>
          <TouchableOpacity onPress={handleUpdate} disabled={saving}>
             {saving ? <ActivityIndicator color={colors.primary} /> : <Save size={24} color={colors.primary} />}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            
            <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Nömrə Məlumatları</Text>
                
                <View style={styles.plateInputContainer}>
                    <View style={styles.plateFrame}>
                        <View style={styles.leftSection}>
                            <ImageComponent 
                                style={styles.flag}
                                {...flagImageProps}
                            />
                            <Text style={styles.azText}>AZ</Text>
                        </View>
                        <View style={styles.plateInputs}>
                            <TextInput 
                                style={styles.plateInputRegion}
                                placeholder="90"
                                placeholderTextColor="#CCC"
                                maxLength={2}
                                keyboardType="number-pad"
                                value={region}
                                onChangeText={(t) => setRegion(t.replace(/[^0-9]/g, ''))}
                            />
                            <View style={styles.plateDash} />
                            <TextInput 
                                style={styles.plateInputSeries}
                                placeholder="AA"
                                placeholderTextColor="#CCC"
                                maxLength={2}
                                autoCapitalize="characters"
                                value={series}
                                onChangeText={(t) => setSeries(t.toUpperCase())}
                            />
                            <View style={styles.plateDash} />
                            <TextInput 
                                style={styles.plateInputNumber}
                                placeholder="000"
                                placeholderTextColor="#CCC"
                                maxLength={3}
                                keyboardType="number-pad"
                                value={number}
                                onChangeText={(t) => setNumber(t.replace(/[^0-9]/g, ''))}
                            />
                        </View>
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Qiymət (AZN)</Text>
                    <TextInput 
                        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                        keyboardType="number-pad"
                        value={price}
                        onChangeText={(t) => setPrice(t.replace(/[^0-9]/g, ''))}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Ad Soyad</Text>
                    <TextInput 
                        style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                        value={sellerName}
                        onChangeText={setSellerName}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Əlavə məlumat</Text>
                    <TextInput 
                        style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]} 
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={4}
                        textAlignVertical="top"
                    />
                </View>

                <View style={[styles.togglesContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.toggleRow, { borderBottomWidth: 0 }]}>
                        <Text style={[styles.toggleLabel, { color: colors.text }]}>VIP Nömrə?</Text>
                        <Switch 
                            value={isVip} 
                            onValueChange={setIsVip}
                            trackColor={{ false: '#333', true: '#FFD700' }}
                        />
                    </View>
                </View>

            </View>

            <TouchableOpacity style={[styles.submitButton, { backgroundColor: colors.primary }]} onPress={handleUpdate}>
                <Save size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text style={styles.submitButtonText}>Yadda Saxla</Text>
            </TouchableOpacity>

        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: Platform.OS === 'android' ? 40 : 60, paddingBottom: 20, paddingHorizontal: 20, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  closeButton: { padding: 4 },
  content: { padding: 20, paddingBottom: 100 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  formGroup: { marginBottom: 16 },
  label: { marginBottom: 8, fontSize: 14 },
  input: { padding: 16, borderRadius: 16, fontSize: 16, borderWidth: 1 },
  textArea: { minHeight: 100 },
  togglesContainer: { borderRadius: 16, overflow: 'hidden', borderWidth: 1 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  toggleLabel: { fontSize: 16 },
  submitButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 18, borderRadius: 30, marginTop: 10 },
  submitButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  plateInputContainer: { marginBottom: 24 },
  plateFrame: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 4, borderColor: '#000', height: 64, flexDirection: 'row', overflow: 'hidden' },
  leftSection: { width: 50, height: '100%', borderRightWidth: 1, borderRightColor: '#E0E0E0', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  flag: { width: 36, height: 24, borderRadius: 2 },
  azText: { fontSize: 16, fontWeight: '900', color: '#000' },
  plateInputs: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  plateInputRegion: { fontSize: 24, fontWeight: 'bold', color: '#000', textAlign: 'center', width: 40, padding: 0 },
  plateInputSeries: { fontSize: 24, fontWeight: 'bold', color: '#000', textAlign: 'center', width: 50, padding: 0 },
  plateInputNumber: { fontSize: 24, fontWeight: 'bold', color: '#000', textAlign: 'center', width: 60, padding: 0 },
  plateDash: { width: 8, height: 5, backgroundColor: '#000', borderRadius: 2, marginHorizontal: 4 },
});
