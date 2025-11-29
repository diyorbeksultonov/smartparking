

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapPin, User, Settings, CreditCard, LogOut, Navigation, 
  Menu, X, Zap, Accessibility, Clock, Search, Filter, 
  Heart, Star, ArrowRight, Home, CheckCircle, Plus, 
  Share2, Shield, Moon, Sun, Mic, Send, Bot, Banknote, Smartphone, Wallet, History,
  BarChart2, TrendingUp, Users, Trash2, Globe, Download, Car, Crosshair, Layers, ExternalLink, Map as MapIcon,
  PlayCircle, StopCircle, AlertTriangle, Trophy, Award, Medal, ScanLine, Newspaper, Calendar, Info, Wrench, Truck, Droplet, Lock, PhoneCall
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';

import { CAR_TYPES, PAYMENT_METHODS, TRANSLATIONS, MOCK_NEWS } from './constants';
import { ParkingSpot, Reservation, User as UserType, ScreenName, Notification, Transaction, NewsItem } from './types';
import { Button, Input, Card, Modal, Badge, Toggle, ToastContainer, QRCodePlaceholder, WeatherWidget, ReportModal, ParkingLayout } from './components/Components';
import { api } from './services/api';

declare global {
  interface Window {
    L: any;
    deferredPrompt: any;
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const calculatePrice = (base: number, occupancyRate: number, hour: number) => {
  let multiplier = 1;
  if (occupancyRate > 0.8) multiplier += 0.2;
  else if (occupancyRate > 0.5) multiplier += 0.1;
  if (hour >= 23 || hour < 6) multiplier -= 0.2;
  return Math.round(base * multiplier);
};

const formatCarPlate = (val: string) => {
  const v = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (v.length === 0) return '';
  let res = '';
  res += v.substring(0, 2);
  if (v.length > 2) res += ' ' + v.substring(2, 3);
  if (v.length > 3) res += ' ' + v.substring(3, 6);
  if (v.length > 6) res += ' ' + v.substring(6, 8);
  return res;
}

const getPaymentIcon = (id: string) => {
  switch (id) {
    case 'payme': return <CreditCard className="text-blue-400" size={24} />;
    case 'click': return <Smartphone className="text-blue-500" size={24} />;
    case 'card': return <CreditCard className="text-green-400" size={24} />;
    case 'cash': return <Banknote className="text-green-500" size={24} />;
    default: return <CreditCard size={24} />;
  }
};

interface MapScreenProps {
  currentUser: UserType | null;
  filteredSpots: ParkingSpot[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  filter: { onlyFree: boolean; onlyEV: boolean; only247: boolean };
  setFilter: React.Dispatch<React.SetStateAction<{ onlyFree: boolean; onlyEV: boolean; only247: boolean }>>;
  setSelectedSpot: (spot: ParkingSpot) => void;
  setCurrentScreen: (screen: ScreenName) => void;
  isNavigating: boolean;
  onCancelNavigation: () => void;
  setIsNavigating: (v: boolean) => void;
  selectedSpot: ParkingSpot | null;
  isLoading: boolean;
  t: (key: string) => string;
  parkedCar: {lat: number, lng: number} | null;
  setParkedCar: (loc: {lat: number, lng: number} | null) => void;
  showToast: (msg: string, type: 'success' | 'info' | 'error') => void;
  onGlobalSearch: () => void;
  speak: (text: string) => void;
}

const MapScreen: React.FC<MapScreenProps> = ({
  currentUser, filteredSpots, searchQuery, setSearchQuery, filter, setFilter,
  setSelectedSpot, setCurrentScreen, isNavigating, onCancelNavigation, setIsNavigating, selectedSpot,
  isLoading, t,
  parkedCar, setParkedCar, showToast, onGlobalSearch, speak
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInst = useRef<any>(null);
  const routeControlRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const userLocationMarkerRef = useRef<any>(null);
  const parkedCarMarkerRef = useRef<any>(null);
  const routeCoordsRef = useRef<any[]>([]);

  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [mapLayer, setMapLayer] = useState<'hybrid' | 'roadmap'>('hybrid');
  const [navStats, setNavStats] = useState<{dist: string, time: string, summary?: string} | null>(null);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);

  useEffect(() => {
    if (!mapRef.current) return;
    const initMap = () => {
      if (!window.L) {
        setTimeout(initMap, 100);
        return;
      }

      if (!mapInst.current) {
         const map = window.L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView([41.311081, 69.240562], 13);
         mapInst.current = map;

         if (navigator.geolocation) {
           navigator.geolocation.getCurrentPosition(
             (pos) => {
               const { latitude, longitude } = pos.coords;
               setUserLocation({ lat: latitude, lng: longitude });
               updateUserMarker({ lat: latitude, lng: longitude });
             },
             (err) => console.log("Silent geo init failed", err),
             { enableHighAccuracy: true }
           );
         }
         addTileLayer(mapLayer);
      } else {
         mapInst.current.invalidateSize();
      }
    };
    initMap();
  }, []); 

  // --- REAL-TIME GPS TRACKING ---
  useEffect(() => {
     if (!navigator.geolocation) return;
     const id = navigator.geolocation.watchPosition(
       (pos) => {
         const { latitude, longitude } = pos.coords;
         setUserLocation({ lat: latitude, lng: longitude });
         updateUserMarker({ lat: latitude, lng: longitude });
         
         // If navigating, follow the user
         if (isNavigating && mapInst.current) {
            mapInst.current.panTo([latitude, longitude]);
         }
       },
       (err) => console.error(err),
       { enableHighAccuracy: true }
     );
     return () => navigator.geolocation.clearWatch(id);
  }, [isNavigating]);

  const updateUserMarker = (latlng: any) => {
      if (!mapInst.current || !window.L) return;
      if (userLocationMarkerRef.current) {
        mapInst.current.removeLayer(userLocationMarkerRef.current);
      }
      const userIcon = window.L.divIcon({
        className: 'user-location-marker',
        html: `<div class="relative flex items-center justify-center w-6 h-6">
                 <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                 <span class="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-white shadow-lg"></span>
               </div>`,
        iconSize: [24, 24]
      });
      userLocationMarkerRef.current = window.L.marker(latlng, { icon: userIcon }).addTo(mapInst.current);
  };

  useEffect(() => {
    if (!mapInst.current || !window.L) return;
    if (parkedCarMarkerRef.current) {
      mapInst.current.removeLayer(parkedCarMarkerRef.current);
      parkedCarMarkerRef.current = null;
    }
    if (parkedCar) {
       const carIcon = window.L.divIcon({
         className: 'parked-car-marker',
         html: `<div class="w-10 h-10 bg-gradient-to-tr from-accent to-purple-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white animate-bounce"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg></div>`,
         iconSize: [40, 40],
         iconAnchor: [20, 20]
       });
       parkedCarMarkerRef.current = window.L.marker([parkedCar.lat, parkedCar.lng], { icon: carIcon })
         .addTo(mapInst.current)
         .bindPopup(`
           <div class="text-center p-2">
             <div class="font-bold mb-2">${t('car_here')}</div>
             <button id="nav-to-car-btn" class="bg-primary text-white px-3 py-1 rounded text-xs mb-2 w-full">${t('nav_to_car')}</button>
             <button id="remove-car-btn" class="bg-red-500 text-white px-3 py-1 rounded text-xs w-full">${t('remove_marker')}</button>
           </div>
         `)
         .on('popupopen', () => {
             const navBtn = document.getElementById('nav-to-car-btn');
             const remBtn = document.getElementById('remove-car-btn');
             if(navBtn) navBtn.onclick = () => {
               const fakeSpot: ParkingSpot = {
                 id: 'my-car', name: t('car_here'), address: 'Saved Location', lat: parkedCar.lat, lng: parkedCar.lng,
                 type: 'standard', totalSpots: 1, availableSpots: 1, basePricePerHour: 0, rating: 5, image: '', features: [], is247: true
               };
               setSelectedSpot(fakeSpot);
               setIsNavigating(true);
               mapInst.current.closePopup();
             };
             if(remBtn) remBtn.onclick = () => {
               setParkedCar(null);
               mapInst.current.closePopup();
             };
         });
    }
  }, [parkedCar, t]);

  const addTileLayer = (layerType: 'hybrid' | 'roadmap') => {
    if(!mapInst.current || !window.L) return;
    mapInst.current.eachLayer((layer: any) => {
      if (layer._url) mapInst.current.removeLayer(layer);
    });
    let tileUrl = '';
    if (layerType === 'hybrid') {
       tileUrl = 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
    } else {
       tileUrl = 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}';
    }
    window.L.tileLayer(tileUrl, { maxZoom: 20, subdomains: ['mt0', 'mt1', 'mt2', 'mt3'] }).addTo(mapInst.current);
  };

  useEffect(() => {
    addTileLayer(mapLayer);
  }, [mapLayer]);

  const handleLocateMe = () => {
    if (!mapInst.current) return;
    setIsLocating(true);
    showToast(t('processing'), 'info');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
           const { latitude, longitude } = position.coords;
           setUserLocation({ lat: latitude, lng: longitude });
           updateUserMarker({ lat: latitude, lng: longitude });
           mapInst.current.flyTo([latitude, longitude], 17, { animate: true, duration: 1.5 });
           showToast("Siz shu yerdasiz!", 'success');
           setIsLocating(false);
        },
        (error) => {
           showToast(t('gps_error'), 'error');
           setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
       showToast("GPS not supported", 'error');
       setIsLocating(false);
    }
  };

  const handleParkCar = () => {
    if (parkedCar) {
      if(mapInst.current) mapInst.current.setView([parkedCar.lat, parkedCar.lng], 16);
    } else {
      if (userLocation) {
        setParkedCar(userLocation);
        showToast(t('car_saved'), 'success');
      } else {
        if(mapInst.current) {
          const center = mapInst.current.getCenter();
          setParkedCar(center);
          showToast(t('car_saved'), 'success');
        } else {
          showToast(t('gps_error'), 'error');
        }
      }
    }
  };

  useEffect(() => {
     if (!mapInst.current || !window.L) return;
     markersRef.current.forEach(m => mapInst.current.removeLayer(m));
     markersRef.current = [];

     filteredSpots.forEach(spot => {
        const isSelected = selectedSpot?.id === spot.id;
        const isAlmostFull = spot.availableSpots > 0 && spot.availableSpots < 5;
        const typeClass = spot.availableSpots === 0 || isAlmostFull ? 'full' : spot.type === 'ev' ? 'ev' : '';
        const priceLabel = `${Math.round(spot.basePricePerHour / 1000)}k`;
        
        const html = `
          <div class="custom-pin-marker ${typeClass} ${isSelected ? 'selected' : ''}">
            ${priceLabel}
          </div>
        `;
        const icon = window.L.divIcon({
          className: 'custom-pin-icon',
          html: html,
          iconSize: [42, 28],
          iconAnchor: [21, 34]
        });
        const marker = window.L.marker([spot.lat, spot.lng], { icon })
          .addTo(mapInst.current)
          .on('click', () => { setSelectedSpot(spot); setCurrentScreen('details'); });
        markersRef.current.push(marker);
     });

     if (isNavigating && selectedSpot && window.L.Routing) {
        speak(t('nav_started_voice'));
        if (routeControlRef.current) {
          mapInst.current.removeControl(routeControlRef.current);
        }
        const startLat = userLocation ? userLocation.lat : 41.311081; 
        const startLng = userLocation ? userLocation.lng : 69.240562;
        
        routeControlRef.current = window.L.Routing.control({
          waypoints: [
            window.L.latLng(startLat, startLng),
            window.L.latLng(selectedSpot.lat, selectedSpot.lng)
          ],
          lineOptions: {
            styles: [{ color: '#00E5FF', opacity: 0.8, weight: 6, className: 'leaflet-routing-anim' }],
            extendToWaypoints: true,
            missingRouteTolerance: 10
          },
          createMarker: () => null,
          addWaypoints: false,
          draggableWaypoints: false,
          fitSelectedRoutes: true,
          show: false
        }).addTo(mapInst.current);

        routeControlRef.current.on('routesfound', function(e: any) {
           const routes = e.routes;
           const summary = routes[0].summary;
           routeCoordsRef.current = routes[0].coordinates;
           const distKm = (summary.totalDistance / 1000).toFixed(1);
           const timeMin = Math.round(summary.totalTime / 60);
           setNavStats({ dist: distKm + ' km', time: timeMin + ' min', summary: routes[0].name });
        });
     } else {
        if (routeControlRef.current) {
           mapInst.current.removeControl(routeControlRef.current);
           routeControlRef.current = null;
        }
        setNavStats(null);
     }
  }, [filteredSpots, isNavigating, selectedSpot, userLocation]);

  const toggleLayer = () => {
    if (mapLayer === 'hybrid') setMapLayer('roadmap');
    else setMapLayer('hybrid');
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    if (newMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  return (
    <div className="h-[100dvh] w-full relative bg-darkBg overflow-hidden flex flex-col">
      <div ref={mapRef} className="absolute inset-0 z-0 bg-gray-900" />
      
      {(isLoading || isSearchingLocation) && (
        <div className="absolute inset-0 z-[150] bg-black/50 backdrop-blur-sm flex items-center justify-center">
           <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
      
      {/* Search Bar: Updated for Visibility (Darker background) */}
      <div className="absolute top-0 left-0 right-0 z-[100] p-4 flex gap-3">
         <div className="flex-1 glass-panel rounded-full h-14 flex items-center p-1.5 shadow-2xl bg-black/60 backdrop-blur-md border border-white/20 group focus-within:bg-black/80 transition-all">
           <input 
             placeholder={t('search_placeholder')} 
             className="bg-transparent w-full outline-none text-white placeholder-gray-400 font-medium px-4"
             value={searchQuery}
             onChange={(e) => setSearchQuery(e.target.value)}
             onKeyDown={(e) => {
               if (e.key === 'Enter') onGlobalSearch();
             }}
           />
           <button 
             onClick={onGlobalSearch} 
             className="bg-primary hover:bg-blue-600 text-white p-2.5 rounded-full transition-colors shadow-lg"
           >
             <Search size={20} />
           </button>
         </div>
         <button 
           onClick={() => setFilter(f => ({...f, onlyFree: !f.onlyFree}))}
           className={`w-14 h-14 rounded-full glass-panel flex items-center justify-center shadow-2xl transition-all ${filter.onlyFree ? 'bg-primary border-primary text-white' : 'bg-black/60 border-white/20 text-white'}`}
         >
           <Filter size={20} />
         </button>
      </div>

      {/* Theme Toggle Button: Replaces Weather Widget */}
      <div className="absolute top-20 right-4 z-[90]">
         <button 
           onClick={toggleTheme}
           className="glass-panel p-3 rounded-full flex items-center justify-center shadow-lg border border-white/20 bg-black/60 active:scale-95 transition-all"
         >
            {isDarkMode ? <Moon size={20} className="text-blue-300" /> : <Sun size={20} className="text-yellow-400" />}
         </button>
      </div>

      {/* Map Controls: Updated for Visibility (Darker backgrounds) */}
      <div className="absolute bottom-32 right-6 z-[90] flex flex-col gap-3">
        <button 
          onClick={toggleLayer}
          className="w-12 h-12 rounded-full glass-panel flex items-center justify-center shadow-2xl bg-black/60 border border-white/30 text-white active:scale-95 transition-transform hover:bg-black/80"
        >
          {mapLayer === 'hybrid' ? <Globe size={24} className="text-green-400"/> : <MapIcon size={24} />}
        </button>

        <button 
          onClick={handleParkCar}
          className={`w-12 h-12 rounded-full glass-panel flex items-center justify-center shadow-2xl border border-white/30 active:scale-95 transition-transform ${parkedCar ? 'bg-accent text-white' : 'bg-black/60 text-gray-200 hover:bg-black/80'}`}
        >
          <div className="font-bold">{parkedCar ? 'P' : 'P'}</div>
        </button>

        <button 
          onClick={handleLocateMe}
          className={`w-12 h-12 rounded-full glass-panel flex items-center justify-center shadow-2xl border border-white/30 text-white active:scale-95 transition-transform ${isLocating ? 'bg-primary' : 'bg-black/60 hover:bg-black/80'}`}
        >
          <Crosshair size={24} className={isLocating ? 'animate-spin' : ''} />
        </button>
      </div>

      {isNavigating && navStats && (
         <div className="absolute top-28 left-4 right-4 z-[100] animate-enter space-y-2">
            <div className="glass-panel rounded-2xl p-4 flex justify-between items-center bg-black/80 border border-primary/50 shadow-blue-500/20 shadow-xl backdrop-blur-xl relative pr-10">
               <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center animate-pulse border border-primary/50">
                     <ArrowRight className="text-white" size={24} />
                  </div>
                  <div>
                     <div className="text-primary font-bold text-sm uppercase tracking-wide">{t('nav_turn')}</div>
                     <div className="text-xl font-bold text-white">{navStats.summary || t('nav_straight')}</div>
                     <div className="text-xs text-gray-400">{navStats.dist} • {navStats.time}</div>
                  </div>
               </div>
               <button 
                 onClick={onCancelNavigation}
                 className="absolute top-2 right-2 p-2 bg-white/10 rounded-full hover:bg-red-500/20 text-gray-400 hover:text-red-500 transition-colors"
               >
                 <X size={20} />
               </button>
            </div>
         </div>
      )}

      <div className="absolute bottom-6 left-6 right-6 z-[100]">
         <div className="glass-panel rounded-[32px] p-2 flex justify-between items-center px-4 shadow-2xl backdrop-blur-xl bg-black/60 border border-white/20">
            <button onClick={() => setCurrentScreen('map')} className="p-3 rounded-2xl bg-white/10 text-primary transition-transform active:scale-90">
              <Home size={24} />
            </button>
            <button onClick={() => setCurrentScreen('support')} className="p-3 rounded-2xl hover:bg-white/5 text-gray-300 transition-transform active:scale-90">
               <Wrench size={24} />
            </button>
            <div className="-mt-8">
              <button 
                onClick={() => setCurrentScreen('scan')}
                className="w-20 h-20 rounded-full bg-gradient-to-tr from-green-400 to-emerald-600 flex items-center justify-center shadow-[0_0_30px_rgba(74,222,128,0.5)] border-4 border-darkBg/50 relative group transition-transform active:scale-95"
              >
                 <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping opacity-30"></div>
                 <ScanLine size={32} className="text-white" />
              </button>
            </div>
            <button onClick={() => setCurrentScreen('news')} className="p-3 rounded-2xl hover:bg-white/5 text-gray-300 transition-transform active:scale-90">
              <Newspaper size={24} />
            </button>
            <button onClick={() => setCurrentScreen('profile')} className="p-3 rounded-2xl hover:bg-white/5 text-gray-300 transition-transform active:scale-90">
              <User size={24} />
            </button>
         </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const loadState = <T,>(key: string, defaultVal: T): T => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultVal;
    } catch (e) { return defaultVal; }
  };

  const [currentScreen, setCurrentScreen] = useState<ScreenName>('splash');
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => loadState('currentUser', null));
  const [language, setLanguage] = useState<'uz' | 'ru' | 'cyr'>('uz');

  const t = (key: string) => {
    // @ts-ignore
    return TRANSLATIONS[language][key] || key;
  };
  
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'ru' ? 'ru-RU' : 'uz-UZ';
      window.speechSynthesis.speak(utterance);
    }
  };

  const [spots, setSpots] = useState<ParkingSpot[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>(() => loadState('reservations', []));
  const [transactions, setTransactions] = useState<Transaction[]>(() => loadState('transactions', []));
  const [favorites, setFavorites] = useState<string[]>(() => loadState('favorites', []));
  const [parkedCar, setParkedCar] = useState<{lat: number, lng: number} | null>(() => loadState('parkedCar', null));
  const [adminStats, setAdminStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<ParkingSpot | null>(null);
  const [filter, setFilter] = useState({ onlyFree: false, onlyEV: false, only247: false });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [resDuration, setResDuration] = useState(1);
  const [resCarType, setResCarType] = useState('sedan');
  const [resPaymentMethod, setResPaymentMethod] = useState('payme');
  const [resSelectedSlot, setResSelectedSlot] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [lastReservation, setLastReservation] = useState<Reservation | null>(null);
  const [activeProfileTab, setActiveProfileTab] = useState<'main' | 'garage' | 'wallet' | 'history' | 'favorites' | 'achievements'>('main');
  const [newCarPlate, setNewCarPlate] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => { localStorage.setItem('currentUser', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('reservations', JSON.stringify(reservations)); }, [reservations]);
  useEffect(() => { localStorage.setItem('transactions', JSON.stringify(transactions)); }, [transactions]);
  useEffect(() => { localStorage.setItem('favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('parkedCar', JSON.stringify(parkedCar)); }, [parkedCar]);

  useEffect(() => {
    if (currentUser?.preferences.language) {
      setLanguage(currentUser.preferences.language);
    }
  }, [currentUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      setSpots(currentSpots => currentSpots.map(spot => {
          if (Math.random() > 0.7) {
              const change = Math.random() > 0.5 ? 1 : -1;
              const newSpots = Math.max(0, Math.min(spot.totalSpots, spot.availableSpots + change));
              return { ...spot, availableSpots: newSpots };
          }
          return spot;
      }));
    }, 5000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      window.deferredPrompt = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const spotsData = await api.getSpots();
        setSpots(spotsData);
        if (currentUser) {
           const myReservations = await api.getReservations(currentUser.id);
           const myTrans = await api.getTransactions(currentUser.id);
           setReservations(myReservations);
           setTransactions(myTrans);
           if (currentUser.role === 'admin') {
             const stats = await api.getStats();
             setAdminStats(stats);
           }
        }
      } catch (e) {
        console.error("Failed to fetch data", e);
      }
    };
    fetchInitialData();
  }, [currentUser]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 500);
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (currentScreen === 'splash') {
      const timer = setTimeout(() => {
        setCurrentScreen('about_app');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [currentScreen]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 3000);
  };

  const goBack = () => {
    if (activeProfileTab !== 'main') {
      setActiveProfileTab('main');
      return;
    }
    if (currentScreen === 'details') {
      setCurrentScreen('map');
      setIsNavigating(false);
    }
    else if (currentScreen === 'reservation') setCurrentScreen('details');
    else if (currentScreen === 'payment') setCurrentScreen('map');
    else if (currentScreen === 'profile') setCurrentScreen('map');
    else if (currentScreen === 'news') setCurrentScreen('map');
    else if (currentScreen === 'scan') setCurrentScreen('map');
    else if (currentScreen === 'support') setCurrentScreen('map');
    else if (currentScreen === 'admin') setCurrentScreen('profile');
    else if (currentScreen === 'auth') setCurrentScreen('about_app');
  };

  const handleLogin = async (role: 'user' | 'admin') => {
    setIsLoading(true);
    try {
      const user = await api.login(role === 'admin' ? 'admin@smart.uz' : 'diyorbek@gmail.com', role);
      setCurrentUser(user);
      if (role === 'admin') {
        setCurrentScreen('admin');
      } else {
        setCurrentScreen('map');
      }
      showToast(`${t('toast_login')}: ${user.name}`, 'success');
    } catch (e) {
      showToast(t('toast_error'), 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGlobalSearch = async () => {
    if (!searchQuery) return;
    showToast("Qidirilmoqda...", 'info');
  };

  const handleNavigate = () => {
    setIsNavigating(true);
    setCurrentScreen('map');
    showToast(t('toast_route'), 'info');
  };

  const openExternalMap = (type: 'yandex' | 'google') => {
    if(!selectedSpot) return;
    const { lat, lng } = selectedSpot;
    if (type === 'yandex') {
      window.open(`https://yandex.com/maps/?pt=${lng},${lat}&z=15&l=map`, '_blank');
    } else {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    }
  };

  const toggleFavorite = (spotId: string) => {
    setFavorites(prev => {
      const isFav = prev.includes(spotId);
      if (isFav) {
        showToast(t('toast_fav_remove'), 'info');
        return prev.filter(id => id !== spotId);
      } else {
        showToast(t('toast_fav_add'), 'success');
        return [...prev, spotId];
      }
    });
  };

  const handleReserve = async () => {
    if (!selectedSpot || !currentUser) return;
    setPaymentProcessing(true);
    try {
      const newRes = await api.createReservation(
        selectedSpot.id, 
        currentUser.id, 
        resDuration, 
        resCarType, 
        resPaymentMethod
      );
      // Append slot selection
      newRes.parkingName += resSelectedSlot ? ` (${t('spot')} ${resSelectedSlot})` : '';
      
      const newTransaction: Transaction = {
        id: 't-' + Date.now(),
        type: 'payment',
        amount: newRes.totalPrice,
        date: new Date().toISOString(),
        description: `Parkovka: ${selectedSpot.name}`
      };
      const updatedUser = { 
        ...currentUser, 
        balance: resPaymentMethod === 'payme' ? currentUser.balance - newRes.totalPrice : currentUser.balance,
        bonusPoints: currentUser.bonusPoints + 10 
      };
      setCurrentUser(updatedUser);
      setReservations([newRes, ...reservations]);
      setTransactions([newTransaction, ...transactions]);
      setLastReservation(newRes);
      setSpots(prev => prev.map(s => s.id === selectedSpot.id ? {...s, availableSpots: Math.max(0, s.availableSpots - 1)} : s));
      setCurrentScreen('payment');
      showToast(t('toast_booked'), 'success');
    } catch (e) {
      showToast(t('toast_error'), 'error');
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleReportIssue = (issueId: string) => {
    setIsReportOpen(false);
    showToast(t('report_sent'), 'success');
  };

  const addCar = () => {
    if (newCarPlate && currentUser) {
      const updatedUser = { ...currentUser, garage: [...currentUser.garage, newCarPlate] };
      setCurrentUser(updatedUser);
      setNewCarPlate('');
      showToast(t('car_added'), 'success');
    }
  };

  const removeCar = (plate: string) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, garage: currentUser.garage.filter(p => p !== plate) };
      setCurrentUser(updatedUser);
      showToast(t('car_removed'), 'info');
    }
  };

  const topUpBalance = async () => {
    if (currentUser) {
      setIsLoading(true);
      await api.updateUserBalance(currentUser.id, 50000, 'deposit');
      const amount = 50000;
      const updatedUser = { ...currentUser, balance: currentUser.balance + amount };
      const newTrx: Transaction = {
        id: 't-' + Date.now(),
        type: 'deposit',
        amount: amount,
        date: new Date().toISOString(),
        description: t('top_up')
      };
      setCurrentUser(updatedUser);
      setTransactions([newTrx, ...transactions]);
      showToast(t('toast_topup'), 'success');
      setIsLoading(false);
    }
  }

  const handleInstallApp = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === 'accepted') {
          console.log('User accepted install');
        }
        setInstallPrompt(null);
      });
    } else {
      showToast("O'rnatish hozircha imkonsiz", 'info');
    }
  };
  
  const handleServiceCall = () => {
    showToast(t('calling_service'), 'info');
    setTimeout(() => {
       showToast(t('service_requested'), 'success');
       setCurrentScreen('map');
    }, 2000);
  };

  const filteredSpots = useMemo(() => spots.filter(spot => {
    if (filter.onlyFree && spot.availableSpots === 0) return false;
    if (filter.onlyEV && spot.type !== 'ev') return false;
    if (filter.only247 && !spot.is247) return false;
    if (debouncedSearch && !spot.name.toLowerCase().includes(debouncedSearch.toLowerCase()) && !spot.address.toLowerCase().includes(debouncedSearch.toLowerCase())) return false;
    return true;
  }), [spots, filter, debouncedSearch]);

  const SplashScreen = () => (
    <div className="h-[100dvh] w-full bg-darkBg flex flex-col items-center justify-center relative overflow-hidden">
      <div className="fixed top-0 left-0 w-64 h-64 bg-primary/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob"></div>
      <div className="fixed bottom-0 right-0 w-64 h-64 bg-accent/30 rounded-full mix-blend-screen filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
      <div className="glass-card p-8 rounded-[40px] flex flex-col items-center z-10 animate-enter border-t border-white/20">
        <div className="w-24 h-24 mb-6 relative">
           <div className="absolute inset-0 bg-gradient-to-tr from-primary to-accent rounded-3xl animate-spin-slow blur-md opacity-70"></div>
           <div className="absolute inset-1 bg-darkBg rounded-[20px] flex items-center justify-center z-10">
              <span className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-white">SP</span>
           </div>
        </div>
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">SmartParking</h1>
        <p className="text-blue-200/80 text-lg font-light tracking-wide">{t('slogan')}</p>
      </div>
    </div>
  );

  const AboutScreen = () => (
    <div className="h-[100dvh] w-full bg-darkBg flex flex-col p-8 relative overflow-hidden justify-between">
       <div className="fixed -top-20 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px]" />
       <div className="mt-10 animate-enter z-10">
         <div className="w-16 h-16 bg-gradient-to-tr from-primary to-accent rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary/30">
            <span className="text-2xl font-black text-white">SP</span>
         </div>
         <h1 className="text-4xl font-bold text-white leading-tight mb-4 whitespace-pre-wrap">{t('about_title')}</h1>
         <p className="text-gray-400 text-lg">{t('about_desc')}</p>
       </div>
       <div className="space-y-4 animate-enter z-10" style={{animationDelay: '0.2s'}}>
          <div className="flex items-center gap-4 p-4 glass-card rounded-2xl">
             <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400"><Zap size={20} /></div>
             <div><h3 className="font-bold text-white">{t('fast')}</h3></div>
          </div>
          <div className="flex items-center gap-4 p-4 glass-card rounded-2xl">
             <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400"><Shield size={20} /></div>
             <div><h3 className="font-bold text-white">{t('secure')}</h3></div>
          </div>
       </div>
       <div className="space-y-3 animate-enter z-10" style={{animationDelay: '0.4s'}}>
         <Button fullWidth onClick={() => setCurrentScreen('auth')}>{t('start_btn')}</Button>
         <div className="flex justify-center gap-4 mt-4 text-gray-500 text-xs">
            <span>{t('version')} 1.0.0</span><span>•</span><span>{t('help')}</span>
         </div>
       </div>
    </div>
  );

  const DetailsScreen = () => {
    if (!selectedSpot) return null;
    const isFav = favorites.includes(selectedSpot.id);
    return (
       <div className="h-[100dvh] w-full bg-darkBg flex flex-col relative overflow-hidden">
          <div className="h-1/2 w-full relative">
             <img src={selectedSpot.image} className="w-full h-full object-cover opacity-80" />
             <div className="absolute inset-0 bg-gradient-to-t from-darkBg via-darkBg/50 to-transparent" />
             <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
                <button onClick={goBack} className="p-3 glass-panel rounded-full text-white bg-black/40 hover:bg-black/60 shadow-lg backdrop-blur-md"><ArrowRight className="rotate-180" /></button>
                <div className="flex gap-2">
                   <button onClick={() => setIsReportOpen(true)} className="p-3 glass-panel rounded-full text-white hover:text-yellow-400 transition-colors bg-black/40"><AlertTriangle size={20} /></button>
                   <button onClick={() => toggleFavorite(selectedSpot.id)} className={`p-3 glass-panel rounded-full transition-all bg-black/40 ${isFav ? 'bg-white text-red-500 shadow-lg shadow-red-500/30' : 'text-white'}`}>
                      <Heart className={isFav ? 'fill-current' : ''} />
                   </button>
                </div>
             </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-[65%] glass-panel rounded-t-[40px] border-t border-white/10 flex flex-col backdrop-blur-xl animate-enter z-20">
             <div className="flex-1 overflow-y-auto no-scrollbar p-8 pb-4 overscroll-contain">
               <div className="w-16 h-1 bg-white/20 rounded-full mx-auto mb-6 shrink-0" />
               <div className="flex justify-between items-start mb-2">
                  <h1 className="text-3xl font-bold text-white w-2/3 leading-tight">{selectedSpot.name}</h1>
                  <div className="text-right">
                     <span className="text-2xl font-bold text-primary">{selectedSpot.basePricePerHour / 1000}k</span>
                     <span className="text-sm text-gray-400 block">/ {t('price_hour')}</span>
                  </div>
               </div>
               <p className="text-gray-400 flex items-center gap-2 mb-6"><MapPin size={16} /> {selectedSpot.address}</p>
               <div className="flex gap-4 mb-6">
                  <div className="flex-1 glass-card p-4 rounded-2xl text-center">
                     <div className={`text-2xl font-bold mb-1 ${selectedSpot.availableSpots < 5 ? 'text-red-500' : 'text-white'}`}>{selectedSpot.availableSpots}</div>
                     <div className="text-xs text-gray-400 uppercase tracking-wide">{t('available')}</div>
                  </div>
                  <div className="flex-1 glass-card p-4 rounded-2xl text-center">
                     <div className="text-2xl font-bold text-accent mb-1">{selectedSpot.rating}</div>
                     <div className="text-xs text-gray-400 uppercase tracking-wide">{t('rating')}</div>
                  </div>
               </div>
               <div className="mb-6">
                  <p className="text-xs text-gray-400 mb-3 uppercase font-semibold">{t('navigators')}</p>
                  <div className="grid grid-cols-2 gap-3">
                     <button onClick={() => openExternalMap('yandex')} className="p-3 bg-white/10 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 transition-colors">
                        <span className="text-red-500 font-bold">Y</span> <span className="text-white">Yandex</span>
                     </button>
                     <button onClick={() => openExternalMap('google')} className="p-3 bg-white/10 rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 transition-colors">
                        <span className="text-blue-500 font-bold">G</span> <span className="text-white">Google</span>
                     </button>
                  </div>
               </div>
               <div className="h-2"></div>
             </div>
             <div className="p-6 pt-2 bg-gradient-to-t from-black/20 to-transparent shrink-0">
                <div className="flex gap-3">
                  <Button variant="secondary" fullWidth onClick={handleNavigate} icon={<Navigation size={18}/>} className="shadow-2xl shadow-green-500/30">
                     {t('route_btn')}
                  </Button>
                  <Button fullWidth onClick={() => setCurrentScreen('reservation')} className="shadow-2xl shadow-primary/40">
                     {t('book_btn')}
                  </Button>
                </div>
             </div>
          </div>
       </div>
    );
  };

  const ReservationScreen = () => {
      const price = calculatePrice(selectedSpot?.basePricePerHour || 0, 0, new Date().getHours());
      const carMult = CAR_TYPES.find(c => c.id === resCarType)?.multiplier || 1;
      const total = price * resDuration * carMult;

      return (
         <div className="h-[100dvh] w-full bg-darkBg p-6 pt-10 flex flex-col overflow-hidden">
            <button onClick={goBack} className="self-start p-2 rounded-full glass-panel mb-6 text-white"><ArrowRight className="rotate-180"/></button>
            <h2 className="text-2xl font-bold text-white mb-6">{t('book_title')}</h2>
            <div className="space-y-6 pb-48 overflow-y-auto no-scrollbar flex-1 overscroll-contain">
              
              {/* VISUAL SELECTION */}
              <ParkingLayout selectedSpot={resSelectedSlot} onSelect={setResSelectedSlot} t={t} />

              <Card>
                 <h3 className="text-gray-400 mb-4 text-sm font-semibold uppercase">{t('time_hour')}</h3>
                 <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                    {[1,2,3,4,5,8,12,24].map(h => (
                       <button key={h} onClick={() => setResDuration(h)} className={`min-w-[48px] h-12 rounded-xl flex items-center justify-center font-bold transition-all ${resDuration === h ? 'bg-primary text-white shadow-lg shadow-primary/50' : 'bg-white/5 text-gray-400'}`}>{h}</button>
                    ))}
                 </div>
              </Card>
              <Card>
                 <h3 className="text-gray-400 mb-4 text-sm font-semibold uppercase">{t('car_type')}</h3>
                 <div className="grid grid-cols-2 gap-3">
                    {CAR_TYPES.map(car => (
                       <div key={car.id} onClick={() => setResCarType(car.id)} 
                            className={`p-3 rounded-xl border transition-all cursor-pointer ${resCarType === car.id ? 'bg-primary/20 border-primary text-white' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}>
                          <div className="font-bold text-white">{t(car.labelKey)}</div>
                          <div className="text-xs text-gray-400 opacity-70">{car.desc}</div>
                       </div>
                    ))}
                 </div>
              </Card>
              <Card>
                 <h3 className="text-gray-400 mb-4 text-sm font-semibold uppercase">{t('payment_method')}</h3>
                 <div className="grid grid-cols-2 gap-3">
                    {PAYMENT_METHODS.map(pm => (
                       <div key={pm.id} onClick={() => setResPaymentMethod(pm.id)} 
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 ${resPaymentMethod === pm.id ? 'bg-green-500/20 border-green-500 text-white shadow-lg shadow-green-500/10' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}>
                           <div className="p-2 bg-white/5 rounded-lg">
                             {getPaymentIcon(pm.id)}
                           </div>
                           <div className="font-bold">{pm.label}</div>
                       </div>
                    ))}
                 </div>
              </Card>
            </div>
            <div className="fixed bottom-0 left-0 right-0 p-6 glass-panel border-t border-white/10 rounded-t-[32px] sm:max-w-md mx-auto z-50 bg-darkBg/90 backdrop-blur-xl">
               <div className="flex justify-between items-center mb-4">
                  <span className="text-gray-400">{t('total')}:</span>
                  <span className="text-2xl font-bold text-white">{total.toLocaleString()} UZS</span>
               </div>
               <Button onClick={handleReserve} disabled={paymentProcessing || !resSelectedSlot} fullWidth>
                  {paymentProcessing ? t('processing') : t('confirm_btn')}
               </Button>
            </div>
         </div>
      )
  };

  const PaymentScreen = () => (
     <div className="h-[100dvh] w-full bg-darkBg flex flex-col items-center justify-center p-6 text-center overflow-hidden relative">
        <div className="absolute top-6 left-6 z-50">
           <button onClick={goBack} className="p-2 rounded-full glass-panel text-white"><ArrowRight className="rotate-180"/></button>
        </div>
        <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mb-6 animate-pulse">
           <CheckCircle size={48} className="text-green-500" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-2">{t('success_title')}</h2>
        <p className="text-gray-400 mb-8">{t('success_sub')}</p>
        <div className="mt-4 animate-enter">
           {lastReservation && <QRCodePlaceholder value={lastReservation.qrCodeData} />}
           <p className="text-xs text-gray-500 mt-4">{t('qr_hint')}</p>
        </div>
        <Button className="mt-12 w-full max-w-xs" onClick={() => setCurrentScreen('map')}>{t('back_map')}</Button>
     </div>
  );

  const SupportScreen = () => {
    const services = [
      { id: 'tow', icon: Truck, titleKey: 'srv_tow', color: 'text-orange-400', bg: 'bg-orange-500/10' },
      { id: 'tire', icon: Crosshair, titleKey: 'srv_tire', color: 'text-blue-400', bg: 'bg-blue-500/10' },
      { id: 'fuel', icon: Droplet, titleKey: 'srv_fuel', color: 'text-red-400', bg: 'bg-red-500/10' },
      { id: 'jump', icon: Zap, titleKey: 'srv_jump', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
      { id: 'lock', icon: Lock, titleKey: 'srv_lock', color: 'text-purple-400', bg: 'bg-purple-500/10' },
      { id: 'other', icon: PhoneCall, titleKey: 'help', color: 'text-green-400', bg: 'bg-green-500/10' },
    ];
    return (
      <div className="h-[100dvh] w-full bg-darkBg flex flex-col overflow-hidden">
         <div className="p-6 pt-10 pb-0 shrink-0 flex items-center gap-4">
           <button onClick={goBack} className="p-2 rounded-full glass-panel text-white"><ArrowRight className="rotate-180"/></button>
           <h2 className="text-2xl font-bold text-white flex items-center gap-3">
             <Wrench className="text-blue-400"/> 
             {t('support_title')}
           </h2>
         </div>
         <p className="px-6 mt-2 text-gray-400">{t('support_desc')}</p>
         <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-6 pb-32 overscroll-contain">
            <div className="grid grid-cols-2 gap-4">
               {services.map((srv, idx) => (
                 <div key={srv.id} onClick={handleServiceCall} className="glass-card p-4 rounded-2xl flex flex-col items-center text-center gap-3 border border-white/5 hover:bg-white/5 transition-colors cursor-pointer animate-enter" style={{animationDelay: `${idx*0.05}s`}}>
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${srv.bg}`}>
                       <srv.icon size={28} className={srv.color} />
                    </div>
                    <span className="text-white font-bold text-sm">{t(srv.titleKey)}</span>
                    <Button variant="glass" className="w-full py-2 text-xs mt-1 bg-white/5">{t('call_now')}</Button>
                 </div>
               ))}
            </div>
         </div>
      </div>
    )
  }

  const ScanScreen = () => {
    useEffect(() => {
      const timer = setTimeout(() => {
        showToast(t('scan_success'), 'success');
        setCurrentScreen('map');
      }, 3000);
      return () => clearTimeout(timer);
    }, []);
    return (
      <div className="h-[100dvh] w-full bg-black flex flex-col items-center justify-center relative overflow-hidden">
         <div className="absolute top-10 left-6 z-10">
           <button onClick={goBack} className="p-2 bg-white/10 rounded-full text-white"><ArrowRight className="rotate-180"/></button>
         </div>
         <div className="w-64 h-64 border-2 border-primary/50 rounded-3xl relative flex items-center justify-center overflow-hidden">
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl"></div>
            <div className="absolute w-full h-1 bg-green-400 shadow-[0_0_20px_#4ade80] animate-[float_2s_ease-in-out_infinite] opacity-80" style={{top: '10%'}}></div>
            <p className="text-white/50 text-xs mt-32 animate-pulse">{t('processing')}</p>
         </div>
         <div className="mt-10 text-center px-8">
           <h2 className="text-2xl font-bold text-white mb-2">{t('scan_title')}</h2>
           <p className="text-gray-400">{t('scan_desc')}</p>
         </div>
      </div>
    )
  }

  const NewsScreen = () => {
    return (
      <div className="h-[100dvh] w-full bg-darkBg flex flex-col overflow-hidden">
         <div className="p-6 pt-10 pb-0 shrink-0 flex items-center gap-4">
           <button onClick={goBack} className="p-2 rounded-full glass-panel text-white"><ArrowRight className="rotate-180"/></button>
           <h2 className="text-2xl font-bold text-white flex items-center gap-3">
             <Newspaper className="text-purple-400"/> {t('news_title')}
           </h2>
         </div>
         <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-6 space-y-6 pb-32 overscroll-contain">
            {MOCK_NEWS.map((item, idx) => (
               <div key={item.id} className="glass-card overflow-hidden rounded-2xl animate-enter group cursor-pointer" style={{animationDelay: `${idx*0.1}s`}}>
                  <div className="h-40 w-full relative overflow-hidden">
                     <img src={item.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                     <div className="absolute top-4 left-4">
                        <Badge color={item.type === 'promo' ? 'bg-green-500 text-white' : item.type === 'alert' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}>
                          {item.type === 'promo' ? t('news_promo') : item.type === 'alert' ? t('news_alert') : t('news_info')}
                        </Badge>
                     </div>
                  </div>
                  <div className="p-5">
                     <div className="flex items-center gap-2 text-gray-400 text-xs mb-2"><Calendar size={12}/> {item.date}</div>
                     <h3 className="text-xl font-bold text-white mb-2 leading-tight">{item.title}</h3>
                     <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                  </div>
               </div>
            ))}
            <div className="text-center p-8 text-gray-500 text-sm">No more news</div>
         </div>
      </div>
    )
  }

  const ProfileScreen = () => {
    if (activeProfileTab === 'garage') {
      return (
        <div className="h-[100dvh] w-full bg-darkBg flex flex-col overflow-hidden">
           <div className="p-6 pt-10 pb-0">
             <button onClick={() => setActiveProfileTab('main')} className="self-start p-2 rounded-full glass-panel mb-6 text-white"><ArrowRight className="rotate-180"/></button>
             <h2 className="text-2xl font-bold text-white mb-6">{t('my_garage')}</h2>
           </div>
           <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-0 space-y-4 pb-32 overscroll-contain">
              {currentUser?.garage.map((plate, idx) => (
                 <div key={idx} className="glass-card p-4 rounded-xl flex justify-between items-center animate-enter" style={{animationDelay: `${idx*0.1}s`}}>
                    <div className="flex items-center gap-3">
                       <Car className="text-primary" />
                       <span className="text-xl font-mono text-white tracking-widest">{plate}</span>
                    </div>
                    <button onClick={() => removeCar(plate)} className="p-2 bg-red-500/20 text-red-500 rounded-lg"><Trash2 size={18}/></button>
                 </div>
              ))}
              <div className="glass-panel p-4 rounded-xl mt-8">
                 <h3 className="text-white mb-3 text-sm">{t('add_car')}</h3>
                 <div className="flex gap-2">
                    <input 
                      className="bg-white/5 border border-white/10 rounded-lg p-3 text-white flex-1 outline-none focus:border-primary uppercase font-mono placeholder-gray-600 tracking-widest"
                      placeholder="01 A 777 AA"
                      value={newCarPlate}
                      onChange={e => setNewCarPlate(formatCarPlate(e.target.value))}
                      maxLength={10}
                    />
                    <Button onClick={addCar} className="py-3 px-4"><Plus/></Button>
                 </div>
              </div>
           </div>
        </div>
      );
    }
    if (activeProfileTab === 'wallet') {
      return (
        <div className="h-[100dvh] w-full bg-darkBg flex flex-col overflow-hidden">
           <div className="p-6 pt-10 pb-0">
             <button onClick={() => setActiveProfileTab('main')} className="self-start p-2 rounded-full glass-panel mb-6 text-white"><ArrowRight className="rotate-180"/></button>
             <h2 className="text-2xl font-bold text-white mb-6">{t('wallet')}</h2>
           </div>
           <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-0 pb-32 overscroll-contain">
              <Card className="bg-gradient-to-br from-primary to-blue-600 mb-8 border-none shadow-lg shadow-blue-500/30">
                  <span className="text-white/80 text-sm">{t('current_balance')}</span>
                  <div className="text-4xl font-bold text-white mt-1 mb-4">{currentUser?.balance.toLocaleString()} <span className="text-lg font-normal">UZS</span></div>
                  <Button onClick={topUpBalance} variant="glass" className="bg-white/20 text-white w-full">{t('top_up')}</Button>
              </Card>
              <h3 className="text-white font-bold mb-4">{t('history')}</h3>
              <div className="space-y-3">
                  {transactions.map((t) => (
                    <div key={t.id} className="glass-card p-4 rounded-xl flex justify-between items-center">
                        <div>
                          <div className="text-white font-medium">{t.description}</div>
                          <div className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString()}</div>
                        </div>
                        <div className={`font-bold ${t.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>{t.type === 'deposit' ? '+' : '-'}{t.amount.toLocaleString()}</div>
                    </div>
                  ))}
              </div>
           </div>
        </div>
      );
    }
    if (activeProfileTab === 'favorites') {
      const favSpots = spots.filter(s => favorites.includes(s.id));
      return (
        <div className="h-[100dvh] w-full bg-darkBg flex flex-col overflow-hidden">
           <div className="p-6 pt-10 pb-0">
              <button onClick={() => setActiveProfileTab('main')} className="self-start p-2 rounded-full glass-panel mb-6 text-white"><ArrowRight className="rotate-180"/></button>
              <h2 className="text-2xl font-bold text-white mb-6">{t('favorites')}</h2>
           </div>
           <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-0 space-y-4 pb-32 overscroll-contain">
              {favSpots.length === 0 && <p className="text-gray-400 text-center mt-10">{t('no_favorites')}</p>}
              {favSpots.map(s => (
                 <div key={s.id} onClick={() => { setSelectedSpot(s); setCurrentScreen('details'); }} className="glass-card p-4 rounded-xl flex items-center gap-4 cursor-pointer">
                    <img src={s.image} className="w-16 h-16 rounded-lg object-cover" />
                    <div className="flex-1">
                       <h4 className="text-white font-bold">{s.name}</h4>
                       <div className="flex items-center gap-1 text-xs text-gray-400"><MapPin size={12}/> {s.address}</div>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); toggleFavorite(s.id); }} className="p-2 bg-red-500/10 text-red-500 rounded-full"><Heart className="fill-current" size={18}/></button>
                 </div>
              ))}
           </div>
        </div>
      )
    }
    if (activeProfileTab === 'achievements') {
      const achievements = [
        { id: 1, title: t('ach_1'), desc: t('ach_1_desc'), icon: Trophy, color: 'text-blue-400', bg: 'bg-blue-500/10', unlocked: true },
        { id: 2, title: t('ach_2'), desc: t('ach_2_desc'), icon: Zap, color: 'text-green-400', bg: 'bg-green-500/10', unlocked: true },
        { id: 3, title: t('ach_3'), desc: t('ach_3_desc'), icon: Moon, color: 'text-purple-400', bg: 'bg-purple-500/10', unlocked: false },
        { id: 4, title: t('ach_4'), desc: t('ach_4_desc'), icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10', unlocked: false },
      ];
      return (
        <div className="h-[100dvh] w-full bg-darkBg flex flex-col overflow-hidden">
           <div className="p-6 pt-10 pb-0">
              <button onClick={() => setActiveProfileTab('main')} className="self-start p-2 rounded-full glass-panel mb-6 text-white"><ArrowRight className="rotate-180"/></button>
              <h2 className="text-2xl font-bold text-white mb-6">{t('achievements')}</h2>
           </div>
           <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-0 pb-32 overscroll-contain">
              <div className="flex items-center gap-4 mb-8 glass-card p-6 rounded-2xl bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
                 <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center border-2 border-yellow-500">
                    <Trophy size={32} className="text-yellow-400" />
                 </div>
                 <div>
                    <h3 className="text-gray-400 text-sm uppercase font-bold">{t('level')}</h3>
                    <div className="text-2xl font-black text-white">{t('expert')}</div>
                    <div className="h-2 w-32 bg-gray-700 rounded-full mt-2 overflow-hidden">
                       <div className="h-full bg-yellow-500 w-3/4"></div>
                    </div>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 {achievements.map(ach => (
                    <div key={ach.id} className={`glass-card p-4 rounded-2xl flex flex-col items-center text-center gap-3 border ${ach.unlocked ? 'border-white/10' : 'border-white/5 opacity-50'}`}>
                       <div className={`w-14 h-14 rounded-full flex items-center justify-center ${ach.bg}`}>
                          <ach.icon size={24} className={ach.color} />
                       </div>
                       <div>
                          <h4 className="text-white font-bold text-sm">{ach.title}</h4>
                          <p className="text-gray-500 text-xs mt-1">{ach.desc}</p>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      );
    }
    return (
    <div className="h-[100dvh] w-full bg-darkBg relative flex flex-col overflow-hidden">
       <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
       </div>
       <div className="absolute top-6 left-6 z-50">
           <button onClick={goBack} className="p-2 rounded-full glass-panel text-white shadow-lg"><ArrowRight className="rotate-180"/></button>
       </div>
       <div className="flex-1 overflow-y-auto no-scrollbar p-6 pt-16 pb-32 z-10 overscroll-contain">
          <div className="flex items-center gap-4 mb-8 relative z-10">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary to-accent p-[2px]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden">
                    <User size={32} className="text-white" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">{currentUser?.name || "Guest"}</h2>
                <p className="text-gray-400">{currentUser?.email}</p>
                <Badge color="bg-primary/20 text-primary mt-1 border border-primary/20">{currentUser?.role === 'admin' ? t('admin') : t('driver')}</Badge>
              </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8">
              <Card className="bg-gradient-to-br from-primary to-blue-600 border-none shadow-lg shadow-blue-500/30" onClick={() => setActiveProfileTab('wallet')}>
                <span className="text-white/80 text-xs flex items-center gap-1"><Wallet size={12}/> Balans</span>
                <p className="text-2xl font-bold text-white mt-1">{currentUser?.balance.toLocaleString()}</p>
              </Card>
              <Card className="bg-gradient-to-br from-accent to-purple-600 border-none shadow-lg shadow-purple-500/30">
                <span className="text-white/80 text-xs flex items-center gap-1"><Star size={12}/> {t('bonus')}</span>
                <p className="text-2xl font-bold text-white mt-1">{currentUser?.bonusPoints}</p>
              </Card>
          </div>
          <div className="space-y-4 relative z-10">
              {installPrompt && (
                <Card className="flex items-center justify-between bg-primary/20 border-primary/40" onClick={handleInstallApp}>
                    <span className="text-white flex items-center gap-3"><Download size={18}/> {t('install_app')}</span>
                    <Badge color="bg-white text-black">PWA</Badge>
                </Card>
              )}
              <Card className="flex items-center justify-between hover:bg-white/5 transition-colors" onClick={() => setActiveProfileTab('achievements')}>
                <span className="text-white flex items-center gap-3"><Trophy size={18} className="text-yellow-400"/> {t('achievements')}</span>
                <div className="flex items-center gap-2">
                   <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 border border-black flex items-center justify-center"><Trophy size={10} className="text-blue-400"/></div>
                      <div className="w-6 h-6 rounded-full bg-green-500/20 border border-black flex items-center justify-center"><Zap size={10} className="text-green-400"/></div>
                   </div>
                   <ArrowRight size={16} className="text-gray-500" />
                </div>
              </Card>
              <Card className="flex items-center justify-between hover:bg-white/5 transition-colors" onClick={() => setActiveProfileTab('garage')}>
                <span className="text-white flex items-center gap-3"><Car size={18} className="text-primary"/> {t('my_cars')}</span>
                <ArrowRight size={16} className="text-gray-500" />
              </Card>
              <Card className="flex items-center justify-between hover:bg-white/5 transition-colors" onClick={() => setActiveProfileTab('wallet')}>
                <span className="text-white flex items-center gap-3"><History size={18} className="text-green-400"/> {t('payments')}</span>
                <ArrowRight size={16} className="text-gray-500" />
              </Card>
              <Card className="flex items-center justify-between hover:bg-white/5 transition-colors" onClick={() => setActiveProfileTab('favorites')}>
                <span className="text-white flex items-center gap-3"><Heart size={18} className="text-red-400"/> {t('fav_spots')}</span>
                <ArrowRight size={16} className="text-gray-500" />
              </Card>
              <div className="glass-card p-4 rounded-xl flex items-center justify-between">
                <span className="text-white flex items-center gap-3"><Globe size={18} className="text-blue-300"/> {t('lang_select')}</span>
                <div className="flex gap-2">
                    <button onClick={() => setLanguage('uz')} className={`px-2 py-1 rounded text-xs font-bold transition-all ${language === 'uz' ? 'bg-primary text-white' : 'bg-white/10 text-gray-400'}`}>UZ</button>
                    <button onClick={() => setLanguage('ru')} className={`px-2 py-1 rounded text-xs font-bold transition-all ${language === 'ru' ? 'bg-primary text-white' : 'bg-white/10 text-gray-400'}`}>RU</button>
                    <button onClick={() => setLanguage('cyr')} className={`px-2 py-1 rounded text-xs font-bold transition-all ${language === 'cyr' ? 'bg-primary text-white' : 'bg-white/10 text-gray-400'}`}>ЎЗ</button>
                </div>
              </div>
              {currentUser?.role === 'admin' && (
                <Card className="flex items-center justify-between border-accent/50 bg-accent/10" onClick={() => setCurrentScreen('admin')}>
                  <span className="text-white flex items-center gap-3"><Shield size={18}/> {t('admin_panel')}</span>
                  <ArrowRight size={16} className="text-accent" />
                </Card>
              )}
              <Button variant="glass" className="w-full mt-8 border-red-500/30 text-red-400 hover:bg-red-500/10" onClick={() => setCurrentScreen('auth')}>
                  {t('logout')}
              </Button>
          </div>
       </div>
       <div className="absolute bottom-6 left-6 right-6 z-[100]">
           <div className="glass-panel rounded-[32px] p-2 flex justify-between items-center px-4 shadow-2xl backdrop-blur-xl bg-black/60 border border-white/20">
              <button onClick={() => setCurrentScreen('map')} className="p-3 rounded-2xl bg-white/10 text-primary transition-transform active:scale-90">
                <Home size={24} />
              </button>
              <button onClick={() => setCurrentScreen('support')} className="p-3 rounded-2xl hover:bg-white/5 text-gray-300 transition-transform active:scale-90">
                 <Wrench size={24} />
              </button>
              <div className="-mt-8">
                <button 
                  onClick={() => setCurrentScreen('scan')}
                  className="w-20 h-20 rounded-full bg-gradient-to-tr from-green-400 to-emerald-600 flex items-center justify-center shadow-[0_0_30px_rgba(74,222,128,0.5)] border-4 border-darkBg/50 relative group transition-transform active:scale-95"
                >
                   <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping opacity-30"></div>
                   <ScanLine size={32} className="text-white" />
                </button>
              </div>
              <button onClick={() => setCurrentScreen('news')} className="p-3 rounded-2xl hover:bg-white/5 text-gray-300 transition-transform active:scale-90">
                <Newspaper size={24} />
              </button>
              <button onClick={() => setCurrentScreen('profile')} className="p-3 rounded-2xl hover:bg-white/5 text-gray-300 transition-transform active:scale-90">
                <User size={24} />
              </button>
           </div>
        </div>
    </div>
    );
  };

  const AdminScreen = () => {
     return (
        <div className="h-[100dvh] w-full bg-darkBg p-6 pt-10 flex flex-col overflow-hidden">
           <div className="flex justify-between items-center mb-6">
              <button onClick={() => setCurrentScreen('profile')} className="p-2 rounded-full glass-panel text-white"><ArrowRight className="rotate-180"/></button>
              <h2 className="text-xl font-bold text-white">{t('admin_panel')}</h2>
              <div className="w-10" />
           </div>
           <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-20 overscroll-contain">
             <div className="grid grid-cols-2 gap-4 mb-6">
                <Card>
                   <div className="flex items-center gap-2 text-gray-400 mb-2"><Users size={16}/> Foydalanuvchilar</div>
                   <div className="text-2xl font-bold text-white">1,234</div>
                   <div className="text-xs text-green-400 mt-1">+12% bu hafta</div>
                </Card>
                <Card>
                   <div className="flex items-center gap-2 text-gray-400 mb-2"><TrendingUp size={16}/> Daromad</div>
                   <div className="text-2xl font-bold text-white">$4.2k</div>
                   <div className="text-xs text-green-400 mt-1">+8% bu hafta</div>
                </Card>
             </div>
             <div className="h-64 mb-6">
                <Card className="h-full">
                  <h3 className="text-white font-bold mb-4">Haftalik Statistika</h3>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={adminStats.length ? adminStats : []}>
                        <defs>
                          <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1E90FF" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#1E90FF" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                        <XAxis dataKey="name" stroke="#ffffff50" fontSize={12} />
                        <YAxis stroke="#ffffff50" fontSize={12} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#1E90FF" fillOpacity={1} fill="url(#colorRev)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
             </div>
             <h3 className="text-white font-bold mb-4">Parkovkalar Holati</h3>
             <div className="space-y-4 mb-10">
                {spots.map(s => (
                   <div key={s.id} className="glass-card p-4 rounded-xl flex items-center gap-4">
                      <img src={s.image} className="w-16 h-16 rounded-lg object-cover" />
                      <div className="flex-1">
                         <h4 className="text-white font-bold text-sm">{s.name}</h4>
                         <div className="flex items-center gap-2 mt-1">
                            <div className={`w-2 h-2 rounded-full ${s.availableSpots > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className="text-xs text-gray-400">{s.availableSpots} / {s.totalSpots} joy</span>
                         </div>
                      </div>
                      <button className="p-2 glass-panel rounded-lg text-primary"><Settings size={18}/></button>
                   </div>
                ))}
             </div>
           </div>
        </div>
     );
  };

  const AuthScreen = () => (
     <div className="h-[100dvh] w-full bg-darkBg flex flex-col justify-center p-8 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-accent/20 rounded-full blur-[100px]" />
        <div className="z-10 animate-enter">
           <h1 className="text-4xl font-bold text-white mb-2">{t('welcome_title')}</h1>
           <p className="text-gray-400 mb-8">{t('welcome_sub')}</p>
           <Input placeholder={t('email')} icon={User} className="mb-4" />
           <Input placeholder={t('password')} type="password" icon={Shield} className="mb-8" />
           <div className="space-y-3">
             <Button fullWidth onClick={() => handleLogin('user')} disabled={isLoading}>{isLoading ? t('processing') : t('login_btn')}</Button>
             <Button fullWidth variant="outline" onClick={() => handleLogin('admin')} disabled={isLoading}>{t('admin_login')}</Button>
           </div>
           <Button variant="ghost" fullWidth onClick={() => setCurrentScreen('about_app')} className="mt-4">{t('back')}</Button>
        </div>
     </div>
  );

  return (
    <div className="w-full h-[100dvh] sm:max-w-md mx-auto bg-darkBg shadow-2xl overflow-hidden font-sans relative selection:bg-primary/30">
      <ToastContainer toasts={notifications} />
      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} onSubmit={handleReportIssue} t={t} />
      {currentScreen === 'splash' && <SplashScreen />}
      {currentScreen === 'about_app' && <AboutScreen />}
      {currentScreen === 'auth' && <AuthScreen />}
      {currentScreen === 'map' && 
         <MapScreen 
            currentUser={currentUser}
            filteredSpots={filteredSpots}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filter={filter}
            setFilter={setFilter}
            setSelectedSpot={setSelectedSpot}
            setCurrentScreen={setCurrentScreen}
            isNavigating={isNavigating}
            onCancelNavigation={() => setIsNavigating(false)} 
            setIsNavigating={setIsNavigating}
            selectedSpot={selectedSpot}
            isLoading={isLoading}
            t={t}
            parkedCar={parkedCar}
            setParkedCar={setParkedCar}
            showToast={showToast}
            onGlobalSearch={handleGlobalSearch}
            speak={speak}
         />
      }
      {currentScreen === 'details' && <DetailsScreen />}
      {currentScreen === 'reservation' && <ReservationScreen />}
      {currentScreen === 'payment' && <PaymentScreen />}
      {currentScreen === 'profile' && <ProfileScreen />}
      {currentScreen === 'scan' && <ScanScreen />}
      {currentScreen === 'news' && <NewsScreen />}
      {currentScreen === 'support' && <SupportScreen />}
      {currentScreen === 'admin' && <AdminScreen />}
    </div>
  );
};

export default App;