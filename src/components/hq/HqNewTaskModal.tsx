'use client';

import React, { useState } from 'react';
import { X, CheckSquare, Sparkles } from 'lucide-react';
import { TaskItem } from './HqTaskCard';
import { getErrorMessage } from '@/lib/hq/errorUtils';

export interface TaskPayload {
  id?: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  leadId: string | null;
  dueDate: string | null;
  isAiGenerated: boolean;
}

interface HqNewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: TaskPayload) => Promise<void>;
  initialTask?: TaskItem | null;
  defaultStatus?: 'TODO' | 'IN_PROGRESS' | 'DONE';
  leads?: Array<{ id: string; name: string; niche: string }>;
}

export function HqNewTaskModal({
  isOpen,
  onClose,
  onSave,
  initialTask = null,
  defaultStatus = 'TODO',
  leads = [],
}: HqNewTaskModalProps) {
  if (!isOpen) return null;

  return (
    <HqNewTaskModalForm
      key={`${initialTask?.id ?? 'new'}-${defaultStatus}`}
      onClose={onClose}
      onSave={onSave}
      initialTask={initialTask}
      defaultStatus={defaultStatus}
      leads={leads}
    />
  );
}

function HqNewTaskModalForm({
  onClose,
  onSave,
  initialTask = null,
  defaultStatus = 'TODO',
  leads = [],
}: Omit<HqNewTaskModalProps, 'isOpen'>) {
  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [status, setStatus] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>(
    initialTask?.status || defaultStatus
  );
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>(
    initialTask?.priority || 'MEDIUM'
  );
  const [leadId, setLeadId] = useState(initialTask?.leadId || '');
  const [dueDate, setDueDate] = useState(
    initialTask?.dueDate ? initialTask.dueDate.substring(0, 10) : ''
  );
  const [isAiGenerated, setIsAiGenerated] = useState(initialTask?.isAiGenerated || false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('El título de la tarea es obligatorio.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        id: initialTask?.id,
        title: title.trim(),
        description: description.trim() || null,
        status,
        priority,
        leadId: leadId || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        isAiGenerated,
      });
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al guardar la tarea'));
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
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">
              {initialTask ? 'Editar Tarea' : 'Nueva Tarea para danIAutoma'}
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
              Título de la Tarea <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Crear funnel de prospección para dentistas"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-100 text-xs outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Descripción o Criterios de Aceptación
            </label>
            <textarea
              rows={3}
              placeholder="Detalles sobre lo que se debe completar..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-100 text-xs outline-hidden resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Columna (Estado)
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskPayload['status'])}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-100 text-xs outline-hidden"
              >
                <option value="TODO">To Do (Por hacer)</option>
                <option value="IN_PROGRESS">In Progress (En curso)</option>
                <option value="DONE">Done (Completada)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Prioridad
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPayload['priority'])}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-100 text-xs outline-hidden"
              >
                <option value="LOW">Baja</option>
                <option value="MEDIUM">Media</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente 🔥</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Asociar a Prospecto (Opcional)
              </label>
              <select
                value={leadId}
                onChange={(e) => setLeadId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-100 text-xs outline-hidden"
              >
                <option value="">Ninguno (Tarea interna de agencia)</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.niche})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Fecha Límite (Opcional)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-100 text-xs outline-hidden"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isAiGenerated}
              onChange={(e) => setIsAiGenerated(e.target.checked)}
              className="rounded bg-zinc-950 border-zinc-800 text-violet-600 focus:ring-violet-500 w-4 h-4"
            />
            <span className="text-xs text-zinc-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              Marcar como generada / asistida por IA
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
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {saving ? 'Guardando...' : initialTask ? 'Guardar Cambios' : 'Crear Tarea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

