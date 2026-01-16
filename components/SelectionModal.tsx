import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  TextInput,
  Image,
  Dimensions,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { X, Search, Check, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

interface SelectionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: any[];
  onSelect: (item: any) => void;
  selectedId?: string | number;
}

export const SelectionModal = ({ 
  visible, 
  onClose, 
  title, 
  items, 
  onSelect,
  selectedId 
}: SelectionModalProps) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
      statusBarTranslucent={true}
      hardwareAccelerated={false}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <View 
            style={[
                styles.container, 
                { 
                    backgroundColor: colors.card,
                    paddingBottom: insets.bottom
                }
            ]}
        >
          {/* Drag Handle */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]} />
          </View>

          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity 
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#F3F4F6' }]}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrapper}>
            <View style={[styles.searchBar, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6', borderColor: colors.border }]}>
              <Search size={18} color={colors.textSecondary} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Axtar..."
                placeholderTextColor={colors.placeholder}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                    <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <FlatList
            data={filteredItems}
            keyExtractor={(item) => item.id.toString()}
            style={{ width: '100%', flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => {
              const isSelected = item.name === selectedId || item.id === selectedId;
              return (
                <TouchableOpacity 
                    style={[
                        styles.item, 
                        { 
                            backgroundColor: isSelected ? (isDark ? '#333' : '#F0F9FF') : 'transparent',
                            borderColor: isSelected ? colors.primary : colors.border,
                        }
                    ]}
                    onPress={() => {
                        onSelect(item);
                        onClose();
                        setSearch('');
                    }}
                    activeOpacity={0.7}
                >
                    <View style={styles.itemContent}>
                        {item.logo_url && (
                            <Image 
                                source={{ uri: item.logo_url }} 
                                style={styles.logo} 
                                resizeMode="contain"
                            />
                        )}
                        <Text style={[
                            styles.itemText, 
                            { color: colors.text },
                            isSelected && { color: colors.primary, fontWeight: '700' }
                        ]}>
                            {item.name}
                        </Text>
                    </View>
                    {isSelected ? (
                        <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                            <Check size={14} color="#FFF" />
                        </View>
                    ) : (
                        <ChevronRight size={18} color={colors.border} />
                    )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={{ color: colors.textSecondary }}>Nəticə tapılmadı</Text>
              </View>
            }
          />
        </View>
      </View>
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
    height: '85%', // Fixed percentage height for bottom sheet feel
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: 'RethinkSans_800ExtraBold',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    fontSize: 16,
    height: '100%',
    fontFamily: 'RethinkSans_500Medium',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
    marginBottom: 10,
    borderWidth: 1,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 12,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'RethinkSans_600SemiBold',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
});
