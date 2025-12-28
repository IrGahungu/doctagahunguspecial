// types/navigation.ts
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

// Define your core entity types
export interface Product {
  id: string;
  name: string;
  title: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
  rating: number;
  image?: string | number;
  description: string;
  categoryId: string;
  pharmacies?: Pharmacy[];
}

export interface Pharmacy {
  id: string;
  name: string;
  image?: string | number;
  location: string;
  priceRange?: { min: number; max: number };
  insurances?: string[];
}

export interface Doctor {
  id: string;
  name: string;
  image?: string | number;
  location: string;
  specialty: string;
  rating?: number;
}

export interface Hospital {
  id: string;
  name: string;
  image?: string | number;
  location: string;
  specialties: string[];
  insurances?: string[];
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
  type: 'premium' | 'silver' | 'gold';
  price: number;
  description: string;
}

// Define your navigation param types
export type RootStackParamList = {
  // Main App Screens
  MainScreen: undefined;
  Home: undefined;
  
  // Product/Medicine Flow
  ProductDetail: { product: Product };
  ProductList: { categoryId?: string };
  
  // Healthcare Provider Screens
  PharmacyDetail: { pharmacy: Pharmacy };
  DoctorDetail: { doctor: Doctor };
  HospitalDetail: { hospital: Hospital };
  InsuranceDetail: { insurance: Insurance };
  
  // Search
  SearchResults: { query: string };
  
  // User Flow
  Cart: undefined;
  Checkout: undefined;
  Payment: { totalAmount: number };
  OrderConfirmation: { orderId: string };
  Profile: undefined;
  Settings: undefined;
  
  // Authentication
  // Special Screens
};

// Navigation prop types for each screen
export type MainScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'MainScreen'
>;

export type ProductDetailNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'ProductDetail'
>;

export type PharmacyDetailNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'PharmacyDetail'
>;

export type DoctorDetailNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'DoctorDetail'
>;

export type HospitalDetailNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'HospitalDetail'
>;

export type SearchResultsNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'SearchResults'
>;

// Extend the global React Navigation types
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}