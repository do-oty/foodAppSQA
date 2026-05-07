import React, { createContext, useContext, useState, useCallback } from 'react';
import { Modal, View, Text, Pressable, Animated, StyleSheet, Dimensions } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

type AlertType = 'success' | 'error' | 'info' | 'warning';

interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) throw new Error('useAlert must be used within AlertProvider');
  return context;
};

export const AlertProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);
  const [anim] = useState(new Animated.Value(0));

  const showAlert = useCallback((opts: AlertOptions) => {
    setOptions(opts);
    setVisible(true);
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 90,
    }).start();
  }, [anim]);

  const hideAlert = useCallback(() => {
    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      setOptions(null);
    });
  }, [anim]);

  const handleConfirm = () => {
    options?.onConfirm?.();
    hideAlert();
  };

  const handleCancel = () => {
    options?.onCancel?.();
    hideAlert();
  };

  const getTypeColor = () => {
    switch (options?.type) {
      case 'success': return '#22C55E';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      default: return '#7C3AED';
    }
  };

  const getTypeIcon = () => {
    switch (options?.type) {
      case 'success': return 'check-circle';
      case 'error': return 'exclamation-circle';
      case 'warning': return 'exclamation-triangle';
      default: return 'info-circle';
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <Modal transparent visible={visible} animationType="none" onRequestClose={hideAlert}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={hideAlert} />
          <Animated.View 
            style={[
              styles.container,
              { 
                opacity: anim,
                transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }]
              }
            ]}
          >
            <View style={[styles.header, { backgroundColor: getTypeColor() + '15' }]}>
              <FontAwesome name={getTypeIcon()} size={28} color={getTypeColor()} />
            </View>
            
            <View className="px-6 pb-6 pt-4 items-center">
              <Text className="font-inter-bold text-xl text-violet-900 text-center">{options?.title}</Text>
              <Text className="mt-2 font-inter-light text-sm text-violet-500 text-center leading-5">
                {options?.message}
              </Text>
              
              <View className="mt-6 w-full flex-row" style={{ gap: 12 }}>
                {options?.showCancel && (
                  <Pressable 
                    onPress={handleCancel}
                    className="flex-1 h-12 items-center justify-center rounded-2xl border border-violet-100 bg-white"
                  >
                    <Text className="font-inter-semibold text-sm text-violet-400">
                      {options.cancelText || 'Cancel'}
                    </Text>
                  </Pressable>
                )}
                <Pressable 
                  onPress={handleConfirm}
                  style={{ backgroundColor: getTypeColor() }}
                  className="flex-1 h-12 items-center justify-center rounded-2xl shadow-sm"
                >
                  <Text className="font-inter-bold text-sm text-white">
                    {options?.confirmText || 'Got it'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </AlertContext.Provider>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 12, 41, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    height: 80,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
