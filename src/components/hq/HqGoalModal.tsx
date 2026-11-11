'use client';

import React, { useState } from 'react';
import { X, Target, Sparkles, CheckCircle2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/hq/errorUtils';

export interface GoalPayload {
  id?: string;
  visionText: string;
  aiFeedback: string | null;
  weekStartDate: string;
  weekEndDate: string;
  isCompleted: boolean;
}

interface HqGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goalData: GoalPayload) => Promise<void>;
  initialGoal?: {
    id?: string;
    visionText: string;
    aiFeedback: string | null;
    weekStartDate: string;
    weekEndDate: string;
    isCompleted: boolean;
  } | null;
}

function getDefaultWeekDates() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const distanceToMonday = (dayOfWeek + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - distanceToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toISOString().substring(0, 10),
    end: sunday.toISOString().substring(0, 10),
  };
}

export function HqGoalModal({
  isOpen,
  onClose,
  onSave,
  initialGoal = null,
}: HqGoalModalProps) {
  if (!isOpen) return null;

  return (
    <HqGoalModalForm
      key={initialGoal?.id ?? 'new'}
      onClose={onClose}
      onSave={onSave}
      initialGoal={initialGoal}
    />
  );
}

function HqGoalModalForm({
  onClose,
  onSave,
  initialGoal = null,
}: Omit<HqGoalModalProps, 'isOpen'>) {
  const [defaultDates] = useState(getDefaultWeekDates);
  const [visionText, setVisionText] = useState(initialGoal?.visionText || '');
  const [aiFeedback, setAiFeedback] = useState(initialGoal?.aiFeedback || '');
  const [weekStartDate, setWeekStartDate] = useState(
    initialGoal?.weekStartDate ? initialGoal.weekStartDate.substring(0, 10) : defaultDates.start
  );
  const [weekEndDate, setWeekEndDate] = useState(
    initialGoal?.weekEndDate ? initialGoal.weekEndDate.substring(0, 10) : defaultDates.end
  );
  const [isCompleted, setIsCompleted] = useState(initialGoal?.isCompleted || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visionText.trim()) {
      setError('El texto de la visión semanal es obligatorio.');
      return;
    }
    if (!weekStartDate || !weekEndDate) {
      setError('Debes especificar las fechas de inicio y fin de la semana.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        id: initialGoal?.id,
        visionText: visionText.trim(),
        aiFeedback: aiFeedback.trim() || null,
        weekStartDate: new Date(weekStartDate).toISOString(),
        weekEndDate: new Date(weekEndDate).toISOString(),
        isCompleted,
      });
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al guardar el objetivo semanal'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-200 text-zinc-100">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-violet-950 border border-violet-500/40 text-violet-400 flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">
              {initialGoal ? 'Actualizar Objetivo Semanal' : 'Definir Visión Semanal'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Visión / Hito Principal de la Semana <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              required
              placeholder="Ej: Cerrar 2 nuevos clientes odontológicos y dejar operativo el canal de WhatsApp oficial..."
              value={visionText}
              onChange={(e) => setVisionText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-violet-500 text-zinc-100 text-xs outline-hidden resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Lunes (Inicio)
              </label>
              <input
                type="date"
                required
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-violet-500 text-zinc-100 text-xs outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Domingo (Cierre)
              </label>
              <input
                type="date"
                required
                value={weekEndDate}
                onChange={(e) => setWeekEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-violet-500 text-zinc-100 text-xs outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              <span>Feedback / Recomendación Estratégica (Opcional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="Recomendación estratégica para acelerar entregas o enfoque prioritario..."
              value={aiFeedback}
              onChange={(e) => setAiFeedback(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-violet-500 text-zinc-100 text-xs outline-hidden resize-none"
            />
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={(e) => setIsCompleted(e.target.checked)}
              className="rounded bg-zinc-950 border-zinc-800 text-emerald-600 focus:ring-emerald-500 w-4 h-4"
            />
            <span className="text-xs text-zinc-300 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Marcar objetivo como completado / alcanzado
            </span>
          </label>

          <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:from-violet-500 hover:to-cyan-500 text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Objetivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

