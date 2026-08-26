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
  Platform
} from 'react-native';
import { X, Calculator, Calendar, Percent, RefreshCcw, Banknote, CreditCard, Send } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CreditApplicationModal } from './CreditApplicationModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CreditCalculatorModalProps {
  visible: boolean;
  onClose: () => void;
  initialPrice?: string;
  carId?: string;
  carTitle?: string;
}

export const CreditCalculatorModal = ({ 
  visible, 
  onClose, 
  initialPrice = '',
  carId,
  carTitle
}: CreditCalculatorModalProps) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [price, setPrice] = useState(initialPrice);
  const [initialPayment, setInitialPayment] = useState('');
  const [rate, setRate] = useState('21'); 
  const [months, setMonths] = useState('36'); 

  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [totalPayment, setTotalPayment] = useState(0);
  const [principalAmount, setPrincipalAmount] = useState(0);
  const [showApplyModal, setShowApplyModal] = useState(false);

  useEffect(() => {
    if (visible && initialPrice) {
      setPrice(initialPrice);
    }
  }, [visible, initialPrice]);

  useEffect(() => {
    calculateLoan();
  }, [price, initialPayment, rate, months]);

  const calculateLoan = () => {
    const p = parseFloat(price) || 0;
    const down = parseFloat(initialPayment) || 0;
    const r = parseFloat(rate) || 0;
    const n = parseFloat(months) || 0;

    const principal = Math.max(0, p - down);
    setPrincipalAmount(principal);

    if (principal <= 0 || n <= 0) {
      setMonthlyPayment(0);
      setTotalInterest(0);
      setTotalPayment(0);
      return;
    }

    if (r === 0) {
      const monthly = principal / n;
      setMonthlyPayment(monthly);
      setTotalPayment(principal);
      setTotalInterest(0);
    } else {
      const monthlyRate = r / 12 / 100;
      const monthly = principal * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
      
      const total = monthly * n;
      const interest = total - principal;

      setMonthlyPayment(monthly);
      setTotalPayment(total);
      setTotalInterest(interest);
    }
  };

  const resetCalculator = () => {
    setPrice('');
    setInitialPayment('');
    setRate('21');
    setMonths('36');
  };

  const predefinedMonths = ['12', '24', '36', '48', '60'];

  const total = principalAmount + totalInterest;
  const principalPercent = total > 0 ? (principalAmount / total) * 100 : 0;
  const interestPercent = total > 0 ? (totalInterest / total) * 100 : 0;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent={true}
      hardwareAccelerated={false} // Important for Android visibility
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        
        <View 
            style={[
                styles.container, 
                { 
                    backgroundColor: colors.card,
                    paddingBottom: insets.bottom
                }
            ]}
        >
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
          </View>

          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
                <Calculator size={20} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Kredit Hesablayıcı</Text>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={resetCalculator} style={[styles.iconBtn, { marginRight: 8, backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
                <RefreshCcw size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={[styles.iconBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
                <X size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View>
              <LinearGradient
                colors={[colors.primary, '#FF6B6B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.resultCard}
              >
                <View style={styles.monthlyContainer}>
                  <Text style={styles.monthlyLabel}>Aylıq Ödəniş</Text>
                  <View style={styles.amountRow}>
                    <Text style={styles.monthlyAmount}>{monthlyPayment.toFixed(0)}</Text>
                    <Text style={styles.currencySymbol}>₼</Text>
                  </View>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.summaryRow}>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Əsas Məbləğ</Text>
                    <Text style={styles.summaryValue}>{principalAmount.toLocaleString()} ₼</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Faiz Məbləği</Text>
                    <Text style={styles.summaryValue}>{totalInterest.toFixed(0)} ₼</Text>
                  </View>
                  <View style={styles.summaryItem}>
                    <Text style={styles.summaryLabel}>Yekun</Text>
                    <Text style={styles.summaryValue}>{totalPayment.toFixed(0)} ₼</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {totalPayment > 0 && (
                <View style={styles.visualBarContainer}>
                    <View style={styles.visualBar}>
                        <View style={[styles.barSegment, { flex: principalPercent, backgroundColor: '#4CD964' }]} />
                        <View style={[styles.barSegment, { flex: interestPercent, backgroundColor: '#FF9500' }]} />
                    </View>
                    <View style={styles.legendContainer}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#4CD964' }]} />
                            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Əsas ({Math.round(principalPercent)}%)</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
                            <Text style={[styles.legendText, { color: colors.textSecondary }]}>Faiz ({Math.round(interestPercent)}%)</Text>
                        </View>
                    </View>
                </View>
            )}

            <View style={styles.inputsContainer}>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Qiymət (AZN)</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Banknote size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.input, { color: colors.text }]}
                      value={price}
                      onChangeText={setPrice}
                      placeholder="0"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>İlkin Ödəniş</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <CreditCard size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.input, { color: colors.text }]}
                      value={initialPayment}
                      onChangeText={setInitialPayment}
                      placeholder="0"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>İllik Faiz (%)</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Percent size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.input, { color: colors.text }]}
                      value={rate}
                      onChangeText={setRate}
                      placeholder="0"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Müddət (Ay)</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Calendar size={18} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput 
                      style={[styles.input, { color: colors.text }]}
                      value={months}
                      onChangeText={setMonths}
                      placeholder="0"
                      placeholderTextColor={colors.placeholder}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.quickMonthsContainer}>
                <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>Tez Seçim</Text>
                <View style={styles.quickMonths}>
                    {predefinedMonths.map((m) => (
                    <TouchableOpacity
                        key={m}
                        style={[
                        styles.monthPill, 
                        { 
                            backgroundColor: months === m ? colors.primary : (isDark ? '#333' : '#F3F4F6'),
                            borderColor: months === m ? colors.primary : 'transparent'
                        }
                        ]}
                        onPress={() => setMonths(m)}
                    >
                        <Text style={[
                        styles.monthText, 
                        { color: months === m ? '#FFF' : colors.text }
                        ]}>{m} ay</Text>
                    </TouchableOpacity>
                    ))}
                </View>
              </View>

              {/* Apply for Credit Button */}
              <TouchableOpacity 
                style={styles.applyBtnWrap}
                onPress={() => setShowApplyModal(true)}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={[colors.primary, '#FF9500']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.calcApplyBtn}
                >
                  <Send size={18} color="#FFF" style={{ marginRight: 8 }} />
                  <Text style={styles.calcApplyBtnText}>Bu Şərtlərlə Müraciət Et</Text>
                </LinearGradient>
              </TouchableOpacity>

            </View>
          </ScrollView>
        </View>
      </View>

      <CreditApplicationModal
        visible={showApplyModal}
        onClose={() => setShowApplyModal(false)}
        carId={carId}
        carTitle={carTitle || (price ? `${parseFloat(price).toLocaleString()} AZN Krediti` : 'Avtomobil Krediti')}
        carPrice={parseFloat(price) || undefined}
      />
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
    height: '90%', // Bottom sheet style
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
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'RethinkSans_800ExtraBold',
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
  resultCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: "#FF3B30", 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 12,
    elevation: 8
  },
  monthlyContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  monthlyLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  monthlyAmount: {
    color: '#FFF',
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 56,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  currencySymbol: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 8,
    marginLeft: 4,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  summaryValue: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'RethinkSans_700Bold',
  },
  visualBarContainer: {
    marginBottom: 24,
  },
  visualBar: {
    height: 8,
    borderRadius: 4,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#F0F0F0',
    marginBottom: 8,
  },
  barSegment: {
    height: '100%',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'RethinkSans_500Medium',
  },
  inputsContainer: {
    gap: 16,
  },
  inputGroup: {
    marginBottom: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 4,
    fontFamily: 'RethinkSans_600SemiBold',
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
    fontSize: 17,
    fontWeight: '600',
    fontFamily: 'RethinkSans_600SemiBold',
  },
  row: {
    flexDirection: 'row',
  },
  quickMonthsContainer: {
    marginTop: 8,
  },
  quickMonths: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  monthPill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  monthText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'RethinkSans_600SemiBold',
  },
  applyBtnWrap: {
    marginTop: 14,
  },
  calcApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  calcApplyBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontFamily: 'RethinkSans_700Bold',
  },
});
