'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Phone,
  Globe,
  ExternalLink,
  Star,
  CheckCircle2,
  BookmarkPlus,
  Loader2,
  ArrowRight,
  MessageSquare,
} from 'lucide-react';
import { RadarBusiness } from '@/lib/radar/placesClient';
import { buildWhatsAppUrl } from '@/lib/radar/phoneUtils';
import { RadarScoreBadge } from './RadarScoreBadge';

interface RadarBusinessCardProps {
  business: RadarBusiness;
  onSavedToCrm?: (updatedBusiness: RadarBusiness) => void;
  isSelected?: boolean;
  onToggleSelect?: (placeId: string) => void;
}

export function RadarBusinessCard({
  business,
  onSavedToCrm,
  isSelected = false,
  onToggleSelect,
}: RadarBusinessCardProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [localSavedState, setLocalSavedState] = useState<{
    placeId: string;
    savedLeadId?: string;
    savedLeadStatus?: string;
  } | null>(null);

  const currentBusiness: RadarBusiness =
    !business.isSavedToCrm && localSavedState?.placeId === business.id
      ? {
          ...business,
          isSavedToCrm: true,
          savedLeadId: localSavedState.savedLeadId,
          savedLeadStatus: localSavedState.savedLeadStatus,
        }
      : business;

  const handleSaveToCrm = async () => {
    try {
      setIsSaving(true);
      const res = await fetch('/api/hq/radar/save-to-crm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          placeId: currentBusiness.id,
          name: currentBusiness.name,
          niche: currentBusiness.category || 'Prospecto Radar',
          phone: currentBusiness.phone,
          formattedAddress: currentBusiness.formattedAddress,
          latitude: currentBusiness.latitude,
          longitude: currentBusiness.longitude,
          websiteUri: currentBusiness.websiteUri,
          hasOwnWebsite: currentBusiness.hasOwnWebsite,
          platformType: currentBusiness.platformType,
          businessStatus: currentBusiness.businessStatus,
          rating: currentBusiness.rating,
          userRatingCount: currentBusiness.userRatingCount,
          category: currentBusiness.category,
          googleMapsUri: currentBusiness.googleMapsUri,
          provisionalScore: currentBusiness.provisionalScore,
          finalScore: currentBusiness.provisionalScore,
          scoreBreakdown: currentBusiness.scoreBreakdown,
          status: 'NEW',
        }),
      });

      const data = await res.json();
      if (data.lead) {
        const updated = {
          ...currentBusiness,
          isSavedToCrm: true,
          savedLeadId: data.lead.id,
          savedLeadStatus: data.lead.status,
        };
        setLocalSavedState({
          placeId: currentBusiness.id,
          savedLeadId: data.lead.id,
          savedLeadStatus: data.lead.status,
        });
        onSavedToCrm?.(updated);
      }
    } catch (err) {
      console.error('Error guardando en CRM:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const waUrl = buildWhatsAppUrl(currentBusiness.phone);
  const isClosed =
    currentBusiness.businessStatus === 'CLOSED_TEMPORARILY' ||
    currentBusiness.businessStatus === 'CLOSED_PERMANENTLY';

  const detailHref = `/hq/radar/${encodeURIComponent(currentBusiness.id)}?${new URLSearchParams({
    name: currentBusiness.name || '',
    niche: currentBusiness.category || '',
    address: currentBusiness.formattedAddress || '',
    phone: currentBusiness.phone || '',
    website: currentBusiness.websiteUri || '',
    platformType: currentBusiness.platformType || '',
    googleMapsUri: currentBusiness.googleMapsUri || '',
    businessStatus: currentBusiness.businessStatus || '',
    rating: String(currentBusiness.rating || 0),
    reviews: String(currentBusiness.userRatingCount || 0),
    score: String(currentBusiness.provisionalScore || 0),
  }).toString()}`;

  return (
    <div
      className={`flex flex-col justify-between p-4 rounded-xl bg-zinc-900/80 border transition-all duration-200 shadow-lg hover:shadow-cyan-950/20 group ${
        isSelected
          ? 'border-cyan-500/80 ring-1 ring-cyan-500/40 bg-cyan-950/10'
          : 'border-zinc-800/80 hover:border-zinc-700/80'
      }`}
    >
      <div>
        {/* Cabecera de la tarjeta: Checkbox selección, Nicho y Score */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {onToggleSelect && (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(currentBusiness.id)}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-cyan-500 focus:ring-cyan-500 cursor-pointer shrink-0"
                title="Seleccionar negocio para acciones en lote"
              />
            )}
            <span className="text-[11px] font-semibold tracking-wider text-cyan-400 bg-cyan-950/40 border border-cyan-800/50 px-2 py-0.5 rounded-md truncate max-w-[180px]">
              {currentBusiness.category || 'Negocio Local'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isClosed && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-950/60 border border-rose-700/60 text-rose-300">
                Cerrado
              </span>
            )}
            <RadarScoreBadge score={currentBusiness.provisionalScore} size="sm" />
          </div>
        </div>

        {/* Nombre del negocio */}
        <h3 className="text-base font-bold text-zinc-100 group-hover:text-cyan-300 transition-colors line-clamp-1 mb-1">
          {currentBusiness.name}
        </h3>

        {/* Dirección */}
        <div className="flex items-start gap-1.5 text-xs text-zinc-400 mb-2">
          <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
          <span className="line-clamp-2 leading-relaxed">{currentBusiness.formattedAddress}</span>
        </div>

        {/* Calificación y reseñas */}
        <div className="flex items-center gap-2 mb-3 text-xs">
          {typeof currentBusiness.rating === 'number' && currentBusiness.rating > 0 ? (
            <div className="flex items-center gap-1 text-amber-400 font-medium">
              <Star className="w-3.5 h-3.5 fill-amber-400" />
              <span>{currentBusiness.rating.toFixed(1)}</span>
              <span className="text-zinc-500">({currentBusiness.userRatingCount || 0} reseñas)</span>
            </div>
          ) : (
            <span className="text-zinc-500 italic text-[11px]">Sin calificaciones en Google</span>
          )}

          {currentBusiness.googleMapsUri && (
            <a
              href={currentBusiness.googleMapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-400 hover:text-cyan-400 flex items-center gap-1 transition-colors"
            >
              <span>Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        {/* Estado Web y Presencia Digital */}
        <div className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60 mb-3 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-1">
            <span className="text-zinc-500 text-[11px]">Presencia Web:</span>
            {currentBusiness.hasOwnWebsite ? (
              <a
                href={currentBusiness.websiteUri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1 truncate max-w-[180px]"
              >
                <Globe className="w-3 h-3 shrink-0" />
                <span className="truncate">{currentBusiness.platformName || 'Sitio Propio'}</span>
                <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
              </a>
            ) : currentBusiness.websiteUri ? (
              <span className="text-amber-400 flex items-center gap-1 truncate max-w-[180px]">
                <Globe className="w-3 h-3 shrink-0" />
                <span className="truncate">{currentBusiness.platformName || 'Red Social'}</span>
              </span>
            ) : (
              <span className="text-rose-400 font-medium text-[11px]">⚠️ Sin sitio web registrado</span>
            )}
          </div>

          {currentBusiness.phone && (
            <div className="flex items-center justify-between gap-1 pt-1 border-t border-zinc-800/40">
              <span className="text-zinc-500 text-[11px]">Teléfono:</span>
              <div className="flex items-center gap-2">
                <a
                  href={`tel:${currentBusiness.phone}`}
                  className="text-zinc-200 hover:text-cyan-400 font-mono text-[11px] flex items-center gap-1"
                >
                  <Phone className="w-3 h-3 text-cyan-400" />
                  <span>{currentBusiness.phone}</span>
                </a>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors"
                    title="Enviar WhatsApp directo"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botones de acción */}
      <div className="pt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
        {currentBusiness.isSavedToCrm ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px]">En Leads ({currentBusiness.savedLeadStatus || 'NEW'})</span>
          </div>
        ) : (
          <button
            onClick={handleSaveToCrm}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 transition-colors disabled:opacity-50"
            title="Guardar en el CRM de danIAutoma"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <BookmarkPlus className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>Guardar en Leads</span>
          </button>
        )}

        <Link
          href={detailHref}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-cyan-600/80 hover:bg-cyan-500 border border-cyan-500/50 transition-colors shadow-sm ml-auto"
        >
          <span>Auditar & Pitches</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

