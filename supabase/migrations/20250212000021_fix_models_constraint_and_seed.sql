/*
  # Fix Constraints and Seed Brands/Models
  
  1.  Structure Changes:
      - Ensures `brands` table has a unique constraint on `name`.
      - Ensures `models` table has a unique constraint on `(brand_id, name)`.
      - Removes duplicate models if any exist before adding the constraint.
  
  2.  Data Seeding:
      - Inserts 57 car brands with their logos.
      - Inserts corresponding models for each brand.
      - Uses `ON CONFLICT` to ensure idempotency (can be run multiple times without error).
*/

-- 1. Ensure Unique Constraints
DO $$ 
BEGIN 
    -- Brands: Ensure name is unique
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'brands_name_key') THEN
        ALTER TABLE public.brands ADD CONSTRAINT brands_name_key UNIQUE (name);
    END IF;

    -- Models: Remove duplicates first to allow creating the unique constraint
    DELETE FROM public.models a USING public.models b
    WHERE a.id > b.id AND a.brand_id = b.brand_id AND a.name = b.name;

    -- Models: Ensure (brand_id, name) is unique
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'models_brand_id_name_key') THEN
        ALTER TABLE public.models ADD CONSTRAINT models_brand_id_name_key UNIQUE (brand_id, name);
    END IF;
END $$;

-- 2. Seed Data
DO $$
DECLARE
    v_brand_id uuid;
