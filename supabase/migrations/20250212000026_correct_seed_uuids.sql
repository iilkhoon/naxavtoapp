/*
  # Correct Seed UUIDs
  
  ## Query Description: 
  This migration fixes the previous UUID syntax error by allowing Postgres to generate valid UUIDs automatically.
  It clears the listings table and repopulates it with 40 sample car listings using valid data types.
  
  ## Metadata:
  - Schema-Category: "Data"
  - Impact-Level: "High" (Resets listings data)
  - Requires-Backup: false
  - Reversible: true
  
  ## Structure Details:
  - Truncates `listings` table
  - Inserts 40 new rows with auto-generated UUIDs
*/

-- First, clear existing data to start fresh
TRUNCATE TABLE public.listings;

-- Insert 40 Sample Listings (Letting DB generate valid UUIDs)
INSERT INTO public.listings (
  title, price, currency, make, model, year, mileage, engine, location,
  image_url, images, is_credit, is_barter, is_vip, is_new,
  body_type, color, gearbox, transmission, market, fuel_type,
  description, seller_name, contact_phone, vin_code, short_id, status, created_at
) VALUES
-- VIP Listings (Top 4)
(
  'Mercedes-Benz C 300', 65000, 'AZN', 'Mercedes', 'C-Class', 2021, 45000, '2.0', 'Bakı',
  'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80'],
  false, true, true, false,
  'Sedan', 'Qara', 'Avtomat', 'Arxa', 'Avropa', 'Benzin',
  'Tam full salon, vuruğu yoxdur. Almaniyadan yeni gəlib.', 'Rəşad Əliyev', '+994502223344', 'WDB2050001A123456', 'MER001', 'approved', NOW()
),
(
  'BMW 530i M-Sport', 72000, 'AZN', 'BMW', '5-Series', 2022, 28000, '2.0', 'Bakı',
  'https://images.unsplash.com/photo-1555215695-3004980adade?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1555215695-3004980adade?auto=format&fit=crop&w=800&q=80'],
  true, false, true, false,
  'Sedan', 'Ağ', 'Avtomat', 'Arxa', 'Avropa', 'Benzin',
  'Rəsmi dilerdən alınıb. Qarantiyadadır.', 'Elvin Məmmədov', '+994551112233', 'WBA5300001B654321', 'BMW001', 'approved', NOW() - INTERVAL '1 hour'
),
(
  'Toyota Land Cruiser 300', 145000, 'USD', 'Toyota', 'Land Cruiser', 2023, 15000, '3.5', 'Bakı',
  'https://images.unsplash.com/photo-1594502184342-28ef38201217?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1594502184342-28ef38201217?auto=format&fit=crop&w=800&q=80'],
  false, false, true, true,
  'SUV', 'Qara', 'Avtomat', 'Tam', 'Dubay', 'Benzin',
  '70 illik yubiley versiyası. Tam dolu komplektasiya.', 'Vüqar Həsənov', '+994709998877', 'JTM3000001C987654', 'TOY001', 'approved', NOW() - INTERVAL '2 hours'
),
(
  'Porsche Panamera GTS', 110000, 'USD', 'Porsche', 'Panamera', 2020, 35000, '4.0', 'Bakı',
  'https://images.unsplash.com/photo-1503376763036-066120622c74?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1503376763036-066120622c74?auto=format&fit=crop&w=800&q=80'],
  true, true, true, false,
  'Liftbek', 'Qırmızı', 'Avtomat', 'Tam', 'Avropa', 'Benzin',
  'Keramika olunub. İdeal vəziyyətdədir.', 'Samir Quliyev', '+994518887766', 'WP0PAN0001D456789', 'POR001', 'approved', NOW() - INTERVAL '3 hours'
),

