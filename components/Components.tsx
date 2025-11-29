

import React, { useRef, useEffect, useState } from 'react';
import { LucideIcon, X, Check, Info, AlertCircle, Sparkles, Sun, Moon, Cloud, CloudRain, Mic, Send, Bot, Banknote, AlertTriangle, ChevronRight, MessageSquare, Truck, Crosshair, Droplet, Zap, Lock, PhoneCall, MoreHorizontal, Brain, CloudFog, CloudLightning, Snowflake, CloudDrizzle, Umbrella, LayoutGrid, ArrowDown } from 'lucide-react';

// --- Glass Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'glass';
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  icon,
  ...props 
}) => {
  const baseStyles = "py-4 px-6 rounded-2xl font-semibold transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-md";
  const variants = {
    primary: "bg-gradient-to-r from-primary to-blue-600 text-white shadow-lg shadow-blue-500/30 border border-white/10",
    secondary: "bg-gradient-to-r from-green-400 to-emerald-600 text-white shadow-lg shadow-green-500/30",
    outline: "border-2 border-primary/50 text-primary hover:bg-primary/10 dark:text-blue-300",
    ghost: "bg-transparent text-gray-600 hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/10",
    danger: "bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-red-500/30",
    glass: "glass-card text-white hover:bg-white/10",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

// --- Glass Input ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
}

export const Input: React.FC<InputProps> = ({ label, icon: Icon, className = '', ...props }) => {
  return (
    <div className={`mb-4 ${className}`}>
      {label && <label className="block text-sm font-medium text-white mb-2 ml-1">{label}</label>}
      <div className="relative group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-white transition-colors">
            <Icon size={20} />
          </div>
        )}
        {/* Updated for better visibility: Darker background, lighter text */}
        <input
          className={`w-full bg-black/40 backdrop-blur-md border border-white/20 text-white text-sm rounded-2xl focus:ring-2 focus:ring-primary/50 focus:border-primary block p-4 ${Icon ? 'pl-11' : ''} transition-all shadow-sm placeholder-gray-400`}
          {...props}
        />
      </div>
    </div>
  );
};

