import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Building2, Phone, Calendar } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { WebChatWidget } from '@/components/channels/WebChatWidget';

export default async function DemoPage() {
  let business = null;
  let channelWeb = null;
  try {
    [business, channelWeb] = await Promise.all([
      prisma.businessProfile.findFirst(),
      prisma.channelConfig.findUnique({ where: { type: 'WEB' } }),
    ]);

    // Garantizar que exista configuración por defecto si la BD no se ha sembrado
    if (!channelWeb) {
      try {
        channelWeb = await prisma.channelConfig.create({
          data: {
            type: 'WEB',
            webChatEnabled: true,
            webChatColor: '#6366f1',
            webChatTitle: 'Asistente danIAutoma',
            webChatWelcome: '¡Hola! 👋 Soy el asistente virtual de danIAutoma. ¿Te gustaría conocer cómo automatizar la atención y citas de tu negocio con IA o agendar una llamada de diagnóstico gratuito?',
          },
        });
      } catch {}
    }
  } catch {}

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col relative">
      {/* Barra de cabecera de la demo */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm sm:text-base shadow-xs shrink-0">
            d
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-stone-900 text-xs sm:text-sm truncate">{business?.name || 'danIAutoma'}</h1>
            <p className="text-[10px] sm:text-[11px] text-stone-500 truncate">{business?.activity || 'Agencia de Automatización con IA y Desarrollo Web'}</p>
          </div>
        </div>

        <Link
          href="/"
          className="flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Volver al Panel</span>
          <span className="sm:hidden">Panel</span>
        </Link>
      </nav>

      {/* Hero de demostración del sitio web con widget integrado */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:p-8 flex flex-col justify-center items-center text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] sm:text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Demostración del Asistente Web en Vivo
        </span>

        <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight max-w-2xl px-2">
          Automatiza la atención y captura clientes 24/7 con IA en El Salvador
        </h2>

        <p className="mt-3 sm:mt-4 text-stone-600 text-xs sm:text-sm max-w-xl leading-relaxed px-2">
          Prueba el widget de chat interactivo de danIAutoma en la esquina inferior. Resuelve dudas sobre implementación de IA, automatización con n8n y agenda una llamada de diagnóstico estratégico en tiempo real.
        </p>

        <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-2xl text-left">
          <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <Calendar className="w-5 h-5 text-indigo-600 mb-2" />
            <h3 className="font-bold text-xs text-stone-900">Diagnóstico Gratis</h3>
            <p className="text-[11px] text-stone-500 mt-1">Sesión 1 a 1 de 30 minutos para analizar tu negocio.</p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <Phone className="w-5 h-5 text-indigo-600 mb-2" />
            <h3 className="font-bold text-xs text-stone-900">WhatsApp Oficial</h3>
            <p className="text-[11px] text-stone-500 mt-1">{business?.phone || '+503 7000 0000'}</p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <Building2 className="w-5 h-5 text-indigo-600 mb-2" />
            <h3 className="font-bold text-xs text-stone-900">Ubicación</h3>
            <p className="text-[11px] text-stone-500 mt-1">{business?.address || 'San Salvador, El Salvador (Atención Digital y Consultoría Remota)'}</p>
          </div>
        </div>
      </main>

      {/* Widget Interactivo Real del Chat Web */}
      {(channelWeb ? channelWeb.webChatEnabled : true) && (
        <WebChatWidget
          color={channelWeb?.webChatColor || '#6366f1'}
          title={channelWeb?.webChatTitle || 'Asistente danIAutoma'}
          welcomeMessage={channelWeb?.webChatWelcome || '¡Hola! 👋 Soy el asistente virtual de danIAutoma. ¿Te gustaría conocer cómo automatizar la atención y citas de tu negocio con IA o agendar una llamada de diagnóstico gratuito?'}
        />
      )}
    </div>
  );
}
