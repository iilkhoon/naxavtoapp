/*
  # Fix Truncate and Re-seed Listings
  
  1. Clear existing data
     - Truncate `listings` and `comments` tables with CASCADE to handle foreign key constraints.
  2. Insert 40 new sample listings
     - Use `gen_random_uuid()` for IDs to avoid syntax errors.
     - Include `short_id`.
     - Varied data for testing (Mercedes, BMW, Toyota, etc.).
*/

-- Clear existing data safely
TRUNCATE TABLE listings, comments CASCADE;

-- Insert 40 Sample Listings
INSERT INTO listings (
  id,
  short_id,
  make,
  model,
  title,
  year,
  price,
  currency,
  mileage,
  engine,
  location,
  image_url,
  images,
  is_credit,
  is_barter,
  is_vip,
  is_new,
  body_type,
  color,
  gearbox,
  transmission,
  market,
  fuel_type,
  description,
  seller_name,
  contact_phone,
  vin_code,
  status,
  created_at
) VALUES 
-- 1. VIP Mercedes (Top)
(gen_random_uuid(), 'MER001', 'Mercedes', 'C-Class', 'Mercedes C-Class', 2021, 65000, 'AZN', 45000, '2.0', 'Bakı', 
 'https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80', 
 ARRAY['https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=800&q=80'], 
 false, true, true, false, 'Sedan', 'Qara', 'Avtomat', 'Arxa', 'Avropa', 'Benzin', 'Tam full salon, vuruğu yoxdur.', 'Rəşad Əliyev', '+994502223344', 'WDB2050001A123456', 'approved', NOW()),

-- 2. VIP BMW (Top)
(gen_random_uuid(), 'BMW001', 'BMW', '5 Series', 'BMW 5 Series', 2022, 72000, 'AZN', 28000, '2.0', 'Bakı', 
 'https://images.unsplash.com/photo-1555215695-3004980adade?auto=format&fit=crop&w=800&q=80', 
 ARRAY['https://images.unsplash.com/photo-1555215695-3004980adade?auto=format&fit=crop&w=800&q=80'], 
 true, false, true, false, 'Sedan', 'Ağ', 'Avtomat', 'Tam', 'Avropa', 'Dizel', 'M Paket, ideal vəziyyətdə.', 'Orxan Məmmədov', '+994551112233', 'WBA500001B123456', 'approved', NOW() - INTERVAL '1 hour'),

-- 3. VIP Toyota (Top)
(gen_random_uuid(), 'TOY001', 'Toyota', 'Camry', 'Toyota Camry', 2023, 58000, 'AZN', 15000, '2.5', 'Gəncə', 
 'https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=800&q=80', 
 ARRAY['https://images.unsplash.com/photo-1621007947382-bb3c3968e3bb?auto=format&fit=crop&w=800&q=80'], 
 false, false, true, false, 'Sedan', 'Gümüşü', 'Avtomat', 'Ön', 'Amerika', 'Hibrid', 'Ekonomik və dözümlü.', 'Elçin Qasımov', '+994703334455', 'JT12345678901234', 'approved', NOW() - INTERVAL '2 hours'),

-- 4. VIP Hyundai (Top)
(gen_random_uuid(), 'HYU001', 'Hyundai', 'Elantra', 'Hyundai Elantra', 2022, 42000, 'AZN', 35000, '1.6', 'Bakı', 
 'https://images.unsplash.com/photo-1626847037657-fd3622613ce3?auto=format&fit=crop&w=800&q=80', 
 ARRAY['https://images.unsplash.com/photo-1626847037657-fd3622613ce3?auto=format&fit=crop&w=800&q=80'], 
 true, true, true, false, 'Sedan', 'Boz', 'Avtomat', 'Ön', 'Koreya', 'Benzin', 'Kredit mümkündür.', 'Vüsal Həsənov', '+994519998877', 'KMH1234567890123', 'approved', NOW() - INTERVAL '3 hours'),

-- 5. Kia Sportage (Newest Regular)
(gen_random_uuid(), 'KIA001', 'Kia', 'Sportage', 'Kia Sportage', 2024, 52000, 'AZN', 0, '1.6', 'Bakı', 
 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80', 
 ARRAY['https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=800&q=80'], 
 true, false, false, true, 'SUV', 'Yaşıl', 'Avtomat', 'Ön', 'Avropa', 'Benzin', 'Rəsmi zəmanət.', 'Kia Motors', '+994123456789', 'KNA1234567890123', 'approved', NOW() - INTERVAL '4 hours'),

