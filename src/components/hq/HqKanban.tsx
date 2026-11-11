'use client';

import React, { useState } from 'react';
import { HqTaskCard, TaskItem } from './HqTaskCard';
import { Clock, Zap, CheckCircle2, Plus } from 'lucide-react';

interface HqKanbanProps {
  tasks: TaskItem[];
  onMoveStatus: (taskId: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => void;
  onEditTask: (task: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onNewTaskInColumn: (status: 'TODO' | 'IN_PROGRESS' | 'DONE') => void;
  loading?: boolean;
}

export function HqKanban({
  tasks,
  onMoveStatus,
  onEditTask,
  onDeleteTask,
  onNewTaskInColumn,
  loading = false,
}: HqKanbanProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const todoTasks = tasks.filter((t) => t.status === 'TODO');
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS');
  const doneTasks = tasks.filter((t) => t.status === 'DONE');

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.setData('text/plain', taskId);
  };

  const handleDragOver = (e: React.DragEvent, colStatus: string) => {
    e.preventDefault();
    setDragOverColumn(colStatus);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = (colStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    if (draggedTaskId) {
      onMoveStatus(draggedTaskId, colStatus);
    }
    setDraggedTaskId(null);
    setDragOverColumn(null);
  };

  const renderColumn = (
    title: string,
    status: 'TODO' | 'IN_PROGRESS' | 'DONE',
    columnTasks: TaskItem[],
    icon: React.ReactNode,
    badgeColor: string,
    accentBorder: string
  ) => {
    const isOver = dragOverColumn === status;

    return (
      <div
        onDragOver={(e) => handleDragOver(e, status)}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop(status)}
        className={`flex-1 flex flex-col rounded-2xl bg-zinc-950/60 border ${
          isOver ? 'border-cyan-500 bg-cyan-950/10' : accentBorder
        } transition-all min-h-[450px] shadow-sm`}
      >
        {/* Cabecera de la columna */}
        <div className="p-3.5 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300">
              {icon}
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-zinc-200">{title}</h3>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${badgeColor}`}>
              {columnTasks.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNewTaskInColumn(status)}
            className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title={`Añadir tarea a ${title}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Tarjetas */}
        <div className="flex-1 p-3 space-y-3 overflow-y-auto max-h-[650px]">
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-zinc-900/40 border border-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : columnTasks.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-zinc-800/80 rounded-xl">
              <p className="text-xs text-zinc-500">No hay tareas en esta columna</p>
              <button
                type="button"
                onClick={() => onNewTaskInColumn(status)}
                className="mt-2 text-[11px] text-cyan-400 hover:underline font-medium"
              >
                + Crear una tarea
              </button>
            </div>
          ) : (
            columnTasks.map((task) => (
              <HqTaskCard
                key={task.id}
                task={task}
                onMoveStatus={onMoveStatus}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onDragStart={handleDragStart}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {renderColumn(
        'To Do (Por Hacer)',
        'TODO',
        todoTasks,
        <Clock className="w-4 h-4 text-amber-400" />,
        'bg-amber-950/60 text-amber-300 border border-amber-600/40',
        'border-zinc-800/80'
      )}

      {renderColumn(
        'In Progress (En Curso)',
        'IN_PROGRESS',
        inProgressTasks,
        <Zap className="w-4 h-4 text-violet-400" />,
        'bg-violet-950/60 text-violet-300 border border-violet-600/40',
        'border-zinc-800/80'
      )}

      {renderColumn(
        'Done (Finalizadas)',
        'DONE',
        doneTasks,
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
        'bg-emerald-950/60 text-emerald-300 border border-emerald-600/40',
        'border-zinc-800/80'
      )}
    </div>
  );
}

