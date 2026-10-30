import {
  PieChart, CreditCard, FileText, MessageSquare, LayoutList, Crown, Zap, Bell, Image as ImageIcon,
  Gift, Settings, Users, CarFront, Layers, Palette, Wallet,
} from 'lucide-react-native';

export type AdminModule =
  | 'statistics' | 'listings' | 'finance' | 'applications' | 'chats'
  | 'notifications' | 'banners' | 'competitions' | 'settings' | 'catalog';

// Sections an admin can be given access to (picked when the user is created)
export const ADMIN_MODULES: { key: AdminModule; title: string; desc: string }[] = [
  { key: 'statistics', title: 'Statistika', desc: 'Baxışlar və hesabatlar' },
  { key: 'listings', title: 'Elanlar', desc: 'Təsdiq, redaktə, VIP və təcili' },
  { key: 'finance', title: 'Finans və kreditlər', desc: 'Kassa, alış-satış, borclar, maaş, kredit paneli' },
  { key: 'applications', title: 'Kredit müraciətləri', desc: 'Müştəri müraciətləri' },
  { key: 'chats', title: 'Canlı dəstək', desc: 'Müştəri çatları' },
  { key: 'notifications', title: 'Bildirişlər', desc: 'Push bildiriş göndərmək' },
  { key: 'banners', title: 'Reklamlar', desc: 'Bannerlər və popup' },
  { key: 'competitions', title: 'Yarışmalar', desc: 'Hədiyyəli yarışmalar' },
  { key: 'settings', title: 'Ayarlar', desc: 'Loqo, əlaqə və ümumi ayarlar' },
  { key: 'catalog', title: 'Kataloq', desc: 'Markalar, modellər, xüsusiyyətlər' },
];

export type AdminMenuItem = {
  title: string;
  desc: string;
  path: string;
  icon: any;
  /** iOS Settings-style icon tile colour */
  tint: string;
  superAdminOnly?: boolean;
  /** Module an admin needs to see this item (superadmins see all) */
  module?: AdminModule;
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
      { title: 'Statistika', desc: 'Baxışlar, elanlar və kreditlər', path: '/admin/statistics', module: 'statistics', icon: PieChart, tint: '#5856D6' },
    ],
  },
  {
    group: 'Elanlar',
    items: [
      { title: 'Elanlar', desc: 'Təsdiqlə, redaktə et və ya sil', path: '/admin/listings', module: 'listings', icon: LayoutList, tint: '#34C759', badge: 'pendingListings' },
      { title: 'VIP elanlar', desc: 'VIP statusunu idarə et', path: '/admin/vip-listings', module: 'listings', icon: Crown, tint: '#F4B400' },
      { title: 'Təcili elanlar', desc: 'Təcili satış statusu', path: '/admin/urgent-listings', module: 'listings', icon: Zap, tint: '#FF3B30' },
    ],
  },
  {
    group: 'Finans',
    items: [
      { title: 'Finans', desc: 'Kassa, alış-satış, borclar, maaşlar', path: '/admin/finance', module: 'finance', icon: Wallet, tint: '#34C759' },
      { title: 'Kredit paneli', desc: 'Kredit və nağd satışlar', path: '/admin/loans', module: 'finance', icon: CreditCard, tint: '#00C7BE' },
      { title: 'Kredit müraciətləri', desc: 'Müştəri müraciətləri', path: '/admin/applications', module: 'applications', icon: FileText, tint: '#FF9500', badge: 'pendingApplications' },
    ],
  },
  {
    group: 'Ünsiyyət',
    items: [
      { title: 'Canlı dəstək', desc: 'Müştəri çatlarına cavab ver', path: '/admin/chats', module: 'chats', icon: MessageSquare, tint: '#007AFF' },
      { title: 'Bildirişlər', desc: 'Push bildiriş göndər', path: '/admin/notifications', module: 'notifications', icon: Bell, tint: '#FF2D55' },
    ],
  },
  {
    group: 'Sayt',
    items: [
      { title: 'Reklamlar', desc: 'Banner və reklamlar', path: '/admin/banners', module: 'banners', icon: ImageIcon, tint: '#30B0C7' },
      { title: 'Yarışmalar', desc: 'Hədiyyəli yarışmalar', path: '/admin/competitions', module: 'competitions', icon: Gift, tint: '#FF9500' },
      { title: 'Ayarlar', desc: 'Loqo, əlaqə və ümumi tənzimləmələr', path: '/admin/settings', module: 'settings', icon: Settings, tint: '#8E8E93' },
    ],
  },
  {
    group: 'Kataloq',
    items: [
      { title: 'Markalar', desc: 'Avtomobil markaları', path: '/brands', module: 'catalog', icon: CarFront, tint: '#AF52DE', mobileOnly: true },
      { title: 'Modellər', desc: 'Marka modelləri', path: '/models', module: 'catalog', icon: Layers, tint: '#FF9500', mobileOnly: true },
      { title: 'Xüsusiyyətlər', desc: 'Marka/model, şəhər və avadanlıq', path: '/admin/features', module: 'catalog', icon: Palette, tint: '#5856D6' },
    ],
  },
  {
    group: 'Giriş',
    items: [
      { title: 'İstifadəçilər', desc: 'Yeni istifadəçi və bölmə icazələri', path: '/admin/users', icon: Users, tint: '#5856D6', superAdminOnly: true },
    ],
  },
];

export const visibleAdminMenu = (isSuperAdmin: boolean, platform: 'web' | 'native', hasModule: (m: AdminModule) => boolean = () => true) =>
  ADMIN_MENU.map((g) => ({
    ...g,
    items: g.items.filter((i) =>
      (!i.superAdminOnly || isSuperAdmin) && (!i.module || hasModule(i.module)) && !(platform === 'web' && i.mobileOnly)),
  })).filter((g) => g.items.length > 0);

// Admin routes outside the menu, mapped to the module that guards them
const EXTRA_ROUTES: [string, AdminModule | 'superadmin'][] = [
  ['/admin/loan-', 'finance'],
  ['/admin/edit-listing', 'listings'],
  ['/admin/edit-plate', 'listings'],
  ['/admin/secret-winners', 'competitions'],
  ['/admin/chat', 'chats'],
  ['/admin/add-user', 'superadmin'],
  ['/admin/user-detail', 'superadmin'],
];

/** What an admin route needs: a module, superadmin, or nothing (hub, statistics shell) */
export const accessForPath = (pathname: string): AdminModule | 'superadmin' | null => {
  const extra = EXTRA_ROUTES.find(([prefix]) => pathname.startsWith(prefix));
  if (extra) return extra[1];
  const item = ADMIN_MENU.flatMap((g) => g.items).find((i) => pathname === i.path || pathname.startsWith(i.path + '/'));
  if (!item) return null;
  return item.superAdminOnly ? 'superadmin' : item.module || null;
};