-- Regular Listings (Newest)
(
  'Hyundai Elantra', 28500, 'AZN', 'Hyundai', 'Elantra', 2021, 55000, '1.6', 'Sumqayıt',
  'https://images.unsplash.com/photo-1626847037657-fd3622613ce3?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1626847037657-fd3622613ce3?auto=format&fit=crop&w=800&q=80'],
  true, false, false, false,
  'Sedan', 'Gümüşü', 'Avtomat', 'Ön', 'Koreya', 'Benzin',
  'Ekonomik və rahat avtomobil. Heç bir problemi yoxdur.', 'Natiq Səfərov', '+994503334455', 'KMHELA0001E112233', 'HYU001', 'approved', NOW() - INTERVAL '4 hours'
),
(
  'Kia Sportage', 34000, 'AZN', 'Kia', 'Sportage', 2020, 62000, '2.0', 'Gəncə',
  'https://images.unsplash.com/photo-1570374910698-6db3d7d759a3?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1570374910698-6db3d7d759a3?auto=format&fit=crop&w=800&q=80'],
  false, true, false, false,
  'SUV', 'Göy', 'Avtomat', 'Ön', 'Koreya', 'Dizel',
  'Dizel mühərrik, çox qənaətcildir. Ailə maşınıdır.', 'Orxan Vəliyev', '+994552221100', 'KNASP0001F334455', 'KIA001', 'approved', NOW() - INTERVAL '5 hours'
),
(
  'Chevrolet Cruze', 18500, 'AZN', 'Chevrolet', 'Cruze', 2017, 110000, '1.4', 'Bakı',
  'https://images.unsplash.com/photo-1615887023516-9b6c50f486b6?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1615887023516-9b6c50f486b6?auto=format&fit=crop&w=800&q=80'],
  false, false, false, false,
  'Sedan', 'Ağ', 'Avtomat', 'Ön', 'Amerika', 'Benzin',
  'RS paket. Yüngül zədə ilə gəlib, tam təmir olunub.', 'Tural Mustafayev', '+994701112233', '1G1CR0001G556677', 'CHE001', 'approved', NOW() - INTERVAL '6 hours'
),
(
  'Lada (VAZ) Priora', 12500, 'AZN', 'Lada (VAZ)', 'Priora', 2015, 145000, '1.6', 'Naxçıvan',
  'https://images.unsplash.com/photo-1549524570-82d1a33199d8?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1549524570-82d1a33199d8?auto=format&fit=crop&w=800&q=80'],
  false, true, false, false,
  'Sedan', 'Qara', 'Mexanika', 'Ön', 'Rusiya', 'Benzin',
  'Yaxşı vəziyyətdədir. Təkərlər təzədir.', 'Həsən Kərimov', '+994602223344', 'XTA2170001H778899', 'LAD001', 'approved', NOW() - INTERVAL '7 hours'
),

-- More VIPs (Middle)
(
  'Range Rover Vogue', 95000, 'USD', 'Land Rover', 'Range Rover', 2019, 58000, '5.0', 'Bakı',
  'https://images.unsplash.com/photo-1606220838315-056192d5e927?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1606220838315-056192d5e927?auto=format&fit=crop&w=800&q=80'],
  true, true, true, false,
  'SUV', 'Qara', 'Avtomat', 'Tam', 'Avropa', 'Benzin',
  'Autobiography. Ən full versiyadır.', 'Cavid İsmayılov', '+994505556677', 'SALRR0001I990011', 'RRG001', 'approved', NOW() - INTERVAL '8 hours'
),
(
  'Mercedes-Benz G 63 AMG', 180000, 'USD', 'Mercedes', 'G-Class', 2021, 25000, '4.0', 'Bakı',
  'https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1520031441872-265e4ff70366?auto=format&fit=crop&w=800&q=80'],
  false, false, true, false,
  'SUV', 'Boz', 'Avtomat', 'Tam', 'Avropa', 'Benzin',
  'Edition 1. Mat rəng. Çox az sürülüb.', 'Fərid Əliyev', '+994559990011', 'WDB4630001J223344', 'MER002', 'approved', NOW() - INTERVAL '9 hours'
),

