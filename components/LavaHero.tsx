import React, { useEffect } from 'react';
import { View, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const GRAIN = require('../assets/grain.png');

type Blob = {
  id: string;
  color: string;
  size: number;
  // Start position as a fraction of the card, and how far (px) it drifts
  x: number;
  y: number;
  dx: number;
  dy: number;
  scale: number;
  duration: number;
};

const BLOBS: Blob[] = [
  { id: 'a', color: '#E10600', size: 340, x: -0.25, y: -0.55, dx: 90, dy: 50, scale: 1.25, duration: 9000 },
  { id: 'b', color: '#9E0000', size: 300, x: 0.45, y: 0.15, dx: -110, dy: -40, scale: 1.15, duration: 11000 },
  { id: 'c', color: '#FF3A1A', size: 200, x: 0.7, y: -0.35, dx: -60, dy: 70, scale: 1.35, duration: 7500 },
  { id: 'd', color: '#5C0000', size: 260, x: -0.1, y: 0.45, dx: 120, dy: -30, scale: 1.2, duration: 13000 },
];

// One soft radial "lava" blob drifting back and forth
function LavaBlob({ blob, reduceMotion }: { blob: Blob; reduceMotion: boolean }) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(withTiming(1, { duration: blob.duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, blob.duration, reduceMotion]);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: blob.dx * t.value },
      { translateY: blob.dy * t.value },
      { scale: 1 + (blob.scale - 1) * t.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        { width: blob.size, height: blob.size, left: `${blob.x * 100}%`, top: `${blob.y * 100}%` },
        animated,
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient id={`lava-${blob.id}`} cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={blob.color} stopOpacity={0.95} />
            <Stop offset="0.45" stopColor={blob.color} stopOpacity={0.55} />
            <Stop offset="1" stopColor={blob.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#lava-${blob.id})`} />
      </Svg>
    </Animated.View>
  );
}

// Dark card with slowly moving red/black lava blobs and a film-grain overlay
export function LavaHero({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();

  return (
    <View style={[styles.card, style]}>
      <LinearGradient colors={['#0A0A0A', '#1A0202', '#050505']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {BLOBS.map((b) => (
        <LavaBlob key={b.id} blob={b} reduceMotion={reduceMotion} />
      ))}
      {/* Darkens the bottom so the subtitle stays readable */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.45)']}
        start={{ x: 0, y: 0.3 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Image source={GRAIN} resizeMode="repeat" style={[StyleSheet.absoluteFill, styles.grain]} pointerEvents="none" />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#0A0A0A',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  blob: { position: 'absolute' },
  grain: { width: '100%', height: '100%', opacity: 0.55 },
  content: { padding: 20 },
});