-- 6. Chevrolet Cruze (Newest Regular)
(gen_random_uuid(), 'CHE001', 'Chevrolet', 'Cruze', 'Chevrolet Cruze', 2018, 18500, 'AZN', 120000, '1.4', 'Sumqayıt', 
 'https://images.unsplash.com/photo-1619682817481-e994891cd1f5?auto=format&fit=crop&w=800&q=80', 
 ARRAY['https://images.unsplash.com/photo-1619682817481-e994891cd1f5?auto=format&fit=crop&w=800&q=80'], 
 false, false, false, false, 'Sedan', 'Qara', 'Avtomat', 'Ön', 'Amerika', 'Benzin', 'RS paket.', 'Samir', '+994501111111', '1G12345678901234', 'approved', NOW() - INTERVAL '5 hours'),

-- 7. Ford Fusion (Newest Regular)
(gen_random_uuid(), 'FOR001', 'Ford', 'Fusion', 'Ford Fusion', 2019, 22000, 'AZN', 95000, '1.5', 'Bakı', 
 'https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=800&q=80', 
 ARRAY['https://images.unsplash.com/photo-1551830820-330a71b99659?auto=format&fit=crop&w=800&q=80'], 
 false, true, false, false, 'Sedan', 'Ağ', 'Avtomat', 'Ön', 'Amerika', 'Benzin', 'Titanium komplektasiya.', 'Nurlan', '+994552222222', '1FA1234567890123', 'approved', NOW() - INTERVAL '6 hours'),

-- 8. Nissan X-Trail (Newest Regular)
(gen_random_uuid(), 'NIS001', 'Nissan', 'X-Trail', 'Nissan X-Trail', 2020, 38000, 'AZN', 60000, '2.5', 'Bakı', 
 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=800&q=80', 
 ARRAY['https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=800&q=80'], 
 true, false, false, false, 'SUV', 'Boz', 'Avtomat', 'Tam', 'Dubay', 'Benzin', 'Ailə maşını.', 'Kamran', '+994703333333', 'JN12345678901234', 'approved', NOW() - INTERVAL '7 hours'),

-- 9. VIP Range Rover (Middle)
(gen_random_uuid(), 'RAN001', 'Land Rover', 'Range Rover', 'Land Rover Range Rover', 2023, 250000, 'AZN', 10000, '4.4', 'Bakı', 
 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=800&q=80', 
 ARRAY['https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=800&q=80'], 
 false, true, true, false, 'SUV', 'Qara', 'Avtomat', 'Tam', 'Avropa', 'Benzin', 'Autobiography.', 'Fərid', '+994504444444', 'SAL1234567890123', 'approved', NOW() - INTERVAL '8 hours'),

-- 10. VIP Porsche Cayenne (Middle)
(gen_random_uuid(), 'POR001', 'Porsche', 'Cayenne', 'Porsche Cayenne', 2022, 180000, 'AZN', 25000, '3.0', 'Bakı', 
 'https://images.unsplash.com/photo-1503376763036-066120622c74?auto=format&fit=crop&w=800&q=80', 
 ARRAY['https://images.unsplash.com/photo-1503376763036-066120622c74?auto=format&fit=crop&w=800&q=80'], 
 true, false, true, false, 'SUV', 'Göy', 'Avtomat', 'Tam', 'Avropa', 'Benzin', 'Coupe.', 'Emin', '+994555555555', 'WP12345678901234', 'approved', NOW() - INTERVAL '9 hours'),

