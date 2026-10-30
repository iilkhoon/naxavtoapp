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
const TAU = Math.PI * 2;

type Blob = {
  id: string;
  coreColor: string;
  midColor: string;
  edgeColor: string;
  size: number;
  // Base position as a fraction of the hero container
  x: number;
  y: number;
  // Primary & secondary orbital radii (px) for figure-8 / liquid swirl paths
  rx1: number;
  ry1: number;
  rx2: number;
  ry2: number;
  // Organic squish & stretch amplitude
  stretch: number;
  pulse: number;
  // Full cycle duration (ms) — slow and hypnotic
  duration: number;
  // Starting phase (radians) so blobs never move in lockstep
  phase0: number;
  // Pointer attraction (px); opposite signs create a swirling liquid current
  followX: number;
  followY: number;
};

const BLOBS: Blob[] = [
  {
    id: 'a',
    coreColor: '#FF5526',
    midColor: '#E10600',
    edgeColor: '#6E0000',
    size: 400,
    x: -0.18,
    y: -0.48,
    rx1: 75,
    ry1: 42,
    rx2: 32,
    ry2: -24,
    stretch: 0.22,
    pulse: 0.14,
    duration: 26000,
    phase0: 0.2,
    followX: 38,
    followY: 28,
  },
  {
    id: 'b',
    coreColor: '#FF2E12',
    midColor: '#B80000',
    edgeColor: '#4D0000',
    size: 360,
    x: 0.48,
    y: 0.08,
    rx1: -85,
    ry1: 36,
    rx2: 38,
    ry2: 28,
    stretch: 0.2,
    pulse: 0.12,
    duration: 32000,
    phase0: 1.9,
    followX: -32,
    followY: -24,
  },
  {
    id: 'c',
    coreColor: '#FF7340',
    midColor: '#FF2A0D',
    edgeColor: '#8A0000',
    size: 270,
    x: 0.64,
    y: -0.36,
    rx1: -56,
    ry1: 52,
    rx2: -28,
    ry2: 22,
    stretch: 0.26,
    pulse: 0.16,
    duration: 22000,
    phase0: 3.4,
    followX: 46,
    followY: -34,
  },
  {
    id: 'd',
    coreColor: '#D90800',
    midColor: '#7A0000',
    edgeColor: '#2E0000',
    size: 340,
    x: -0.06,
    y: 0.36,
    rx1: 88,
    ry1: -34,
    rx2: -36,
    ry2: 24,
    stretch: 0.19,
    pulse: 0.13,
    duration: 36000,
    phase0: 4.7,
    followX: -40,
    followY: 30,
  },
  {
    id: 'e',
    coreColor: '#FF451A',
    midColor: '#C40400',
    edgeColor: '#520000',
    size: 290,
    x: 0.22,
    y: -0.22,
    rx1: 64,
    ry1: 46,
    rx2: -42,
    ry2: -30,
    stretch: 0.24,
    pulse: 0.15,
    duration: 28000,
    phase0: 2.6,
    followX: 28,
    followY: 36,
  },
];

