'use client';

import React, { useState } from 'react';
import { X, Briefcase } from 'lucide-react';
import { getErrorMessage } from '@/lib/hq/errorUtils';

export interface LeadItem {
  id: string;
  name: string;
  niche: string;
  contactInfo: string;
  status: 'NEW' | 'ANALYZED' | 'CONTACTED' | 'REPLIED' | 'MEETING' | 'WON' | 'LOST';
  value: number | null;
  notes: string | null;
  nextActionDate?: string | null;
  placeId?: string | null;
  formattedAddress?: string | null;
  googleMapsUri?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  hasOwnWebsite?: boolean;
  platformType?: string | null;
  businessStatus?: string | null;
  finalScore?: number | null;
  provisionalScore?: number | null;
  websiteUri?: string | null;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { tasks: number };
}

export interface LeadPayload {
  id?: string;
  name: string;
  niche: string;
  contactInfo: string;
  status: LeadItem['status'];
  value: number | null;
  nextActionDate: string | null;
  notes: string | null;
}

interface HqNewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (leadData: LeadPayload) => Promise<void>;
  initialLead?: LeadItem | null;
}

export function HqNewLeadModal({
  isOpen,
  onClose,
  onSave,
  initialLead = null,
}: HqNewLeadModalProps) {
  if (!isOpen) return null;

  return (
    <HqNewLeadModalForm
      key={initialLead?.id ?? 'new'}
      onClose={onClose}
      onSave={onSave}
      initialLead={initialLead}
    />
  );
}

function HqNewLeadModalForm({
  onClose,
  onSave,
  initialLead = null,
}: Omit<HqNewLeadModalProps, 'isOpen'>) {
  const [name, setName] = useState(initialLead?.name || '');
  const [niche, setNiche] = useState(initialLead?.niche || '');
  const [contactInfo, setContactInfo] = useState(initialLead?.contactInfo || '');
  const [status, setStatus] = useState<LeadItem['status']>(initialLead?.status || 'NEW');
  const [value, setValue] = useState(initialLead?.value ? String(initialLead.value) : '');
  const [nextActionDate, setNextActionDate] = useState(
    initialLead?.nextActionDate ? initialLead.nextActionDate.slice(0, 10) : ''
  );
  const [notes, setNotes] = useState(initialLead?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !niche.trim() || !contactInfo.trim()) {
      setError('Nombre, nicho e información de contacto son obligatorios.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave({
        id: initialLead?.id,
        name: name.trim(),
        niche: niche.trim(),
        contactInfo: contactInfo.trim(),
        status,
        value: value ? parseFloat(value) : null,
        nextActionDate: nextActionDate || null,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Error al guardar el prospecto'));
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
              <Briefcase className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">
              {initialLead ? 'Editar Prospecto' : 'Nuevo Prospecto Comercial'}
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
              Nombre de la Empresa o Contacto <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Clínica Dental Las Palmas o Dr. Roberto Mendoza"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-100 text-xs outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Nicho / Sector <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Odontología, Bienes Raíces"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-100 text-xs outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Estado del Prospecto
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as LeadItem['status'])}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-100 text-xs outline-hidden"
              >
                <option value="NEW">Nuevo (Sin contactar)</option>
                <option value="ANALYZED">Analizado por Radar / IA</option>
                <option value="CONTACTED">Contactado</option>
                <option value="REPLIED">Respondió / Interesado</option>
                <option value="MEETING">Reunión / Demo Agendada</option>
                <option value="WON">Ganado (Cliente Cerrado) 🎉</option>
                <option value="LOST">Perdido / Descartado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Información de Contacto <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Tel: +503 7000-0000 o email"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-100 text-xs outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">
                Valor Estimado ($ USD)
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="Ej: 450.00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-100 text-xs outline-hidden font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Fecha de Próxima Acción (Seguimiento)
            </label>
            <input
              type="date"
              value={nextActionDate}
              onChange={(e) => setNextActionDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-100 text-xs outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">
              Notas y Seguimiento Comercial
            </label>
            <textarea
              rows={3}
              placeholder="Intereses del cliente, objeciones, fecha de seguimiento..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 focus:border-cyan-500 text-zinc-100 text-xs outline-hidden resize-none"
            />
          </div>

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
              className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all disabled:opacity-50"
            >
              {saving ? 'Guardando...' : initialLead ? 'Guardar Cambios' : 'Registrar Prospecto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

