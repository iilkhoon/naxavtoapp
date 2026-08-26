import { Tabs } from 'expo-router';
import { WebHeader } from '../../components/WebHeader.web';

export default function WebTabLayout() {
    return (
        <>
            <WebHeader />
            <Tabs
                tabBar={() => null}
                screenOptions={{ headerShown: false }}
            >
                <Tabs.Screen name="index" options={{ title: 'Ana səhifə' }} />
                <Tabs.Screen name="favorites" options={{ title: 'Seçilmişlər' }} />
                <Tabs.Screen name="add" options={{ title: 'Elan ver' }} />
                <Tabs.Screen name="compare" options={{ title: 'Müqayisə' }} />
                <Tabs.Screen name="credit" options={{ title: 'Kredit' }} />
                <Tabs.Screen name="contact" options={{ title: 'Əlaqə' }} />
            </Tabs>
        </>
    );
}