-- More Regular Listings (Mixed)
(
  'Toyota Camry', 24500, 'AZN', 'Toyota', 'Camry', 2018, 85000, '2.5', 'Bakı',
  'https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=800&q=80'],
  true, false, false, false,
  'Sedan', 'Ağ', 'Avtomat', 'Ön', 'Amerika', 'Hibrid',
  'SE komplektasiya. Çox ekonom və dözümlü maşındır.', 'Adil Qasımov', '+994703332211', 'JTNCM0001K445566', 'TOY002', 'approved', NOW() - INTERVAL '1 day'
),
(
  'Ford Fusion', 16800, 'AZN', 'Ford', 'Fusion', 2016, 120000, '1.5', 'Sumqayıt',
  'https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=800&q=80'],
  false, true, false, false,
  'Sedan', 'Qara', 'Avtomat', 'Ön', 'Amerika', 'Benzin',
  'Titanium. Dəri salon, lyuk. Xərci yoxdur.', 'Ramin Məmmədov', '+994508887766', '1FA6P0001L667788', 'FOR001', 'approved', NOW() - INTERVAL '1 day 2 hours'
),
(
  'Opel Astra', 11500, 'AZN', 'Opel', 'Astra', 2008, 180000, '1.3', 'Gəncə',
  'https://images.unsplash.com/photo-1570179538662-faa5e38e9d8f?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1570179538662-faa5e38e9d8f?auto=format&fit=crop&w=800&q=80'],
  false, false, false, false,
  'Universal', 'Gümüşü', 'Mexanika', 'Ön', 'Avropa', 'Dizel',
  'Dizel mühərrik. Çox az yanacaq işlədir. Taksi kimi sürülməyib.', 'İlqar Hüseynov', '+994554443322', 'W0L0AH0001M889900', 'OPE001', 'approved', NOW() - INTERVAL '1 day 5 hours'
),
(
  'Nissan X-Trail', 22000, 'AZN', 'Nissan', 'X-Trail', 2015, 95000, '2.0', 'Bakı',
  'https://images.unsplash.com/photo-1609520505218-7421da3b3d7d?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1609520505218-7421da3b3d7d?auto=format&fit=crop&w=800&q=80'],
  true, false, false, false,
  'SUV', 'Ağ', 'Avtomat', 'Tam', 'Yaponiya', 'Benzin',
  '7 yerlik. Ailə üçün idealdır. Panoramik lyuk.', 'Zaur Səmədov', '+994705554433', 'JN1TN0001N112233', 'NIS001', 'approved', NOW() - INTERVAL '2 days'
),
(
  'Kia Optima', 26000, 'AZN', 'Kia', 'Optima', 2019, 70000, '2.4', 'Bakı',
  'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=800&q=80'],
  true, true, false, false,
  'Sedan', 'Qara', 'Avtomat', 'Ön', 'Amerika', 'Benzin',
  'GT Line görünüş. Start/Stop, böyük monitor.', 'Eldar Rzayev', '+994506665544', 'KNAOT0001O334455', 'KIA002', 'approved', NOW() - INTERVAL '2 days 4 hours'
),
(
  'Hyundai Santa Fe', 38500, 'AZN', 'Hyundai', 'Santa Fe', 2020, 48000, '2.2', 'Bakı',
  'https://images.unsplash.com/photo-1582639510494-c80b5de9f148?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1582639510494-c80b5de9f148?auto=format&fit=crop&w=800&q=80'],
  false, false, false, false,
  'SUV', 'Boz', 'Avtomat', 'Tam', 'Koreya', 'Dizel',
  'TM (Yeni kusa). 7 yerlik. Dizel mühərrik.', 'Səbuhi Əhmədov', '+994557776655', 'KMHSF0001P556677', 'HYU002', 'approved', NOW() - INTERVAL '3 days'
),
(
  'Mercedes-Benz E 220', 32000, 'AZN', 'Mercedes', 'E-Class', 2014, 160000, '2.2', 'Bakı',
  'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80'],
  false, true, false, false,
  'Sedan', 'Qara', 'Avtomat', 'Arxa', 'Avropa', 'Dizel',
  'Restayl model. AMG paket. Vuruğu yoxdur.', 'Kamran Nağıyev', '+994708889900', 'WDB2120001Q778899', 'MER003', 'approved', NOW() - INTERVAL '3 days 6 hours'
),
(
  'BMW X5', 55000, 'AZN', 'BMW', 'X5', 2016, 115000, '3.0', 'Bakı',
  'https://images.unsplash.com/photo-1556800572-1b8aeef2c54f?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1556800572-1b8aeef2c54f?auto=format&fit=crop&w=800&q=80'],
  true, false, false, false,
  'SUV', 'Ağ', 'Avtomat', 'Tam', 'Amerika', 'Benzin',
  'M Paket. Head-up display, 360 kamera.', 'Rauf Babayev', '+994501110022', 'WBAX500001R990011', 'BMW002', 'approved', NOW() - INTERVAL '4 days'
),
(
  'Toyota Corolla', 21000, 'AZN', 'Toyota', 'Corolla', 2017, 90000, '1.6', 'Gəncə',
  'https://images.unsplash.com/photo-1623869675781-804f84b3e529?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1623869675781-804f84b3e529?auto=format&fit=crop&w=800&q=80'],
  false, false, false, false,
  'Sedan', 'Gümüşü', 'Avtomat', 'Ön', 'Avropa', 'Benzin',
  'Rəsmi diler maşınıdır. İlk sahibiyəm.', 'Nizami Quliyev', '+994552223344', 'JTNC00001S112233', 'TOY003', 'approved', NOW() - INTERVAL '4 days 5 hours'
),
(
  'Volkswagen Passat', 15500, 'AZN', 'Volkswagen', 'Passat', 2013, 135000, '1.8', 'Sumqayıt',
  'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80'],
  false, true, false, false,
  'Sedan', 'Qara', 'Avtomat', 'Ön', 'Amerika', 'Benzin',
  'TSI mühərrik. Sürətli və komfortlu.', 'Emil Hacıyev', '+994703334455', 'WVWPA0001T334455', 'VW001', 'approved', NOW() - INTERVAL '5 days'
),
(
  'Kia Cerato', 19500, 'AZN', 'Kia', 'Cerato', 2016, 105000, '1.6', 'Bakı',
  'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80'],
  true, false, false, false,
  'Sedan', 'Ağ', 'Avtomat', 'Ön', 'Koreya', 'Dizel',
  'Dizel mühərrik. Çox sərfəlidir.', 'Aqil Məmmədov', '+994504445566', 'KNACE0001U556677', 'KIA003', 'approved', NOW() - INTERVAL '5 days 8 hours'
),
(
  'Hyundai Tucson', 31000, 'AZN', 'Hyundai', 'Tucson', 2019, 65000, '2.0', 'Bakı',
  'https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?auto=format&fit=crop&w=800&q=80'],
  false, false, false, false,
  'SUV', 'Qara', 'Avtomat', 'Ön', 'Koreya', 'Dizel',
  'TL model. Panoramik lyuk, dəri salon.', 'Vüsal Kərimov', '+994555556677', 'KMHTU0001V778899', 'HYU003', 'approved', NOW() - INTERVAL '6 days'
),
(
  'Lada (VAZ) Niva', 14000, 'AZN', 'Lada (VAZ)', 'Niva', 2018, 55000, '1.7', 'Şəki',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80'],
  false, true, false, false,
  'SUV', 'Ağ', 'Mexanika', 'Tam', 'Rusiya', 'Benzin',
  'Urban. Kondisioner var. Səliqəli sürülüb.', 'Teymur Əliyev', '+994706667788', 'XTA2120001W990011', 'LAD002', 'approved', NOW() - INTERVAL '6 days 4 hours'
),
(
  'Mercedes-Benz S 500', 45000, 'AZN', 'Mercedes', 'S-Class', 2011, 190000, '5.5', 'Bakı',
  'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80'],
  false, false, false, false,
  'Sedan', 'Qara', 'Avtomat', 'Arxa', 'Yaponiya', 'Benzin',
  'Long versiya. Prezident paket. Hər bir funksiyası işləkdir.', 'Faiq Həsənov', '+994507778899', 'WDB2210001X112233', 'MER004', 'approved', NOW() - INTERVAL '7 days'
),
(
  'BMW 328i', 23500, 'AZN', 'BMW', '3-Series', 2015, 105000, '2.0', 'Bakı',
  'https://images.unsplash.com/photo-1556189250-72ba95452e13?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1556189250-72ba95452e13?auto=format&fit=crop&w=800&q=80'],
  true, false, false, false,
  'Sedan', 'Göy', 'Avtomat', 'Arxa', 'Amerika', 'Benzin',
  'F30 kuzov. M sükan, böyük monitor.', 'Rəşid Quliyev', '+994558889900', 'WBA3280001Y334455', 'BMW003', 'approved', NOW() - INTERVAL '1 week'
),
(
  'Toyota Prado', 36000, 'AZN', 'Toyota', 'Prado', 2014, 140000, '2.7', 'Bakı',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80'],
  false, true, false, false,
  'SUV', 'Qara', 'Avtomat', 'Tam', 'Dubay', 'Benzin',
  '7 yerlik. Monitor, kamera. Heç bir xərc tələb etmir.', 'Elçin Məmmədov', '+994709990011', 'JTEPR0001Z556677', 'TOY004', 'approved', NOW() - INTERVAL '1 week 2 days'
),
(
  'Opel Corsa', 9500, 'AZN', 'Opel', 'Corsa', 2009, 165000, '1.2', 'Sumqayıt',
  'https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=800&q=80'],
  false, false, false, false,
  'Hetçbek', 'Qırmızı', 'Avtomat', 'Ön', 'Avropa', 'Benzin',
  'Xanım maşınıdır. Çox səliqəli sürülüb.', 'Aysel Əliyeva', '+994501112233', 'W0L0CO0001A778899', 'OPE002', 'approved', NOW() - INTERVAL '1 week 4 days'
),
(
  'Nissan Juke', 17500, 'AZN', 'Nissan', 'Juke', 2014, 110000, '1.6', 'Bakı',
  'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=800&q=80'],
  true, false, false, false,
  'SUV', 'Ağ', 'Avtomat', 'Ön', 'Avropa', 'Benzin',
  'Şəhər üçün ideal krossover. Ekonomikdir.', 'Nigar Həsənova', '+994552223344', 'JN1JU0001B990011', 'NIS002', 'approved', NOW() - INTERVAL '1 week 6 days'
),
(
  'Chevrolet Malibu', 20500, 'AZN', 'Chevrolet', 'Malibu', 2018, 88000, '1.5', 'Bakı',
  'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80'],
  true, true, false, false,
  'Sedan', 'Göy', 'Avtomat', 'Ön', 'Amerika', 'Benzin',
  'LT komplektasiya. Böyük monitor, dəri salon.', 'Rüstəm Quliyev', '+994703334455', '1G1MA0001C112233', 'CHE002', 'approved', NOW() - INTERVAL '2 weeks'
),
(
  'Ford Focus', 14500, 'AZN', 'Ford', 'Focus', 2015, 130000, '2.0', 'Gəncə',
  'https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=800&q=80'],
  false, false, false, false,
  'Sedan', 'Qara', 'Avtomat', 'Ön', 'Amerika', 'Benzin',
  'SE model. Sadə mühərrik, sadə karobka.', 'Elmir Səfərov', '+994504445566', '1FA6P0001D334455', 'FOR002', 'approved', NOW() - INTERVAL '2 weeks 2 days'
),
(
  'Kia Rio', 18000, 'AZN', 'Kia', 'Rio', 2017, 95000, '1.4', 'Bakı',
  'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80'],
  true, false, false, false,
  'Sedan', 'Ağ', 'Avtomat', 'Ön', 'Avropa', 'Benzin',
  'Rəsmi servis maşınıdır. Vuruğu yoxdur.', 'Anar Vəliyev', '+994555556677', 'KNARI0001E556677', 'KIA004', 'approved', NOW() - INTERVAL '2 weeks 5 days'
),
(
  'Hyundai Sonata', 29000, 'AZN', 'Hyundai', 'Sonata', 2018, 75000, '2.0', 'Bakı',
  'https://images.unsplash.com/photo-1582639510494-c80b5de9f148?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1582639510494-c80b5de9f148?auto=format&fit=crop&w=800&q=80'],
  false, true, false, false,
  'Sedan', 'Gümüşü', 'Avtomat', 'Ön', 'Amerika', 'Benzin',
  'Sport paket. Dəri salon, lyuk.', 'Samir Əhmədov', '+994706667788', 'KMHSO0001F778899', 'HYU004', 'approved', NOW() - INTERVAL '3 weeks'
),
(
  'Lada (VAZ) 2107', 8500, 'AZN', 'Lada (VAZ)', '2107', 2011, 120000, '1.6', 'Lənkəran',
  'https://images.unsplash.com/photo-1549524570-82d1a33199d8?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1549524570-82d1a33199d8?auto=format&fit=crop&w=800&q=80'],
  false, false, false, false,
  'Sedan', 'Ağ', 'Mexanika', 'Arxa', 'Rusiya', 'Benzin',
  'İnyektor mühərrik. Çürüyü, pası yoxdur.', 'Vasif Qasımov', '+994507778899', 'XTA2107001G990011', 'LAD003', 'approved', NOW() - INTERVAL '3 weeks 2 days'
),
(
  'Mercedes-Benz C 200', 16500, 'AZN', 'Mercedes', 'C-Class', 2008, 210000, '2.2', 'Bakı',
  'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80'],
  false, false, false, false,
  'Sedan', 'Qara', 'Avtomat', 'Arxa', 'Avropa', 'Dizel',
  'W204 kuzov. Dizel mühərrik. Çox dözümlüdür.', 'Elşən Məmmədov', '+994558889900', 'WDB2040001H112233', 'MER005', 'approved', NOW() - INTERVAL '3 weeks 5 days'
),
(
  'BMW 528i', 27000, 'AZN', 'BMW', '5-Series', 2014, 130000, '2.0', 'Bakı',
  'https://images.unsplash.com/photo-1555215695-3004980adade?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1555215695-3004980adade?auto=format&fit=crop&w=800&q=80'],
  true, true, false, false,
  'Sedan', 'Ağ', 'Avtomat', 'Arxa', 'Amerika', 'Benzin',
  'F10 kuzov. Restayl. M sükan, böyük monitor.', 'Ramin Əliyev', '+994709990011', 'WBA5280001I334455', 'BMW004', 'approved', NOW() - INTERVAL '1 month'
),
(
  'Toyota Rav4', 42000, 'AZN', 'Toyota', 'Rav4', 2016, 100000, '2.5', 'Bakı',
  'https://images.unsplash.com/photo-1594502184342-28ef38201217?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1594502184342-28ef38201217?auto=format&fit=crop&w=800&q=80'],
  false, false, false, false,
  'SUV', 'Qara', 'Avtomat', 'Tam', 'Avropa', 'Benzin',
  'Rəsmi diler. Vuruğu, udarı yoxdur.', 'Namiq Həsənov', '+994501112233', 'JTERA0001J556677', 'TOY005', 'approved', NOW() - INTERVAL '1 month 2 days'
),
(
  'Opel Vectra', 8800, 'AZN', 'Opel', 'Vectra', 2007, 220000, '2.2', 'Gəncə',
  'https://images.unsplash.com/photo-1570179538662-faa5e38e9d8f?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1570179538662-faa5e38e9d8f?auto=format&fit=crop&w=800&q=80'],
  false, false, false, false,
  'Sedan', 'Göy', 'Avtomat', 'Ön', 'Avropa', 'Benzin',
  'C model. Mühərrik və karobka yaxşı vəziyyətdədir.', 'Sərxan Quliyev', '+994552223344', 'W0L0VE0001K778899', 'OPE003', 'approved', NOW() - INTERVAL '1 month 5 days'
),
(
  'Nissan Sunny', 13500, 'AZN', 'Nissan', 'Sunny', 2013, 150000, '1.5', 'Bakı',
  'https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=800&q=80'],
  false, true, false, false,
  'Sedan', 'Ağ', 'Avtomat', 'Ön', 'Dubay', 'Benzin',
  'Ekonomik maşındır. Kondisioner işləyir.', 'Elşad Məmmədov', '+994703334455', 'JN1SU0001L990011', 'NIS003', 'approved', NOW() - INTERVAL '1 month 1 week'
),
(
  'Chevrolet Niva', 12000, 'AZN', 'Chevrolet', 'Niva', 2014, 130000, '1.7', 'Şamaxı',
  'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80'],
  false, false, false, false,
  'SUV', 'Gümüşü', 'Mexanika', 'Tam', 'Rusiya', 'Benzin',
  'Bertone. Off-road üçün yığılıb.', 'Vüqar Əliyev', '+994504445566', 'X9L2123001M112233', 'CHE003', 'approved', NOW() - INTERVAL '1 month 2 weeks'
),
(
  'Hyundai Accent', 19000, 'AZN', 'Hyundai', 'Accent', 2017, 98000, '1.6', 'Bakı',
  'https://images.unsplash.com/photo-1626847037657-fd3622613ce3?auto=format&fit=crop&w=800&q=80',
  ARRAY['https://images.unsplash.com/photo-1626847037657-fd3622613ce3?auto=format&fit=crop&w=800&q=80'],
  true, false, false, false,
  'Sedan', 'Qara', 'Avtomat', 'Ön', 'Rusiya', 'Benzin',
  'Rəsmi diler. Yürüş orijinaldır.', 'Orxan Həsənov', '+994555556677', 'KMHAC0001N334455', 'HYU005', 'approved', NOW() - INTERVAL '2 months'
);
