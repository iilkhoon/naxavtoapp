import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Check, Copy } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '../contexts/ToastContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SuccessModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  shortId?: string;
}

export const SuccessModal = ({ 
  visible, 
  onClose, 
  title = "Uğurlu!", 
  message = "Əməliyyat uğurla tamamlandı.",
  shortId
}: SuccessModalProps) => {
  const { colors, isDark } = useTheme();
  const { showToast } = useToast();

  const handleCopy = async () => {
    if (shortId) {
        await Clipboard.setStringAsync(shortId);
        showToast('Elan ID kopyalandı', 'success');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <View 
          style={[
            styles.modal, 
            { 
                backgroundColor: colors.card, 
                borderColor: colors.border,
                width: SCREEN_WIDTH * 0.85 
            }
        ]}>
          <View style={[styles.iconContainer, { backgroundColor: '#4CD964' }]}>
            <Check size={40} color="#FFF" strokeWidth={3} />
          </View>
          
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
          
          {shortId && (
            <TouchableOpacity 
                style={[styles.idBox, { backgroundColor: isDark ? '#333' : '#F3F4F6' }]}
                onPress={handleCopy}
            >
                <Text style={[styles.idLabel, { color: colors.textSecondary }]}>Elan ID:</Text>
                <Text style={[styles.idValue, { color: colors.primary }]}>{shortId}</Text>
                <Copy size={16} color={colors.textSecondary} style={{ marginLeft: 8 }} />
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={[styles.button, { backgroundColor: colors.primary }]} 
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Bağla</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modal: {
    borderRadius: 30,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: "#4CD964",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
    fontFamily: 'RethinkSans_500Medium',
  },
  idBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  idLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  idValue: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'RethinkSans_700Bold',
  },
});
