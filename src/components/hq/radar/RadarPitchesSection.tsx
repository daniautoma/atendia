'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  PhoneCall,
  Mail,
  Copy,
  Check,
  Send,
  Loader2,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { CommercialPitches, BusinessDiagnosis } from '@/lib/radar/geminiClient';
import { PitchTone } from '@/lib/radar/settingsService';
import { buildWhatsAppUrl } from '@/lib/radar/phoneUtils';
import { getErrorMessage } from '@/lib/hq/errorUtils';

interface RadarPitchesSectionProps {
  initialPitches?: CommercialPitches | null;
  businessName: string;
  niche: string;
  phone?: string;
  contactPerson?: string;
  diagnosis: BusinessDiagnosis | null;
  placeId?: string;
  leadId?: string;
  defaultTone?: PitchTone;
  onPitchesCompleted?: (pitches: CommercialPitches) => void;
}

export function RadarPitchesSection({
  initialPitches,
  businessName,
  niche,
  phone,
  contactPerson,
  diagnosis,
  placeId,
  leadId,
  defaultTone = 'cercano',
  onPitchesCompleted,
}: RadarPitchesSectionProps) {
  const [localPitches, setLocalPitches] = useState<CommercialPitches | null>(null);
  const pitches = localPitches ?? initialPitches ?? null;
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'phone' | 'email'>('whatsapp');
  const [tone, setTone] = useState<PitchTone>(initialPitches?.tone || defaultTone);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePitches = async () => {
    if (!diagnosis) {
      setError('Debes generar primero el diagnóstico inteligente antes de redactar los guiones comerciales.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await fetch('/api/hq/radar/gemini/pitches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          niche,
          phone,
          contactPerson,
          diagnosis,
          tone,
          placeId,
          leadId,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Error al redactar guiones comerciales');
      }

      setLocalPitches(data.pitches);
      onPitchesCompleted?.(data.pitches);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error inesperado generando guiones con Gemini.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, tabKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(tabKey);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const waUrl = pitches?.whatsAppMessage ? buildWhatsAppUrl(phone, pitches.whatsAppMessage) : null;

  return (
    <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800/60">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-zinc-100">Guiones Comerciales para El Salvador</h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Selector de tono */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value as PitchTone)}
              className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 focus:outline-none"
            >
              <option value="cercano">Tono Cercano</option>
              <option value="formal">Tono Formal</option>
              <option value="persuasivo">Tono Persuasivo</option>
              <option value="directo">Tono Directo</option>
            </select>
          </div>

          <button
            onClick={handleGeneratePitches}
            disabled={isLoading || !diagnosis}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-950/30"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Redactando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{pitches ? 'Regenerar Guiones' : 'Generar Guiones con IA'}</span>
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

      {pitches ? (
        <div className="space-y-3">
          {/* Pestañas de canales */}
          <div className="flex border-b border-zinc-800 text-xs">
            <button
              onClick={() => setActiveTab('whatsapp')}
              className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'whatsapp'
                  ? 'border-emerald-400 text-emerald-300 font-semibold bg-emerald-950/20'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Mensaje WhatsApp</span>
            </button>
            <button
              onClick={() => setActiveTab('phone')}
              className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'phone'
                  ? 'border-cyan-400 text-cyan-300 font-semibold bg-cyan-950/20'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Llamada en Frío (30 seg)</span>
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`flex items-center gap-1.5 px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === 'email'
                  ? 'border-violet-400 text-violet-300 font-semibold bg-violet-950/20'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Correo Comercial</span>
            </button>
          </div>

          {/* Contenido de la pestaña activa */}
          <div className="relative p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/70 text-xs text-zinc-200">
            {activeTab === 'whatsapp' && (
              <div className="space-y-3">
                <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-200 bg-emerald-950/15 p-3 rounded-lg border border-emerald-900/30">
                  {pitches.whatsAppMessage}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-zinc-500">
                    Optimizado para respuesta rápida en WhatsApp Business
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(pitches.whatsAppMessage, 'wa')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                      {copiedTab === 'wa' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </button>

                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Abrir en WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'phone' && (
              <div className="space-y-3">
                <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-zinc-200 bg-cyan-950/15 p-3 rounded-lg border border-cyan-900/30">
                  {pitches.phoneScript30s}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-zinc-500">
                    Duración estimada: ~30 segundos (meta: agendar demo o reunión)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy(pitches.phoneScript30s, 'phone')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                    >
                      {copiedTab === 'phone' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Guion</span>
                        </>
                      )}
                    </button>

                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 transition-colors shadow-sm"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Llamar {phone}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="space-y-3">
                <div className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-zinc-200 bg-violet-950/15 p-3 rounded-lg border border-violet-900/30">
                  {pitches.emailMessage}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-[11px] text-zinc-500">
                    Estructura: Gancho + Dolor detectado + Solución danIAutoma + CTA
                  </span>
                  <button
                    onClick={() => handleCopy(pitches.emailMessage, 'email')}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors ml-auto"
                  >
                    {copiedTab === 'email' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Correo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center text-zinc-400 text-xs">
          Genera primero el diagnóstico de Gemini para desbloquear la redacción automática de guiones para WhatsApp, llamadas de 30 segundos y correos comerciales.
        </div>
      )}
    </div>
  );
}

