

import { MOCK_PARKING_SPOTS, MOCK_TRANSACTIONS, MOCK_ADMIN_STATS, CAR_TYPES } from '../constants';
import { ParkingSpot, User, Reservation, Transaction, ScreenName } from '../types';

// SERVER MANZILI
// Agar kompyuteringizda serverni ishga tushirsangiz, bu manzil ishlaydi:
const BASE_URL = 'http://localhost:5000/api'; 

// AGAR SERVER ISHLAMASA, "TRUE" QILIB QO'YING (TEST UCHUN)
// Fixed: Set to true by default to prevent "Failed to load" errors when backend is missing
const IS_MOCK_MODE = true; 

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const api = {
  // --- Auth ---
  login: async (email: string, role: 'user' | 'admin'): Promise<User> => {
    if (!IS_MOCK_MODE) {
      try {
        const res = await fetch(`${BASE_URL}/auth/login`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ email, role })
        });
        if (!res.ok) throw new Error("Login failed");
        return await res.json();
      } catch (e) {
        console.warn("Serverga ulanib bo'lmadi, Mock ishlatilmoqda...", e);
      }
    }

    await delay(800);
    return {
      id: role === 'admin' ? 'admin1' : 'user1',
      name: role === 'admin' ? 'Admin User' : 'Diyorbek',
      email: email,
      role: role,
      balance: 150000,
      bonusPoints: 50,
      carPlate: '01 A 777 AA',
      garage: ['01 A 777 AA', '01 B 888 BB'],
      preferences: { darkMode: true, notifications: true, language: 'uz' }
    };
  },

  // --- Parking Spots ---
  getSpots: async (): Promise<ParkingSpot[]> => {
    if (!IS_MOCK_MODE) {
       try {
         const res = await fetch(`${BASE_URL}/spots`);
         if (res.ok) return await res.json();
       } catch (e) { console.warn("Server error, using mock spots"); }
    }
    await delay(500);
    return [...MOCK_PARKING_SPOTS];
  },

  // --- Reservations ---
  createReservation: async (spotId: string, userId: string, duration: number, carType: string, paymentMethod: string): Promise<Reservation> => {
    if (!IS_MOCK_MODE) {
      try {
        const res = await fetch(`${BASE_URL}/reservations`, {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ spotId, userId, duration, carType, paymentMethod })
        });
        if (res.ok) return await res.json();
      } catch (e) { console.warn("Reservation server error"); }
    }

    await delay(1500);
    const spot = MOCK_PARKING_SPOTS.find(s => s.id === spotId);
    if (!spot) throw new Error("Parkovka topilmadi");

    const price = spot.basePricePerHour; 
    const carMult = CAR_TYPES.find(c => c.id === carType)?.multiplier || 1;
    const total = Math.round(price * duration * carMult);

    return {
      id: Math.random().toString(36).substr(2, 9).toUpperCase(),
      parkingId: spot.id,
      parkingName: spot.name,
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + duration * 3600000).toISOString(),
      durationHours: duration,
      totalPrice: total,
      status: 'active',
      carType,
      paymentMethod,
      timestamp: Date.now(),
      qrCodeData: `SP-${Date.now()}-${spot.id}`
    };
  },

  getReservations: async (userId: string): Promise<Reservation[]> => {
    if (!IS_MOCK_MODE) {
       try {
          const res = await fetch(`${BASE_URL}/reservations/${userId}`);
          if (res.ok) return await res.json();
       } catch(e) {}
    }
    await delay(300);
    const saved = localStorage.getItem('reservations');
    return saved ? JSON.parse(saved) : [];
  },

  // --- User & Wallet ---
  updateUserBalance: async (userId: string, amount: number, type: 'deposit' | 'withdraw'): Promise<number> => {
    // Real server logic would go here
    await delay(1000);
    return 200000;
  },

  getTransactions: async (userId: string): Promise<Transaction[]> => {
    if (!IS_MOCK_MODE) {
       try {
          const res = await fetch(`${BASE_URL}/transactions/${userId}`);
          if (res.ok) return await res.json();
       } catch(e) {}
    }
    await delay(400);
    return [...MOCK_TRANSACTIONS];
  },
  
  // --- Admin ---
  getStats: async () => {
    if (!IS_MOCK_MODE) {
       try {
          const res = await fetch(`${BASE_URL}/admin/stats`);
          if (res.ok) return await res.json();
       } catch(e) {}
    }
    await delay(600);
    return MOCK_ADMIN_STATS;
  }
};
