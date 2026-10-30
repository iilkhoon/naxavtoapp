import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useRouter } from 'expo-router';
import { DynamicColorIOS, DeviceEventEmitter } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

// iOS uses the system tab bar (Liquid Glass on iOS 26+). Android keeps the custom
// tab bar in _layout.tsx and web uses _layout.web.tsx.
const tint = DynamicColorIOS({ light: '#FF3B30', dark: '#FF453A' });

// SF Symbols can't be drawn thinner than the system weight, which reads heavy
// here; Ionicons' outline set has a much lighter stroke.
const icon = (name: React.ComponentProps<typeof Ionicons>['name']) => (
  <NativeTabs.Trigger.Icon
    src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name={name} />}
    renderingMode="template"
  />
);

export default function TabLayout() {
  const router = useRouter();

  return (
    <NativeTabs tintColor={tint} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger
        name="index"
        disableTransparentOnScrollEdge
        listeners={{ tabPress: () => DeviceEventEmitter.emit('scroll_to_top_home') }}
      >
        {icon('home-outline')}
        <NativeTabs.Trigger.Label>Ana səhifə</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="favorites" disableTransparentOnScrollEdge>
        {icon('heart-outline')}
        <NativeTabs.Trigger.Label>Seçilmişlər</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="credit" disableTransparentOnScrollEdge>
        {icon('card-outline')}
        <NativeTabs.Trigger.Label>Kredit</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="contact" disableTransparentOnScrollEdge>
        {icon('call-outline')}
        <NativeTabs.Trigger.Label>Əlaqə</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/*
        "Elan ver": a lone "+" on its own surface at the right of the tab bar
        (`prominent`, iOS 27+; a regular tab on older iOS). `disabled` stops the
        tab from being selected, but tabPress still fires, so it opens the
        add-listing modal over the current tab instead of switching tabs.
      */}
      <NativeTabs.Trigger
        name="add"
        prominent
        disabled
        listeners={{ tabPress: () => router.push('/add-listing') }}
      >
        {icon('add')}
        <NativeTabs.Trigger.Label hidden>Elan ver</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="compare" hidden />
    </NativeTabs>
  );
}
