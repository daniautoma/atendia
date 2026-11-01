'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import {
  Activity,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ChevronDown,
  Layers,
  Wrench,
  Radio,
  RefreshCw,
} from 'lucide-react';

export default function ActividadPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelFilter, setChannelFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/activity?channel=${channelFilter}&status=${statusFilter}`);
      const data = await res.json();
      if (data.logs) {
        setLogs(data.logs);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 4000);
    return () => clearInterval(interval);
  }, [channelFilter, statusFilter]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-50">
      <Header
        title="Registro de Actividad"
        subtitle="Auditoría en tiempo real de cada decisión, llamada a herramientas, webhooks y eventos del sistema"
        actions={
          <button
            onClick={fetchLogs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-stone-500" />
            <span>Refrescar</span>
          </button>
        }
      />

      <div className="flex-1 flex flex-col p-4 sm:p-8 overflow-hidden max-w-6xl space-y-4">
        {/* Barra de Filtros */}
        <div className="p-4 bg-white rounded-2xl border border-stone-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-stone-400" />
            <span className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Filtros:
            </span>

            {/* Canal */}
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-800 bg-white"
            >
              <option value="ALL">Todos los canales</option>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="WEB">Chat Web</option>
            </select>

            {/* Resultado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-stone-200 text-xs text-stone-800 bg-white"
            >
              <option value="ALL">Todos los resultados</option>
              <option value="INFO">Informativo (INFO)</option>
              <option value="SUCCESS">Éxito (SUCCESS)</option>
              <option value="WARNING">Avisos (WARNING)</option>
              <option value="ERROR">Errores (ERROR)</option>
            </select>
          </div>

          <span className="text-xs text-stone-400 font-mono">
            {logs.length} eventos registrados
          </span>
        </div>

        {/* Tabla de Auditoría */}
        <div className="flex-1 bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="overflow-y-auto flex-1 divide-y divide-stone-100">
            {logs.length === 0 ? (
              <div className="text-center py-16 text-stone-400 text-xs">
                No hay registros con los filtros seleccionados.
              </div>
            ) : (
              logs.map((log) => {
                const isSuccess = log.status === 'SUCCESS';
                const isError = log.status === 'ERROR';
                const isWarning = log.status === 'WARNING';

                return (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                    className="p-4 hover:bg-stone-50/80 transition-colors cursor-pointer space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isSuccess
                              ? 'bg-emerald-500 ring-2 ring-emerald-200'
                              : isError
                              ? 'bg-rose-500 ring-2 ring-rose-200'
                              : isWarning
                              ? 'bg-amber-500 ring-2 ring-amber-200'
                              : 'bg-teal-500 ring-2 ring-teal-200'
                          }`}
                        />

                        <span className="font-mono text-xs font-bold text-stone-900">
                          {log.action}
                        </span>

                        {log.channel && (
                          <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-[10px] font-semibold">
                            {log.channel}
                          </span>
                        )}

                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isError
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : isWarning
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-stone-100 text-stone-600 border-stone-200'
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>

                      <span className="text-[11px] text-stone-400 font-mono">
                        {new Date(log.createdAt).toLocaleTimeString('es-SV', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          timeZone: 'America/El_Salvador',
                        })}
                      </span>
                    </div>

                    {/* Detalle del evento si está expandido */}
                    {selectedLog?.id === log.id && (
                      <div className="mt-3 p-3.5 bg-stone-900 text-stone-200 rounded-xl text-xs font-mono space-y-2">
                        <div className="flex justify-between text-stone-400 text-[10px]">
                          <span>ID: {log.id}</span>
                          <span>Fecha: {new Date(log.createdAt).toISOString()}</span>
                        </div>
                        {log.error && (
                          <p className="text-rose-400 font-semibold">Error: {log.error}</p>
                        )}
                        {log.details && (
                          <pre className="overflow-x-auto text-[11px]">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
