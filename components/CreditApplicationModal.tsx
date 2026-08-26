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
  ActivityIndicator
} from 'react-native';
import { X, User, Briefcase, DollarSign, Phone, Calendar, Fingerprint, Send } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CreditApplicationModalProps {
  visible: boolean;
  onClose: () => void;
  carId: string;
  carTitle: string;
  carPrice: number;
  carCurrency?: string;
}

export const CreditApplicationModal = ({ 
  visible, 
  onClose, 
  carId, 
  carTitle, 
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
  
  const [submitting, setSubmitting] = useState(false);

  // Auto-fill fullName and phone if logged in
  useEffect(() => {
    const fetchAccountDetails = async () => {
      if (visible && session?.user?.id) {
        try {
          const { data, error } = await supabase.from('accounts')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (error) throw error;
          if (data) {
            if (data.full_name) setFullName(data.full_name);
            if (data.phone) setPhone(data.phone);
          }
        } catch (err: any) {
          console.log('Error prefilling account details:', err);
        }
      }
    };
    fetchAccountDetails();
  }, [visible, session]);

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      showToast('Lütfən ad və soyadınızı daxil edin', 'error');
      return;
    }
    if (!fatherName.trim()) {
      showToast('Lütfən ata adınızı daxil edin', 'error');
      return;
    }
    if (finCode.trim().length !== 7) {
      showToast('FIN kod tam olaraq 7 simvol olmalıdır', 'error');
      return;
    }
    if (!birthDate.trim()) {
      showToast('Lütfən doğum tarixinizi daxil edin', 'error');
      return;
    }

    // Validate date format DD.MM.YYYY
    const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
    if (!dateRegex.test(birthDate.trim())) {
      showToast('Doğum tarixi GG.AA.YYYY formatında olmalıdır', 'error');
      return;
    }

    if (!workplace.trim()) {
      showToast('Lütfən işlədiyiniz yeri daxil edin', 'error');
      return;
    }
    if (!monthlyIncome.trim() || isNaN(Number(monthlyIncome))) {
      showToast('Lütfən aylıq qazancınızı düzgün daxil edin', 'error');
      return;
    }
    if (!phone.trim()) {
      showToast('Lütfən mobil nömrənizi daxil edin', 'error');
      return;
    }

    setSubmitting(true);

    try {
      // Format birthdate from DD.MM.YYYY to YYYY-MM-DD
      const parts = birthDate.trim().split('.');
      const dbBirthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;

      const { error } = await supabase
        .from('credit_applications')
        .insert({
          car_id: carId,
          full_name: fullName.trim(),
          father_name: fatherName.trim(),
          fin_code: finCode.trim().toUpperCase(),
          birth_date: dbBirthDate,
          workplace: workplace.trim(),
          monthly_income: parseFloat(monthlyIncome),
          phone: phone.trim(),
          status: 'pending',
          account_id: session?.user?.id || null
        });

      if (error) throw error;

      showToast('Kredit müraciətiniz uğurla göndərildi!', 'success');
      
      // Reset form
      setFullName('');
      setFatherName('');
      setFinCode('');
      setBirthDate('');
      setWorkplace('');
      setMonthlyIncome('');
      setPhone('');
      
      onClose();
    } catch (e: any) {
      showToast('Müraciət zamanı xəta baş verdi: ' + e.message, 'error');
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
      <View style={styles.overlay}>
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

          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
                <Calendar size={20} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>Kredit Müraciəti</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                  {carTitle} • {carPrice.toLocaleString()} {carCurrency}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            contentContainerStyle={styles.content} 
            keyboardShouldPersistTaps="handled" 
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formContainer}>
              
              {/* Ad Soyad */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Adı və Soyadı</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <User size={18} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput 
                    style={[styles.input, { color: colors.text }]}
                    value={fullName}
                    onChangeText={setFullName}
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
                    onChangeText={setFatherName}
                    placeholder="Məs: Əli oğlu"
                    placeholderTextColor={colors.placeholder}
                  />
                </View>
              </View>

              {/* FIN Kod & Doğum Tarixi */}
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>FİN Kod</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Fingerprint size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.input, { color: colors.text }]}
                      value={finCode}
                      onChangeText={(val) => setFinCode(val.substring(0, 7))}
                      autoCapitalize="characters"
                      placeholder="Məs: 7ABC123"
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
                      onChangeText={setBirthDate}
                      placeholder="GG.AA.YYYY"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* İş yeri */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>İşlədiyiniz yer</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Briefcase size={18} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput 
                    style={[styles.input, { color: colors.text }]}
                    value={workplace}
                    onChangeText={setWorkplace}
                    placeholder="Məs: Bakı Avto MMC"
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
                    onChangeText={setMonthlyIncome}
                    placeholder="Məs: 1500"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Mobil nömrə */}
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: colors.textSecondary }]}>Mobil nömrə</Text>
                <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Phone size={18} color={colors.textSecondary} style={styles.inputIcon} />
                  <TextInput 
                    style={[styles.input, { color: colors.text }]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Məs: +994 50 123 45 67"
                    placeholderTextColor={colors.placeholder}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity 
                onPress={handleSubmit} 
                disabled={submitting} 
                style={{ marginTop: 12 }}
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
                      <Text style={styles.submitBtnText}>Müraciət Et</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </View>
      </View>
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
    gap: 16,
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
    height: 54,
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
});
