'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  Blocks,
  Share2,
  Sparkles,
  MessageSquare,
  Activity,
  Settings,
  ExternalLink,
  LogOut,
  Building2,
} from 'lucide-react';

interface SidebarProps {
  businessName?: string;
  assistantActive?: boolean;
  agencyName?: string;
}

export function Sidebar({
  businessName = 'Clínica Dental Lumen',
  assistantActive = true,
  agencyName = 'Agencia Atendia',
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: 'Resumen', href: '/', icon: LayoutDashboard },
    { label: 'Comportamiento', href: '/comportamiento', icon: Bot },
    { label: 'Conocimiento', href: '/conocimiento', icon: BookOpen },
    { label: 'Integraciones', href: '/integraciones', icon: Blocks },
    { label: 'Canales', href: '/canales', icon: Share2 },
    { label: 'Probar', href: '/probar', icon: Sparkles },
    { label: 'Conversaciones', href: '/conversaciones', icon: MessageSquare },
    { label: 'Actividad', href: '/actividad', icon: Activity },
    { label: 'Ajustes', href: '/ajustes', icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      router.push('/login');
    }
  };

  return (
    <aside className="w-64 bg-stone-900 text-stone-200 flex flex-col h-screen border-r border-stone-800 shrink-0">
      {/* Cabecera de la Marca */}
      <div className="p-5 border-b border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-teal-500/20">
            A
          </div>
          <div>
            <h1 className="font-semibold text-white text-base tracking-tight leading-none">Atendia</h1>
            <p className="text-[11px] text-stone-400 mt-0.5">{agencyName}</p>
          </div>
        </div>

        {/* Tarjeta del Negocio Actual */}
        <div className="mt-4 p-2.5 rounded-lg bg-stone-800/80 border border-stone-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <Building2 className="w-4 h-4 text-stone-400 shrink-0" />
            <div className="truncate">
              <p className="text-xs font-medium text-stone-200 truncate">{businessName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    assistantActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span className="text-[10px] text-stone-400">
                  {assistantActive ? 'Asistente activo' : 'En pausa'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación Principal */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-teal-600 text-white shadow-xs font-semibold'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/70'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-400'}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Pie con Demo y Logout */}
      <div className="p-3 border-t border-stone-800 space-y-1">
        <Link
          href="/demo"
          target="_blank"
          className="flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-stone-300 hover:text-white hover:bg-stone-800/70 transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
            Ver Chat Web (/demo)
          </span>
          <span className="text-[10px] bg-stone-800 px-1.5 py-0.5 rounded text-stone-400">Público</span>
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}

