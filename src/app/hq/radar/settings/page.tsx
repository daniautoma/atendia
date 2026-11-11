'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SlidersHorizontal,
  User,
  Activity,
  Database,
  Save,
  Trash2,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  RotateCcw,
} from 'lucide-react';
import { HqHeader } from '@/components/hq/HqHeader';
import { PitchTone } from '@/lib/radar/settingsService';
import { getErrorMessage } from '@/lib/hq/errorUtils';

export default function RadarSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);

  const [sellerName, setSellerName] = useState('Daniel');
  const [agencyName, setAgencyName] = useState('danIAutoma');
  const [servicesText, setServicesText] = useState('');
  const [valueProposition, setValueProposition] = useState('');
  const [defaultTone, setDefaultTone] = useState<PitchTone>('cercano');
  const [placesMonthlyLimit, setPlacesMonthlyLimit] = useState(800);

  const [usage, setUsage] = useState<{ monthYear: string; placesCalls: number; limitAlert: number } | null>(null);
  const [cacheCount, setCacheCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchSettingsPayload = async () => {
    const res = await fetch('/api/hq/radar/settings');
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || 'Error cargando ajustes');
    return data;
  };

  useEffect(() => {
    let active = true;
    fetchSettingsPayload()
      .then((data) => {
        if (!active) return;
        if (data.settings) {
          setSellerName(data.settings.sellerName || '');
          setAgencyName(data.settings.agencyName || '');
          setServicesText((data.settings.servicesOffered || []).join('\n'));
          setValueProposition(data.settings.valueProposition || '');
          setDefaultTone(data.settings.defaultTone || 'cercano');
          setPlacesMonthlyLimit(data.settings.placesMonthlyLimit || 800);
        }
        if (data.usage) setUsage(data.usage);
        if (typeof data.cacheCount === 'number') setCacheCount(data.cacheCount);
      })
      .catch((err: unknown) => {
        if (active) setError(getErrorMessage(err, 'Error cargando ajustes'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const fetchSettingsData = async () => {
    const data = await fetchSettingsPayload();
    if (data.settings) {
      setSellerName(data.settings.sellerName || '');
      setAgencyName(data.settings.agencyName || '');
      setServicesText((data.settings.servicesOffered || []).join('\n'));
      setValueProposition(data.settings.valueProposition || '');
      setDefaultTone(data.settings.defaultTone || 'cercano');
      setPlacesMonthlyLimit(data.settings.placesMonthlyLimit || 800);
    }
    if (data.usage) setUsage(data.usage);
    if (typeof data.cacheCount === 'number') setCacheCount(data.cacheCount);
  };

  const handleSave = async (e?: React.FormEvent, resetMonthlyUsage = false) => {
    e?.preventDefault();
    try {
      setSaving(true);
      setError(null);
      setFeedback(null);

      const servicesOffered = servicesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/hq/radar/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sellerName,
          agencyName,
          servicesOffered,
          valueProposition,
          defaultTone,
          placesMonthlyLimit: Number(placesMonthlyLimit) || 800,
          resetMonthlyUsage,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error guardando ajustes');

      if (data.usage) setUsage(data.usage);
      setFeedback(
        resetMonthlyUsage
          ? 'Contador mensual reiniciado y ajustes guardados.'
          : 'Perfil del vendedor y límites guardados correctamente.'
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error guardando ajustes'));
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async (mode: 'expired' | 'all') => {
    try {
      setClearingCache(true);
      setFeedback(null);
      const res = await fetch(`/api/hq/radar/settings?mode=${mode}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error limpiando caché');

      setFeedback(`Caché limpiada (${data.deletedCount} registros eliminados).`);
      await fetchSettingsData();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error limpiando caché'));
    } finally {
      setClearingCache(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b]">
      <HqHeader />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/hq/radar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Radar de Clientes</span>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-zinc-100 tracking-tight">
              Ajustes del Radar & Identidad Comercial IA
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Personaliza cómo Gemini firma tus guiones de WhatsApp, llamadas y correos, y administra la cuota mensual y caché de PostgreSQL.
            </p>
          </div>
        </div>

        {feedback && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-zinc-500 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Cargando configuración desde PostgreSQL...</span>
          </div>
        ) : (
          <form onSubmit={(e) => handleSave(e, false)} className="space-y-6">
            {/* Identidad Comercial */}
            <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
                <User className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold text-zinc-100">Perfil del Vendedor y Agencia</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Tu Nombre / Firma
                  </label>
                  <input
                    type="text"
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:border-cyan-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Nombre de Agencia
                  </label>
                  <input
                    type="text"
                    value={agencyName}
                    onChange={(e) => setAgencyName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:border-cyan-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Tono Predeterminado
                  </label>
                  <select
                    value={defaultTone}
                    onChange={(e) => setDefaultTone(e.target.value as PitchTone)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:border-cyan-500 outline-none"
                  >
                    <option value="cercano">Cercano</option>
                    <option value="formal">Formal</option>
                    <option value="persuasivo">Persuasivo</option>
                    <option value="directo">Directo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Propuesta de Valor (Contexto para Gemini)
                </label>
                <textarea
                  rows={2}
                  value={valueProposition}
                  onChange={(e) => setValueProposition(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:border-cyan-500 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Servicios Ofrecidos (uno por línea)
                </label>
                <textarea
                  rows={4}
                  value={servicesText}
                  onChange={(e) => setServicesText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 font-mono focus:border-cyan-500 outline-none"
                />
              </div>
            </div>

            {/* Cuota y Caché */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-xl space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
                  <Activity className="w-4 h-4 text-violet-400" />
                  <h2 className="text-sm font-bold text-zinc-100">Cuota Mensual Google Places</h2>
                </div>

                {usage && (
                  <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/60 text-xs flex items-center justify-between">
                    <span className="text-zinc-400">Consumo ({usage.monthYear}):</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {usage.placesCalls} / {usage.limitAlert} llamadas
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                    Límite de Alerta Mensual
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={50000}
                    value={placesMonthlyLimit}
                    onChange={(e) => setPlacesMonthlyLimit(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 font-mono focus:border-violet-500 outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleSave(undefined, true)}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-medium transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Reiniciar contador del mes a 0</span>
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-xl space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-zinc-800/60">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <h2 className="text-sm font-bold text-zinc-100">Caché Persistente (48 horas)</h2>
                </div>

                <p className="text-xs text-zinc-400 leading-relaxed">
                  Las búsquedas en Google Places se almacenan en PostgreSQL durante 48 horas para ahorrar cuota. Actualmente hay <strong className="text-zinc-100 font-mono">{cacheCount}</strong> búsquedas en caché.
                </p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={clearingCache}
                    onClick={() => handleClearCache('expired')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-200 font-medium transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Limpiar expiradas</span>
                  </button>
                  <button
                    type="button"
                    disabled={clearingCache}
                    onClick={() => handleClearCache('all')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-950/70 border border-rose-800/60 text-xs text-rose-300 font-medium transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Vaciar toda la caché</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-xs font-bold text-white shadow-lg transition-all disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Guardar Configuración del Radar</span>
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

