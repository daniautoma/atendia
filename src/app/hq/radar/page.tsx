'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Compass,
  TrendingUp,
  LayoutGrid,
  Table2,
  BookmarkPlus,
  Sparkles,
  Loader2,
  RefreshCw,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  MessageSquare,
} from 'lucide-react';
import { RadarBusiness } from '@/lib/radar/placesClient';
import { buildWhatsAppUrl } from '@/lib/radar/phoneUtils';
import { getErrorMessage } from '@/lib/hq/errorUtils';
import { RadarSearchBar } from '@/components/hq/radar/RadarSearchBar';
import { RadarBusinessCard } from '@/components/hq/radar/RadarBusinessCard';
import { RadarScoreBadge } from '@/components/hq/radar/RadarScoreBadge';
import { RadarUsageIndicator } from '@/components/hq/radar/RadarUsageIndicator';
import { HqHeader } from '@/components/hq/HqHeader';

function RadarPageContent() {
  const urlSearchParams = useSearchParams();
  const initialDept = urlSearchParams.get('department') || 'San Salvador';
  const initialMun = urlSearchParams.get('municipality') || 'San Salvador Centro';
  const initialNiche = urlSearchParams.get('niche') || 'Clínicas Dentales y Odontología';
  const initialQ = urlSearchParams.get('q') || '';
  const shouldAutoSearch = urlSearchParams.get('autoSearch') === '1';

  const [businesses, setBusinesses] = useState<RadarBusiness[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [overrideUsage, setOverrideUsage] = useState<{ placesCalls: number; limitAlert: number } | null>(null);

  const [searchParams, setSearchParams] = useState({
    department: initialDept,
    municipality: initialMun,
    niche: initialNiche,
    q: initialQ,
  });

  // Vista y selección en lote
  const [viewMode, setViewMode] = useState<'CARDS' | 'TABLE'>('CARDS');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchAnalyzing, setBatchAnalyzing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{
    current: number;
    total: number;
    label: string;
  } | null>(null);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  // 5 Filtros avanzados de prospección
  const [filterScore, setFilterScore] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'>('ALL');
  const [filterWeb, setFilterWeb] = useState<'ALL' | 'NO_WEB' | 'OWN_WEB' | 'SOCIAL'>('ALL');
  const [filterHasPhone, setFilterHasPhone] = useState(false);
  const [filterMinRating, setFilterMinRating] = useState(0);
  const [filterMinReviews, setFilterMinReviews] = useState(0);
  const [filterHideClosed, setFilterHideClosed] = useState(true);

  const autoSearchedRef = useRef(false);

  const executeSearch = async (
    params: { department: string; municipality: string; niche: string; q: string },
    options?: { pageToken?: string; append?: boolean; forceRefresh?: boolean }
  ) => {
    const isAppending = Boolean(options?.append && options?.pageToken);
    try {
      if (isAppending) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setSelectedIds(new Set());
        setBatchMessage(null);
      }
      setError(null);
      setSearchParams(params);

      const queryParams = new URLSearchParams({
        department: params.department,
        municipality: params.municipality,
        niche: params.niche,
      });

      if (params.q) queryParams.append('q', params.q);
      if (options?.pageToken) queryParams.append('pageToken', options.pageToken);
      if (options?.forceRefresh) queryParams.append('forceRefresh', '1');

      const res = await fetch(`/api/hq/radar/search?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al buscar en Radar.');
      }

      const incoming: RadarBusiness[] = data.businesses || [];
      if (isAppending) {
        setBusinesses((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueIncoming = incoming.filter((b) => !existingIds.has(b.id));
          return [...prev, ...uniqueIncoming].slice(0, 60);
        });
      } else {
        setBusinesses(incoming);
      }

      setNextPageToken(data.nextPageToken || undefined);
      setFromCache(!!data.fromCache);
      if (typeof data.usageCount === 'number' && typeof data.usageLimit === 'number') {
        setOverrideUsage({ placesCalls: data.usageCount, limitAlert: data.usageLimit });
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error inesperado al conectar con el Radar.'));
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    if (shouldAutoSearch && !autoSearchedRef.current) {
      autoSearchedRef.current = true;
      executeSearch({
        department: initialDept,
        municipality: initialMun,
        niche: initialNiche,
        q: initialQ,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldAutoSearch]);

  // Filtrado reactivo en el cliente
  const filteredBusinesses = businesses.filter((b) => {
    if (filterHideClosed && (b.businessStatus === 'CLOSED_TEMPORARILY' || b.businessStatus === 'CLOSED_PERMANENTLY')) {
      return false;
    }

    if (filterScore === 'CRITICAL' && b.provisionalScore < 75) return false;
    if (filterScore === 'HIGH' && (b.provisionalScore < 50 || b.provisionalScore >= 75)) return false;
    if (filterScore === 'MODERATE' && (b.provisionalScore < 30 || b.provisionalScore >= 50)) return false;
    if (filterScore === 'LOW' && b.provisionalScore >= 30) return false;

    if (filterWeb === 'NO_WEB' && b.platformType !== 'none') return false;
    if (filterWeb === 'OWN_WEB' && !b.hasOwnWebsite) return false;
    if (
      filterWeb === 'SOCIAL' &&
      b.platformType !== 'social' &&
      b.platformType !== 'directory' &&
      b.platformType !== 'linkhub'
    ) {
      return false;
    }

    if (filterHasPhone && !b.phone) return false;
    if (filterMinRating > 0 && (b.rating || 0) < filterMinRating) return false;
    if (filterMinReviews > 0 && (b.userRatingCount || 0) < filterMinReviews) return false;

    return true;
  });

  const toggleSelect = (placeId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) {
        next.delete(placeId);
      } else {
        next.add(placeId);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    if (filteredBusinesses.length === 0) return;
    const allSelected = filteredBusinesses.every((b) => selectedIds.has(b.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBusinesses.map((b) => b.id)));
    }
  };

  const handleBatchSave = async () => {
    const targets = businesses.filter((b) => selectedIds.has(b.id));
    if (targets.length === 0) return;

    try {
      setBatchSaving(true);
      setBatchMessage(null);
      const res = await fetch('/api/hq/radar/save-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businesses: targets }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error guardando lote.');

      interface SavedLeadBatchItem {
        id: string;
        placeId?: string | null;
        status: string;
      }

      const leadsList = (data.leads || []) as SavedLeadBatchItem[];
      const leadByPlace = new Map<string, SavedLeadBatchItem>(
        leadsList.filter((l) => Boolean(l.placeId)).map((l) => [l.placeId as string, l])
      );

      setBusinesses((prev) =>
        prev.map((b) => {
          const matched = leadByPlace.get(b.id);
          if (!matched) return b;
          return {
            ...b,
            isSavedToCrm: true,
            savedLeadId: matched.id,
            savedLeadStatus: matched.status,
          };
        })
      );
      setSelectedIds(new Set());
      setBatchMessage(`${data.savedCount} negocio(s) guardados en Mis Leads.`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error en guardado múltiple.'));
    } finally {
      setBatchSaving(false);
    }
  };

  const handleBatchAnalyze = async () => {
    const targets = businesses.filter((b) => selectedIds.has(b.id));
    if (targets.length === 0) return;

    setBatchAnalyzing(true);
    setBatchMessage(null);
    let completed = 0;
    const total = targets.length;
    setBatchProgress({ current: 0, total, label: 'Iniciando análisis en lote...' });

    // Concurrencia controlada de 2 negocios a la vez
    const queue = [...targets];
    const worker = async () => {
      while (queue.length > 0) {
        const b = queue.shift();
        if (!b) break;

        setBatchProgress({
          current: completed,
          total,
          label: `Analizando: ${b.name}`,
        });

        try {
          // 1. Asegurar guardado en CRM para persistir análisis y score
          let leadId = b.savedLeadId;
          if (!b.isSavedToCrm || !leadId) {
            const saveRes = await fetch('/api/hq/radar/save-to-crm', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                placeId: b.id,
                name: b.name,
                niche: b.category || searchParams.niche,
                phone: b.phone,
                formattedAddress: b.formattedAddress,
                latitude: b.latitude,
                longitude: b.longitude,
                websiteUri: b.websiteUri,
                hasOwnWebsite: b.hasOwnWebsite,
                platformType: b.platformType,
                businessStatus: b.businessStatus,
                rating: b.rating,
                userRatingCount: b.userRatingCount,
                category: b.category,
                googleMapsUri: b.googleMapsUri,
                provisionalScore: b.provisionalScore,
                finalScore: b.provisionalScore,
                scoreBreakdown: b.scoreBreakdown,
                status: 'NEW',
              }),
            });
            const saveData = await saveRes.json();
            leadId = saveData.lead?.id;
          }

          // 2. Si tiene web propia, correr PageSpeed Insights
          let auditData = undefined;
          if (b.hasOwnWebsite && b.websiteUri) {
            try {
              const psiRes = await fetch('/api/hq/radar/audit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  url: b.websiteUri,
                  strategy: 'mobile',
                  placeId: b.id,
                  leadId,
                }),
              });
              const psiJson = await psiRes.json();
              if (psiRes.ok && psiJson.audit) {
                auditData = psiJson.audit;
              }
            } catch {
              // continuar con Gemini aunque PageSpeed falle
            }
          }

          // 3. Diagnóstico Gemini + recalculo final
          const gemRes = await fetch('/api/hq/radar/gemini/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessName: b.name,
              niche: b.category || searchParams.niche,
              address: b.formattedAddress,
              phone: b.phone,
              websiteUri: b.websiteUri,
              platformType: b.platformType,
              businessStatus: b.businessStatus,
              rating: b.rating,
              userRatingCount: b.userRatingCount,
              pageSpeedAudit: auditData
                ? {
                    performanceScore: auditData.performanceScore,
                    seoScore: auditData.seoScore,
                    accessibilityScore: auditData.accessibilityScore,
                  }
                : undefined,
              placeId: b.id,
              leadId,
            }),
          });
          const gemData = await gemRes.json();

          setBusinesses((prev) =>
            prev.map((item) => {
              if (item.id !== b.id) return item;
              return {
                ...item,
                isSavedToCrm: true,
                savedLeadId: gemData.lead?.id || leadId || item.savedLeadId,
                savedLeadStatus: gemData.lead?.status || 'ANALYZED',
                provisionalScore: gemData.recalculatedScore?.totalScore ?? item.provisionalScore,
                scoreLevel: gemData.recalculatedScore?.level ?? item.scoreLevel,
                scoreBreakdown: gemData.recalculatedScore?.breakdown ?? item.scoreBreakdown,
              };
            })
          );
        } catch (err) {
          console.error(`Error analizando en lote ${b.name}:`, err);
        } finally {
          completed++;
          setBatchProgress({
            current: completed,
            total,
            label: completed === total ? 'Análisis completado' : `Completados ${completed} de ${total}`,
          });
        }
      }
    };

    await Promise.all([worker(), worker()]);
    setBatchAnalyzing(false);
    setSelectedIds(new Set());
    setBatchMessage(`Análisis en lote finalizado: ${completed} negocio(s) diagnosticados y guardados en Mis Leads.`);
    setTimeout(() => setBatchProgress(null), 1500);
  };

  const criticalCount = businesses.filter((b) => b.provisionalScore >= 75).length;
  const noWebCount = businesses.filter((b) => b.platformType === 'none').length;
  const savedCount = businesses.filter((b) => b.isSavedToCrm).length;

  return (
    <div className="min-h-screen bg-[#09090b]">
      <HqHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Encabezado de la página */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-cyan-500/30 text-cyan-400">
                <Compass className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-black text-zinc-100 tracking-tight">
                Radar de Clientes & Prospección Local
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Localiza negocios en El Salvador, audita su presencia digital y conviértelos en prospectos con guiones de IA.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <RadarUsageIndicator overrideUsage={overrideUsage} />

            <Link
              href="/hq/radar/niches"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-violet-300 bg-violet-950/40 hover:bg-violet-950/70 border border-violet-800/60 transition-colors shadow-sm"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Radar de Nichos</span>
            </Link>

            <Link
              href="/hq/radar/settings"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ajustes</span>
            </Link>
          </div>
        </div>

        {/* Barra de Búsqueda */}
        <RadarSearchBar
          onSearch={(p) => executeSearch(p)}
          isLoading={isLoading}
          initialParams={{
            department: initialDept,
            municipality: initialMun,
            niche: initialNiche,
            q: initialQ,
          }}
        />

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-xs text-rose-200">
            <strong>Error de búsqueda:</strong> {error}
          </div>
        )}

        {batchMessage && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between">
            <span>{batchMessage}</span>
            <button
              type="button"
              onClick={() => setBatchMessage(null)}
              className="text-zinc-400 hover:text-white text-[11px]"
            >
              Cerrar
            </button>
          </div>
        )}

        {/* Progreso de análisis en lote */}
        {batchProgress && (
          <div className="p-4 rounded-xl bg-zinc-900/90 border border-violet-700/50 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-violet-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                {batchProgress.label}
              </span>
              <span className="font-mono text-zinc-300">
                {batchProgress.current} / {batchProgress.total}
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-300"
                style={{
                  width: `${Math.round((batchProgress.current / Math.max(1, batchProgress.total)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Resultados de Búsqueda */}
        {businesses.length > 0 && (
          <div className="space-y-4">
            {/* Métricas rápidas y toggle vista */}
            <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/70 text-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-semibold text-zinc-200">
                    {businesses.length} negocios encontrados
                    {fromCache && (
                      <span className="ml-1.5 text-[11px] text-cyan-400 font-normal">(Caché 48h)</span>
                    )}
                  </span>
                  {fromCache && (
                    <button
                      type="button"
                      onClick={() => executeSearch(searchParams, { forceRefresh: true })}
                      disabled={isLoading}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition-colors"
                      title="Consultar Google Places en vivo omitiendo caché"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Refrescar</span>
                    </button>
                  )}
                  <span className="text-zinc-700">|</span>
                  <span className="text-rose-400 font-medium">🔥 {criticalCount} Críticos</span>
                  <span className="text-amber-400 font-medium">🌐 {noWebCount} Sin web</span>
                  <span className="text-emerald-400 font-medium">✅ {savedCount} En Leads</span>
                </div>

                {/* Controles Vista Dual & Selección */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 hover:text-white transition-colors"
                  >
                    {filteredBusinesses.length > 0 &&
                    filteredBusinesses.every((b) => selectedIds.has(b.id))
                      ? 'Deseleccionar visibles'
                      : `Seleccionar visibles (${filteredBusinesses.length})`}
                  </button>

                  <div className="flex items-center rounded-lg bg-zinc-950 border border-zinc-800 p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode('CARDS')}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                        viewMode === 'CARDS'
                          ? 'bg-zinc-800 text-cyan-300'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                      <span>Tarjetas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('TABLE')}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                        viewMode === 'TABLE'
                          ? 'bg-zinc-800 text-cyan-300'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Table2 className="w-3.5 h-3.5" />
                      <span>Tabla</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Barra de 5 Filtros + Ocultar cerrados */}
              <div className="pt-2.5 border-t border-zinc-800/60 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-zinc-500 text-[11px]">Score:</span>
                  <select
                    value={filterScore}
                    onChange={(e) =>
                      setFilterScore(
                        e.target.value as 'ALL' | 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW'
                      )
                    }
                    className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 focus:outline-none"
                  >
                    <option value="ALL">Todos</option>
                    <option value="CRITICAL">Críticos (75-100)</option>
                    <option value="HIGH">Altos (50-74)</option>
                    <option value="MODERATE">Medios (30-49)</option>
                    <option value="LOW">Bajos (&lt;30)</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-zinc-500 text-[11px]">Web:</span>
                  <select
                    value={filterWeb}
                    onChange={(e) =>
                      setFilterWeb(
                        e.target.value as 'ALL' | 'NO_WEB' | 'OWN_WEB' | 'SOCIAL'
                      )
                    }
                    className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 focus:outline-none"
                  >
                    <option value="ALL">Todas</option>
                    <option value="NO_WEB">Sin sitio web</option>
                    <option value="OWN_WEB">Sitio propio</option>
                    <option value="SOCIAL">Solo redes / directorios</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-zinc-500 text-[11px]">Rating mín:</span>
                  <select
                    value={filterMinRating}
                    onChange={(e) => setFilterMinRating(Number(e.target.value))}
                    className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 focus:outline-none"
                  >
                    <option value={0}>Cualquiera</option>
                    <option value={3.5}>3.5★ o más</option>
                    <option value={4.0}>4.0★ o más</option>
                    <option value={4.5}>4.5★ o más</option>
                  </select>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-zinc-500 text-[11px]">Reseñas mín:</span>
                  <select
                    value={filterMinReviews}
                    onChange={(e) => setFilterMinReviews(Number(e.target.value))}
                    className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 focus:outline-none"
                  >
                    <option value={0}>Todas</option>
                    <option value={5}>5+ reseñas</option>
                    <option value={15}>15+ reseñas</option>
                    <option value={30}>30+ reseñas</option>
                  </select>
                </div>

                <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterHasPhone}
                    onChange={(e) => setFilterHasPhone(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-950 text-cyan-500"
                  />
                  <span>Solo con teléfono</span>
                </label>

                <label className="inline-flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterHideClosed}
                    onChange={(e) => setFilterHideClosed(e.target.checked)}
                    className="rounded border-zinc-700 bg-zinc-950 text-cyan-500"
                  />
                  <span>Ocultar cerrados</span>
                </label>
              </div>
            </div>

            {/* Barra flotante de acciones en lote */}
            {selectedIds.size > 0 && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-cyan-950/60 via-zinc-900 to-violet-950/60 border border-cyan-500/40 flex flex-wrap items-center justify-between gap-3 text-xs sticky top-20 z-30 backdrop-blur-md shadow-xl">
                <span className="font-bold text-cyan-200">
                  {selectedIds.size} negocio(s) seleccionados
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleBatchSave}
                    disabled={batchSaving || batchAnalyzing}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-white font-semibold disabled:opacity-50 transition-colors"
                  >
                    {batchSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <BookmarkPlus className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    <span>Guardar en Leads ({selectedIds.size})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleBatchAnalyze}
                    disabled={batchSaving || batchAnalyzing}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white font-bold disabled:opacity-50 transition-all shadow-md"
                  >
                    {batchAnalyzing ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>Auditar & Diagnosticar IA ({selectedIds.size})</span>
                  </button>
                </div>
              </div>
            )}

            {/* Vista Tarjetas vs Vista Tabla */}
            {viewMode === 'CARDS' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBusinesses.map((b) => (
                  <RadarBusinessCard
                    key={b.id}
                    business={b}
                    isSelected={selectedIds.has(b.id)}
                    onToggleSelect={toggleSelect}
                    onSavedToCrm={(updated) => {
                      setBusinesses((prev) =>
                        prev.map((item) => (item.id === updated.id ? updated : item))
                      );
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl bg-zinc-900/80 border border-zinc-800 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] border-b border-zinc-800">
                    <tr>
                      <th className="py-2.5 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={
                            filteredBusinesses.length > 0 &&
                            filteredBusinesses.every((b) => selectedIds.has(b.id))
                          }
                          onChange={selectAllFiltered}
                          className="rounded border-zinc-700 bg-zinc-950"
                        />
                      </th>
                      <th className="py-2.5 px-3">Negocio</th>
                      <th className="py-2.5 px-3">Score</th>
                      <th className="py-2.5 px-3">Web / Plataforma</th>
                      <th className="py-2.5 px-3">Google Maps</th>
                      <th className="py-2.5 px-3">Teléfono</th>
                      <th className="py-2.5 px-3 text-right">Ficha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {filteredBusinesses.map((b) => {
                      const waUrl = buildWhatsAppUrl(b.phone);
                      const detailHref = `/hq/radar/${encodeURIComponent(b.id)}?${new URLSearchParams({
                        name: b.name || '',
                        niche: b.category || '',
                        address: b.formattedAddress || '',
                        phone: b.phone || '',
                        website: b.websiteUri || '',
                        platformType: b.platformType || '',
                        googleMapsUri: b.googleMapsUri || '',
                        businessStatus: b.businessStatus || '',
                        rating: String(b.rating || 0),
                        reviews: String(b.userRatingCount || 0),
                        score: String(b.provisionalScore || 0),
                      }).toString()}`;

                      return (
                        <tr key={b.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="py-2.5 px-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(b.id)}
                              onChange={() => toggleSelect(b.id)}
                              className="rounded border-zinc-700 bg-zinc-950"
                            />
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="font-bold text-zinc-100">{b.name}</p>
                            <p className="text-[11px] text-zinc-500 line-clamp-1">{b.formattedAddress}</p>
                          </td>
                          <td className="py-2.5 px-3">
                            <RadarScoreBadge score={b.provisionalScore} showLabel={false} size="sm" />
                          </td>
                          <td className="py-2.5 px-3">
                            {b.hasOwnWebsite ? (
                              <a
                                href={b.websiteUri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                              >
                                <span>{b.platformName || 'Sitio propio'}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            ) : b.websiteUri ? (
                              <span className="text-amber-400">{b.platformName || 'Red social'}</span>
                            ) : (
                              <span className="text-rose-400 font-medium">Sin sitio web</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-amber-300">
                            {b.rating ? `${b.rating.toFixed(1)}★ (${b.userRatingCount || 0})` : 'Sin reseñas'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px]">
                            {b.phone ? (
                              <div className="flex items-center gap-1.5">
                                <span className="text-zinc-200">{b.phone}</span>
                                {waUrl && (
                                  <a
                                    href={waUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-400 hover:text-emerald-300"
                                    title="WhatsApp"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-zinc-500">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              {b.isSavedToCrm && (
                                <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3" />
                                  {b.savedLeadStatus}
                                </span>
                              )}
                              <Link
                                href={detailHref}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-600/80 hover:bg-cyan-500 text-white text-[11px] font-semibold"
                              >
                                <span>Auditar</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredBusinesses.length === 0 && (
              <div className="py-12 text-center text-zinc-400 text-xs rounded-xl bg-zinc-900/40 border border-zinc-800/50">
                No hay negocios que coincidan con los filtros seleccionados.
              </div>
            )}

            {/* Paginación Google Places nextPageToken (hasta 60) */}
            {nextPageToken && businesses.length < 60 && (
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  disabled={isLoadingMore}
                  onClick={() =>
                    executeSearch(searchParams, { pageToken: nextPageToken, append: true })
                  }
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-cyan-300 transition-colors disabled:opacity-50 shadow-md"
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Cargando siguiente página...</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4" />
                      <span>Cargar más resultados ({businesses.length} / máx. 60)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Estado inicial sin búsquedas */}
        {businesses.length === 0 && !isLoading && !error && (
          <div className="py-16 text-center rounded-2xl bg-zinc-900/40 border border-dashed border-zinc-800/80 p-8 space-y-3">
            <div className="w-12 h-12 rounded-full bg-cyan-950/40 border border-cyan-800/50 text-cyan-400 flex items-center justify-center mx-auto">
              <Compass className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-zinc-200">
              Explora y localiza clientes de alto valor en El Salvador
            </h3>
            <p className="text-xs text-zinc-400 max-w-md mx-auto leading-relaxed">
              Selecciona un departamento, municipio y nicho comercial en la barra superior y pulsa <strong>&quot;Escanear Negocios&quot;</strong> para descubrir oportunidades comerciales con Google Places y Gemini.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function RadarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#09090b] flex items-center justify-center text-xs text-zinc-500">
          Cargando Radar de Clientes...
        </div>
      }
    >
      <RadarPageContent />
    </Suspense>
  );
}
