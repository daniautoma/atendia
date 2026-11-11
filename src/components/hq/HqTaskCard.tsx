'use client';

import React from 'react';
import {
  Sparkles,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit2,
  Clock,
} from 'lucide-react';

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isAiGenerated: boolean;
  leadId: string | null;
  lead?: {
    id: string;
    name: string;
    niche: string;
  } | null;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

interface HqTaskCardProps {
  task: TaskItem;
  onMoveStatus: (taskId: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (taskId: string) => void;
  onDragStart?: (e: React.DragEvent, taskId: string) => void;
}

export function HqTaskCard({
  task,
  onMoveStatus,
  onEdit,
  onDelete,
  onDragStart,
}: HqTaskCardProps) {
  const getPriorityBadge = (priority: TaskItem['priority']) => {
    switch (priority) {
      case 'URGENT':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950/80 text-rose-300 border border-rose-600/40 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
            Urgente
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600/40 uppercase">
            Alta
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-cyan-950/60 text-cyan-300 border border-cyan-600/30 uppercase">
            Media
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/50 uppercase">
            Baja
          </span>
        );
    }
  };

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
    <div
      draggable
      onDragStart={(e) => onDragStart?.(e, task.id)}
      className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800/90 hover:border-zinc-700 hover:shadow-lg transition-all group relative cursor-grab active:cursor-grabbing"
    >
      {/* Cabecera de la tarjeta: Prioridad, IA y Acciones */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {getPriorityBadge(task.priority)}
          {task.isAiGenerated && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-950/70 text-violet-300 border border-violet-600/40"
              title="Tarea formulada por asistente IA"
            >
              <Sparkles className="w-2.5 h-2.5 text-violet-400" />
              IA
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 transition-colors"
            title="Editar tarea"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
            title="Eliminar tarea"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Título y Descripción */}
      <h4 className="mt-2 text-xs sm:text-sm font-semibold text-zinc-100 leading-snug line-clamp-2">
        {task.title}
      </h4>

      {task.description && (
        <p className="mt-1 text-xs text-zinc-400 line-clamp-2 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Prospecto asociado (si existe) */}
      {task.lead && (
        <div className="mt-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-800/90 border border-zinc-700/60 text-[11px] text-cyan-300 truncate max-w-full">
          <Briefcase className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="truncate">{task.lead.name}</span>
          <span className="text-zinc-500 text-[10px]">({task.lead.niche})</span>
        </div>
      )}

      {/* Pie de tarjeta: Fechas y Botones de Movimiento */}
      <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-400">
        <span className="flex items-center gap-1 text-zinc-400 font-mono text-[10px]">
          <Clock className="w-3 h-3 text-zinc-400" />
          {formatDate(task.createdAt)}
        </span>

        {/* Botones de traslado rápido de columna */}
        <div className="flex items-center gap-1">
          {task.status !== 'TODO' && (
            <button
              type="button"
              onClick={() => onMoveStatus(task.id, task.status === 'DONE' ? 'IN_PROGRESS' : 'TODO')}
              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Mover a la columna anterior"
            >
              <ChevronLeft className="w-3 h-3" />
            </button>
          )}

          {task.status !== 'DONE' && (
            <button
              type="button"
              onClick={() => onMoveStatus(task.id, task.status === 'TODO' ? 'IN_PROGRESS' : 'DONE')}
              className="p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Mover a la columna siguiente"
            >
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

