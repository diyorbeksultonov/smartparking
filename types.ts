
export type ParkingType = 'standard' | 'ev' | 'disabled' | 'moto';

export interface ParkingSpot {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  type: ParkingType;
  totalSpots: number;
  availableSpots: number;
  basePricePerHour: number; // UZS
  rating: number;
  image: string;
  features: string[];
  is247: boolean;
  reviews?: Review[];
}

export interface Review {
  id: string;
  user: string;
  rating: number;
  text: string;
  date: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'payment' | 'refund';
  amount: number;
  date: string; // ISO
  description: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  carPlate?: string; // Primary car
  garage: string[]; // List of all cars
  balance: number;
  bonusPoints: number;
  preferences: {
    darkMode: boolean;
    notifications: boolean;
    language: 'uz' | 'ru' | 'cyr';
  }
}

export interface Reservation {
  id: string;
  parkingId: string;
  parkingName: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  durationHours: number;
  totalPrice: number;
  status: 'active' | 'completed' | 'cancelled';
  carType: string;
  paymentMethod: string;
  timestamp: number;
  qrCodeData: string;
}

export type ScreenName = 
  | 'splash' 
  | 'about_app' 
  | 'auth' 
  | 'map' 
  | 'details' 
  | 'reservation' 
  | 'payment' 
  | 'profile' 
  | 'admin'
  | 'scan' 
  | 'news'
  | 'support';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface NewsItem {
  id: string;
  title: string;
  desc: string;
  date: string;
  image: string;
  type: 'promo' | 'alert' | 'info';
}

export interface ServiceItem {
  id: string;
  titleKey: string;
  icon: any; // Lucide icon
  color: string;
  priceStart: string;
}
