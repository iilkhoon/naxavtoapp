import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MotiView, AnimatePresence } from 'moti';
import { Check, AlertCircle, Info } from 'lucide-react-native';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
});

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toast, setToast] = useState<{ message: string; type: ToastType; id: number } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    const id = Date.now();
    setToast({ message, type, id });
    
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 3000);
  }, []);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <Check size={20} color="#FFF" />;
      case 'error': return <AlertCircle size={20} color="#FFF" />;
      default: return <Info size={20} color="#FFF" />;
    }
  };

  const getBackgroundColor = (type: ToastType) => {
    switch (type) {
      case 'success': return '#4CD964';
      case 'error': return '#FF3B30';
      default: return '#007AFF';
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <AnimatePresence>
        {toast && (
          <MotiView
            from={{ opacity: 0, translateY: 100, scale: 0.9 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            exit={{ opacity: 0, translateY: 100, scale: 0.9 }}
            transition={{ type: 'spring', damping: 15 }}
            style={styles.toastContainer}
          >
            <View style={[styles.toast, { backgroundColor: getBackgroundColor(toast.type) }]}>
              <View style={styles.iconContainer}>
                {getIcon(toast.type)}
              </View>
              <Text style={styles.message}>{toast.message}</Text>
            </View>
          </MotiView>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 99999,
    elevation: 99999,
    pointerEvents: 'none',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 30,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 10,
    maxWidth: '90%',
  },
  iconContainer: {
    marginRight: 10,
  },
  message: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
