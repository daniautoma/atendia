'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import Link from 'next/link';
import {
  MessageSquare,
  CalendarCheck2,
  UserCheck,
  Zap,
  Share2,
  Globe,
  Blocks,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function ResumenPage() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/summary')
      .then((res) => res.json())
      .then((json) => {
        if (!json.error) setData(json);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
      </div>
    );
  }

  const metrics = data?.metrics || {
    conversationsToday: 1,
    conversationsWeek: 1,
    appointmentsCount: 0,
    waitingHumanCount: 0,
    avgResponseTimeSec: 2.8,
  };

  const channels = data?.channels || {
    whatsapp: { provider: 'BAILEYS', status: 'DISCONNECTED' },
    web: { enabled: true },
  };

  const integrations = data?.integrations || [];

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-50">
      <Header
        title="Resumen General"
        subtitle="Métricas de atención en tiempo real, canales activos y estado de integraciones"
      />

      <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-6xl">
        {/* 1. Métricas Principales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Conversaciones Hoy
              </span>
              <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                <MessageSquare className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-stone-900 mt-3">{metrics.conversationsToday}</p>
            <p className="text-xs text-stone-400 mt-1">
              Esta semana: <b>{metrics.conversationsWeek}</b> en total
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Citas Asistente
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <CalendarCheck2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-stone-900 mt-3">{metrics.appointmentsCount}</p>
            <p className="text-xs text-stone-400 mt-1">Agendadas automáticamente</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Esperan a Humano
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  metrics.waitingHumanCount > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-stone-100 text-stone-600'
                }`}
              >
                <UserCheck className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-stone-900 mt-3">{metrics.waitingHumanCount}</p>
            <p className="text-xs text-stone-400 mt-1">Requieren atención del equipo</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Tiempo de Respuesta
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <p className="text-3xl font-bold text-stone-900 mt-3">{metrics.avgResponseTimeSec}s</p>
            <p className="text-xs text-stone-400 mt-1">Con debounce y razonamiento</p>
          </div>
        </div>

        {/* 2. Estado de Canales e Integraciones */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Canales */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-900">Estado de Canales</h3>
              <Link
                href="/canales"
                className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1"
              >
                <span>Configurar</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {/* WhatsApp */}
              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    WA
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900">
                      WhatsApp ({channels.whatsapp.provider === 'BAILEYS' ? 'Baileys QR' : 'YCloud API'})
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {channels.whatsapp.phoneNumber || 'Sin número vinculado todavía'}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                    channels.whatsapp.status === 'CONNECTED'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {channels.whatsapp.status === 'CONNECTED' ? 'Conectado' : 'Desconectado'}
                </span>
              </div>

              {/* Chat Web */}
              <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                    <Globe className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-stone-900">Chat para tu Web</p>
                    <p className="text-[11px] text-stone-500">Widget flotante disponible en /demo</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] px-2.5 py-1 rounded-full font-semibold ${
                    channels.web.enabled
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-stone-200 text-stone-600'
                  }`}
                >
                  {channels.web.enabled ? 'Activo' : 'Desactivado'}
                </span>
              </div>
            </div>
          </div>

          {/* Integraciones */}
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="text-sm font-bold text-stone-900">Integraciones Conectadas</h3>
              <Link
                href="/integraciones"
                className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1"
              >
                <span>Catálogo completo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {integrations.map((intg: any) => (
                <div
                  key={intg.provider}
                  className="p-2.5 rounded-lg border border-stone-200 bg-white flex items-center justify-between text-xs"
                >
                  <span className="font-medium text-stone-800 truncate">{intg.name}</span>
                  {intg.enabled ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <span className="text-[10px] text-stone-400">Sin conectar</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Próximas Citas Confirmadas */}
        <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <CalendarCheck2 className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-stone-900">Citas Agendadas por el Asistente</h3>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold">
              {data?.appointments?.length || 0} cita(s) registrada(s)
            </span>
          </div>

          {(!data?.appointments || data.appointments.length === 0) ? (
            <div className="text-center py-8 text-stone-400 text-xs">
              No hay citas agendadas todavía. Cuando un paciente reserve por WhatsApp o Web, aparecerá aquí.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-100 text-stone-400 font-medium">
                    <th className="pb-2">Paciente</th>
                    <th className="pb-2">Tratamiento</th>
                    <th className="pb-2">Fecha y Hora</th>
                    <th className="pb-2">Teléfono</th>
                    <th className="pb-2">Estado</th>
                    <th className="pb-2 text-right">Google Calendar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {data.appointments.map((a: any) => (
                    <tr key={a.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3 font-bold text-stone-900">{a.contactName || 'Paciente'}</td>
                      <td className="py-3 text-stone-700">{a.serviceName}</td>
                      <td className="py-3 text-stone-600 font-mono">
                        {new Date(a.startTime).toLocaleDateString('es-ES', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Europe/Madrid',
                        })}
                      </td>
                      <td className="py-3 text-stone-500 font-mono">{a.contactPhone || '—'}</td>
                      <td className="py-3">
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                          Confirmada
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/appointments', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ appointmentId: a.id, action: 'SYNC_CALENDAR' }),
                              });
                              const json = await res.json();
                              if (json.success) {
                                alert('✓ Cita sincronizada con éxito en tu Google Calendar');
                              } else {
                                alert('Error al sincronizar: ' + (json.error || 'Verifica que Google Calendar esté conectado'));
                              }
                            } catch (e: any) {
                              alert('Error de red: ' + e.message);
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-semibold cursor-pointer border border-teal-200"
                        >
                          Sincronizar a Calendar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 4. Últimas Acciones del Asistente */}
        <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <h3 className="text-sm font-bold text-stone-900">Últimas Acciones del Asistente</h3>
            <Link
              href="/actividad"
              className="text-xs text-teal-700 hover:text-teal-800 font-semibold flex items-center gap-1"
            >
              <span>Ver registro completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {(!data?.recentLogs || data.recentLogs.length === 0) ? (
            <div className="text-center py-8 text-stone-400 text-xs">
              No hay acciones registradas aún. Puedes probar el asistente en la pestaña «Probar».
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {data.recentLogs.map((log: any) => (
                <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        log.status === 'SUCCESS'
                          ? 'bg-emerald-500'
                          : log.status === 'ERROR'
                          ? 'bg-rose-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    <span className="font-mono text-stone-700 font-medium">{log.action}</span>
                    {log.channel && (
                      <span className="bg-stone-100 text-stone-600 px-1.5 py-0.5 rounded text-[10px]">
                        {log.channel}
                      </span>
                    )}
                  </div>
                  <span className="text-stone-400 text-[11px]">
                    {new Date(log.createdAt).toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

