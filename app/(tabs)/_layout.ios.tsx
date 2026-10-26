import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useRouter } from 'expo-router';
import { DynamicColorIOS } from 'react-native';

// iOS uses the system tab bar (Liquid Glass on iOS 26+). Android keeps the custom
// tab bar in _layout.tsx and web uses _layout.web.tsx.
const tint = DynamicColorIOS({ light: '#FF3B30', dark: '#FF453A' });

export default function TabLayout() {
  const router = useRouter();

  return (
    <NativeTabs tintColor={tint} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <NativeTabs.Trigger.Label>Ana səhifə</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="favorites" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Icon sf={{ default: 'heart', selected: 'heart.fill' }} />
        <NativeTabs.Trigger.Label>Seçilmişlər</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="credit" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Icon sf={{ default: 'creditcard', selected: 'creditcard.fill' }} />
        <NativeTabs.Trigger.Label>Kredit</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="contact" disableTransparentOnScrollEdge>
        <NativeTabs.Trigger.Icon sf={{ default: 'phone', selected: 'phone.fill' }} />
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
        <NativeTabs.Trigger.Icon sf="plus" />
        <NativeTabs.Trigger.Label hidden>Elan ver</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="compare" hidden />
    </NativeTabs>
  );
}
