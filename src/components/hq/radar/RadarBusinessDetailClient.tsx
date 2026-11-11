'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Globe,
  Star,
  ExternalLink,
  MessageSquare,
  BookmarkPlus,
  CheckCircle2,
  Loader2,
  Printer,
  Calendar,
  Save,
  AlertTriangle,
} from 'lucide-react';
import { RadarAuditSection } from './RadarAuditSection';
import { RadarGeminiSection } from './RadarGeminiSection';
import { RadarPitchesSection } from './RadarPitchesSection';
import { RadarScoreBadge } from './RadarScoreBadge';
import { PageSpeedAuditResult } from '@/lib/radar/pageSpeedClient';
import { BusinessDiagnosis, CommercialPitches } from '@/lib/radar/geminiClient';
import { CommercialScoreResult } from '@/lib/radar/scoringEngine';
import { PitchTone } from '@/lib/radar/settingsService';
import { buildWhatsAppUrl } from '@/lib/radar/phoneUtils';
import { getErrorMessage } from '@/lib/hq/errorUtils';

export interface RadarDetailLeadMeta {
  id: string;
  status: 'NEW' | 'ANALYZED' | 'CONTACTED' | 'REPLIED' | 'MEETING' | 'WON' | 'LOST';
  value: number | null;
  notes: string | null;
  nextActionDate: string | null;
}

export interface RadarDetailBusinessData {
  name: string;
  niche: string;
  category?: string;
  formattedAddress: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  websiteUri?: string;
  hasOwnWebsite: boolean;
  platformType: string;
  googleMapsUri?: string;
  businessStatus?: string;
  rating?: number;
  userRatingCount?: number;
  provisionalScore: number;
}

interface RadarBusinessDetailClientProps {
  placeId: string;
  initialLead: RadarDetailLeadMeta | null;
  business: RadarDetailBusinessData;
  initialAudit: PageSpeedAuditResult | null;
  initialDiagnosis: BusinessDiagnosis | null;
  initialPitches: CommercialPitches | null;
  initialScoreResult: CommercialScoreResult;
  defaultTone?: PitchTone;
}

