import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Image, StyleProp, ViewStyle, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Defs, RadialGradient, Stop, Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  SharedValue,
  withSpring,
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
  // How far (px) the blob chases the pointer; opposite signs make the lava swirl
  follow: number;
};

const BLOBS: Blob[] = [
  { id: 'a', color: '#E10600', size: 340, x: -0.25, y: -0.55, dx: 90, dy: 50, scale: 1.25, duration: 9000, follow: 70 },
  { id: 'b', color: '#9E0000', size: 300, x: 0.45, y: 0.15, dx: -110, dy: -40, scale: 1.15, duration: 11000, follow: -55 },
  { id: 'c', color: '#FF3A1A', size: 200, x: 0.7, y: -0.35, dx: -60, dy: 70, scale: 1.35, duration: 7500, follow: 110 },
  { id: 'd', color: '#5C0000', size: 260, x: -0.1, y: 0.45, dx: 120, dy: -30, scale: 1.2, duration: 13000, follow: -80 },
];

// One soft radial "lava" blob drifting back and forth
function LavaBlob({ blob, reduceMotion, k, px, py }: { blob: Blob; reduceMotion: boolean; k: number; px: SharedValue<number>; py: SharedValue<number> }) {
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(withTiming(1, { duration: blob.duration, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t, blob.duration, reduceMotion]);

  const animated = useAnimatedStyle(() => ({
    transform: [
      { translateX: (blob.dx * t.value + blob.follow * px.value) * k },
      { translateY: (blob.dy * t.value + blob.follow * py.value) * k },
      { scale: 1 + (blob.scale - 1) * t.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        { width: blob.size * k, height: blob.size * k, left: `${blob.x * 100}%`, top: `${blob.y * 100}%` },
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
// Blob sizes are tuned for a ~360px phone card and grow (sub-linearly, so dark gaps remain) on wider containers
export function LavaHero({ children, style, contentStyle }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; contentStyle?: StyleProp<ViewStyle> }) {
  const reduceMotion = useReducedMotion();
  const [k, setK] = useState(1);
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  // Pointer position relative to the hero centre, roughly -1..1 (web only)
  const px = useSharedValue(0);
  const py = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || reduceMotion) return;
    const node = ref.current as unknown as HTMLElement | null;
    if (!node?.getBoundingClientRect) return;
    const spring = { damping: 12, stiffness: 140, mass: 0.6 };
    const clamp = (v: number) => Math.max(-1.5, Math.min(1.5, v));
    const onMove = (e: PointerEvent) => {
      const r = node.getBoundingClientRect();
      if (e.clientY > r.bottom + 200) return;
      px.value = withSpring(clamp(((e.clientX - r.left) / r.width - 0.5) * 2), spring);
      py.value = withSpring(clamp(((e.clientY - r.top) / r.height - 0.5) * 2), spring);
    };
    const onLeave = () => {
      px.value = withSpring(0, spring);
      py.value = withSpring(0, spring);
    };
    window.addEventListener('pointermove', onMove);
    document.addEventListener('pointerleave', onLeave);
    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [px, py, reduceMotion]);

  return (
    <View ref={ref} style={[styles.card, style]} onLayout={(e) => setK(Math.max(1, Math.sqrt(e.nativeEvent.layout.width / 360)))}>
      <LinearGradient colors={['#0A0A0A', '#1A0202', '#050505']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {BLOBS.map((b) => (
        <LavaBlob key={b.id} blob={b} reduceMotion={reduceMotion} k={k} px={px} py={py} />
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
      <View style={[styles.content, contentStyle]}>{children}</View>
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
  grain: { width: '100%', height: '100%', opacity: 0.22 },
  content: { padding: 20 },
});
