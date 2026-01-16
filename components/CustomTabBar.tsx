import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Home, Heart, Plus, ArrowLeftRight, Phone } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Calculate bottom position
  const bottomMargin = Platform.OS === 'ios' && insets.bottom > 0 ? insets.bottom : 20;

  return (
    <View style={[
        styles.container, 
        { bottom: bottomMargin }
    ]}>
      <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 50}
        tint="dark"
        style={styles.blurContainer}
      >
        <View style={styles.tabRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            const onPress = () => {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            // Special Case for "Add" Button
            if (route.name === 'add') {
              return (
                <View 
                    key={index} 
                    style={[styles.addButtonWrapper, { pointerEvents: 'box-none' }]}
                >
                    <TouchableOpacity
                        onPress={onPress}
                        activeOpacity={0.9}
                        style={styles.addButtonContainer}
                    >
                        <MotiView
                            from={{ scale: 1 }}
                            animate={{ scale: isFocused ? 1.05 : 1 }}
                            transition={{ type: 'spring', damping: 10 }}
                            style={[styles.addButton, { backgroundColor: '#FF3B30' }]} 
                        >
                            <Plus size={28} color="#FFF" strokeWidth={3} />
                        </MotiView>
                        <View style={styles.badgeContainer}>
                            <Text 
                                style={styles.badgeText} 
                                numberOfLines={1} 
                                adjustsFontSizeToFit 
                                minimumFontScale={0.7}
                            >
                                YENİ ELAN
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
              );
            }

            // Custom Icon Logic
            let Icon = Home;
            if (route.name === 'index') Icon = Home;
            else if (route.name === 'favorites') Icon = Heart;
            else if (route.name === 'compare') Icon = ArrowLeftRight;
            else if (route.name === 'contact') Icon = Phone;

            return (
              <TouchableOpacity
                key={index}
                onPress={onPress}
                style={styles.tabItem}
                activeOpacity={0.7}
              >
                <MotiView
                  animate={{
                    scale: isFocused ? 1.1 : 1,
                    translateY: isFocused ? -2 : 0,
                  }}
                  transition={{ type: 'spring', damping: 12 }}
                  style={styles.iconContainer}
                >
                  <Icon 
                    size={24} 
                    color={isFocused ? '#FF3B30' : '#8E8E93'} 
                    fill={isFocused && route.name === 'favorites' ? '#FF3B30' : 'transparent'}
                  />
                </MotiView>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    elevation: 0,
    zIndex: 100,
  },
  blurContainer: {
    borderRadius: 30,
    overflow: 'visible', 
    height: 60,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(15,15,15,0.9)',
    boxShadow: '0px 10px 20px rgba(0,0,0,0.3)',
    elevation: 10,
    justifyContent: 'center',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: '100%',
    paddingHorizontal: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    zIndex: 20,
  },
  addButtonContainer: {
    position: 'absolute',
    top: -15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 8px 12px rgba(255, 59, 48, 0.4)',
    elevation: 8,
    borderWidth: 4,
    borderColor: '#121212', 
  },
  badgeContainer: {
    backgroundColor: '#34C759', 
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
    borderWidth: 2,
    borderColor: '#121212',
    position: 'absolute',
    bottom: -18,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 8,
    fontFamily: 'RethinkSans_800ExtraBold',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.2,
  }
});
