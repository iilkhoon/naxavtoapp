/*
  # Seed Brand Logos
  Populates the `brands` table with logo URLs for common car manufacturers.
*/

-- BMW
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/2048px-BMW.svg.png' WHERE name ILIKE 'BMW';

-- Mercedes
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Mercedes-Benz_logo.svg/2048px-Mercedes-Benz_logo.svg.png' WHERE name ILIKE 'Mercedes%';

-- Toyota
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Toyota_carlogo.svg/2048px-Toyota_carlogo.svg.png' WHERE name ILIKE 'Toyota';

-- Hyundai
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/Hyundai_Motor_Company_logo.svg/2560px-Hyundai_Motor_Company_logo.svg.png' WHERE name ILIKE 'Hyundai';

-- Kia
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/Kia-logo.png/2880px-Kia-logo.png' WHERE name ILIKE 'Kia';

-- Ford
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Ford_logo_flat.svg/2560px-Ford_logo_flat.svg.png' WHERE name ILIKE 'Ford';

-- Volkswagen
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6d/Volkswagen_logo_2019.svg/2048px-Volkswagen_logo_2019.svg.png' WHERE name ILIKE 'Volkswagen';

-- Nissan
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Nissan_logo.png/2453px-Nissan_logo.png' WHERE name ILIKE 'Nissan';

-- Chevrolet
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Chevrolet-logo.png/2560px-Chevrolet-logo.png' WHERE name ILIKE 'Chevrolet';

-- Honda
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Honda_Logo.svg/2560px-Honda_Logo.svg.png' WHERE name ILIKE 'Honda';

-- Lada
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Lada_2015_logo.svg/2560px-Lada_2015_logo.svg.png' WHERE name ILIKE 'Lada' OR name ILIKE 'Vaz';

-- Opel
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/Opel_logo_2020.svg/2560px-Opel_logo_2020.svg.png' WHERE name ILIKE 'Opel';

-- Land Rover
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/67/Land_Rover_logo_2011.svg/2560px-Land_Rover_logo_2011.svg.png' WHERE name ILIKE 'Land Rover';

-- Audi
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/Audi-Logo_2016.svg/2560px-Audi-Logo_2016.svg.png' WHERE name ILIKE 'Audi';

-- Porsche
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Porsche_logo.svg/2048px-Porsche_logo.svg.png' WHERE name ILIKE 'Porsche';

-- Lexus
UPDATE brands SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f1/Lexus_logo.svg/2560px-Lexus_logo.svg.png' WHERE name ILIKE 'Lexus';
