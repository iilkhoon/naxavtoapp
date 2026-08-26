import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions, DeviceEventEmitter } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Home, Heart, Plus, User, Phone } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { MotiView } from 'moti';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SCREEN_WIDTH = Dimensions.get('window').width;

export const CustomTabBar = ({ state, descriptors, navigation }: BottomTabBarProps) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Floating bottom margin
  // Respects safe area bottom on all platforms so it doesn't get covered by the Android system navbar.
  const bottomMargin = insets.bottom > 0 ? insets.bottom + (Platform.OS === 'android' ? 12 : 0) : 24;

  return (
    <View style={[styles.container, { bottom: bottomMargin }]}>
      {/* Liquid Glass Background */}
      <View style={styles.glassContainer}>
        <BlurView
          intensity={90} // Heavy blur for "Liquid" feel
          tint={isDark ? "systemMaterialDark" : "systemMaterialLight"} // Adapts nicely
          style={StyleSheet.absoluteFill}
        />
        {/* Subtle Gradient/Noise overlay could go here if we had an image, but pure blur is cleaner */}
        <View style={[
          styles.glassBorder,
          { borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)' }
        ]} />
      </View>


      {/* Tab Items */}
      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          // Skip hidden tabs - only show these specific routes
          const visibleRoutes = ['index', 'favorites', 'add', 'credit', 'contact'];
          if (!visibleRoutes.includes(route.name)) return null;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (isFocused) {
              if (route.name === 'index') {
                DeviceEventEmitter.emit('scroll_to_top_home');
              }
            } else if (!event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          // Special Case for "Add" Button - Floating above
          if (route.name === 'add') {
            return (
              <View key={index} style={styles.addButtonWrapper}>
                <TouchableOpacity
                  onPress={onPress}
                  activeOpacity={0.9}
                  style={styles.addButtonContainer}
                >
                  {/* Add Button Glow/Shadow */}
                  <MotiView
                    from={{ scale: 1 }}
                    animate={{ scale: isFocused ? 1.1 : 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                    style={[styles.addButton, { backgroundColor: '#FF3B30' }]}
                  >
                    <Plus size={28} color="#FFF" strokeWidth={3} />
                  </MotiView>

                  {/* New Listing Badge */}
                  <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText} numberOfLines={1}>YENİ ELAN</Text>
                  </View>

                </TouchableOpacity>
              </View>
            );
          }

          // Icons
          let Icon = Home;
          if (route.name === 'index') Icon = Home;
          else if (route.name === 'favorites') Icon = Heart;
          else if (route.name === 'credit') Icon = User;
          else if (route.name === 'contact') Icon = Phone;

          return (
            <TouchableOpacity
              key={state.routes[index].key}
              onPress={onPress}
              style={styles.tabItem}
              activeOpacity={0.7}
            >
              <MotiView
                animate={{
                  scale: isFocused ? 1.15 : 1,
                  translateY: isFocused ? -2 : 0,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 250,
                  damping: 20,
                  mass: 0.8
                }}
                style={styles.iconContainer}
              >
                <Icon
                  size={24}
                  color={isFocused ? (isDark ? '#FFF' : '#000') : (isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)')}
                  fill={isFocused && route.name === 'favorites' ? (isDark ? '#FFF' : '#000') : 'transparent'}
                  strokeWidth={isFocused ? 2.5 : 2}
                />

                {/* Minimal Indicator Dot */}
                <MotiView
                  animate={{
                    opacity: isFocused ? 1 : 0,
                    scale: isFocused ? 1 : 0,
                    translateY: isFocused ? 0 : 5
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  style={[
                    styles.indicatorDot,
                    { backgroundColor: isDark ? '#FFF' : '#000' }
                  ]}
                />
              </MotiView>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 58, // Reduced from 70
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassContainer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30, // Reduced from 40
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 15 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
      },
      android: {
        elevation: 10,
      },
      web: {
        boxShadow: '0px 15px 25px rgba(0, 0, 0, 0.25)' as any,
      }
    }),
  },
  glassBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30, // Reduced from 40
    borderWidth: 1.5,
    // Note: borderColor is set inline to adapt to theme
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    paddingHorizontal: 10,
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
  indicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 6,
    position: 'absolute',
    bottom: -10,
  },
  addButtonWrapper: {
    width: 60, // Reduced from 70
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  addButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // Lift it slightly out of the glass for depth
    top: -18, // Reduced from -20
  },
  addButton: {
    width: 54, // Reduced from 64
    height: 54, // Reduced from 64
    borderRadius: 27, // Reduced from 32
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4, // Ring around button
    borderColor: 'rgba(255,255,255,0.1)', // Subtle glass ring
    ...Platform.select({
      ios: {
        shadowColor: "#FF3B30",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
      },
      android: { elevation: 15 },
      web: { boxShadow: '0px 10px 15px rgba(255, 59, 48, 0.5)' as any },
    }),
  },
  badgeContainer: {
    position: 'absolute',
    bottom: -14, // Reduced from -16
    backgroundColor: '#34C759', // Nice green for "New"
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#FFF', // White border to separate from background
    minWidth: 70, // Ensure enough width
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: { elevation: 4 },
      web: { boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)' as any },
    }),
  },
  badgeText: {
    color: '#FFF',
    fontSize: 9,
    fontFamily: 'RethinkSans_800ExtraBold',
    textTransform: 'uppercase',
    textAlign: 'center', // Ensure centered if wider
  },
});