// --- Glass Card ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; onClick?: () => void }> = ({ children, className = '', onClick }) => (
  <div onClick={onClick} className={`glass-card rounded-3xl p-5 ${className} ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}>
    {children}
  </div>
);

// --- Modal ---
export const Modal: React.FC<{ isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="glass-panel w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl animate-enter border-t border-white/20 dark:border-white/10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

// --- Report Modal ---
export const ReportModal: React.FC<{ isOpen: boolean; onClose: () => void; onSubmit: (issue: string) => void; t: (key: string) => string }> = ({ isOpen, onClose, onSubmit, t }) => {
  if (!isOpen) return null;

  const issues = [
    { id: 'full', label: t('issue_full'), icon: AlertCircle },
    { id: 'price', label: t('issue_price'), icon: Banknote },
    { id: 'closed', label: t('issue_closed'), icon: X },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('report_title')}>
       <div className="space-y-3">
          {issues.map((issue) => (
             <button 
               key={issue.id}
               onClick={() => onSubmit(issue.id)}
               className="w-full p-4 glass-card rounded-xl flex items-center gap-4 hover:bg-white/10 transition-colors"
             >
                <div className="p-2 rounded-full bg-red-500/20 text-red-500">
                   <issue.icon size={20} />
                </div>
                <span className="text-white font-medium">{issue.label}</span>
             </button>
          ))}
       </div>
    </Modal>
  );
};

// --- Badge ---
export const Badge: React.FC<{ children: React.ReactNode; color?: string; onClick?: () => void }> = ({ children, color = 'bg-blue-100 text-blue-800', onClick }) => (
  <span 
    onClick={onClick}
    className={`inline-flex items-center px-4 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-all ${color} ${onClick ? 'cursor-pointer active:opacity-80 hover:scale-105' : ''}`}
  >
    {children}
  </span>
);

// --- Toggle Switch ---
export const Toggle: React.FC<{ checked: boolean; onChange: (val: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <div className="flex items-center justify-between py-3">
    <span className="text-white font-medium">{label}</span>
    <button 
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none shadow-inner ${checked ? 'bg-primary' : 'bg-gray-600'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  </div>
);

// --- Toast Notification ---
export const ToastContainer: React.FC<{ toasts: {id: string, message: string, type: 'success' | 'error' | 'info'}[] }> = ({ toasts }) => {
  return (
    <div className="fixed top-6 left-0 right-0 z-[1200] flex flex-col items-center gap-3 pointer-events-none px-4">
      {toasts.map((toast) => (
        <div key={toast.id} className="animate-enter pointer-events-auto flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl glass-panel border-l-4 min-w-[320px] max-w-sm backdrop-blur-xl"
             style={{ borderLeftColor: toast.type === 'success' ? '#10B981' : toast.type === 'error' ? '#EF4444' : '#3B82F6' }}>
          <div className={`p-2 rounded-full ${toast.type === 'success' ? 'bg-green-100/20 text-green-600' : toast.type === 'error' ? 'bg-red-100/20 text-red-600' : 'bg-blue-100/20 text-white'}`}>
            <span className="text-white">
            {toast.type === 'success' ? <Check size={18} /> : toast.type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />}
            </span>
          </div>
          {/* Forced white text for better visibility */}
          <p className="text-white text-sm font-semibold">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}

// --- REAL WEATHER WIDGET (Compact Pill Design) ---
export const WeatherWidget: React.FC<{city: string, t: (key: string) => string}> = ({city, t}) => {
  const [weather, setWeather] = useState<{
    temp: number,
    code: number,
    isDay: boolean,
    loading: boolean
  }>({ temp: 0, code: 0, isDay: true, loading: true });

  useEffect(() => {
    // Tashkent Coordinates
    const LAT = 41.31;
    const LNG = 69.24;
    
    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LNG}&current_weather=true&timezone=auto`);
        const data = await res.json();
        
        setWeather({
          temp: Math.round(data.current_weather.temperature),
          code: data.current_weather.weathercode,
          isDay: data.current_weather.is_day === 1,
          loading: false
        });
      } catch (e) {
        console.error("Weather fetch failed", e);
        setWeather(prev => ({...prev, loading: false}));
      }
    };
    
    fetchWeather();
    const timer = setInterval(fetchWeather, 300000); // Update every 5 min
    return () => clearInterval(timer);
  }, []);

  const getWeatherIcon = (code: number, isDay: boolean) => {
    if (code === 0) return isDay ? <Sun className="text-yellow-400" size={18} /> : <Moon className="text-blue-300" size={18} />;
    if (code >= 1 && code <= 3) return <Cloud className="text-gray-300" size={18} />;
    if (code >= 45 && code <= 48) return <CloudFog className="text-gray-400" size={18} />;
    if (code >= 51 && code <= 57) return <CloudDrizzle className="text-blue-300" size={18} />;
    if (code >= 61 && code <= 67) return <CloudRain className="text-blue-400" size={18} />;
    if (code >= 71 && code <= 77) return <Snowflake className="text-white" size={18} />;
    if (code >= 95) return <CloudLightning className="text-yellow-300" size={18} />;
    return <Sun className="text-yellow-400" size={18} />;
  };

  const getWeatherLabelKey = (code: number) => {
    if (code === 0) return weather.isDay ? 'w_sunny' : 'w_clear';
    if (code >= 1 && code <= 3) return 'w_cloudy';
    if (code >= 45 && code <= 48) return 'w_fog';
    if (code >= 51 && code <= 57) return 'w_drizzle';
    if (code >= 61 && code <= 67) return 'w_rain';
    if (code >= 71 && code <= 77) return 'w_snow';
    if (code >= 95) return 'w_thunder';
    return 'w_sunny';
  };

  const getTipKey = () => {
    if (weather.code >= 51) return 'tip_rain'; 
    if (weather.temp > 35) return 'tip_hot';   
    return null;
  };

  if (weather.loading) {
     return (
       <div className="glass-panel p-2 rounded-full flex items-center justify-center w-12 h-8 bg-black/60">
         <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
       </div>
     )
  }

  const tipKey = getTipKey();

  return (
    <div className="flex flex-col items-end gap-2 animate-enter">
      {/* Compact Main Widget (Pill Shape) */}
      <div className={`glass-panel pl-2 pr-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg border border-white/20 backdrop-blur-xl transition-all ${weather.isDay ? 'bg-black/60' : 'bg-black/70'}`}>
         {getWeatherIcon(weather.code, weather.isDay)}
         <div className="flex items-center gap-1">
           <span className="text-base font-bold text-white">{weather.temp}°</span>
         </div>
      </div>
      
      {/* Mini Tip Badge (Only shows if there is a warning) */}
      {tipKey && (
         <div className="glass-panel px-2 py-0.5 rounded-lg text-[10px] font-medium text-white bg-red-500/80 border-none shadow-md whitespace-nowrap animate-enter">
            {t(tipKey)}
         </div>
      )}
    </div>
  );
}