// Single molten liquid blob moving on a continuous multi-harmonic curve while morphing shape
function LavaBlob({
  blob,
  reduceMotion,
  k,
  px,
  py,
}: {
  blob: Blob;
  reduceMotion: boolean;
  k: number;
  px: SharedValue<number>;
  py: SharedValue<number>;
}) {
  const phase = useSharedValue(blob.phase0);

  useEffect(() => {
    if (reduceMotion) return;
    phase.value = blob.phase0;
    phase.value = withRepeat(
      withTiming(blob.phase0 + TAU, { duration: blob.duration, easing: Easing.linear }),
      -1,
      false
    );
  }, [phase, blob.duration, blob.phase0, reduceMotion]);

  const animated = useAnimatedStyle(() => {
    const a = phase.value;
    // Lissajous + second-harmonic swirl so the blob never retraces a rigid straight line
    const x =
      (blob.rx1 * Math.sin(a) + blob.rx2 * Math.cos(a * 2 + 0.8) + blob.followX * px.value) * k;
    const y =
      (blob.ry1 * Math.cos(a) + blob.ry2 * Math.sin(a * 2 - 0.5) + blob.followY * py.value) * k;

    // Volume-preserving liquid squish & stretch + gentle breathing pulse
    const breath = 1 + blob.pulse * Math.sin(a - 0.4);
    const deform = blob.stretch * Math.sin(a * 2 + blob.phase0);
    const pointerStretch = (px.value * blob.followX - py.value * blob.followY) * 0.0012;
    const scaleX = breath * (1 + deform + pointerStretch);
    const scaleY = breath * (1 - deform * 0.78 - pointerStretch);

    // Slow organic rotation so the off-centre hot core swirls inside the blob
    const rotateDeg = 28 * Math.sin(a + blob.phase0) + 14 * Math.cos(a * 2) + px.value * 10;

    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rotateDeg}deg` },
        { scaleX },
        { scaleY },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.blob,
        {
          width: blob.size * k,
          height: blob.size * k,
          left: `${blob.x * 100}%`,
          top: `${blob.y * 100}%`,
        },
        animated,
      ]}
    >
      <Svg width="100%" height="100%" viewBox="0 0 100 100">
        <Defs>
          <RadialGradient
            id={`lava-${blob.id}`}
            cx="50"
            cy="50"
            r="50"
            fx="38"
            fy="38"
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor={blob.coreColor} stopOpacity={0.92} />
            <Stop offset="0.32" stopColor={blob.midColor} stopOpacity={0.75} />
            <Stop offset="0.68" stopColor={blob.edgeColor} stopOpacity={0.38} />
            <Stop offset="1" stopColor={blob.edgeColor} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#lava-${blob.id})`} />
      </Svg>
    </Animated.View>
  );
}

// Dark card with slowly flowing molten red/black liquid blobs and a film-grain overlay
export function LavaHero({
  children,
  style,
  contentStyle,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion();
  const [k, setK] = useState(1);
  const ref = useRef<React.ComponentRef<typeof View>>(null);
  // Viscous pointer offset (-1..1, web only)
  const px = useSharedValue(0);
  const py = useSharedValue(0);

  useEffect(() => {
    if (Platform.OS !== 'web' || reduceMotion) return;
    const node = ref.current as unknown as HTMLElement | null;
    if (!node?.getBoundingClientRect) return;
    // Heavy, viscous spring so the lava glides smoothly behind the cursor instead of snapping
    const liquidSpring = { damping: 34, stiffness: 20, mass: 2.2 };
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    let rafId = 0;
    let lastX = 0;
    let lastY = 0;

    const updatePointer = () => {
      rafId = 0;
      const r = node.getBoundingClientRect();
      if (!r.width || !r.height || lastY > r.bottom + 240) return;
      px.value = withSpring(clamp(((lastX - r.left) / r.width - 0.5) * 2), liquidSpring);
      py.value = withSpring(clamp(((lastY - r.top) / r.height - 0.5) * 2), liquidSpring);
    };

    const onMove = (e: PointerEvent) => {
      lastX = e.clientX;
      lastY = e.clientY;
      if (!rafId) rafId = window.requestAnimationFrame(updatePointer);
    };
    const onLeave = () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      px.value = withSpring(0, liquidSpring);
      py.value = withSpring(0, liquidSpring);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  }, [px, py, reduceMotion]);

  return (
    <View
      ref={ref}
      style={[styles.card, style]}
      onLayout={(e) => setK(Math.max(1, Math.sqrt(e.nativeEvent.layout.width / 360)))}
    >
      <LinearGradient
        colors={['#08080A', '#1C0303', '#050506']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[StyleSheet.absoluteFill, styles.lavaLayer]} pointerEvents="none">
        {BLOBS.map((b) => (
          <LavaBlob key={b.id} blob={b} reduceMotion={reduceMotion} k={k} px={px} py={py} />
        ))}
      </View>
      {/* Darkens the bottom so the subtitle stays readable */}
      <LinearGradient
        colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.48)']}
        start={{ x: 0, y: 0.25 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <Image
        source={GRAIN}
        resizeMode="repeat"
        style={[StyleSheet.absoluteFill, styles.grain]}
        pointerEvents="none"
      />
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
  lavaLayer: Platform.select({
    web: {
      filter: 'blur(26px) saturate(130%) contrast(108%)',
    } as any,
    default: {},
  }),
  blob: Platform.select({
    web: {
      position: 'absolute',
      mixBlendMode: 'screen',
      willChange: 'transform',
    } as any,
    default: {
      position: 'absolute',
    },
  }),
  grain: { width: '100%', height: '100%', opacity: 0.2 },
  content: { padding: 20 },
});

