'use client';

import React, { useState } from 'react';
import { Gauge, Smartphone, Monitor, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { PageSpeedAuditResult } from '@/lib/radar/pageSpeedClient';
import { CommercialScoreResult, ScoreChecklistInput } from '@/lib/radar/scoringEngine';
import { getErrorMessage } from '@/lib/hq/errorUtils';

interface RadarAuditSectionProps {
  initialAudit?: PageSpeedAuditResult | null;
  targetUrl?: string;
  placeId?: string;
  leadId?: string;
  rating?: number;
  userRatingCount?: number;
  phone?: string;
  formattedAddress?: string;
  niche?: string;
  businessStatus?: string;
  aiChecklist?: ScoreChecklistInput | null;
  onAuditCompleted?: (audit: PageSpeedAuditResult, recalculatedScore?: CommercialScoreResult) => void;
}

export function RadarAuditSection({
  initialAudit,
  targetUrl,
  placeId,
  leadId,
  rating,
  userRatingCount,
  phone,
  formattedAddress,
  niche,
  businessStatus,
  aiChecklist,
  onAuditCompleted,
}: RadarAuditSectionProps) {
  const [localAudit, setLocalAudit] = useState<PageSpeedAuditResult | null>(null);
  const audit = localAudit ?? initialAudit ?? null;
  const [strategy, setStrategy] = useState<'mobile' | 'desktop'>('mobile');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunAudit = async () => {
    if (!targetUrl) return;
    try {
      setIsRunning(true);
      setError(null);

      const res = await fetch('/api/hq/radar/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          strategy,
          placeId,
          leadId,
          rating,
          userRatingCount,
          phone,
          formattedAddress,
          niche,
          businessStatus,
          aiChecklist,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al ejecutar auditoría');
      }

      setLocalAudit(data.audit);
      onAuditCompleted?.(data.audit, data.recalculatedScore);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error inesperado al auditar el sitio.'));
    } finally {
      setIsRunning(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
    if (score >= 50) return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
    return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
  };

  if (!targetUrl) {
    return (
      <div className="p-5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 text-center">
        <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2 opacity-80" />
        <h4 className="text-sm font-semibold text-zinc-200">Sin sitio web para auditar</h4>
        <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
          Este negocio no tiene un sitio web registrado. Es una oportunidad directa para ofrecerles diseño web y presencia digital propia.
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 shadow-xl space-y-4">
      {/* Header de la sección */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <Gauge className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-zinc-100">Auditoría Google PageSpeed Insights v5</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector móvil / escritorio */}
          <div className="flex items-center rounded-lg bg-zinc-950 border border-zinc-800 p-0.5 text-xs">
            <button
              onClick={() => setStrategy('mobile')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                strategy === 'mobile' ? 'bg-zinc-800 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Móvil</span>
            </button>
            <button
              onClick={() => setStrategy('desktop')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
                strategy === 'desktop' ? 'bg-zinc-800 text-cyan-300 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Escritorio</span>
            </button>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Auditando...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{audit ? 'Re-auditar' : 'Ejecutar Auditoría'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Resultados de la auditoría */}
      {audit ? (
        <div className="space-y-4">
          {/* 4 Métricas principales Lighthouse */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${getScoreColor(audit.performanceScore)}`}>
              <span className="text-2xl font-black font-mono">{audit.performanceScore}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider mt-0.5">Rendimiento</span>
            </div>

            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${getScoreColor(audit.seoScore)}`}>
              <span className="text-2xl font-black font-mono">{audit.seoScore}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider mt-0.5">SEO Técnico</span>
            </div>

            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${getScoreColor(audit.accessibilityScore)}`}>
              <span className="text-2xl font-black font-mono">{audit.accessibilityScore}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider mt-0.5">Accesibilidad</span>
            </div>

            <div className={`p-3 rounded-xl border flex flex-col items-center justify-center text-center ${getScoreColor(audit.bestPracticesScore)}`}>
              <span className="text-2xl font-black font-mono">{audit.bestPracticesScore}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider mt-0.5">Buenas Prácticas</span>
            </div>
          </div>

          {/* Core Web Vitals & Screenshot */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {/* Tiempos de carga */}
            <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 space-y-2">
              <h4 className="text-xs font-semibold text-zinc-300">Core Web Vitals ({audit.strategy})</h4>
              <div className="space-y-1.5 text-xs text-zinc-400">
                <div className="flex justify-between py-1 border-b border-zinc-800/40">
                  <span>First Contentful Paint (FCP):</span>
                  <span className="font-mono text-zinc-200">{audit.metrics.firstContentfulPaint || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/40">
                  <span>Largest Contentful Paint (LCP):</span>
                  <span className="font-mono text-zinc-200">{audit.metrics.largestContentfulPaint || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800/40">
                  <span>Total Blocking Time (TBT):</span>
                  <span className="font-mono text-zinc-200">{audit.metrics.totalBlockingTime || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Cumulative Layout Shift (CLS):</span>
                  <span className="font-mono text-zinc-200">{audit.metrics.cumulativeLayoutShift || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Captura de pantalla real de Lighthouse */}
            <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 flex flex-col justify-center items-center text-center">
              <h4 className="text-xs font-semibold text-zinc-300 mb-2">Captura Visual Renderizada</h4>
              {audit.screenshotBase64 ? (
                <div className="relative rounded-lg overflow-hidden border border-zinc-800 max-h-48 shadow-md">
                  <img
                    src={audit.screenshotBase64}
                    alt="Vista previa del sitio web"
                    className="w-full h-auto object-cover max-h-48"
                  />
                </div>
              ) : (
                <div className="text-xs text-zinc-500 italic py-6">
                  Captura no disponible en esta prueba
                </div>
              )}
            </div>
          </div>

          <div className="text-[11px] text-zinc-500 text-right">
            Última auditoría: {new Date(audit.auditedAt).toLocaleString()}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-zinc-400 text-xs">
          Haz clic en <span className="text-cyan-400 font-semibold">&quot;Ejecutar Auditoría&quot;</span> para analizar el rendimiento móvil, SEO y tiempos de carga de {targetUrl}.
        </div>
      )}
    </div>
  );
}

