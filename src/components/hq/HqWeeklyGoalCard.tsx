'use client';

import React from 'react';
import { Target, Sparkles, Calendar, Edit3, CheckCircle2 } from 'lucide-react';

interface WeeklyGoal {
  id: string;
  visionText: string;
  aiFeedback: string | null;
  weekStartDate: string;
  weekEndDate: string;
  isCompleted: boolean;
  createdAt: string;
}

interface HqWeeklyGoalCardProps {
  goal: WeeklyGoal | null;
  onEdit: () => void;
  loading?: boolean;
}

export function HqWeeklyGoalCard({
  goal,
  onEdit,
  loading = false,
}: HqWeeklyGoalCardProps) {
  if (loading) {
    return (
      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 animate-pulse h-40" />
    );
  }

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('es-SV', {
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-violet-950/20 border border-violet-500/30 relative overflow-hidden shadow-lg shadow-violet-950/20">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-950/80 border border-violet-500/40 text-violet-400 flex items-center justify-center shrink-0 shadow-xs">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-violet-400">
                Objetivo Semanal Estratégico
              </h3>
              {goal?.isCompleted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  Alcanzado
                </span>
              )}
            </div>
            {goal ? (
              <p className="mt-1.5 text-sm sm:text-base font-medium text-zinc-100 leading-snug">
                &quot;{goal.visionText}&quot;
              </p>
            ) : (
              <p className="mt-1 text-sm text-zinc-400 italic">
                Aún no has definido la visión estratégica para esta semana.
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold self-start shrink-0 transition-colors cursor-pointer"
        >
          <Edit3 className="w-3.5 h-3.5 text-violet-400" />
          <span>{goal ? 'Actualizar Visión' : 'Definir Objetivo'}</span>
        </button>
      </div>

      {goal && (
        <div className="mt-4 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {/* Fechas de la semana */}
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Calendar className="w-3.5 h-3.5 text-zinc-500" />
            <span>
              Semana del <b>{formatDate(goal.weekStartDate)}</b> al <b>{formatDate(goal.weekEndDate)}</b>
            </span>
          </div>

          {/* Feedback de IA */}
          {goal.aiFeedback && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-violet-950/60 border border-violet-500/30 text-violet-300 text-[11px]">
              <Sparkles className="w-3 h-3 text-violet-400 shrink-0" />
              <span className="truncate max-w-md">
                <b>IA Feedback:</b> {goal.aiFeedback}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

