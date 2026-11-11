'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ArrowLeft,
  Sparkles,
  Trophy,
  Loader2,
  Compass,
  Plus,
  AlertTriangle,
  Database,
  X,
} from 'lucide-react';
import { EL_SALVADOR_DEPARTMENTS, RADAR_NICHES } from '@/lib/radar/elSalvadorGeo';
import { NicheComparisonResult } from '@/lib/radar/geminiClient';
import { HqHeader } from '@/components/hq/HqHeader';
import { getErrorMessage } from '@/lib/hq/errorUtils';

export default function RadarNichesPage() {
  const [department, setDepartment] = useState('San Salvador');
  const [municipality, setMunicipality] = useState('San Salvador Centro');
  const [customNicheInput, setCustomNicheInput] = useState('');
  const [selectedNiches, setSelectedNiches] = useState<string[]>([
    'Clínicas Dentales y Odontología',
    'Médicos Especialistas y Clínicas',
    'Clínicas de Estética y Dermatología',
    'Bufetes de Abogados y Notarías',
    'Talleres Mecánicos y Electromecánica',
  ]);
  const [empiricalMode, setEmpiricalMode] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [usageInfo, setUsageInfo] = useState<{ placesCalls: number; limitAlert: number } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [comparison, setComparison] = useState<NicheComparisonResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentDeptObj = EL_SALVADOR_DEPARTMENTS.find((d) => d.name === department);
  const availableMunicipalities = currentDeptObj?.municipalities || [];
  const effectiveMunicipality =
    !municipality || availableMunicipalities.includes(municipality)
      ? municipality
      : availableMunicipalities[0] || '';

  const handleDepartmentChange = (nextDeptName: string) => {
    setDepartment(nextDeptName);
    const nextMunicipalities =
      EL_SALVADOR_DEPARTMENTS.find((d) => d.name === nextDeptName)?.municipalities || [];
    if (
      municipality &&
      nextMunicipalities.length > 0 &&
      !nextMunicipalities.includes(municipality)
    ) {
      setMunicipality(nextMunicipalities[0]);
    }
  };

  const toggleNiche = (nicheName: string) => {
    setSelectedNiches((prev) =>
      prev.includes(nicheName)
        ? prev.filter((n) => n !== nicheName)
        : prev.length < 6
        ? [...prev, nicheName]
        : prev
    );
  };

  const handleAddCustomNiche = () => {
    const trimmed = customNicheInput.trim();
    if (!trimmed) return;
    if (!selectedNiches.includes(trimmed) && selectedNiches.length < 6) {
      setSelectedNiches((prev) => [...prev, trimmed]);
    }
    setCustomNicheInput('');
  };

  const handleRequestAnalyze = async () => {
    if (selectedNiches.length < 2) {
      setError('Selecciona al menos 2 sectores para realizar la comparativa.');
      return;
    }

    if (empiricalMode) {
      try {
        const res = await fetch('/api/hq/radar/usage');
        const data = await res.json();
        if (!data.error) {
          setUsageInfo({ placesCalls: data.placesCalls, limitAlert: data.limitAlert });
        }
      } catch {
        // continuar mostrando modal
      }
      setShowConfirmModal(true);
    } else {
      executeAnalysis(false);
    }
  };

  const executeAnalysis = async (useEmpirical: boolean) => {
    setShowConfirmModal(false);
    try {
      setIsLoading(true);
      setError(null);

      const zone = `${effectiveMunicipality || department}, ${department}`;
      const res = await fetch('/api/hq/radar/gemini/niches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zone,
          department,
          municipality: effectiveMunicipality,
          niches: selectedNiches,
          empirical: useEmpirical,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al analizar nichos.');
      }

      setComparison(data.comparison);
      if (typeof data.usageCount === 'number' && typeof data.usageLimit === 'number') {
        setUsageInfo({ placesCalls: data.usageCount, limitAlert: data.usageLimit });
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error inesperado al analizar nichos.'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b]">
      <HqHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/hq/radar"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-cyan-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al Radar de Clientes</span>
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 text-violet-400">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-black text-zinc-100 tracking-tight">
                Radar de Nichos & Mercado Empírico
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Escanea Google Places por sector en El Salvador para medir % real sin web y demanda, y rankea las mejores oportunidades con Gemini.
            </p>
          </div>
        </div>

        {/* Panel de Configuración */}
        <div className="p-5 rounded-xl bg-zinc-900/90 border border-zinc-800/80 shadow-xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Departamento
              </label>
              <select
                value={department}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
              >
                {EL_SALVADOR_DEPARTMENTS.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Municipio / Zona
              </label>
              <select
                value={effectiveMunicipality}
                onChange={(e) => setMunicipality(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:outline-none focus:border-violet-500"
              >
                <option value="">Todo el departamento</option>
                {availableMunicipalities.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Agregar sector personalizado
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={customNicheInput}
                  onChange={(e) => setCustomNicheInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomNiche();
                    }
                  }}
                  placeholder="Ej: Ópticas, Laboratorios..."
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 focus:outline-none focus:border-violet-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomNiche}
                  disabled={!customNicheInput.trim() || selectedNiches.length >= 6}
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Selector de nichos (máximo 6) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Sectores Seleccionados ({selectedNiches.length} / 6):
              </label>
              <span className="text-[11px] text-zinc-500">Selecciona entre 2 y 6 para comparar</span>
            </div>

            <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
              {[...new Set([...selectedNiches, ...RADAR_NICHES.flatMap((c) => c.items)])].map(
                (nicheItem) => {
                  const isSelected = selectedNiches.includes(nicheItem);
                  return (
                    <button
                      key={nicheItem}
                      type="button"
                      onClick={() => toggleNiche(nicheItem)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-violet-600 text-white font-semibold shadow-sm'
                          : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                      }`}
                    >
                      {isSelected ? `✓ ${nicheItem}` : nicheItem}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={empiricalMode}
                onChange={(e) => setEmpiricalMode(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-violet-500 focus:ring-violet-500"
              />
              <span>
                <strong>Escanear negocios reales en Google Places</strong> antes de rankear con Gemini (aprovecha caché de 48h)
              </span>
            </label>

            <button
              onClick={handleRequestAnalyze}
              disabled={isLoading || selectedNiches.length < 2}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-violet-950/40"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Escaneando y analizando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {empiricalMode
                      ? `Escanear y Rankear ${selectedNiches.length} Nichos`
                      : 'Comparar solo con IA (0 Places)'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Resultados */}
        {comparison && (
          <div className="space-y-5">
            {/* Tarjeta del Ganador */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-950/40 via-zinc-900/90 to-cyan-950/40 border border-violet-800/60 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Trophy className="w-4 h-4" />
                  <span>Nicho Ganador en {comparison.zone}</span>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                    comparison.isEmpirical
                      ? 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                  }`}
                >
                  <Database className="w-3 h-3" />
                  {comparison.isEmpirical ? 'Basado en Datos Reales Places API' : 'Estimación IA'}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-zinc-100">
                {comparison.winnerNiche}
              </h2>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                {comparison.strategicInsight}
              </p>
            </div>

            {/* Tarjetas por nicho */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {comparison.niches.map((n, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-xl border shadow-md flex flex-col justify-between space-y-3 ${
                    idx < 3
                      ? 'bg-zinc-900/90 border-violet-700/50'
                      : 'bg-zinc-900/70 border-zinc-800/80'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        {idx < 3 && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">
                            Top #{idx + 1} Oportunidad
                          </span>
                        )}
                        <h3 className="text-sm font-bold text-zinc-100">{n.niche}</h3>
                      </div>
                      <span className="font-mono text-xs font-black text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-2 py-0.5 rounded-full shrink-0">
                        {n.priorityScore} pts
                      </span>
                    </div>

                    {n.empirical && (
                      <div className="grid grid-cols-2 gap-1.5 p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80 text-[11px]">
                        <div>
                          <span className="text-zinc-500 block">Sin Web Propia</span>
                          <span className="font-mono font-bold text-rose-400">
                            {n.empirical.noWebsitePct}% ({n.empirical.noWebsiteCount + n.empirical.socialOnlyCount}/{n.empirical.totalFound})
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Promedio Google</span>
                          <span className="font-mono font-bold text-amber-300">
                            {n.empirical.avgRating}★ · {n.empirical.avgReviews} res.
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Con Teléfono</span>
                          <span className="font-mono font-semibold text-emerald-400">
                            {n.empirical.withPhonePct}%
                          </span>
                        </div>
                        <div>
                          <span className="text-zinc-500 block">Origen Datos</span>
                          <span className="font-semibold text-cyan-300">
                            {n.empirical.fromCache ? 'Caché 48h' : 'Places En Vivo'}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5 text-xs text-zinc-400">
                      <div className="flex justify-between py-1 border-b border-zinc-800/40">
                        <span>Madurez / Saturación:</span>
                        <span className="font-medium text-zinc-200">
                          {n.digitalMaturity} / {n.saturationLevel}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-zinc-800/40">
                        <span>Ticket Promedio (USD):</span>
                        <span className="font-semibold text-emerald-400">{n.averageTicketUsd}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 text-[11px] text-zinc-300">
                      <strong className="text-violet-400 block mb-0.5">Ángulo recomendado:</strong>
                      {n.recommendedPitch}
                    </div>
                  </div>

                  <Link
                    href={`/hq/radar?${new URLSearchParams({
                      department,
                      municipality: effectiveMunicipality,
                      niche: n.niche,
                      autoSearch: '1',
                    }).toString()}`}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-600/80 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Prospectar este nicho en Radar</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Modal de Confirmación de Cuota Places */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-700/50 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Confirmar Escaneo de Mercado</h3>
                  <p className="text-[11px] text-zinc-400">Google Places API + Gemini 2.5</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="text-zinc-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-300 space-y-2">
              <p>
                Se analizarán <strong className="text-white">{selectedNiches.length} sectores</strong> en{' '}
                <strong className="text-cyan-300">{municipality || department}</strong>.
              </p>
              <p className="text-zinc-400">
                Consumo máximo estimado: <strong className="text-amber-300">hasta {selectedNiches.length} llamadas</strong> a Places API (las combinaciones ya consultadas en las últimas 48h saldrán de caché sin consumir cuota).
              </p>
              {usageInfo && (
                <p className="text-[11px] font-mono text-zinc-400 pt-1 border-t border-zinc-800">
                  Uso actual del mes: {usageInfo.placesCalls} / {usageInfo.limitAlert}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300 font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => executeAnalysis(true)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-xs font-bold text-white"
              >
                Confirmar y Escanear
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
