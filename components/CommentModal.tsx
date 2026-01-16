import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { X, Send, User, MessageSquare } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CommentModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (fullName: string, text: string) => Promise<void>;
}

export const CommentModal = ({ visible, onClose, onSubmit }: CommentModalProps) => {
  const [fullName, setFullName] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const handleSubmit = async () => {
    if (!fullName.trim() || !text.trim()) return;
    setLoading(true);
    await onSubmit(fullName, text);
    setLoading(false);
    setFullName('');
    setText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
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
                    paddingBottom: insets.bottom + 20
                }
            ]}
        >
            <View style={styles.handleContainer}>
                <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
            </View>

            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <Text style={[styles.title, { color: colors.text }]}>Rəy Bildir</Text>
                <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}>
                    <X size={20} color={colors.text} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}15` }]}>
                        <MessageSquare size={32} color={colors.primary} />
                    </View>
                    <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                        Fikirləriniz bizim üçün önəmlidir.
                    </Text>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Ad və Soyad</Text>
                    <View style={[styles.inputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <User size={20} color={colors.textSecondary} style={{marginRight: 10}} />
                        <TextInput
                            style={[styles.input, { color: colors.text }]}
                            placeholder="Adınızı daxil edin"
                            placeholderTextColor={colors.placeholder}
                            value={fullName}
                            onChangeText={setFullName}
                        />
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Rəyiniz</Text>
                    <View style={[
                        styles.textAreaContainer, 
                        { 
                            backgroundColor: colors.background, 
                            borderColor: colors.border 
                        }
                    ]}>
                        <TextInput
                            style={[styles.input, styles.textArea, { color: colors.text }]}
                            placeholder="Fikirlərinizi yazın..."
                            placeholderTextColor={colors.placeholder}
                            value={text}
                            onChangeText={setText}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.submitButton, { backgroundColor: colors.primary }, (!fullName || !text) && styles.disabledButton]} 
                    onPress={handleSubmit}
                    disabled={loading || !fullName || !text}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Send size={20} color="#FFF" style={{ marginRight: 8 }} />
                            <Text style={styles.submitText}>Göndər</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtitle: {
    fontSize: 14,
    maxWidth: '70%',
    fontFamily: 'RethinkSans_500Medium',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'RethinkSans_600SemiBold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'RethinkSans_500Medium',
  },
  textAreaContainer: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 120,
  },
  textArea: {
    height: '100%',
  },
  submitButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.5,
  },
  submitText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
    fontFamily: 'RethinkSans_700Bold',
  },
});
