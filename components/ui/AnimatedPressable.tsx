import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring, 
  withTiming 
} from 'react-native-reanimated';

interface AnimatedPressableProps extends PressableProps {
  style?: StyleProp<ViewStyle>;
  scale?: number;
  children: React.ReactNode;
}

const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

export const AnimatedPressable = ({ 
  style, 
  scale = 0.96, 
  children, 
  ...props 
}: AnimatedPressableProps) => {
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { 
          scale: withSpring(pressed.value ? scale : 1, {
            mass: 0.5,
            damping: 10,
            stiffness: 200,
          }) 
        }
      ],
      opacity: withTiming(pressed.value ? 0.9 : 1, { duration: 100 })
    };
  });

  return (
    <AnimatedPressableComponent
      onPressIn={() => { pressed.value = 1; }}
      onPressOut={() => { pressed.value = 0; }}
      style={[style, animatedStyle]}
      {...props}
    >
      {children}
    </AnimatedPressableComponent>
  );
};
