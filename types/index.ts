import { ImageProgressEventDataIOS, ImageSourcePropType, StyleProp, ViewStyle } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// Core Entity Interfaces
export interface Product {
  id: number | string;
  name: string;
  title: string;
  description: string;
  categoryId: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  image?: string | number;
  ratingCount?: number;
  isFreeDelivery?: boolean;
  isAssured?: boolean;
  insurances?: string[];
  pharmacies: Pharmacy[];
}

export interface Category {
  id: string;
  name: string;
  image?: string; // <-- this is your emoji or icon
  created_at?: string;
  icon?: string;
}

export interface Pharmacy {
  id: string;
  name: string;
  image: string | number;
  location: string;
  insurances: string[];
 medicines: {
    id: string;
    name: string;
    description: string;
    image: string;
    price: number;
  }[];
}

export interface FeaturedPharmacy extends Omit<Pharmacy, 'medicines'> {
  tagline?: string;
  rating?: number;
  medicines: {
    id: string;
    name: string;
    description: string;
    image: string;
    price: number;
  }[];
}

export interface Medicine {
  id: string;
  name: string;
  description: string;
  image: string;
  price?: number;
}

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  image?: ImageSourcePropType; 
  location: string;
  rating?: number;
  consultationFee?: number;
  languages?: string[];
}

export interface Hospital {
  id: string;
  name: string;
  image?: string | number;
  location: string;
  specialties: string[];
  insurances: string[];
  bloodTypes: string[];
  emergencyServices?: boolean;
}

export interface Insurance {
  id: string;
  name: string;
  image?: string;
  locations: InsuranceLocation[];
}

export interface InsuranceLocation {
  location: string;
  plans: InsurancePlan[];
}

export interface InsurancePlan {
  type: string;
  price: number;
  description: string;
  coverage: string[];
}

// Marketing Content Interfaces
export interface Banner {
  id: string;
  image: ImageSourcePropType;
  link: string;
   wrapperStyle?: StyleProp<ViewStyle>;
}

export interface DealOfTheDay {
  id: string;
  title: string;
  discount: string;
  image: string;
  tagline: string;
  productId?: string;
}

// Navigation Types
export type RootStackParamList = {
  MainScreen: undefined;
  SearchScreen: { initialQuery?: string };
  ProductDetail: {
    id: string;
    name: string;
    price: number;
    image?: string;
    description: string;
  };
  PharmacyDetail: {
    id: string;
    name: string;
    location: string;
    image?: string;
    priceRange?: { min: number; max: number };
    insurances?: string[];
  };
  HospitalDetail: {
    id: string;
    name: string;
    location: string;
    specialties?: string[];
    insurances?: string[];
  };
  DoctorDetail: {
    id: string;
    name: string;
    specialty: string;
    location: string;
    rating?: number;
  };
  InsuranceDetail: {
    id: string;
    name: string;
    locations: InsuranceLocation[];
  };
  CategoryProducts: {
    categoryId: string;
    categoryName: string;
  };
};

// Navigation Props
export type MainScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MainScreen'
>;

export type ProductDetailNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ProductDetail'
>;

// Utility Types
export type EntityType = 
  | 'medicine' 
  | 'pharmacy' 
  | 'hospital' 
  | 'doctor' 
  | 'insurance';

export type SearchResultItem = {
  id: string;
  name: string;
  type: EntityType;
  image?: string | number;
  location?: string;
  price?: number;
  specialty?: string;
} & (
  | { type: 'medicine'; price: number }
  | { type: 'pharmacy'; location: string }
  | { type: 'hospital'; location: string }
  | { type: 'doctor'; specialty: string }
  | { type: 'insurance'; locations: InsuranceLocation[] }
);

// API Response Types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}