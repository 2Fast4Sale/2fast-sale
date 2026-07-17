"use client";
import React from 'react';
import { Camera, Settings, Car } from 'lucide-react';

interface SidebarProps {
  activeStep: string;
  setActiveStep: (step: string) => void;
}

export default function SettingsSidebar({ activeStep, setActiveStep }: SidebarProps) {
  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-sm">
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <Car className="text-white w-6 h-6" />
        </div>
        <span className="text-xl font-black tracking-tight text-blue-600">2FAST-SALE</span>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        <button 
          onClick={() => setActiveStep('dashboard')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeStep === 'dashboard' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Camera size={20} /> Fahrzeug-Inbound
        </button>
        
        <button 
          onClick={() => setActiveStep('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold transition-all ${activeStep === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Settings size={20} /> Studio-Branding
        </button>
      </nav>
    </aside>
  );
}