import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  StatusBar
} from 'react-native';
import { RefreshCcw, Banknote, CreditCard, ArrowLeft, Calendar, Percent, Send } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { CreditApplicationModal } from '../components/CreditApplicationModal';

export default function CalculatorScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  
  const initialPriceParam = params.initialPrice ? params.initialPrice.toString() : '';
  const carIdParam = params.carId ? params.carId.toString() : '';
  const carTitleParam = params.carTitle ? params.carTitle.toString() : '';
  
  const [price, setPrice] = useState(initialPriceParam);
  const [initialPayment, setInitialPayment] = useState('');
  const [rate, setRate] = useState('21'); 
  const [months, setMonths] = useState('36'); 

  const [monthlyPayment, setMonthlyPayment] = useState(0);
  const [totalInterest, setTotalInterest] = useState(0);
  const [totalPayment, setTotalPayment] = useState(0);
  const [principalAmount, setPrincipalAmount] = useState(0);
  const [showApplyModal, setShowApplyModal] = useState(false);

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
    <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
          <Stack.Screen options={{ headerShown: false }} />

          {/* Header */}
          <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border, paddingTop: Platform.OS === 'ios' ? 60 : 40 }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <ArrowLeft size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Kredit Hesablayıcı</Text>
            <TouchableOpacity onPress={resetCalculator} style={styles.resetButton}>
                <RefreshCcw size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 20 }]} 
            keyboardShouldPersistTaps="handled" 
            showsVerticalScrollIndicator={false}
          >
            {/* Result Card */}
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

            {/* Visual Breakdown */}
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

            {/* Inputs */}
            <View style={styles.inputsContainer}>
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 12 }]}>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Qiymət (AZN)</Text>
                  <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                  <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                  <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                  <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
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
                            backgroundColor: months === m ? colors.primary : colors.card,
                            borderColor: months === m ? colors.primary : colors.border
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
                  <Text style={styles.calcApplyBtnText}>Bu Şərtlərlə Kreditə Müraciət Et</Text>
                </LinearGradient>
              </TouchableOpacity>

            </View>
          </ScrollView>

          <CreditApplicationModal
            visible={showApplyModal}
            onClose={() => setShowApplyModal(false)}
            carId={carIdParam || null}
            carTitle={carTitleParam || (price ? `${parseFloat(price).toLocaleString()} AZN Krediti` : 'Avtomobil Krediti')}
            carPrice={parseFloat(price) || undefined}
          />
        </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  resetButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'RethinkSans_700Bold',
  },
  content: {
    padding: 20,
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
    lineHeight: 56,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  currencySymbol: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 24,
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
    marginBottom: 4,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  summaryValue: {
    color: '#FFF',
    fontSize: 15,
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
    fontFamily: 'RethinkSans_600SemiBold',
  },
  applyBtnWrap: {
    marginTop: 16,
    marginBottom: 10,
  },
  calcApplyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 54,
    borderRadius: 16,
    shadowColor: '#FF9500',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  calcApplyBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'RethinkSans_700Bold',
  },
});
