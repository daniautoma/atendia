'use client';

import React, { useState } from 'react';
import {
  Bot,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Target,
  Loader2,
  ShieldCheck,
  XCircle,
  Globe,
  Mail,
  Share2,
} from 'lucide-react';
import { BusinessDiagnosis } from '@/lib/radar/geminiClient';
import { PageSpeedAuditResult } from '@/lib/radar/pageSpeedClient';
import { CommercialScoreResult } from '@/lib/radar/scoringEngine';
import { getErrorMessage } from '@/lib/hq/errorUtils';

interface RadarGeminiSectionProps {
  initialDiagnosis?: BusinessDiagnosis | null;
  businessName: string;
  niche: string;
  address?: string;
  phone?: string;
  websiteUri?: string;
  platformType?: string;
  businessStatus?: string;
  rating?: number;
  userRatingCount?: number;
  pageSpeedAudit?: PageSpeedAuditResult | null;
  placeId?: string;
  leadId?: string;
  onDiagnosisCompleted?: (
    diagnosis: BusinessDiagnosis,
    recalculatedScore?: CommercialScoreResult
  ) => void;
}

export function RadarGeminiSection({
  initialDiagnosis,
  businessName,
  niche,
  address,
  phone,
  websiteUri,
  platformType,
  businessStatus,
  rating,
  userRatingCount,
  pageSpeedAudit,
  placeId,
  leadId,
  onDiagnosisCompleted,
}: RadarGeminiSectionProps) {
  const [localDiagnosis, setLocalDiagnosis] = useState<BusinessDiagnosis | null>(null);
  const diagnosis = localDiagnosis ?? initialDiagnosis ?? null;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDiagnose = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/hq/radar/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          niche,
          address,
          phone,
          websiteUri,
          platformType,
          businessStatus,
          rating,
          userRatingCount,
          pageSpeedAudit: pageSpeedAudit
            ? {
                performanceScore: pageSpeedAudit.performanceScore,
                seoScore: pageSpeedAudit.seoScore,
                accessibilityScore: pageSpeedAudit.accessibilityScore,
              }
            : undefined,
          placeId,
          leadId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al generar diagnóstico con Gemini');
      }

      setLocalDiagnosis(data.diagnosis);
      onDiagnosisCompleted?.(data.diagnosis, data.recalculatedScore);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error inesperado al conectar con Gemini.'));
    } finally {
      setIsLoading(false);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    if (urgency === 'ALTA') {
      return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
    }
    if (urgency === 'MEDIA') {
      return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    }
    return 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30';
  };

  const checklist = diagnosis?.checklist;

  return (
    <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-violet-400" />
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Diagnóstico Inteligente (Gemini 2.5 Flash)</h3>
            {checklist?.inspectedWithUrlContext && (
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                <Globe className="w-3 h-3" />
                Inspección HTML en vivo (UrlContext)
              </span>
            )}
          </div>
        </div>

        <button
          onClick={handleDiagnose}
          disabled={isLoading}
          className="print:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-md shadow-violet-950/30"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analizando con IA...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{diagnosis ? 'Reanalizar con Gemini' : 'Generar Diagnóstico'}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
          {error}
        </div>
      )}

      {diagnosis ? (
        <div className="space-y-4 text-xs">
          {/* Resumen ejecutivo y urgencia */}
          <div className="p-3.5 rounded-lg bg-zinc-950/70 border border-zinc-800/60">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Resumen Ejecutivo
              </span>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${getUrgencyBadge(diagnosis.urgency)}`}>
                Urgencia: {diagnosis.urgency}
              </span>
            </div>
            <p className="text-zinc-200 leading-relaxed text-sm">{diagnosis.summary}</p>
          </div>

          {/* Checklist técnico web (urlContext) */}
          {checklist && (
            <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Checklist Técnico de Conversión
                </h4>
                {checklist.copyrightYear && (
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Copyright: {checklist.copyrightYear}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                {[
                  { label: 'Certificado HTTPS', ok: checklist.hasHttps },
                  { label: 'Diseño Responsive', ok: checklist.isMobileResponsive },
                  { label: 'Botón WhatsApp', ok: checklist.hasWhatsAppButton },
                  { label: 'Citas / Reserva Online', ok: checklist.hasOnlineBooking },
                  { label: 'Formulario de Contacto', ok: checklist.hasContactForm },
                  { label: 'Copyright Actualizado', ok: !checklist.hasOutdatedCopyright },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border ${
                      item.ok
                        ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                        : 'bg-rose-950/20 border-rose-900/40 text-rose-300'
                    }`}
                  >
                    {item.ok ? (
                      <CheckCircle className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                    )}
                    <span className="truncate font-medium">{item.label}</span>
                  </div>
                ))}
              </div>

              {(Boolean(checklist.emailsFound?.length) || Boolean(checklist.socialLinksFound?.length)) && (
                <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap gap-3 text-[11px] text-zinc-400">
                  {checklist.emailsFound && checklist.emailsFound.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span className="font-mono text-zinc-200">
                        {checklist.emailsFound.join(', ')}
                      </span>
                    </div>
                  )}
                  {checklist.socialLinksFound && checklist.socialLinksFound.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Share2 className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                      {checklist.socialLinksFound.slice(0, 3).map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-violet-300 hover:underline truncate max-w-[180px]"
                        >
                          {link.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Debilidades detectadas */}
          <div>
            <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Debilidades Comerciales & Técnicas
            </h4>
            <div className="grid grid-cols-1 gap-1.5">
              {diagnosis.weaknesses.map((w, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 p-2 rounded-lg bg-rose-950/20 border border-rose-900/40 text-rose-200"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Servicios recomendados */}
          <div>
            <h4 className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
              Soluciones Recomendadas
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {diagnosis.recommendedServices.map((service, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-800/40 text-cyan-200 font-medium flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{service}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Ángulo de venta clave */}
          <div className="p-3.5 rounded-lg bg-gradient-to-r from-violet-950/30 to-zinc-950/60 border border-violet-800/40">
            <div className="flex items-center gap-1.5 text-violet-300 font-semibold mb-1">
              <Target className="w-3.5 h-3.5" />
              <span>Ángulo de Cierre Estratégico</span>
            </div>
            <p className="text-zinc-300 leading-relaxed">{diagnosis.sellingAngle}</p>
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-zinc-400 text-xs">
          Haz clic en <span className="text-violet-400 font-semibold">&quot;Generar Diagnóstico&quot;</span> para que Gemini evalúe la web en vivo, checklist técnico y mejores servicios a ofrecerle en El Salvador.
        </div>
      )}
    </div>
  );
}
