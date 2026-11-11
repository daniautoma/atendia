'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Terminal,
  Target,
  ArrowLeft,
  Clock,
  Briefcase,
  CheckSquare,
  LayoutDashboard,
  Compass,
  TrendingUp,
  SlidersHorizontal,
} from 'lucide-react';

interface HqHeaderProps {
  onOpenNewTask?: () => void;
  onOpenNewLead?: () => void;
  onOpenGoal?: () => void;
}

export function HqHeader({
  onOpenNewTask,
  onOpenNewLead,
  onOpenGoal,
}: HqHeaderProps) {
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('es-SV', {
        timeZone: 'America/El_Salvador',
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

  const navLinks = [
    {
      label: 'Tablero HQ',
      href: '/hq',
      icon: LayoutDashboard,
      active: pathname === '/hq',
    },
    {
      label: 'Radar de Clientes',
      href: '/hq/radar',
      icon: Compass,
      active:
        pathname.startsWith('/hq/radar') &&
        pathname !== '/hq/radar/niches' &&
        pathname !== '/hq/radar/settings',
    },
    {
      label: 'Radar de Nichos',
      href: '/hq/radar/niches',
      icon: TrendingUp,
      active: pathname === '/hq/radar/niches',
    },
    {
      label: 'Ajustes Radar',
      href: '/hq/radar/settings',
      icon: SlidersHorizontal,
      active: pathname === '/hq/radar/settings',
    },
  ];

  return (
    <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Identidad de Marca */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-zinc-900 to-violet-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/40">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-zinc-100 tracking-tight">
                  Cuartel General — <span className="bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">danIAutoma</span>
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  HQ Privado
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Modo Producción: Activo.
                </span>
                {currentTime && (
                  <>
                    <span className="text-zinc-600 text-xs">•</span>
                    <span className="text-[11px] text-zinc-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-zinc-500" />
                      {currentTime} (El Salvador)
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-medium transition-colors"
              title="Volver al panel CRM de la clínica"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
              <span>Volver a Atendia</span>
            </Link>

            {onOpenGoal && (
              <button
                type="button"
                onClick={onOpenGoal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-950/40 text-violet-300 hover:bg-violet-900/50 hover:border-violet-400 text-xs font-semibold transition-all shadow-xs"
              >
                <Target className="w-3.5 h-3.5 text-violet-400" />
                <span>Objetivo Semanal</span>
              </button>
            )}

            {onOpenNewLead && (
              <button
                type="button"
                onClick={onOpenNewLead}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/50 hover:border-cyan-400 text-xs font-semibold transition-all shadow-xs"
              >
                <Briefcase className="w-3.5 h-3.5 text-cyan-400" />
                <span>+ Nuevo Prospecto</span>
              </button>
            )}

            {onOpenNewTask && (
              <button
                type="button"
                onClick={onOpenNewTask}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-violet-600 text-white text-xs font-semibold hover:from-cyan-500 hover:to-violet-500 transition-all shadow-md shadow-cyan-950/50"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>+ Nueva Tarea</span>
              </button>
            )}
          </div>
        </div>

        {/* Pestañas de Navegación de HQ */}
        <nav className="flex items-center gap-1 mt-3 pt-2.5 border-t border-zinc-800/60 overflow-x-auto text-xs">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg font-medium transition-all ${
                  link.active
                    ? 'bg-zinc-800 text-cyan-300 font-semibold border border-zinc-700/80 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/80'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${link.active ? 'text-cyan-400' : 'text-zinc-500'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
