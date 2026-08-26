import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  Dimensions, 
  ScrollView,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Alert
} from 'react-native';
import { X, User, Briefcase, DollarSign, Phone, Calendar, Fingerprint, Send, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CreditApplicationModalProps {
  visible: boolean;
  onClose: () => void;
  carId?: string | null;
  carTitle?: string;
  carPrice?: number;
  carCurrency?: string;
}

export const CreditApplicationModal = ({ 
  visible, 
  onClose, 
  carId, 
  carTitle = 'Avtomobil Krediti', 
  carPrice,
  carCurrency = 'AZN' 
}: CreditApplicationModalProps) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [finCode, setFinCode] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [phone, setPhone] = useState('');
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Auto-fill account details if logged in
  useEffect(() => {
    const fetchAccountDetails = async () => {
      if (visible && session?.user?.id) {
        try {
          const { data } = await supabase
            .from('accounts')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (data) {
            if (data.full_name && !fullName) setFullName(data.full_name);
            if (data.phone && !phone) setPhone(data.phone);
          }
        } catch (err: any) {
          console.log('Error prefilling account details:', err);
        }
      }
    };
    if (visible) {
      setSubmitted(false);
      setErrorMessage(null);
      fetchAccountDetails();
    }
  }, [visible, session]);

  // Smart formatting for Birth Date (GG.AA.YYYY)
  const handleBirthDateChange = (text: string) => {
    setErrorMessage(null);
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = '';
    if (cleaned.length > 0) formatted += cleaned.substring(0, 2);
    if (cleaned.length >= 3) formatted += '.' + cleaned.substring(2, 4);
    if (cleaned.length >= 5) formatted += '.' + cleaned.substring(4, 8);
    setBirthDate(formatted);
  };

  // Smart formatting for FIN code (max 7 chars, uppercase alphanumeric)
  const handleFinChange = (text: string) => {
    setErrorMessage(null);
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 7);
    setFinCode(cleaned);
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    // Validation
    if (!fullName.trim()) {
      setErrorMessage('Lütfən ad və soyadınızı daxil edin');
      return;
    }
    if (!finCode.trim()) {
      setErrorMessage('Lütfən FİN kodunuzu daxil edin');
      return;
    }
    if (!phone.trim()) {
      setErrorMessage('Lütfən əlaqə nömrənizi daxil edin');
      return;
    }

    setSubmitting(true);

    try {
      // Parse birth date safely
      let dbBirthDate: string | null = null;
      if (birthDate.trim()) {
        const cleaned = birthDate.trim().replace(/[^0-9]/g, '');
        if (cleaned.length === 8) {
          const day = cleaned.substring(0, 2);
          const month = cleaned.substring(2, 4);
          const year = cleaned.substring(4, 8);
          dbBirthDate = `${year}-${month}-${day}`;
        } else {
          const parts = birthDate.trim().replace(/[\/\-]/g, '.').split('.');
          if (parts.length === 3 && parts[0].length <= 2 && parts[2].length === 4) {
            dbBirthDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      }

      // Parse monthly income
      let parsedIncome: number | null = null;
      if (monthlyIncome.trim()) {
        const inc = parseFloat(monthlyIncome.replace(',', '.').trim());
        if (!isNaN(inc)) parsedIncome = inc;
      }

      // Resolve car UUID safely
      let resolvedCarId: string | null = null;
      if (carId) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(carId);
        if (isUuid) {
          resolvedCarId = carId;
        } else {
          try {
            const { data: carData } = await supabase
              .from('listings')
              .select('id')
              .eq('short_id', carId)
              .maybeSingle();
            if (carData?.id) {
              resolvedCarId = carData.id;
            }
          } catch (e) {
            console.log('Error resolving car ID:', e);
          }
        }
      }

      const insertPayload = {
        car_id: resolvedCarId,
        full_name: fullName.trim(),
        father_name: fatherName.trim() || null,
        fin_code: finCode.trim().toUpperCase(),
        birth_date: dbBirthDate,
        workplace: workplace.trim() || null,
        monthly_income: parsedIncome,
        phone: phone.trim(),
        status: 'pending',
        account_id: session?.user?.id || null
      };

      console.log('[Credit Application Modal] Submitting to Supabase:', insertPayload);

      const { data, error } = await supabase
        .from('credit_applications')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        console.error('[Credit Application Modal] Supabase error:', error);
        throw error;
      }

      console.log('[Credit Application Modal] Submitted successfully:', data);

      setSubmitted(true);
      showToast('Kredit müraciətiniz qəbul edildi!', 'success');
      
      // Reset form
      setFullName('');
      setFatherName('');
      setFinCode('');
      setBirthDate('');
      setWorkplace('');
      setMonthlyIncome('');
      setPhone('');
      setErrorMessage(null);

      setTimeout(() => {
        onClose();
        setSubmitted(false);
      }, 2200);

    } catch (e: any) {
      console.error('[Credit Application Modal] Submission error:', e);
      const msg = e?.message || 'Xəta baş verdi. Xahiş edirik yenidən cəhd edin.';
      setErrorMessage(msg);
      Alert.alert('Müraciət Xətası', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View 
          style={[
            styles.container, 
            { 
              backgroundColor: colors.card,
              paddingBottom: Platform.OS === 'ios' ? insets.bottom + 10 : 20
            }
          ]}
        >
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
          </View>

          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
                <Calendar size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.title, { color: colors.text }]}>Kredit Müraciəti</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                  {carTitle} {carPrice ? `• ${carPrice.toLocaleString()} ${carCurrency}` : ''}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          {submitted ? (
            <View style={styles.successContainer}>
              <View style={styles.successIconCircle}>
                <CheckCircle2 size={54} color="#34C759" />
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>Müraciətiniz Qəbul Edildi!</Text>
              <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
                Məlumatlarınız Naxçıvan Avto kredit mütəxəssislərinə göndərildi. Tezliklə sizinlə əlaqə saxlanılacaq.
              </Text>
            </View>
          ) : (
            <ScrollView 
              contentContainerStyle={styles.content} 
              keyboardShouldPersistTaps="handled" 
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formContainer}>
                
                {/* Error Banner */}
                {errorMessage && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={18} color="#FF3B30" style={{ marginRight: 8 }} />
                    <Text style={styles.errorText}>{errorMessage}</Text>
                  </View>
                )}

                {/* Ad Soyad */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Adı və Soyadı *</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <User size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.input, { color: colors.text }]}
                      value={fullName}
                      onChangeText={(t) => { setErrorMessage(null); setFullName(t); }}
                      placeholder="Məs: İlkin Rzayev"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>

                {/* Ata adı */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Ata adı</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <User size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.input, { color: colors.text }]}
                      value={fatherName}
                      onChangeText={(t) => { setErrorMessage(null); setFatherName(t); }}
                      placeholder="Məs: Əli oğlu"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>

                {/* FIN Kod & Doğum Tarixi */}
                <View style={styles.row}>
                  <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>FİN Kod *</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Fingerprint size={18} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput 
                        style={[styles.input, { color: colors.text }]}
                        value={finCode}
                        onChangeText={handleFinChange}
                        autoCapitalize="characters"
                        maxLength={7}
                        placeholder="7ABC123"
                        placeholderTextColor={colors.placeholder}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Doğum Tarixi</Text>
                    <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Calendar size={18} color={colors.textSecondary} style={styles.inputIcon} />
                      <TextInput 
                        style={[styles.input, { color: colors.text }]}
                        value={birthDate}
                        onChangeText={handleBirthDateChange}
                        placeholder="GG.AA.YYYY"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="numeric"
                        maxLength={10}
                      />
                    </View>
                  </View>
                </View>

                {/* Mobil nömrə */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Mobil nömrə *</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Phone size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.input, { color: colors.text }]}
                      value={phone}
                      onChangeText={(t) => { setErrorMessage(null); setPhone(t); }}
                      placeholder="Məs: +994 50 123 45 67"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="phone-pad"
                    />
                  </View>
                </View>

                {/* İş yeri */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>İşlədiyiniz yer / Fəaliyyət</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Briefcase size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.input, { color: colors.text }]}
                      value={workplace}
                      onChangeText={(t) => { setErrorMessage(null); setWorkplace(t); }}
                      placeholder="Məs: Naxçıvan MMC"
                      placeholderTextColor={colors.placeholder}
                    />
                  </View>
                </View>

                {/* Aylıq Qazanc */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Aylıq qazanc (₼)</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <DollarSign size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.input, { color: colors.text }]}
                      value={monthlyIncome}
                      onChangeText={(t) => { setErrorMessage(null); setMonthlyIncome(t); }}
                      placeholder="Məs: 1500"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity 
                  onPress={handleSubmit} 
                  disabled={submitting} 
                  style={{ marginTop: 8 }}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={[colors.primary, '#FF9500']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitBtn}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <>
                        <Send size={18} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.submitBtnText}>Müraciəti Göndər</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

              </View>
            </ScrollView>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    height: '92%', 
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: -5 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 10,
    elevation: 20
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    width: '100%',
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  subtitle: {
    fontSize: 12,
    fontFamily: 'RethinkSans_500Medium',
    marginTop: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  formContainer: {
    gap: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: '#FF3B30',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 13,
    fontFamily: 'RethinkSans_600SemiBold',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 2,
  },
  label: {
    fontSize: 13,
    fontFamily: 'RethinkSans_600SemiBold',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  row: {
    flexDirection: 'row',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 18,
    shadowColor: '#FF9500', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.25, 
    shadowRadius: 8,
    elevation: 4
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'RethinkSans_700Bold',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  successIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(52,199,89,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: 22,
    fontFamily: 'RethinkSans_800ExtraBold',
    textAlign: 'center',
    marginBottom: 10,
  },
  successSubtitle: {
    fontSize: 14,
    fontFamily: 'RethinkSans_400Regular',
    textAlign: 'center',
    lineHeight: 22,
  },
});
