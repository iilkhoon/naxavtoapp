export interface FeatureCategory {
  id: string;
  title: string;
  type: 'checkbox' | 'radio' | 'grid';
  items: string[];
}

export const CAR_FEATURES: FeatureCategory[] = [
  {
    id: 'interior_material',
    title: 'Salonun üz çəkməsi',
    type: 'radio',
    items: ['Parça', 'Velür', 'Dəri', 'Alkantara', 'Qarışıq']
  },
  {
    id: 'interior_color',
    title: 'Salonun rəngi',
    type: 'radio',
    items: ['Açıq', 'Tünd']
  },
  {
    id: 'headlights',
    title: 'Faralar',
    type: 'radio',
    items: ['Ksenon', 'Lazer', 'İşıq diodlu', 'Halogen']
  },
  {
    id: 'exterior_general',
    title: 'Eksteryer',
    type: 'checkbox',
    items: ['Adaptiv işıqlandırma', 'Lyuk', 'Panoram dam', 'Duman əleyhinə faralar']
  },
  {
    id: 'wheel_size',
    title: 'Disk ölçüsü',
    type: 'grid',
    items: ['12"', '13"', '14"', '15"', '16"', '17"', '18"', '19"', '20"', '21"', '22"', '23"', '24"', '25"', '25"+']
  },
  {
    id: 'functional',
    title: 'Funksional avadanlıq',
    type: 'checkbox',
    items: [
      'Bort kompüter',
      'Yağış sensoru',
      'İşıq sensoru',
      'Qızdırılan yan güzgülər',
      'Fara yuyucuları',
      'Sükan gücləndirici',
      'Mərkəzi qapanma',
      'Siqnalizasiya',
      'Pnevmatik asqı',
      'Əyləc zamanı rekuperasiya sistemi'
    ]
  },
  {
    id: 'comfort',
    title: 'Komfort',
    type: 'checkbox',
    items: [
      'Kondisioner',
      'Klimat-kontrol',
      'Kruiz-kontrol',
      'Adaptiv kruiz-kontrol',
      'Avtomatik parklanma sistemi',
      'Parktronik',
      'Proyeksiya ekranı',
      'Elektron cihazlar paneli',
      '«Start-stop» sistemi',
      'Qızdırılan sükan',
      'Qızdırılan oturacaqlar',
      'Ventilyasiyalı oturacaqlar'
    ]
  },
  {
    id: 'cameras',
    title: 'Kamera',
    type: 'radio',
    items: ['Arxa görüntü kamerası', '360° kamera', 'Ön və arxa kamera']
  },
  {
    id: 'adjustments',
    title: 'Tənzim edilmələr',
    type: 'checkbox',
    items: [
      'Elektrik şüşəqaldıranlar',
      'Güzgülərin elektrik tənzimlənməsi',
      'Sürücü oturacağı elektrik tənzimləmə',
      'Sürücü oturacağı yaddaş funksiyası',
      'Sərnişin oturacağı elektrik tənzimləmə',
      'Sükanın elektrik tənzimlənməsi'
    ]
  },
  {
    id: 'multimedia',
    title: 'Multimedia',
    type: 'checkbox',
    items: [
      'Android Auto',
      'Apple CarPlay',
      'Naviqasiya sistemi',
      'Səslə idarə olunma',
      'AUX',
      'Bluetooth',
      'CD',
      'USB',
      'TV',
      'Premium səs sistemi'
    ]
  },
  {
    id: 'safety',
    title: 'Təhlükəsizlik',
    type: 'checkbox',
    items: [
      'Antiqapanma sistemi (ABS)',
      'Antisürüşmə sistemi (ASR)',
      'Sabitlik sistemi (ESP)',
      'Təhlükəsizlik yastıqları',
      'Avtomatik saxlanma (Auto Hold)',
      'Toqquşma xəbərdarlığı sistemi',
      'Avtomatik təcili əyləc sistemi (AEB)',
      'Zolaqdan çıxma xəbərdarlığı',
      'Zolaqda saxlama assistenti',
      'Tıxacda hərəkət assistenti',
      'Sürücünün yorğunluğuna nəzarət',
      'Yol nişanlarının tanınması',
      'Kor zonalara nəzarət',
      'İzofiks (Isofix)'
    ]
  }
];
