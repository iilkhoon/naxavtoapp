export interface Listing {
  id: string;
  short_id?: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  image_url: string;
  images: string[];
  mileage: number;
  engine: string;
  horsepower?: number;
  location: string;
  description: string;
  is_credit: boolean;
  is_barter: boolean;
  is_vip: boolean;
  is_new: boolean;
  body_type: string;
  color: string;
  gearbox: string;
  transmission: string;
  market: string;
  fuel_type: string;
  seller_name: string;
  contact_phone: string;
  vin_code: string;
  status: 'approved' | 'pending' | 'rejected';
  features: string[];
  created_at: string;
}

export interface Plate {
  id: string;
  short_id?: string;
  region: string;
  series: string;
  number: string;
  price: number;
  description: string;
  is_vip: boolean;
  seller_name: string;
  contact_phone: string;
  status: 'approved' | 'pending' | 'rejected';
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  logo_url?: string;
  count?: number;
}

export interface Model {
  id: string;
  name: string;
  brand_id: string;
  count?: number;
}

export interface FilterOption {
  id: number;
  name: string;
}

export interface AdvancedFilters {
  minPrice?: string;
  maxPrice?: string;
  minYear?: string;
  maxYear?: string;
  minMileage?: string;
  maxMileage?: string;
  minEngine?: string;
  maxEngine?: string;
  city?: string;
  bodyType?: string;
  color?: string;
  fuelType?: string;
  gearbox?: string;
  transmission?: string;
  market?: string;
  isNew?: boolean;
  isCredit?: boolean;
  isBarter?: boolean;
}

export interface AppSetting {
  key: string;
  value: string;
  label?: string;
}

export interface Comment {
  id: string;
  listing_id: string;
  full_name: string;
  text: string;
  created_at: string;
}
