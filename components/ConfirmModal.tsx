import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, Pressable, Dimensions, Platform } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Bəli",
  cancelText = "Xeyr",
  isDestructive = false
}: ConfirmModalProps) => {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onCancel} />
        
        {visible && (
            <View 
                style={[
                    styles.modal, 
                    { 
                        backgroundColor: colors.card, 
                        borderColor: colors.border,
                        width: SCREEN_WIDTH * 0.85 
                    }
                ]}
            >
            <View style={[styles.iconContainer, { backgroundColor: isDestructive ? 'rgba(255,59,48,0.1)' : 'rgba(0,122,255,0.1)' }]}>
                <AlertTriangle size={32} color={isDestructive ? '#FF3B30' : colors.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
            
            <View style={styles.buttonRow}>
                <TouchableOpacity style={[styles.cancelButton, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]} onPress={onCancel}>
                <Text style={[styles.cancelText, { color: colors.text }]}>{cancelText}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                style={[
                    styles.confirmButton, 
                    isDestructive ? { backgroundColor: '#FF3B30' } : { backgroundColor: colors.primary }
                ]} 
                onPress={onConfirm}
                >
                <Text style={styles.confirmText}>{confirmText}</Text>
                </TouchableOpacity>
            </View>
            </View>
        )}
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
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modal: {
    borderRadius: 28,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    fontFamily: 'RethinkSans_500Medium',
  },
  buttonRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontWeight: '600',
    fontSize: 15,
    fontFamily: 'RethinkSans_600SemiBold',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  confirmText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
    fontFamily: 'RethinkSans_700Bold',
  },
});
