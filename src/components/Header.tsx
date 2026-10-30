'use client';

import React, { useState, useEffect } from 'react';
import { Power, Clock } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const [isActive, setIsActive] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    // Cargar estado inicial del asistente
    fetch('/api/business/profile')
      .then((res) => res.json())
      .then((data) => {
        if (data.assistantActive !== undefined) {
          setIsActive(data.assistantActive);
        }
      })
      .catch(() => {});

    // Actualizar reloj en hora de Madrid
    const updateClock = () => {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(now);
      setCurrentTime(timeStr);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleAssistant = async () => {
    setLoading(true);
    const nextState = !isActive;
    setIsActive(nextState);

    try {
      await fetch('/api/business/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assistantActive: nextState }),
      });
    } catch (err) {
      console.error('Error toggling assistant:', err);
      setIsActive(!nextState); // revert
    } finally {
      setLoading(false);
    }
  };

  return (
    <header className="h-16 px-8 bg-white border-b border-stone-200 flex items-center justify-between shrink-0">
      <div>
        <h2 className="text-xl font-bold text-stone-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Hora oficial en Madrid */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 text-xs font-mono">
          <Clock className="w-3.5 h-3.5 text-stone-400" />
          <span>Madrid: {currentTime || '...'}</span>
        </div>

        {/* Interruptor General del Asistente */}
        <button
          onClick={toggleAssistant}
          disabled={loading}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border shadow-xs ${
            isActive
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
              : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
          }`}
          title="Conmuta la atención automática de todos los canales"
        >
          <Power
            className={`w-3.5 h-3.5 ${
              isActive ? 'text-emerald-600 animate-pulse' : 'text-amber-600'
            }`}
          />
          <span>{isActive ? 'Asistente Encendido' : 'Asistente en Pausa'}</span>
        </button>

        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

