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
            webChatColor: '#0d9488',
            webChatTitle: 'Atención Clínica Dental San Salvador',
            webChatWelcome: '¡Hola! ¿Tienes alguna pregunta sobre nuestros tratamientos o deseas pedir cita?',
          },
        });
      } catch {}
    }
  } catch {}

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col relative">
      {/* Barra de cabecera de la clínica demo */}
      <nav className="bg-white border-b border-stone-200 px-4 py-3 sm:px-6 sm:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-sm sm:text-base shadow-xs shrink-0">
            S
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-stone-900 text-xs sm:text-sm truncate">{business?.name || 'Clínica Dental San Salvador'}</h1>
            <p className="text-[10px] sm:text-[11px] text-stone-500 truncate">{business?.activity || 'Odontología integral en San Salvador'}</p>
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

      {/* Hero de demostración del sitio web del cliente */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:p-8 flex flex-col justify-center items-center text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-[11px] sm:text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Página web simulada del negocio local
        </span>

        <h2 className="text-2xl sm:text-4xl font-extrabold text-stone-900 tracking-tight max-w-2xl px-2">
          Tu sonrisa en las mejores manos en San Salvador
        </h2>

        <p className="mt-3 sm:mt-4 text-stone-600 text-xs sm:text-sm max-w-xl leading-relaxed px-2">
          Esta es la página pública donde se integra el widget de chat de Atendia. Los pacientes pueden consultar dudas clínicas, horarios y reservar citas en tiempo real.
        </p>

        <div className="mt-6 sm:mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 w-full max-w-2xl text-left">
          <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <Calendar className="w-5 h-5 text-teal-600 mb-2" />
            <h3 className="font-bold text-xs text-stone-900">Cita Online</h3>
            <p className="text-[11px] text-stone-500 mt-1">Primera visita y diagnóstico digital 3D gratuito.</p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <Phone className="w-5 h-5 text-teal-600 mb-2" />
            <h3 className="font-bold text-xs text-stone-900">Atención Directa</h3>
            <p className="text-[11px] text-stone-500 mt-1">{business?.phone || '+503 2200 1234'}</p>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <Building2 className="w-5 h-5 text-teal-600 mb-2" />
            <h3 className="font-bold text-xs text-stone-900">Ubicación</h3>
            <p className="text-[11px] text-stone-500 mt-1">{business?.address || 'Paseo General Escalón #3700, San Salvador'}</p>
          </div>
        </div>
      </main>

      {/* Widget Interactivo Real del Chat Web */}
      {(channelWeb ? channelWeb.webChatEnabled : true) && (
        <WebChatWidget
          color={channelWeb?.webChatColor || '#0d9488'}
          title={channelWeb?.webChatTitle || 'Atención Clínica Dental San Salvador'}
          welcomeMessage={channelWeb?.webChatWelcome || '¡Hola! ¿Tienes alguna pregunta sobre nuestros tratamientos o deseas pedir cita?'}
        />
      )}
    </div>
  );
}
