import { Tabs, useRouter } from 'expo-router';
import { CustomTabBar } from '../../components/CustomTabBar';

export default function TabLayout() {
  const router = useRouter();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Ana səhifə' }} />
      <Tabs.Screen name="favorites" options={{ title: 'Seçilmişlər' }} />
      <Tabs.Screen 
        name="add" 
        options={{ title: 'Elan ver' }} 
        listeners={() => ({
            tabPress: (e) => {
                e.preventDefault();
                router.push('/add-listing');
            },
        })}
      />
      <Tabs.Screen name="compare" options={{ title: 'Müqayisə' }} />
      <Tabs.Screen name="contact" options={{ title: 'Əlaqə' }} />
    </Tabs>
  );
}
