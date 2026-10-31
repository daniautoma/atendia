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
      <nav className="bg-white border-b border-stone-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
            S
          </div>
          <div>
            <h1 className="font-bold text-stone-900 text-sm">{business?.name || 'Clínica Dental San Salvador'}</h1>
            <p className="text-[11px] text-stone-500">{business?.activity || 'Odontología integral en San Salvador'}</p>
          </div>
        </div>

        <Link
          href="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al Panel</span>
        </Link>
      </nav>

      {/* Hero de demostración del sitio web del cliente */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-8 flex flex-col justify-center items-center text-center">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          Página web simulada del negocio local
        </span>

        <h2 className="text-3xl sm:text-4xl font-extrabold text-stone-900 tracking-tight max-w-2xl">
          Tu sonrisa en las mejores manos en San Salvador
        </h2>

        <p className="mt-4 text-stone-600 text-sm max-w-xl leading-relaxed">
          Esta es la página pública donde se integra el widget de chat de Atendia. Los pacientes pueden consultar dudas clínicas, horarios y reservar citas en tiempo real.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl text-left">
          <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <Calendar className="w-5 h-5 text-teal-600 mb-2" />
            <h3 className="font-bold text-xs text-stone-900">Cita Online</h3>
            <p className="text-[11px] text-stone-500 mt-1">Primera visita y diagnóstico digital 3D gratuito.</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs">
            <Phone className="w-5 h-5 text-teal-600 mb-2" />
            <h3 className="font-bold text-xs text-stone-900">Atención Directa</h3>
            <p className="text-[11px] text-stone-500 mt-1">{business?.phone || '+503 2200 1234'}</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-stone-200 shadow-2xs">
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
