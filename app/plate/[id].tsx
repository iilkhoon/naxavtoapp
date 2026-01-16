import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  StatusBar,
  Linking,
  Share,
  Platform,
  ScrollView,
  Alert,
  Image
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { 
  ArrowLeft, 
  Share2, 
  Phone, 
  Clock,
  MapPin,
  ShieldCheck,
  Hash,
  Copy
} from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { Colors } from '../../constants/Colors';
import { MotiView } from 'moti';
import { AnimatedPressable } from '../../components/ui/AnimatedPressable';
import { format } from 'date-fns';
import { useTheme } from '../../contexts/ThemeContext';
import { useSettings } from '../../contexts/SettingsContext';
import { PlateVisual } from '../../components/PlateVisual';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '../../contexts/ToastContext';

export default function PlateDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const { settings } = useSettings();
  const { showToast } = useToast();
  
  const [plate, setPlate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlateDetails();
  }, [id]);

  const fetchPlateDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('plates')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setPlate(data);
    } catch (error) {
      console.error('Error fetching plate:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const message = `Naxavto-da bu nömrəyə bax: ${plate.region}-${plate.series}-${plate.number} - ${plate.price} AZN`;
    
    try {
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: 'Naxavto',
            text: message,
            url: window.location.href,
          });
        } else {
          Alert.alert('Paylaşım', 'Bu brauzer paylaşımı dəstəkləmir.');
        }
      } else {
        await Share.share({
          message,
        });
      }
    } catch (error: any) {
      if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
        console.log('Share error:', error);
      }
    }
  };

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleCopyId = async () => {
    if (plate?.short_id || plate?.id) {
        await Clipboard.setStringAsync(plate.short_id || plate.id);
        showToast('Elan ID kopyalandı', 'success');
    }
  };

  // Determine Logo URL based on theme
  const logoUrl = isDark ? settings.site_logo_dark : settings.site_logo_light;

  // Get Admin Phones from Settings
  const adminPhones = Object.keys(settings)
    .filter(k => k.startsWith('phone_') && settings[k])
    .sort()
    .map(k => settings[k]);
  
  if (adminPhones.length === 0 && settings.phone) adminPhones.push(settings.phone);
  if (adminPhones.length === 0) adminPhones.push('+994 50 123 45 67'); // Default fallback

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!plate) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text }}>Nömrə tapılmadı</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary }}>Geri qayıt</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        <AnimatedPressable style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text} />
        </AnimatedPressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Nömrə Detalları</Text>
        <AnimatedPressable style={[styles.iconButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleShare}>
          <Share2 size={22} color={colors.text} />
        </AnimatedPressable>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Visual Plate Display */}
        <MotiView 
            from={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring' }}
            style={styles.plateContainer}
        >
            <PlateVisual 
                region={plate.region} 
                series={plate.series} 
                number={plate.number} 
                scale={1.1}
            />
            
            {plate.is_vip && (
                <View style={styles.vipTag}>
                    <Text style={styles.vipText}>VIP Nömrə</Text>
                </View>
            )}
        </MotiView>

        {/* Info Cards */}
        <MotiView 
            from={{ translateY: 20, opacity: 0 }}
            animate={{ translateY: 0, opacity: 1 }}
            delay={200}
            style={styles.detailsContainer}
        >
            {/* ID Display - Now using Short ID */}
            <TouchableOpacity 
                style={[styles.idContainer, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]} 
                onPress={handleCopyId}
            >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Hash size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
                    <Text style={[styles.idText, { color: colors.textSecondary }]}>
                        Elan ID: {plate.short_id || plate.id.split('-')[0].toUpperCase()}
                    </Text>
                </View>
                <Copy size={14} color={colors.textSecondary} />
            </TouchableOpacity>

            <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>Qiymət</Text>
                <Text style={[styles.priceValue, { color: colors.primary }]}>{plate.price.toLocaleString()} AZN</Text>
            </View>

            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.infoRow}>
                    <Clock size={18} color={colors.textSecondary} />
                    <Text style={[styles.infoText, { color: colors.text }]}>
                        Elan tarixi: {format(new Date(plate.created_at), 'dd.MM.yyyy')}
                    </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.infoRow}>
                    <MapPin size={18} color={colors.textSecondary} />
                    <Text style={[styles.infoText, { color: colors.text }]}>Şəhər: Naxçıvan</Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />
                <View style={styles.infoRow}>
                    <ShieldCheck size={18} color={Colors.dark.success} />
                    <Text style={[styles.infoText, { color: Colors.dark.success }]}>
                        Yoxlanılmış Satıcı
                    </Text>
                </View>
            </View>

            {/* Seller / Contact Section */}
            <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
                <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 12 }]}>Satıcı</Text>
                
                <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 16}}>
                    <View style={{marginRight: 12, position: 'relative'}}>
                        <Image 
                            source={{ uri: logoUrl || 'https://via.placeholder.com/50' }} 
                            style={{width: 50, height: 50, borderRadius: 25, backgroundColor: isDark ? 'transparent' : '#F8F9FA'}} 
                            resizeMode="contain"
                        />
                        <View style={{position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#4CD964', borderWidth: 2, borderColor: '#FFF'}} />
                    </View>
                    <View>
                        <Text style={[styles.sellerName, { color: colors.text }]}>{settings.seller_name || 'Naxçıvan Avto'}</Text>
                        <Text style={{color: colors.textSecondary, fontSize: 12}}>Rəsmi Satıcı</Text>
                    </View>
                </View>
                
                <View style={styles.contactList}>
                    {adminPhones.map((phone, index) => (
                        <TouchableOpacity 
                            key={index} 
                            style={[styles.contactItem, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]} 
                            onPress={() => handleCall(phone)}
                        >
                            <Phone size={18} color={colors.primary} />
                            <Text style={[styles.contactText, { color: colors.text }]}>{phone}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {plate.description ? (
                <View style={[styles.descriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Açıqlama</Text>
                    <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{plate.description}</Text>
                </View>
            ) : null}

            {/* Footer Info */}
            <View style={styles.footerInfo}>
                <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                    Avtomobil və nömrə haqqında ətraflı məlumat üçün bizimlə əlaqə saxlayın!
                </Text>
                <Text style={[styles.devCredit, { color: colors.textSecondary }]}>
                    İlkin Rzayev / Novoloji / +994 55 466 66 63
                </Text>
            </View>

            <View style={{ height: 100 }} />
        </MotiView>
      </ScrollView>

      {/* Footer Actions */}
      <MotiView 
        from={{ translateY: 100 }}
        animate={{ translateY: 0 }}
        delay={300}
        style={[styles.footer, { backgroundColor: colors.card, borderTopColor: colors.border }]}
      >
        <AnimatedPressable style={[styles.callButton, { backgroundColor: colors.primary }]} onPress={() => handleCall(adminPhones[0])}>
          <Phone size={20} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.callButtonText}>Zəng et</Text>
        </AnimatedPressable>
      </MotiView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 20, zIndex: 10 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  iconButton: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 120 },
  plateContainer: { alignItems: 'center', marginVertical: 30 },
  vipTag: { marginTop: 20, backgroundColor: '#FFD700', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  vipText: { color: '#000', fontWeight: 'bold', fontSize: 14 },
  detailsContainer: { gap: 16 },
  idContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, marginBottom: 8 },
  idText: { fontSize: 12, fontWeight: '500' },
  priceCard: { padding: 20, borderRadius: 20, alignItems: 'center', borderWidth: 1 },
  priceLabel: { fontSize: 14, marginBottom: 4 },
  priceValue: { fontSize: 32, fontWeight: 'bold' },
  infoCard: { padding: 20, borderRadius: 20, borderWidth: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoText: { fontSize: 15 },
  divider: { height: 1, marginVertical: 16 },
  descriptionCard: { padding: 20, borderRadius: 20, borderWidth: 1 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  sellerName: { fontSize: 16, fontWeight: 'bold' },
  contactList: { gap: 10 },
  contactItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, gap: 10 },
  contactText: { fontSize: 16, fontWeight: '600' },
  descriptionText: { fontSize: 15, lineHeight: 24 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingVertical: 16, paddingBottom: Platform.OS === 'ios' ? 34 : 16, flexDirection: 'row', gap: 12, borderTopWidth: 1 },
  callButton: { flex: 1, height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  callButtonText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  
  // Footer Info Styles
  footerInfo: {
    marginTop: 20,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  disclaimerText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  devCredit: {
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    opacity: 0.5,
  },
});
