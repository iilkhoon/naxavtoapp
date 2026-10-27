import {
  PieChart, CreditCard, FileText, MessageSquare, LayoutList, Crown, Zap, Bell, Image as ImageIcon,
  Gift, Settings, Users, CarFront, Layers, Palette, Wallet,
} from 'lucide-react-native';

export type AdminMenuItem = {
  title: string;
  desc: string;
  path: string;
  icon: any;
  /** iOS Settings-style icon tile colour */
  tint: string;
  superAdminOnly?: boolean;
  /** Screens that only exist in the app (no web layout) */
  mobileOnly?: boolean;
  /** Key of a live counter shown as a badge */
  badge?: 'pendingApplications' | 'pendingListings';
};

// One source for the mobile admin menu (app/menu.tsx) and the web sidebar
export const ADMIN_MENU: { group: string; items: AdminMenuItem[] }[] = [
  {
    group: 'Ümumi',
    items: [
      { title: 'Statistika', desc: 'Baxışlar, elanlar və kreditlər', path: '/admin/statistics', icon: PieChart, tint: '#5856D6' },
    ],
  },
  {
    group: 'Elanlar',
    items: [
      { title: 'Elanlar', desc: 'Təsdiqlə, redaktə et və ya sil', path: '/admin/listings', icon: LayoutList, tint: '#34C759', badge: 'pendingListings' },
      { title: 'VIP elanlar', desc: 'VIP statusunu idarə et', path: '/admin/vip-listings', icon: Crown, tint: '#F4B400' },
      { title: 'Təcili elanlar', desc: 'Təcili satış statusu', path: '/admin/urgent-listings', icon: Zap, tint: '#FF3B30' },
    ],
  },
  {
    group: 'Finans',
    items: [
      { title: 'Finans', desc: 'Kassa, alış-satış, borclar, maaşlar', path: '/admin/finance', icon: Wallet, tint: '#34C759', superAdminOnly: true },
      { title: 'Kredit paneli', desc: 'Kredit və nağd satışlar', path: '/admin/loans', icon: CreditCard, tint: '#00C7BE', superAdminOnly: true },
      { title: 'Kredit müraciətləri', desc: 'Müştəri müraciətləri', path: '/admin/applications', icon: FileText, tint: '#FF9500', badge: 'pendingApplications' },
    ],
  },
  {
    group: 'Ünsiyyət',
    items: [
      { title: 'Canlı dəstək', desc: 'Müştəri çatlarına cavab ver', path: '/admin/chats', icon: MessageSquare, tint: '#007AFF' },
      { title: 'Bildirişlər', desc: 'Push bildiriş göndər', path: '/admin/notifications', icon: Bell, tint: '#FF2D55' },
    ],
  },
  {
    group: 'Sayt',
    items: [
      { title: 'Reklamlar', desc: 'Banner və reklamlar', path: '/admin/banners', icon: ImageIcon, tint: '#30B0C7' },
      { title: 'Yarışmalar', desc: 'Hədiyyəli yarışmalar', path: '/admin/competitions', icon: Gift, tint: '#FF9500' },
      { title: 'Ayarlar', desc: 'Loqo, əlaqə və ümumi tənzimləmələr', path: '/admin/settings', icon: Settings, tint: '#8E8E93' },
    ],
  },
  {
    group: 'Kataloq',
    items: [
      { title: 'Markalar', desc: 'Avtomobil markaları', path: '/brands', icon: CarFront, tint: '#AF52DE', mobileOnly: true },
      { title: 'Modellər', desc: 'Marka modelləri', path: '/models', icon: Layers, tint: '#FF9500', mobileOnly: true },
      { title: 'Xüsusiyyətlər', desc: 'Marka/model, şəhər və avadanlıq', path: '/admin/features', icon: Palette, tint: '#5856D6' },
    ],
  },
  {
    group: 'Giriş',
    items: [
      { title: 'Admin istifadəçilər', desc: 'Admin və superadminlər', path: '/admin/users', icon: Users, tint: '#5856D6', superAdminOnly: true },
    ],
  },
];

export const visibleAdminMenu = (isSuperAdmin: boolean, platform: 'web' | 'native') =>
  ADMIN_MENU.map((g) => ({
    ...g,
    items: g.items.filter((i) => (!i.superAdminOnly || isSuperAdmin) && !(platform === 'web' && i.mobileOnly)),
  })).filter((g) => g.items.length > 0);
