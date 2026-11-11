'use client';

import React from 'react';
import {
  Briefcase,
  Clock,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface HqMetricsProps {
  stats: {
    totalLeads: number;
    totalTasks: number;
    leadsByStatus: {
      NEW: number;
      ANALYZED?: number;
      CONTACTED: number;
      REPLIED?: number;
      MEETING: number;
      WON: number;
      LOST: number;
    };
    tasksByStatus: {
      TODO: number;
      IN_PROGRESS: number;
      DONE: number;
    };
  } | null;
  loading?: boolean;
}

export function HqMetrics({ stats, loading = false }: HqMetricsProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-28 rounded-2xl bg-zinc-900/60 border border-zinc-800 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const { totalLeads, leadsByStatus, tasksByStatus } = stats;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Prospectos Comerciales */}
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 relative overflow-hidden group hover:border-cyan-500/40 transition-all shadow-sm">
        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl group-hover:bg-cyan-500/10 transition-all pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
            Pipeline Prospectos
          </span>
          <div className="w-8 h-8 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 flex items-center justify-center">
            <Briefcase className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-zinc-100 font-mono">
            {totalLeads}
          </span>
          <span className="text-xs text-cyan-400 font-medium">leads activos</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 flex-wrap text-[10px]">
          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono border border-zinc-700/50">
            Nuevos: {leadsByStatus.NEW}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-sky-950/60 text-sky-300 font-mono border border-sky-800/40">
            Reunión: {leadsByStatus.MEETING}
          </span>
          <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 text-emerald-300 font-mono border border-emerald-800/40 font-semibold">
            Ganados: {leadsByStatus.WON}
          </span>
        </div>
      </div>

      {/* 2. Tareas Pendientes (To Do) */}
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 relative overflow-hidden group hover:border-amber-500/40 transition-all shadow-sm">
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
            Tareas Por Hacer
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-950/60 border border-amber-500/30 text-amber-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-zinc-100 font-mono">
            {tasksByStatus.TODO}
          </span>
          <span className="text-xs text-amber-400 font-medium">en cola</span>
        </div>
        <p className="mt-3 text-[11px] text-zinc-400 truncate">
          Actividades pendientes en el backlog de danIAutoma.
        </p>
      </div>

      {/* 3. Tareas En Progreso */}
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 relative overflow-hidden group hover:border-violet-500/40 transition-all shadow-sm">
        <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
            En Progreso
          </span>
          <div className="w-8 h-8 rounded-lg bg-violet-950/60 border border-violet-500/30 text-violet-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-zinc-100 font-mono">
            {tasksByStatus.IN_PROGRESS}
          </span>
          <span className="text-xs text-violet-400 font-medium">activas ahora</span>
        </div>
        <p className="mt-3 text-[11px] text-zinc-400 truncate">
          Trabajos en ejecución activa por el equipo.
        </p>
      </div>

      {/* 4. Tareas Finalizadas (Done) */}
      <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/90 relative overflow-hidden group hover:border-emerald-500/40 transition-all shadow-sm">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
            Finalizadas
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-extrabold text-zinc-100 font-mono">
            {tasksByStatus.DONE}
          </span>
          <span className="text-xs text-emerald-400 font-medium">completadas</span>
        </div>
        <p className="mt-3 text-[11px] text-zinc-400 truncate">
          Hitos completados con éxito y entregados.
        </p>
      </div>
    </div>
  );
}