export function RadarBusinessDetailClient({
  placeId,
  initialLead,
  business,
  initialAudit,
  initialDiagnosis,
  initialPitches,
  initialScoreResult,
  defaultTone = 'cercano',
}: RadarBusinessDetailClientProps) {
  const router = useRouter();
  const draftStorageKey = `radar_draft_${placeId}`;

  const [leadId, setLeadId] = useState<string | undefined>(initialLead?.id);
  const [isSaved, setIsSaved] = useState<boolean>(Boolean(initialLead));
  const [status, setStatus] = useState<RadarDetailLeadMeta['status']>(initialLead?.status || 'NEW');
  const [notes, setNotes] = useState<string>(initialLead?.notes || '');
  const [nextActionDate, setNextActionDate] = useState<string>(
    initialLead?.nextActionDate ? initialLead.nextActionDate.slice(0, 10) : ''
  );

  const [audit, setAudit] = useState<PageSpeedAuditResult | null>(initialAudit);
  const [diagnosis, setDiagnosis] = useState<BusinessDiagnosis | null>(initialDiagnosis);
  const [pitches, setPitches] = useState<CommercialPitches | null>(initialPitches);
  const [scoreResult, setScoreResult] = useState<CommercialScoreResult>(initialScoreResult);

  const [isSavingLead, setIsSavingLead] = useState(false);
  const [isUpdatingCrm, setIsUpdatingCrm] = useState(false);
  const [crmFeedback, setCrmFeedback] = useState<string | null>(null);
  const hasUnsavedDraft = !isSaved && Boolean(audit || diagnosis || pitches);

  // Restaurar borrador en sesión si aún no está guardado en PostgreSQL
  useEffect(() => {
    if (isSaved) return;
    let cancelled = false;

    Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const raw = sessionStorage.getItem(draftStorageKey);
        if (!raw) return;
        const parsed = JSON.parse(raw) as {
          audit?: PageSpeedAuditResult;
          diagnosis?: BusinessDiagnosis;
          pitches?: CommercialPitches;
          scoreResult?: CommercialScoreResult;
        };
        if (parsed.audit) setAudit((prev) => prev ?? parsed.audit ?? null);
        if (parsed.diagnosis) setDiagnosis((prev) => prev ?? parsed.diagnosis ?? null);
        if (parsed.pitches) setPitches((prev) => prev ?? parsed.pitches ?? null);
        if (parsed.scoreResult) setScoreResult(parsed.scoreResult);
      } catch {
        // Ignorar borrador inválido
      }
    });

    return () => {
      cancelled = true;
    };
  }, [draftStorageKey, isSaved]);

  // Guardar borrador automático mientras el negocio no esté guardado en CRM
  useEffect(() => {
    if (isSaved) return;
    if (!audit && !diagnosis && !pitches) return;
    try {
      sessionStorage.setItem(
        draftStorageKey,
        JSON.stringify({ audit, diagnosis, pitches, scoreResult })
      );
    } catch {
      // Ignorar errores de cuota de sessionStorage (screenshots base64 grandes)
    }
  }, [audit, diagnosis, pitches, scoreResult, isSaved, draftStorageKey]);

  const handleSaveToCrm = async () => {
    try {
      setIsSavingLead(true);
      setCrmFeedback(null);

      const res = await fetch('/api/hq/radar/save-to-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId,
          name: business.name,
          niche: business.niche,
          category: business.category || business.niche,
          phone: business.phone,
          formattedAddress: business.formattedAddress,
          latitude: business.latitude,
          longitude: business.longitude,
          websiteUri: business.websiteUri,
          hasOwnWebsite: business.hasOwnWebsite,
          platformType: business.platformType,
          googleMapsUri: business.googleMapsUri,
          businessStatus: business.businessStatus,
          rating: business.rating,
          userRatingCount: business.userRatingCount,
          provisionalScore: business.provisionalScore,
          finalScore: scoreResult.totalScore,
          scoreBreakdown: scoreResult.breakdown,
          pageSpeedAudit: audit,
          aiAnalysis: diagnosis,
          pitches,
          notes: notes.trim() || undefined,
          nextActionDate: nextActionDate || undefined,
          status: diagnosis ? 'ANALYZED' : 'NEW',
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error guardando en CRM');
      }

      if (data.lead) {
        setLeadId(data.lead.id);
        setIsSaved(true);
        setStatus(data.lead.status);
        try {
          sessionStorage.removeItem(draftStorageKey);
        } catch {
          // ignore
        }
        setCrmFeedback('Prospecto y análisis guardados en Mis Leads.');
        router.refresh();
      }
    } catch (err: unknown) {
      setCrmFeedback(getErrorMessage(err, 'No se pudo guardar en CRM.'));
    } finally {
      setIsSavingLead(false);
    }
  };

  const handleUpdateCrmFollowup = async () => {
    if (!leadId) return;
    try {
      setIsUpdatingCrm(true);
      setCrmFeedback(null);

      const res = await fetch(`/api/hq/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes,
          nextActionDate: nextActionDate || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error actualizando seguimiento');
      }

      setCrmFeedback('Seguimiento actualizado en HQ.');
      router.refresh();
    } catch (err: unknown) {
      setCrmFeedback(getErrorMessage(err, 'No se pudo actualizar.'));
    } finally {
      setIsUpdatingCrm(false);
    }
  };

  const waUrl = buildWhatsAppUrl(business.phone);
  const isClosed =
    business.businessStatus === 'CLOSED_TEMPORARILY' ||
    business.businessStatus === 'CLOSED_PERMANENTLY';

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Navegación y acciones CRM */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/hq/radar"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Radar de Clientes</span>
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 text-xs font-medium text-zinc-200 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-400" />
            <span>Imprimir / PDF</span>
          </button>

          {isSaved ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>En CRM · {status}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSaveToCrm}
              disabled={isSavingLead}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-xs font-bold text-white transition-all shadow-md shadow-cyan-950/40 disabled:opacity-50"
            >
              {isSavingLead ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <BookmarkPlus className="w-3.5 h-3.5" />
              )}
              <span>{hasUnsavedDraft ? 'Guardar Análisis en Leads' : 'Guardar en Mis Leads'}</span>
            </button>
          )}
        </div>
      </div>

      {hasUnsavedDraft && !isSaved && (
        <div className="print:hidden p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Este negocio tiene auditoría/diagnóstico en sesión pero aún no está guardado en PostgreSQL.
            </span>
          </div>
          <button
            type="button"
            onClick={handleSaveToCrm}
            disabled={isSavingLead}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors"
          >
            Guardar ahora en CRM
          </button>
        </div>
      )}

      {crmFeedback && (
        <div className="print:hidden px-4 py-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/60 text-xs text-cyan-200 flex items-center justify-between">
          <span>{crmFeedback}</span>
          <button
            type="button"
            onClick={() => setCrmFeedback(null)}
            className="text-zinc-400 hover:text-white text-[11px]"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Ficha Principal del Negocio */}
      <div className="p-6 rounded-2xl bg-zinc-900/90 border border-zinc-800/80 shadow-2xl backdrop-blur-md">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold tracking-wider text-cyan-400 bg-cyan-950/50 border border-cyan-800/60 px-2.5 py-0.5 rounded-md">
                {business.niche}
              </span>
              <RadarScoreBadge score={scoreResult.totalScore} size="md" />
              {isClosed && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-950/60 border border-rose-700/60 text-rose-300">
                  Negocio Cerrado ({business.businessStatus})
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 tracking-tight">
              {business.name}
            </h1>

            <div className="flex items-start gap-2 text-xs text-zinc-400">
              <MapPin className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <span>{business.formattedAddress}</span>
            </div>
          </div>

          {/* Calificaciones y enlaces directos */}
          <div className="flex flex-col items-end gap-2 text-xs">
            {typeof business.rating === 'number' && business.rating > 0 && (
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-amber-400 font-semibold">
                <Star className="w-4 h-4 fill-amber-400" />
                <span className="text-sm">{business.rating.toFixed(1)}</span>
                <span className="text-zinc-500 font-normal">
                  ({business.userRatingCount || 0} reseñas)
                </span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-end gap-2">
              {business.phone && (
                <a
                  href={`tel:${business.phone}`}
                  className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{business.phone}</span>
                </a>
              )}

              {waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 font-semibold transition-colors flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>WhatsApp</span>
                </a>
              )}

              {business.websiteUri && (
                <a
                  href={business.websiteUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Sitio Web</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
              )}

              {business.googleMapsUri && (
                <a
                  href={business.googleMapsUri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>Google Maps</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Panel rápido de Seguimiento CRM si está guardado */}
        {isSaved && (
          <div className="print:hidden mt-5 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 grid grid-cols-1 md:grid-cols-12 gap-3 items-end text-xs">
            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Estado Pipeline
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as RadarDetailLeadMeta['status'])}
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:border-cyan-500 outline-none"
              >
                <option value="NEW">Nuevo</option>
                <option value="ANALYZED">Analizado IA</option>
                <option value="CONTACTED">Contactado</option>
                <option value="REPLIED">Respondió</option>
                <option value="MEETING">Reunión / Demo</option>
                <option value="WON">Ganado 🎉</option>
                <option value="LOST">Perdido</option>
              </select>
            </div>

            <div className="md:col-span-3">
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-cyan-400" />
                Próxima Acción
              </label>
              <input
                type="date"
                value={nextActionDate}
                onChange={(e) => setNextActionDate(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:border-cyan-500 outline-none"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                Notas de Seguimiento
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Llamar el martes a las 10am, hablar con Dra..."
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs focus:border-cyan-500 outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={handleUpdateCrmFollowup}
                disabled={isUpdatingCrm}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
              >
                {isUpdatingCrm ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>Guardar CRM</span>
              </button>
            </div>
          </div>
        )}

        {/* Desglose de Puntos de Oportunidad */}
        <div className="mt-6 pt-4 border-t border-zinc-800/60">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">
            Desglose de Oportunidad Comercial (Algoritmo B2B):
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {scoreResult.breakdown.map((f, idx) => {
              const isNegative = f.type === 'negative' || f.points < 0;
              const styleClass = isNegative
                ? 'bg-rose-950/20 border-rose-800/40 text-rose-200'
                : f.triggered && f.points > 0
                ? 'bg-amber-950/15 border-amber-800/40 text-amber-200'
                : 'bg-zinc-950/40 border-zinc-800/40 text-zinc-400';

              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-xs flex items-start justify-between gap-2 ${styleClass}`}
                >
                  <div>
                    <span className="font-semibold block">{f.factor}</span>
                    <span className="text-[11px] opacity-80">{f.description}</span>
                  </div>
                  <span className="font-mono font-bold shrink-0">
                    {f.points >= 0 ? `+${f.points}` : f.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid de 2 Columnas: Auditoría Técnica y Diagnóstico + Pitches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda: Auditoría PageSpeed */}
        <div className="space-y-6">
          <RadarAuditSection
            initialAudit={audit}
            targetUrl={business.websiteUri}
            placeId={placeId}
            leadId={leadId}
            rating={business.rating}
            userRatingCount={business.userRatingCount}
            phone={business.phone}
            formattedAddress={business.formattedAddress}
            niche={business.niche}
            businessStatus={business.businessStatus}
            aiChecklist={diagnosis?.checklist || null}
            onAuditCompleted={(newAudit, newScore) => {
              setAudit(newAudit);
              if (newScore) {
                setScoreResult(newScore);
              }
            }}
          />
        </div>

        {/* Columna Derecha: Gemini Diagnóstico y Guiones */}
        <div className="space-y-6">
          <RadarGeminiSection
            initialDiagnosis={diagnosis}
            businessName={business.name}
            niche={business.niche}
            address={business.formattedAddress}
            phone={business.phone}
            websiteUri={business.websiteUri}
            platformType={business.platformType}
            businessStatus={business.businessStatus}
            rating={business.rating}
            userRatingCount={business.userRatingCount}
            pageSpeedAudit={audit}
            placeId={placeId}
            leadId={leadId}
            onDiagnosisCompleted={(newDiagnosis, newScore) => {
              setDiagnosis(newDiagnosis);
              if (newScore) {
                setScoreResult(newScore);
              }
              if (isSaved && status === 'NEW') {
                setStatus('ANALYZED');
              }
            }}
          />

          <RadarPitchesSection
            initialPitches={pitches}
            businessName={business.name}
            niche={business.niche}
            phone={business.phone}
            diagnosis={diagnosis}
            placeId={placeId}
            leadId={leadId}
            defaultTone={defaultTone}
            onPitchesCompleted={(newPitches) => {
              setPitches(newPitches);
            }}
          />
        </div>
      </div>
    </main>
  );
}

