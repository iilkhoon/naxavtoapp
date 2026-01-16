/*
  # Enhance Features Table
  
  1. Add category column to car_features
  2. Seed default data from the app constants
*/

ALTER TABLE car_features ADD COLUMN IF NOT EXISTS category text DEFAULT 'Digər';

-- Clear existing to avoid duplicates during seed (optional, but cleaner for this transition)
TRUNCATE TABLE car_features;

-- Seed Data
INSERT INTO car_features (name, category) VALUES
-- Interior Material
('Parça', 'Salonun üz çəkməsi'),
('Velür', 'Salonun üz çəkməsi'),
('Dəri', 'Salonun üz çəkməsi'),
('Alkantara', 'Salonun üz çəkməsi'),
('Qarışıq', 'Salonun üz çəkməsi'),

-- Interior Color
('Açıq', 'Salonun rəngi'),
('Tünd', 'Salonun rəngi'),

-- Headlights
('Ksenon', 'Faralar'),
('Lazer', 'Faralar'),
('İşıq diodlu', 'Faralar'),
('Halogen', 'Faralar'),

-- Exterior
('Adaptiv işıqlandırma', 'Eksteryer'),
('Lyuk', 'Eksteryer'),
('Panoram dam', 'Eksteryer'),
('Duman əleyhinə faralar', 'Eksteryer'),

-- Wheel Size
('12"', 'Disk ölçüsü'),
('13"', 'Disk ölçüsü'),
('14"', 'Disk ölçüsü'),
('15"', 'Disk ölçüsü'),
('16"', 'Disk ölçüsü'),
('17"', 'Disk ölçüsü'),
('18"', 'Disk ölçüsü'),
('19"', 'Disk ölçüsü'),
('20"', 'Disk ölçüsü'),
('21"', 'Disk ölçüsü'),
('22"', 'Disk ölçüsü'),
('23"', 'Disk ölçüsü'),
('24"', 'Disk ölçüsü'),
('25"', 'Disk ölçüsü'),
('25"+', 'Disk ölçüsü'),

-- Functional
('Bort kompüter', 'Funksional avadanlıq'),
('Yağış sensoru', 'Funksional avadanlıq'),
('İşıq sensoru', 'Funksional avadanlıq'),
('Qızdırılan yan güzgülər', 'Funksional avadanlıq'),
('Fara yuyucuları', 'Funksional avadanlıq'),
('Sükan gücləndirici', 'Funksional avadanlıq'),
('Mərkəzi qapanma', 'Funksional avadanlıq'),
('Siqnalizasiya', 'Funksional avadanlıq'),
('Pnevmatik asqı', 'Funksional avadanlıq'),
('Əyləc zamanı rekuperasiya sistemi', 'Funksional avadanlıq'),

-- Comfort
('Kondisioner', 'Komfort'),
('Klimat-kontrol', 'Komfort'),
('Kruiz-kontrol', 'Komfort'),
('Adaptiv kruiz-kontrol', 'Komfort'),
('Avtomatik parklanma sistemi', 'Komfort'),
('Parktronik', 'Komfort'),
('Proyeksiya ekranı', 'Komfort'),
('Elektron cihazlar paneli', 'Komfort'),
('«Start-stop» sistemi', 'Komfort'),
('Qızdırılan sükan', 'Komfort'),
('Qızdırılan oturacaqlar', 'Komfort'),
('Ventilyasiyalı oturacaqlar', 'Komfort'),

-- Cameras
('Arxa görüntü kamerası', 'Kamera'),
('360° kamera', 'Kamera'),
('Ön və arxa kamera', 'Kamera'),

-- Adjustments
('Elektrik şüşəqaldıranlar', 'Tənzim edilmələr'),
('Güzgülərin elektrik tənzimlənməsi', 'Tənzim edilmələr'),
('Sürücü oturacağı elektrik tənzimləmə', 'Tənzim edilmələr'),
('Sürücü oturacağı yaddaş funksiyası', 'Tənzim edilmələr'),
('Sərnişin oturacağı elektrik tənzimləmə', 'Tənzim edilmələr'),
('Sükanın elektrik tənzimlənməsi', 'Tənzim edilmələr'),

-- Multimedia
('Android Auto', 'Multimedia'),
('Apple CarPlay', 'Multimedia'),
('Naviqasiya sistemi', 'Multimedia'),
('Səslə idarə olunma', 'Multimedia'),
('AUX', 'Multimedia'),
('Bluetooth', 'Multimedia'),
('CD', 'Multimedia'),
('USB', 'Multimedia'),
('TV', 'Multimedia'),
('Premium səs sistemi', 'Multimedia'),

-- Safety
('Antiqapanma sistemi (ABS)', 'Təhlükəsizlik'),
('Antisürüşmə sistemi (ASR)', 'Təhlükəsizlik'),
('Sabitlik sistemi (ESP)', 'Təhlükəsizlik'),
('Təhlükəsizlik yastıqları', 'Təhlükəsizlik'),
('Avtomatik saxlanma (Auto Hold)', 'Təhlükəsizlik'),
('Toqquşma xəbərdarlığı sistemi', 'Təhlükəsizlik'),
('Avtomatik təcili əyləc sistemi (AEB)', 'Təhlükəsizlik'),
('Zolaqdan çıxma xəbərdarlığı', 'Təhlükəsizlik'),
('Zolaqda saxlama assistenti', 'Təhlükəsizlik'),
('Tıxacda hərəkət assistenti', 'Təhlükəsizlik'),
('Sürücünün yorğunluğuna nəzarət', 'Təhlükəsizlik'),
('Yol nişanlarının tanınması', 'Təhlükəsizlik'),
('Kor zonalara nəzarət', 'Təhlükəsizlik'),
('İzofiks (Isofix)', 'Təhlükəsizlik');
