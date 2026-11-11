'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { HqHeader } from '@/components/hq/HqHeader';
import { HqMetrics } from '@/components/hq/HqMetrics';
import { HqWeeklyGoalCard } from '@/components/hq/HqWeeklyGoalCard';
import { HqKanban } from '@/components/hq/HqKanban';
import { HqLeadsTable } from '@/components/hq/HqLeadsTable';
import { HqNewTaskModal, TaskPayload } from '@/components/hq/HqNewTaskModal';
import { HqNewLeadModal, LeadItem, LeadPayload } from '@/components/hq/HqNewLeadModal';
import { HqGoalModal, GoalPayload } from '@/components/hq/HqGoalModal';
import { TaskItem } from '@/components/hq/HqTaskCard';
import { Layers, Briefcase } from 'lucide-react';

interface HqStats {
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
}

interface WeeklyGoalItem {
  id: string;
  visionText: string;
  aiFeedback: string | null;
  weekStartDate: string;
  weekEndDate: string;
  isCompleted: boolean;
  createdAt: string;
}

export default function HqDashboardPage() {
  const [stats, setStats] = useState<HqStats | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [goal, setGoal] = useState<WeeklyGoalItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Modales
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [defaultTaskStatus, setDefaultTaskStatus] = useState<'TODO' | 'IN_PROGRESS' | 'DONE'>('TODO');

  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadItem | null>(null);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  // Pestaña activa en la vista inferior (Kanban o Leads)
  const [activeTab, setActiveTab] = useState<'KANBAN' | 'LEADS'>('KANBAN');

  const fetchDashboardPayload = useCallback(async () => {
    const [resStats, resTasks, resLeads, resGoals] = await Promise.all([
      fetch('/api/hq/stats').then((r) => r.json()),
      fetch('/api/hq/tasks').then((r) => r.json()),
      fetch('/api/hq/leads').then((r) => r.json()),
      fetch('/api/hq/goals').then((r) => r.json()),
    ]);
    return { resStats, resTasks, resLeads, resGoals };
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { resStats, resTasks, resLeads, resGoals } = await fetchDashboardPayload();
      if (resStats.stats) setStats(resStats.stats);
      if (resTasks.tasks) setTasks(resTasks.tasks);
      if (resLeads.leads) setLeads(resLeads.leads);
      if (resGoals.goal !== undefined) setGoal(resGoals.goal);
    } catch (err) {
      console.error('Error cargando datos de HQ:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchDashboardPayload]);

  useEffect(() => {
    let active = true;
    fetchDashboardPayload()
      .then(({ resStats, resTasks, resLeads, resGoals }) => {
        if (!active) return;
        if (resStats.stats) setStats(resStats.stats);
        if (resTasks.tasks) setTasks(resTasks.tasks);
        if (resLeads.leads) setLeads(resLeads.leads);
        if (resGoals.goal !== undefined) setGoal(resGoals.goal);
      })
      .catch((err) => {
        if (active) console.error('Error cargando datos de HQ:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [fetchDashboardPayload]);

  // Manejo de Tareas
  const handleOpenNewTask = (status: 'TODO' | 'IN_PROGRESS' | 'DONE' = 'TODO') => {
    setEditingTask(null);
    setDefaultTaskStatus(status);
    setIsTaskModalOpen(true);
  };

  const handleEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (taskData: TaskPayload) => {
    const isEdit = !!taskData.id;
    const url = isEdit ? `/api/hq/tasks/${taskData.id}` : '/api/hq/tasks';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Error al guardar la tarea');
    }

    loadData();
  };

  const handleMoveTaskStatus = async (taskId: string, newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );

    try {
      await fetch(`/api/hq/tasks/${taskId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      // Recargar stats silenciosamente
      fetch('/api/hq/stats')
        .then((r) => r.json())
        .then((data) => {
          if (data.stats) setStats(data.stats);
        });
    } catch {
      loadData();
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('¿Deseas eliminar esta tarea?')) return;
    try {
      await fetch(`/api/hq/tasks/${taskId}`, { method: 'DELETE' });
      loadData();
    } catch {
      alert('Error al eliminar tarea');
    }
  };

  // Manejo de Prospectos (Leads)
  const handleOpenNewLead = () => {
    setEditingLead(null);
    setIsLeadModalOpen(true);
  };

  const handleEditLead = (lead: LeadItem) => {
    setEditingLead(lead);
    setIsLeadModalOpen(true);
  };

  const handleSaveLead = async (leadData: LeadPayload) => {
    const isEdit = !!leadData.id;
    const url = isEdit ? `/api/hq/leads/${leadData.id}` : '/api/hq/leads';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(leadData),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Error al guardar prospecto');
    }

    loadData();
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: LeadItem['status']) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l))
    );

    try {
      const res = await fetch(`/api/hq/leads/${leadId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Error HTTP');
      fetch('/api/hq/stats')
        .then((r) => r.json())
        .then((data) => {
          if (data.stats) setStats(data.stats);
        });
    } catch {
      alert('Error al actualizar estado del prospecto');
      loadData();
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('¿Deseas eliminar este prospecto? Las tareas asociadas se conservarán.')) return;
    try {
      await fetch(`/api/hq/leads/${leadId}`, { method: 'DELETE' });
      loadData();
    } catch {
      alert('Error al eliminar prospecto');
    }
  };

  // Manejo de Objetivo Semanal
  const handleSaveGoal = async (goalData: GoalPayload) => {
    const res = await fetch('/api/hq/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goalData),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Error al guardar objetivo semanal');
    }

    loadData();
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. Encabezado Global de HQ */}
      <HqHeader
        onOpenNewTask={() => handleOpenNewTask('TODO')}
        onOpenNewLead={handleOpenNewLead}
        onOpenGoal={() => setIsGoalModalOpen(true)}
      />

      {/* 2. Cuerpo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Objetivo Semanal Estratégico */}
        <HqWeeklyGoalCard
          goal={goal}
          onEdit={() => setIsGoalModalOpen(true)}
          loading={loading}
        />

        {/* 4 Métricas Clave */}
        <HqMetrics stats={stats} loading={loading} />

        {/* Selector de Sección Principal (Kanban vs Pipeline Leads) */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pt-2 pb-1">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('KANBAN')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'KANBAN'
                  ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700/80'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <Layers className="w-4 h-4 text-violet-400" />
              <span>Tablero Kanban de Tareas</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-900 text-zinc-300">
                {tasks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('LEADS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'LEADS'
                  ? 'bg-zinc-800 text-white shadow-xs border border-zinc-700/80'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
              }`}
            >
              <Briefcase className="w-4 h-4 text-cyan-400" />
              <span>Prospectos Comerciales (Leads)</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-900 text-cyan-300">
                {leads.length}
              </span>
            </button>
          </div>
        </div>

        {/* Contenido Condicional según Pestaña */}
        {activeTab === 'KANBAN' ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            <HqKanban
              tasks={tasks}
              onMoveStatus={handleMoveTaskStatus}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onNewTaskInColumn={handleOpenNewTask}
              loading={loading}
            />

            {/* Vista compacta de prospectos al pie del Kanban */}
            <div className="pt-6 border-t border-zinc-900">
              <HqLeadsTable
                leads={leads}
                onEditLead={handleEditLead}
                onDeleteLead={handleDeleteLead}
                onUpdateStatus={handleUpdateLeadStatus}
                onOpenNewLead={handleOpenNewLead}
                onImportComplete={loadData}
                loading={loading}
              />
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in duration-200">
            <HqLeadsTable
              leads={leads}
              onEditLead={handleEditLead}
              onDeleteLead={handleDeleteLead}
              onUpdateStatus={handleUpdateLeadStatus}
              onOpenNewLead={handleOpenNewLead}
              onImportComplete={loadData}
              loading={loading}
            />
          </div>
        )}
      </main>

      {/* Modales */}
      <HqNewTaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
        defaultStatus={defaultTaskStatus}
        leads={leads.map((l) => ({ id: l.id, name: l.name, niche: l.niche }))}
      />

      <HqNewLeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        onSave={handleSaveLead}
        initialLead={editingLead}
      />

      <HqGoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={handleSaveGoal}
        initialGoal={goal}
      />
    </div>
  );
}