-- 11-40. Mixed Regular Listings
(gen_random_uuid(), 'LAD001', 'Lada (VAZ)', 'Niva', 'Lada Niva', 2015, 12000, 'AZN', 150000, '1.7', 'Lənkəran', 
 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80', ARRAY['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'], false, false, false, false, 'SUV', 'Ağ', 'Mexanika', 'Tam', 'Rusiya', 'Benzin', 'Yaxşı vəziyyətdə.', 'Əli', '+994506666666', 'XTA1234567890123', 'approved', NOW() - INTERVAL '10 hours'),

(gen_random_uuid(), 'LAD002', 'Lada (VAZ)', 'Priora', 'Lada Priora', 2014, 10500, 'AZN', 180000, '1.6', 'Xaçmaz', 
 'https://images.unsplash.com/photo-1589634749000-1e432222f930?auto=format&fit=crop&w=800&q=80', ARRAY['https://images.unsplash.com/photo-1589634749000-1e432222f930?auto=format&fit=crop&w=800&q=80'], false, true, false, false, 'Sedan', 'Qara', 'Mexanika', 'Ön', 'Rusiya', 'Benzin', 'Təcili satılır.', 'Vəli', '+994557777777', 'XTA9876543210123', 'approved', NOW() - INTERVAL '11 hours'),

(gen_random_uuid(), 'OPE001', 'Opel', 'Astra', 'Opel Astra', 2008, 11500, 'AZN', 220000, '1.3', 'Bakı', 
 'https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&w=800&q=80', ARRAY['https://images.unsplash.com/photo-1507136566006-cfc505b114fc?auto=format&fit=crop&w=800&q=80'], false, false, false, false, 'Universal', 'Gümüşü', 'Mexanika', 'Ön', 'Avropa', 'Dizel', 'Ekonomik.', 'Həsən', '+994708888888', 'W0L1234567890123', 'approved', NOW() - INTERVAL '12 hours'),

(gen_random_uuid(), 'MER002', 'Mercedes', 'E-Class', 'Mercedes E-Class', 2012, 24000, 'AZN', 180000, '2.2', 'Bakı', 
 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80', ARRAY['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80'], true, false, false, false, 'Sedan', 'Qara', 'Avtomat', 'Arxa', 'Avropa', 'Dizel', 'Panorama lyuk.', 'Zaur', '+994509999999', 'WDB2120001A12345', 'approved', NOW() - INTERVAL '13 hours'),

(gen_random_uuid(), 'BMW002', 'BMW', '3 Series', 'BMW 3 Series', 2015, 28000, 'AZN', 140000, '2.0', 'Bakı', 
 'https://images.unsplash.com/photo-1556189250-72ba954522bb?auto=format&fit=crop&w=800&q=80', ARRAY['https://images.unsplash.com/photo-1556189250-72ba954522bb?auto=format&fit=crop&w=800&q=80'], false, true, false, false, 'Sedan', 'Ağ', 'Avtomat', 'Arxa', 'Amerika', 'Benzin', 'F30 kuzov.', 'Tural', '+994551010101', 'WBA300001B123456', 'approved', NOW() - INTERVAL '14 hours'),

(gen_random_uuid(), 'TOY002', 'Toyota', 'Prado', 'Toyota Prado', 2010, 32000, 'AZN', 200000, '2.7', 'Bakı', 
 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80', ARRAY['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80'], false, false, false, false, 'SUV', 'Qara', 'Avtomat', 'Tam', 'Dubay', 'Benzin', '7 yerlik.', 'İlqar', '+994702020202', 'JTE1234567890123', 'approved', NOW() - INTERVAL '15 hours'),

(gen_random_uuid(), 'KIA002', 'Kia', 'Rio', 'Kia Rio', 2018, 19500, 'AZN', 80000, '1.4', 'Bakı', 
 'https://images.unsplash.com/photo-1567808291548-7946e3356c53?auto=format&fit=crop&w=800&q=80', ARRAY['https://images.unsplash.com/photo-1567808291548-7946e3356c53?auto=format&fit=crop&w=800&q=80'], true, false, false, false, 'Sedan', 'Boz', 'Avtomat', 'Ön', 'Rusiya', 'Benzin', 'Xanım idarə edib.', 'Aysel', '+994503030303', 'KNA9876543210123', 'approved', NOW() - INTERVAL '16 hours'),

(gen_random_uuid(), 'HYU002', 'Hyundai', 'Santa Fe', 'Hyundai Santa Fe', 2014, 26000, 'AZN', 160000, '2.2', 'Bakı', 
 'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=800&q=80', ARRAY['https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=800&q=80'], false, true, false, false, 'SUV', 'Ağ', 'Avtomat', 'Tam', 'Koreya', 'Dizel', 'Full komplektasiya.', 'Ramin', '+994554040404', 'KMH9876543210123', 'approved', NOW() - INTERVAL '17 hours'),

(gen_random_uuid(), 'NIS002', 'Nissan', 'Sunny', 'Nissan Sunny', 2013, 13000, 'AZN', 190000, '1.5', 'Bakı', 
 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80', ARRAY['https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80'], false, false, false, false, 'Sedan', 'Gümüşü', 'Avtomat', 'Ön', 'Dubay', 'Benzin', 'Ekonomik şəhər maşını.', 'Elmir', '+994705050505', 'JN98765432101234', 'approved', NOW() - INTERVAL '18 hours'),

(gen_random_uuid(), 'FOR002', 'Ford', 'Focus', 'Ford Focus', 2016, 16000, 'AZN', 110000, '2.0', 'Bakı', 
 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80', ARRAY['https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=800&q=80'], true, false, false, false, 'Hetçbek', 'Qırmızı', 'Avtomat', 'Ön', 'Amerika', 'Benzin', 'SE model.', 'Leyla', '+994506060606', '1FA9876543210123', 'approved', NOW() - INTERVAL '19 hours'),

-- Adding 20 more generic listings to reach 40 total
(gen_random_uuid(), 'MER003', 'Mercedes', 'Vito', 'Mercedes Vito', 2008, 18000, 'AZN', 300000, '2.2', 'Bakı', 'https://via.placeholder.com/800x600?text=Mercedes+Vito', ARRAY['https://via.placeholder.com/800x600?text=Mercedes+Vito'], false, false, false, false, 'Minivan', 'Qara', 'Mexanika', 'Arxa', 'Avropa', 'Dizel', 'Sərnişin daşıma.', 'Səlim', '+994557070707', 'WDB6390001A12345', 'approved', NOW() - INTERVAL '20 hours'),
(gen_random_uuid(), 'BMW003', 'BMW', 'X5', 'BMW X5', 2011, 29000, 'AZN', 210000, '3.0', 'Bakı', 'https://via.placeholder.com/800x600?text=BMW+X5', ARRAY['https://via.placeholder.com/800x600?text=BMW+X5'], false, true, false, false, 'SUV', 'Ağ', 'Avtomat', 'Tam', 'Amerika', 'Benzin', 'E70.', 'Mahir', '+994708080808', 'WBA700001B123456', 'approved', NOW() - INTERVAL '21 hours'),
(gen_random_uuid(), 'TOY003', 'Toyota', 'Corolla', 'Toyota Corolla', 2015, 23000, 'AZN', 130000, '1.6', 'Bakı', 'https://via.placeholder.com/800x600?text=Toyota+Corolla', ARRAY['https://via.placeholder.com/800x600?text=Toyota+Corolla'], true, false, false, false, 'Sedan', 'Gümüşü', 'Avtomat', 'Ön', 'Avropa', 'Benzin', 'Rəsmi servis.', 'Natiq', '+994509090909', 'JT3000001A123456', 'approved', NOW() - INTERVAL '22 hours'),
(gen_random_uuid(), 'KIA003', 'Kia', 'Optima', 'Kia Optima', 2017, 25000, 'AZN', 100000, '2.0', 'Bakı', 'https://via.placeholder.com/800x600?text=Kia+Optima', ARRAY['https://via.placeholder.com/800x600?text=Kia+Optima'], false, true, false, false, 'Sedan', 'Qara', 'Avtomat', 'Ön', 'Koreya', 'Benzin', 'Panorama.', 'Elşən', '+994551212121', 'KNA300001A123456', 'approved', NOW() - INTERVAL '23 hours'),
(gen_random_uuid(), 'HYU003', 'Hyundai', 'Accent', 'Hyundai Accent', 2019, 21000, 'AZN', 70000, '1.4', 'Bakı', 'https://via.placeholder.com/800x600?text=Hyundai+Accent', ARRAY['https://via.placeholder.com/800x600?text=Hyundai+Accent'], true, false, false, false, 'Sedan', 'Ağ', 'Avtomat', 'Ön', 'Rusiya', 'Benzin', 'Təmiz maşın.', 'Rauf', '+994702323232', 'KMH300001A123456', 'approved', NOW() - INTERVAL '1 day'),
(gen_random_uuid(), 'LAD003', 'Lada (VAZ)', '2107', 'Lada 2107', 2011, 8500, 'AZN', 120000, '1.6', 'Bakı', 'https://via.placeholder.com/800x600?text=Lada+2107', ARRAY['https://via.placeholder.com/800x600?text=Lada+2107'], false, false, false, false, 'Sedan', 'Ağ', 'Mexanika', 'Arxa', 'Rusiya', 'Benzin', '07.', 'Qadir', '+994503434343', 'XTA2107001A12345', 'approved', NOW() - INTERVAL '1 day 1 hour'),
(gen_random_uuid(), 'OPE002', 'Opel', 'Vectra', 'Opel Vectra', 2000, 8000, 'AZN', 350000, '2.0', 'Gəncə', 'https://via.placeholder.com/800x600?text=Opel+Vectra', ARRAY['https://via.placeholder.com/800x600?text=Opel+Vectra'], false, false, false, false, 'Sedan', 'Göy', 'Mexanika', 'Ön', 'Avropa', 'Benzin', 'Vectra B.', 'Akif', '+994554545454', 'W0L300001A123456', 'approved', NOW() - INTERVAL '1 day 2 hours'),
(gen_random_uuid(), 'MER004', 'Mercedes', 'S-Class', 'Mercedes S-Class', 2015, 60000, 'AZN', 120000, '3.5', 'Bakı', 'https://via.placeholder.com/800x600?text=Mercedes+S-Class', ARRAY['https://via.placeholder.com/800x600?text=Mercedes+S-Class'], false, true, false, false, 'Sedan', 'Qara', 'Avtomat', 'Arxa', 'Avropa', 'Hibrid', 'W222.', 'Cavid', '+994705656565', 'WDB2220001A12345', 'approved', NOW() - INTERVAL '1 day 3 hours'),
(gen_random_uuid(), 'BMW004', 'BMW', 'F10', 'BMW 5 Series', 2013, 30000, 'AZN', 190000, '2.0', 'Bakı', 'https://via.placeholder.com/800x600?text=BMW+F10', ARRAY['https://via.placeholder.com/800x600?text=BMW+F10'], true, false, false, false, 'Sedan', 'Qara', 'Avtomat', 'Arxa', 'Avropa', 'Benzin', 'M5 yığılıb.', 'Ruslan', '+994506767676', 'WBA500002B123456', 'approved', NOW() - INTERVAL '1 day 4 hours'),
(gen_random_uuid(), 'TOY004', 'Toyota', 'Land Cruiser', 'Toyota Land Cruiser', 2018, 85000, 'AZN', 90000, '4.6', 'Bakı', 'https://via.placeholder.com/800x600?text=Toyota+LC200', ARRAY['https://via.placeholder.com/800x600?text=Toyota+LC200'], false, true, false, false, 'SUV', 'Ağ', 'Avtomat', 'Tam', 'Dubay', 'Benzin', 'LC200.', 'Hikmət', '+994557878787', 'JTE200001A123456', 'approved', NOW() - INTERVAL '1 day 5 hours'),
(gen_random_uuid(), 'KIA004', 'Kia', 'Cerato', 'Kia Cerato', 2014, 18000, 'AZN', 150000, '1.6', 'Bakı', 'https://via.placeholder.com/800x600?text=Kia+Cerato', ARRAY['https://via.placeholder.com/800x600?text=Kia+Cerato'], true, false, false, false, 'Sedan', 'Gümüşü', 'Avtomat', 'Ön', 'Koreya', 'Benzin', 'Ekonomik.', 'Nizami', '+994708989898', 'KNA400001A123456', 'approved', NOW() - INTERVAL '1 day 6 hours'),
(gen_random_uuid(), 'HYU004', 'Hyundai', 'Sonata', 'Hyundai Sonata', 2016, 22000, 'AZN', 110000, '2.0', 'Bakı', 'https://via.placeholder.com/800x600?text=Hyundai+Sonata', ARRAY['https://via.placeholder.com/800x600?text=Hyundai+Sonata'], false, true, false, false, 'Sedan', 'Boz', 'Avtomat', 'Ön', 'Amerika', 'Hibrid', 'Limited.', 'Tofiq', '+994501212121', 'KMH400001A123456', 'approved', NOW() - INTERVAL '1 day 7 hours'),
(gen_random_uuid(), 'LAD004', 'Lada (VAZ)', 'Niva Urban', 'Lada Niva', 2020, 16000, 'AZN', 40000, '1.7', 'Bakı', 'https://via.placeholder.com/800x600?text=Lada+Niva+Urban', ARRAY['https://via.placeholder.com/800x600?text=Lada+Niva+Urban'], false, false, false, false, 'SUV', 'Qara', 'Mexanika', 'Tam', 'Rusiya', 'Benzin', 'Urban.', 'Yaşar', '+994552323232', 'XTA400001A123456', 'approved', NOW() - INTERVAL '1 day 8 hours'),
(gen_random_uuid(), 'OPE003', 'Opel', 'Corsa', 'Opel Corsa', 2009, 10000, 'AZN', 180000, '1.2', 'Bakı', 'https://via.placeholder.com/800x600?text=Opel+Corsa', ARRAY['https://via.placeholder.com/800x600?text=Opel+Corsa'], true, false, false, false, 'Hetçbek', 'Qırmızı', 'Avtomat', 'Ön', 'Avropa', 'Benzin', 'Xanım maşını.', 'Sevda', '+994703434343', 'W0L400001A123456', 'approved', NOW() - INTERVAL '1 day 9 hours'),
(gen_random_uuid(), 'MER005', 'Mercedes', 'GL-Class', 'Mercedes GL-Class', 2014, 45000, 'AZN', 140000, '4.7', 'Bakı', 'https://via.placeholder.com/800x600?text=Mercedes+GL', ARRAY['https://via.placeholder.com/800x600?text=Mercedes+GL'], false, true, false, false, 'SUV', 'Ağ', 'Avtomat', 'Tam', 'Amerika', 'Benzin', 'GL500.', 'Rafiq', '+994504545454', 'WDB1660001A12345', 'approved', NOW() - INTERVAL '1 day 10 hours'),
(gen_random_uuid(), 'BMW005', 'BMW', '7 Series', 'BMW 7 Series', 2010, 28000, 'AZN', 220000, '3.0', 'Bakı', 'https://via.placeholder.com/800x600?text=BMW+7+Series', ARRAY['https://via.placeholder.com/800x600?text=BMW+7+Series'], true, false, false, false, 'Sedan', 'Qara', 'Avtomat', 'Arxa', 'Avropa', 'Dizel', 'F01.', 'Murad', '+994555656565', 'WBA700002B123456', 'approved', NOW() - INTERVAL '1 day 11 hours'),
(gen_random_uuid(), 'TOY005', 'Toyota', 'RAV4', 'Toyota RAV4', 2016, 42000, 'AZN', 80000, '2.5', 'Bakı', 'https://via.placeholder.com/800x600?text=Toyota+RAV4', ARRAY['https://via.placeholder.com/800x600?text=Toyota+RAV4'], false, true, false, false, 'SUV', 'Ağ', 'Avtomat', 'Tam', 'Avropa', 'Benzin', 'Ideal.', 'Səbuhi', '+994706767676', 'JTE400001A123456', 'approved', NOW() - INTERVAL '1 day 12 hours'),
(gen_random_uuid(), 'KIA005', 'Kia', 'Sorento', 'Kia Sorento', 2015, 32000, 'AZN', 120000, '2.2', 'Bakı', 'https://via.placeholder.com/800x600?text=Kia+Sorento', ARRAY['https://via.placeholder.com/800x600?text=Kia+Sorento'], true, false, false, false, 'SUV', 'Qara', 'Avtomat', 'Tam', 'Koreya', 'Dizel', '7 yer.', 'Vaqif', '+994507878787', 'KNA500001A123456', 'approved', NOW() - INTERVAL '1 day 13 hours'),
(gen_random_uuid(), 'HYU005', 'Hyundai', 'Tucson', 'Hyundai Tucson', 2017, 35000, 'AZN', 90000, '2.0', 'Bakı', 'https://via.placeholder.com/800x600?text=Hyundai+Tucson', ARRAY['https://via.placeholder.com/800x600?text=Hyundai+Tucson'], false, true, false, false, 'SUV', 'Göy', 'Avtomat', 'Ön', 'Koreya', 'Dizel', 'Full.', 'Elvin', '+994558989898', 'KMH500001A123456', 'approved', NOW() - INTERVAL '1 day 14 hours'),
(gen_random_uuid(), 'CHE002', 'Chevrolet', 'Malibu', 'Chevrolet Malibu', 2018, 20000, 'AZN', 100000, '1.5', 'Bakı', 'https://via.placeholder.com/800x600?text=Chevrolet+Malibu', ARRAY['https://via.placeholder.com/800x600?text=Chevrolet+Malibu'], true, false, false, false, 'Sedan', 'Qara', 'Avtomat', 'Ön', 'Amerika', 'Benzin', 'LT.', 'Azər', '+994709090909', '1G1500001A123456', 'approved', NOW() - INTERVAL '1 day 15 hours');