// --- VISUAL PARKING LAYOUT ---
export const ParkingLayout: React.FC<{ selectedSpot: string | null; onSelect: (id: string) => void; t: (key: string) => string }> = ({ selectedSpot, onSelect, t }) => {
  const [floor, setFloor] = useState(1);
  
  // Create mock grid
  const renderGrid = (floorNum: number) => {
    const rows = ['A', 'B', 'C'];
    const cols = 6;
    const grid = [];

    for (let r = 0; r < rows.length; r++) {
       const rowSlots = [];
       for (let c = 1; c <= cols; c++) {
          const id = `${floorNum}-${rows[r]}${c}`;
          // Deterministic pseudo-random occupation based on ID string length char code
          const isOccupied = (id.charCodeAt(0) + id.charCodeAt(3)) % 3 === 0;
          const isSelected = selectedSpot === id;
          
          rowSlots.push(
            <button 
              key={id} 
              disabled={isOccupied}
              onClick={() => onSelect(id)}
              className={`w-10 h-12 rounded-lg m-1 flex flex-col items-center justify-center transition-all relative ${
                 isSelected ? 'bg-yellow-400 scale-110 shadow-[0_0_15px_rgba(250,204,21,0.6)] z-10' :
                 isOccupied ? 'bg-red-500/20 border border-red-500/30 cursor-not-allowed opacity-50' :
                 'bg-green-500/20 border border-green-500/30 hover:bg-green-500/40'
              }`}
            >
               <span className={`text-[10px] font-bold ${isSelected ? 'text-black' : isOccupied ? 'text-red-300' : 'text-green-300'}`}>
                 {rows[r]}{c}
               </span>
               {isOccupied && <X size={12} className="text-red-400 absolute" />}
            </button>
          );
       }
       grid.push(
         <div key={rows[r]} className="flex justify-center mb-2">
            <span className="mr-2 text-xs text-gray-500 self-center w-4">{rows[r]}</span>
            {rowSlots}
         </div>
       );
    }
    return grid;
  };

  return (
    <div className="glass-card p-4 rounded-3xl animate-enter">
       <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold flex items-center gap-2"><LayoutGrid size={18} className="text-primary"/> {t('select_spot_title')}</h3>
          <div className="flex bg-white/10 rounded-lg p-1">
             <button onClick={() => setFloor(1)} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${floor === 1 ? 'bg-primary text-white' : 'text-gray-400'}`}>1</button>
             <button onClick={() => setFloor(2)} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${floor === 2 ? 'bg-primary text-white' : 'text-gray-400'}`}>2</button>
          </div>
       </div>
       
       <div className="flex justify-center gap-4 mb-4 text-[10px] text-gray-400">
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500/20 border border-green-500/50 rounded"></div> {t('available')}</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500/20 border border-red-500/50 rounded"></div> Band</div>
          <div className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-400 rounded"></div> Tanlangan</div>
       </div>

       <div className="relative py-4 border-t border-b border-white/5">
          {renderGrid(floor)}
          <div className="text-center mt-2 text-gray-500 text-xs flex items-center justify-center gap-1">
             <ArrowDown size={12} /> {t('entrance')}
          </div>
       </div>

       {selectedSpot && (
         <div className="mt-4 text-center">
            <span className="text-gray-400 text-xs">{t('floor')} {selectedSpot.split('-')[0]} • {t('spot')} </span>
            <span className="text-xl font-bold text-yellow-400 ml-1">{selectedSpot.split('-')[1]}</span>
         </div>
       )}
    </div>
  );
};

// --- QR Code Placeholder ---
export const QRCodePlaceholder: React.FC<{ value: string }> = ({ value }) => {
  return (
    <div className="w-56 h-56 glass-panel p-3 rounded-2xl mx-auto flex flex-col items-center justify-center relative overflow-hidden group bg-white">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <div className="w-full h-full bg-white relative flex items-center justify-center overflow-hidden rounded-xl">
         <div className="absolute inset-0 grid grid-cols-6 grid-rows-6 gap-1.5 p-3">
            {[...Array(36)].map((_, i) => (
              <div key={i} className={`bg-black ${Math.random() > 0.4 ? 'opacity-100 rounded-[2px]' : 'opacity-0'}`}></div>
            ))}
         </div>
         <div className="absolute w-12 h-12 bg-white rounded-lg flex items-center justify-center z-10 shadow-lg">
           <div className="text-black font-black text-xs tracking-tighter">SP</div>
         </div>
         <div className="absolute top-3 left-3 w-10 h-10 border-[5px] border-black rounded-lg"></div>
         <div className="absolute top-3 right-3 w-10 h-10 border-[5px] border-black rounded-lg"></div>
         <div className="absolute bottom-3 left-3 w-10 h-10 border-[5px] border-black rounded-lg"></div>
      </div>
    </div>
  );
}