BEGIN
    -- Acura
    INSERT INTO public.brands (name, logo_url) VALUES ('Acura', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/acura.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;
    
    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'MDX'), (v_brand_id, 'RDX'), (v_brand_id, 'TLX'), (v_brand_id, 'ILX'), (v_brand_id, 'NSX'), (v_brand_id, 'Integra')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Alfa Romeo
    INSERT INTO public.brands (name, logo_url) VALUES ('Alfa Romeo', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/alfa-romeo.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Giulia'), (v_brand_id, 'Stelvio'), (v_brand_id, 'Tonale'), (v_brand_id, 'Giulietta'), (v_brand_id, '4C'), (v_brand_id, '159')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Audi
    INSERT INTO public.brands (name, logo_url) VALUES ('Audi', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/audi.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'A3'), (v_brand_id, 'A4'), (v_brand_id, 'A5'), (v_brand_id, 'A6'), (v_brand_id, 'A7'), (v_brand_id, 'A8'), 
    (v_brand_id, 'Q2'), (v_brand_id, 'Q3'), (v_brand_id, 'Q5'), (v_brand_id, 'Q7'), (v_brand_id, 'Q8'), 
    (v_brand_id, 'e-tron'), (v_brand_id, 'RS6'), (v_brand_id, 'RS7'), (v_brand_id, 'TT'), (v_brand_id, 'R8')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Aston Martin
    INSERT INTO public.brands (name, logo_url) VALUES ('Aston Martin', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/aston-martin.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'DB11'), (v_brand_id, 'Vantage'), (v_brand_id, 'DBS'), (v_brand_id, 'DBX'), (v_brand_id, 'Valkyrie')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Bentley
    INSERT INTO public.brands (name, logo_url) VALUES ('Bentley', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/bentley.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Continental GT'), (v_brand_id, 'Flying Spur'), (v_brand_id, 'Bentayga'), (v_brand_id, 'Mulsanne')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- BMW
    INSERT INTO public.brands (name, logo_url) VALUES ('BMW', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/bmw.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, '1 Series'), (v_brand_id, '3 Series'), (v_brand_id, '4 Series'), (v_brand_id, '5 Series'), (v_brand_id, '7 Series'), (v_brand_id, '8 Series'),
    (v_brand_id, 'X1'), (v_brand_id, 'X3'), (v_brand_id, 'X5'), (v_brand_id, 'X6'), (v_brand_id, 'X7'),
    (v_brand_id, 'M3'), (v_brand_id, 'M4'), (v_brand_id, 'M5'), (v_brand_id, 'iX'), (v_brand_id, 'i4'), (v_brand_id, 'Z4')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- BYD
    INSERT INTO public.brands (name, logo_url) VALUES ('BYD', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/byd.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Han'), (v_brand_id, 'Tang'), (v_brand_id, 'Atto 3'), (v_brand_id, 'Dolphin'), (v_brand_id, 'Seal'), (v_brand_id, 'Song Plus'), (v_brand_id, 'Chazor')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Cadillac
    INSERT INTO public.brands (name, logo_url) VALUES ('Cadillac', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/cadillac.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Escalade'), (v_brand_id, 'CT4'), (v_brand_id, 'CT5'), (v_brand_id, 'XT4'), (v_brand_id, 'XT5'), (v_brand_id, 'XT6'), (v_brand_id, 'Lyriq')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Changan
    INSERT INTO public.brands (name, logo_url) VALUES ('Changan', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/changan.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'CS35'), (v_brand_id, 'CS55'), (v_brand_id, 'CS75'), (v_brand_id, 'CS85'), (v_brand_id, 'CS95'), (v_brand_id, 'Uni-K'), (v_brand_id, 'Uni-T'), (v_brand_id, 'Uni-V')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Chevrolet
    INSERT INTO public.brands (name, logo_url) VALUES ('Chevrolet', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/chevrolet.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Cruze'), (v_brand_id, 'Malibu'), (v_brand_id, 'Aveo'), (v_brand_id, 'Spark'), (v_brand_id, 'Camaro'), (v_brand_id, 'Corvette'), 
    (v_brand_id, 'Tahoe'), (v_brand_id, 'Suburban'), (v_brand_id, 'Trax'), (v_brand_id, 'Equinox'), (v_brand_id, 'Captiva')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Chery
    INSERT INTO public.brands (name, logo_url) VALUES ('Chery', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/chery.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Tiggo 2'), (v_brand_id, 'Tiggo 4'), (v_brand_id, 'Tiggo 7'), (v_brand_id, 'Tiggo 8 Pro'), (v_brand_id, 'Arrizo 5'), (v_brand_id, 'Arrizo 6')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Citroen
    INSERT INTO public.brands (name, logo_url) VALUES ('Citroen', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/citroen.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'C3'), (v_brand_id, 'C4'), (v_brand_id, 'C5 Aircross'), (v_brand_id, 'C-Elysee'), (v_brand_id, 'Berlingo'), (v_brand_id, 'Ami')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Dacia
    INSERT INTO public.brands (name, logo_url) VALUES ('Dacia', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/dacia.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Duster'), (v_brand_id, 'Sandero'), (v_brand_id, 'Logan'), (v_brand_id, 'Jogger'), (v_brand_id, 'Spring')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Daewoo
    INSERT INTO public.brands (name, logo_url) VALUES ('Daewoo', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/daewoo.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Nexia'), (v_brand_id, 'Matiz'), (v_brand_id, 'Gentra'), (v_brand_id, 'Lanos'), (v_brand_id, 'Nubira'), (v_brand_id, 'Espero'), (v_brand_id, 'Damas')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Dodge
    INSERT INTO public.brands (name, logo_url) VALUES ('Dodge', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/dodge.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Challenger'), (v_brand_id, 'Charger'), (v_brand_id, 'Durango'), (v_brand_id, 'RAM (Legacy)'), (v_brand_id, 'Journey')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Ferrari
    INSERT INTO public.brands (name, logo_url) VALUES ('Ferrari', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/ferrari.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, '488'), (v_brand_id, 'F8 Tributo'), (v_brand_id, 'Roma'), (v_brand_id, 'Portofino'), (v_brand_id, '812 Superfast'), (v_brand_id, 'SF90'), (v_brand_id, 'Purosangue')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Fiat
    INSERT INTO public.brands (name, logo_url) VALUES ('Fiat', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/fiat.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, '500'), (v_brand_id, 'Egea'), (v_brand_id, 'Panda'), (v_brand_id, 'Doblo'), (v_brand_id, 'Fiorino'), (v_brand_id, 'Tipo'), (v_brand_id, 'Linea')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Ford
    INSERT INTO public.brands (name, logo_url) VALUES ('Ford', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/ford.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Focus'), (v_brand_id, 'Fiesta'), (v_brand_id, 'Mondeo'), (v_brand_id, 'Fusion'), (v_brand_id, 'Mustang'), (v_brand_id, 'F-150'), 
    (v_brand_id, 'Ranger'), (v_brand_id, 'Explorer'), (v_brand_id, 'Kuga'), (v_brand_id, 'Transit'), (v_brand_id, 'Edge')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Geely
    INSERT INTO public.brands (name, logo_url) VALUES ('Geely', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/geely.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Coolray'), (v_brand_id, 'Tugella'), (v_brand_id, 'Monjaro'), (v_brand_id, 'Atlas Pro'), (v_brand_id, 'Emgrand')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Genesis
    INSERT INTO public.brands (name, logo_url) VALUES ('Genesis', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/genesis.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'G70'), (v_brand_id, 'G80'), (v_brand_id, 'G90'), (v_brand_id, 'GV70'), (v_brand_id, 'GV80')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- GMC
    INSERT INTO public.brands (name, logo_url) VALUES ('GMC', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/gmc.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Sierra'), (v_brand_id, 'Yukon'), (v_brand_id, 'Terrain'), (v_brand_id, 'Acadia'), (v_brand_id, 'Hummer EV')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Haval
    INSERT INTO public.brands (name, logo_url) VALUES ('Haval', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/haval.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'H6'), (v_brand_id, 'H9'), (v_brand_id, 'Jolion'), (v_brand_id, 'F7'), (v_brand_id, 'F7x'), (v_brand_id, 'Dargo')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Honda
    INSERT INTO public.brands (name, logo_url) VALUES ('Honda', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/honda.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Civic'), (v_brand_id, 'Accord'), (v_brand_id, 'CR-V'), (v_brand_id, 'HR-V'), (v_brand_id, 'Pilot'), (v_brand_id, 'City'), (v_brand_id, 'Jazz'), (v_brand_id, 'Ridgeline')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Hyundai
    INSERT INTO public.brands (name, logo_url) VALUES ('Hyundai', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/hyundai.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Elantra'), (v_brand_id, 'Sonata'), (v_brand_id, 'Accent'), (v_brand_id, 'Tucson'), (v_brand_id, 'Santa Fe'), (v_brand_id, 'Palisade'), 
    (v_brand_id, 'Ioniq 5'), (v_brand_id, 'i10'), (v_brand_id, 'i20'), (v_brand_id, 'i30'), (v_brand_id, 'Azera (Grandeur)'), (v_brand_id, 'Veloster')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Infiniti
    INSERT INTO public.brands (name, logo_url) VALUES ('Infiniti', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/infiniti.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Q50'), (v_brand_id, 'Q60'), (v_brand_id, 'QX50'), (v_brand_id, 'QX55'), (v_brand_id, 'QX60'), (v_brand_id, 'QX80'), (v_brand_id, 'FX35 (Legacy)')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Isuzu
    INSERT INTO public.brands (name, logo_url) VALUES ('Isuzu', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/isuzu.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'D-Max'), (v_brand_id, 'Mu-X')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Jaguar
    INSERT INTO public.brands (name, logo_url) VALUES ('Jaguar', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/jaguar.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'XE'), (v_brand_id, 'XF'), (v_brand_id, 'F-Type'), (v_brand_id, 'F-Pace'), (v_brand_id, 'E-Pace'), (v_brand_id, 'I-Pace')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Jeep
    INSERT INTO public.brands (name, logo_url) VALUES ('Jeep', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/jeep.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Wrangler'), (v_brand_id, 'Grand Cherokee'), (v_brand_id, 'Cherokee'), (v_brand_id, 'Compass'), (v_brand_id, 'Renegade'), (v_brand_id, 'Gladiator')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Kia
    INSERT INTO public.brands (name, logo_url) VALUES ('Kia', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/kia.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Rio'), (v_brand_id, 'Cerato (Forte)'), (v_brand_id, 'Optima'), (v_brand_id, 'K5'), (v_brand_id, 'Sportage'), (v_brand_id, 'Sorento'), 
    (v_brand_id, 'Carnival'), (v_brand_id, 'Picanto'), (v_brand_id, 'Seltos'), (v_brand_id, 'Soul'), (v_brand_id, 'EV6'), (v_brand_id, 'Stinger')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Lada (VAZ)
    INSERT INTO public.brands (name, logo_url) VALUES ('Lada (VAZ)', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/lada.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Niva (4x4)'), (v_brand_id, 'Priora'), (v_brand_id, 'Granta'), (v_brand_id, 'Vesta'), (v_brand_id, 'Kalina'), 
    (v_brand_id, '2107'), (v_brand_id, '2106'), (v_brand_id, '2101'), (v_brand_id, 'Largus'), (v_brand_id, 'XRAY')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Lamborghini
    INSERT INTO public.brands (name, logo_url) VALUES ('Lamborghini', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/lamborghini.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Huracan'), (v_brand_id, 'Aventador'), (v_brand_id, 'Urus'), (v_brand_id, 'Revuelto'), (v_brand_id, 'Countach')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Land Rover
    INSERT INTO public.brands (name, logo_url) VALUES ('Land Rover', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/land-rover.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Range Rover'), (v_brand_id, 'Range Rover Sport'), (v_brand_id, 'Velar'), (v_brand_id, 'Evoque'), 
    (v_brand_id, 'Defender'), (v_brand_id, 'Discovery'), (v_brand_id, 'Discovery Sport')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Lexus
    INSERT INTO public.brands (name, logo_url) VALUES ('Lexus', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/lexus.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'IS'), (v_brand_id, 'ES'), (v_brand_id, 'LS'), (v_brand_id, 'NX'), (v_brand_id, 'RX'), (v_brand_id, 'GX'), (v_brand_id, 'LX'), (v_brand_id, 'UX'), (v_brand_id, 'RC'), (v_brand_id, 'LC')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Lincoln
    INSERT INTO public.brands (name, logo_url) VALUES ('Lincoln', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/lincoln.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Navigator'), (v_brand_id, 'Aviator'), (v_brand_id, 'Corsair'), (v_brand_id, 'Nautilus')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Maserati
    INSERT INTO public.brands (name, logo_url) VALUES ('Maserati', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/maserati.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Ghibli'), (v_brand_id, 'Quattroporte'), (v_brand_id, 'Levante'), (v_brand_id, 'Grecale'), (v_brand_id, 'MC20'), (v_brand_id, 'GranTurismo')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Mazda
    INSERT INTO public.brands (name, logo_url) VALUES ('Mazda', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mazda.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Mazda3'), (v_brand_id, 'Mazda6'), (v_brand_id, 'CX-3'), (v_brand_id, 'CX-5'), (v_brand_id, 'CX-9'), (v_brand_id, 'CX-30'), (v_brand_id, 'CX-60'), (v_brand_id, 'MX-5 Miata')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- McLaren
    INSERT INTO public.brands (name, logo_url) VALUES ('McLaren', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mclaren.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, '720S'), (v_brand_id, '765LT'), (v_brand_id, 'Artura'), (v_brand_id, 'GT'), (v_brand_id, 'P1')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Mercedes-Benz
    INSERT INTO public.brands (name, logo_url) VALUES ('Mercedes-Benz', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mercedes-benz.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'C-Class'), (v_brand_id, 'E-Class'), (v_brand_id, 'S-Class'), (v_brand_id, 'A-Class'), (v_brand_id, 'B-Class'), 
    (v_brand_id, 'CLA'), (v_brand_id, 'CLS'), (v_brand_id, 'GLA'), (v_brand_id, 'GLB'), (v_brand_id, 'GLC'), (v_brand_id, 'GLE'), (v_brand_id, 'GLS'), (v_brand_id, 'G-Class'), 
    (v_brand_id, 'AMG GT'), (v_brand_id, 'EQS'), (v_brand_id, 'EQE'), (v_brand_id, 'Vito'), (v_brand_id, 'Sprinter'), (v_brand_id, '190 (W201)')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Mini
    INSERT INTO public.brands (name, logo_url) VALUES ('Mini', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mini.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Cooper'), (v_brand_id, 'Countryman'), (v_brand_id, 'Clubman')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Mitsubishi
    INSERT INTO public.brands (name, logo_url) VALUES ('Mitsubishi', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/mitsubishi.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Lancer'), (v_brand_id, 'Pajero'), (v_brand_id, 'Outlander'), (v_brand_id, 'ASX'), (v_brand_id, 'L200'), (v_brand_id, 'Eclipse Cross'), (v_brand_id, 'Attrage')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Nissan
    INSERT INTO public.brands (name, logo_url) VALUES ('Nissan', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/nissan.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Sunny'), (v_brand_id, 'Sentra'), (v_brand_id, 'Altima'), (v_brand_id, 'Maxima'), (v_brand_id, 'Qashqai'), (v_brand_id, 'X-Trail'), 
    (v_brand_id, 'Patrol'), (v_brand_id, 'Juke'), (v_brand_id, 'Pathfinder'), (v_brand_id, 'Navara'), (v_brand_id, 'GT-R'), (v_brand_id, 'Leaf'), (v_brand_id, 'Tiida')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Opel
    INSERT INTO public.brands (name, logo_url) VALUES ('Opel', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/opel.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Astra'), (v_brand_id, 'Corsa'), (v_brand_id, 'Insignia'), (v_brand_id, 'Mokka'), (v_brand_id, 'Crossland'), (v_brand_id, 'Grandland'), (v_brand_id, 'Zafira'), (v_brand_id, 'Vectra (Legacy)')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Peugeot
    INSERT INTO public.brands (name, logo_url) VALUES ('Peugeot', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/peugeot.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, '206'), (v_brand_id, '207'), (v_brand_id, '208'), (v_brand_id, '301'), (v_brand_id, '308'), (v_brand_id, '408'), (v_brand_id, '508'), 
    (v_brand_id, '2008'), (v_brand_id, '3008'), (v_brand_id, '5008'), (v_brand_id, 'Partner'), (v_brand_id, 'Rifter')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Porsche
    INSERT INTO public.brands (name, logo_url) VALUES ('Porsche', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/porsche.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, '911'), (v_brand_id, 'Cayenne'), (v_brand_id, 'Panamera'), (v_brand_id, 'Macan'), (v_brand_id, 'Taycan'), (v_brand_id, '718 Cayman'), (v_brand_id, '718 Boxster')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Renault
    INSERT INTO public.brands (name, logo_url) VALUES ('Renault', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/renault.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Clio'), (v_brand_id, 'Megane'), (v_brand_id, 'Captur'), (v_brand_id, 'Kadjar'), (v_brand_id, 'Koleos'), (v_brand_id, 'Talisman'), (v_brand_id, 'Duster (Renault badge)'), (v_brand_id, 'Arkana'), (v_brand_id, 'Zoe')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Rolls-Royce
    INSERT INTO public.brands (name, logo_url) VALUES ('Rolls-Royce', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/rolls-royce.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Phantom'), (v_brand_id, 'Ghost'), (v_brand_id, 'Cullinan'), (v_brand_id, 'Wraith'), (v_brand_id, 'Dawn')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Seat
    INSERT INTO public.brands (name, logo_url) VALUES ('Seat', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/seat.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Ibiza'), (v_brand_id, 'Leon'), (v_brand_id, 'Arona'), (v_brand_id, 'Ateca'), (v_brand_id, 'Tarraco')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Skoda
    INSERT INTO public.brands (name, logo_url) VALUES ('Skoda', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/skoda.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Octavia'), (v_brand_id, 'Superb'), (v_brand_id, 'Kodiaq'), (v_brand_id, 'Karoq'), (v_brand_id, 'Kamiq'), (v_brand_id, 'Fabia'), (v_brand_id, 'Scala'), (v_brand_id, 'Enyaq')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Subaru
    INSERT INTO public.brands (name, logo_url) VALUES ('Subaru', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/subaru.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Impreza'), (v_brand_id, 'Legacy'), (v_brand_id, 'Outback'), (v_brand_id, 'Forester'), (v_brand_id, 'Crosstrek'), (v_brand_id, 'WRX'), (v_brand_id, 'BRZ')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Suzuki
    INSERT INTO public.brands (name, logo_url) VALUES ('Suzuki', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/suzuki.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Swift'), (v_brand_id, 'Vitara'), (v_brand_id, 'Jimny'), (v_brand_id, 'S-Cross'), (v_brand_id, 'Baleno'), (v_brand_id, 'Ciaz')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Tesla
    INSERT INTO public.brands (name, logo_url) VALUES ('Tesla', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/tesla.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Model S'), (v_brand_id, 'Model 3'), (v_brand_id, 'Model X'), (v_brand_id, 'Model Y'), (v_brand_id, 'Cybertruck')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Toyota
    INSERT INTO public.brands (name, logo_url) VALUES ('Toyota', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/toyota.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Corolla'), (v_brand_id, 'Camry'), (v_brand_id, 'Prius'), (v_brand_id, 'RAV4'), (v_brand_id, 'Land Cruiser'), (v_brand_id, 'Prado'), 
    (v_brand_id, 'Hilux'), (v_brand_id, 'Yaris'), (v_brand_id, 'C-HR'), (v_brand_id, 'Highlander'), (v_brand_id, 'Avalon'), (v_brand_id, 'Supra'), (v_brand_id, 'Tundra'), (v_brand_id, 'Tacoma')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Volkswagen
    INSERT INTO public.brands (name, logo_url) VALUES ('Volkswagen', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/volkswagen.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Golf'), (v_brand_id, 'Passat'), (v_brand_id, 'Jetta'), (v_brand_id, 'Polo'), (v_brand_id, 'Tiguan'), (v_brand_id, 'Touareg'), 
    (v_brand_id, 'ID.4'), (v_brand_id, 'ID.3'), (v_brand_id, 'Arteon'), (v_brand_id, 'Transporter'), (v_brand_id, 'Caddy'), (v_brand_id, 'Bora'), (v_brand_id, 'Amarok')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Volvo
    INSERT INTO public.brands (name, logo_url) VALUES ('Volvo', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/volvo.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'S60'), (v_brand_id, 'S90'), (v_brand_id, 'V60'), (v_brand_id, 'V90'), (v_brand_id, 'XC40'), (v_brand_id, 'XC60'), (v_brand_id, 'XC90'), (v_brand_id, 'C40')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Zeekr
    INSERT INTO public.brands (name, logo_url) VALUES ('Zeekr', 'https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized/zeekr.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, '001'), (v_brand_id, '009'), (v_brand_id, 'X')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Tofas
    INSERT INTO public.brands (name, logo_url) VALUES ('Tofas', 'https://upload.wikimedia.org/wikipedia/tr/0/03/Tofa%C5%9F_logo.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'Sahin'), (v_brand_id, 'Dogan'), (v_brand_id, 'Kartal')
    ON CONFLICT (brand_id, name) DO NOTHING;

    -- Khazar
    INSERT INTO public.brands (name, logo_url) VALUES ('Khazar', 'https://upload.wikimedia.org/wikipedia/commons/2/23/Khazar_car_logo.png')
    ON CONFLICT (name) DO UPDATE SET logo_url = EXCLUDED.logo_url
    RETURNING id INTO v_brand_id;

    INSERT INTO public.models (brand_id, name) VALUES
    (v_brand_id, 'SD'), (v_brand_id, 'LD')
    ON CONFLICT (brand_id, name) DO NOTHING;

END $$;
