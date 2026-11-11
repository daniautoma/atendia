'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { LeadItem } from './HqNewLeadModal';
import { HqLeadsKanban } from './HqLeadsKanban';
import { RadarScoreBadge } from './radar/RadarScoreBadge';
import { buildWhatsAppUrl } from '@/lib/radar/phoneUtils';
import { getErrorMessage } from '@/lib/hq/errorUtils';
import {
  Briefcase,
  Search,
  Edit2,
  Trash2,
  Plus,
  Layers,
  Compass,
  Download,
  Upload,
  Table2,
  Columns3,
  MessageSquare,
  Calendar,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';

interface HqLeadsTableProps {
  leads: LeadItem[];
  onEditLead: (lead: LeadItem) => void;
  onDeleteLead: (leadId: string) => void;
  onUpdateStatus: (leadId: string, status: LeadItem['status']) => void;
  onOpenNewLead: () => void;
  onImportComplete?: () => void;
  loading?: boolean;
}

export function HqLeadsTable({
  leads,
  onEditLead,
  onDeleteLead,
  onUpdateStatus,
  onOpenNewLead,
  onImportComplete,
  loading = false,
}: HqLeadsTableProps) {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'TABLE' | 'KANBAN'>('TABLE');
  const [importing, setImporting] = useState(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredLeads = leads.filter((lead) => {
    const matchesStatus = filterStatus === 'ALL' || lead.status === filterStatus;
    const matchesSearch =
      !searchTerm ||
      lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.niche.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.contactInfo.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleExportCsv = () => {
    const headers = [
      'Nombre',
      'Nicho',
      'Estado',
      'Score',
      'Telefono',
      'Sitio Web',
      'Direccion',
      'Contacto',
      'Valor USD',
      'Proxima Accion',
      'Notas',
      'Fecha Creacion',
    ];

    const escapeCsv = (val: unknown) => {
      const str = val === null || val === undefined ? '' : String(val);
      return `"${str.replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;
    };

    const rows = filteredLeads.map((l) => [
      escapeCsv(l.name),
      escapeCsv(l.niche),
      escapeCsv(l.status),
      escapeCsv(l.finalScore ?? l.provisionalScore ?? ''),
      escapeCsv(l.phone ?? ''),
      escapeCsv(l.websiteUri ?? ''),
      escapeCsv(l.formattedAddress ?? ''),
      escapeCsv(l.contactInfo),
      escapeCsv(l.value ?? ''),
      escapeCsv(l.nextActionDate ? l.nextActionDate.slice(0, 10) : ''),
      escapeCsv(l.notes ?? ''),
      escapeCsv(l.createdAt ? l.createdAt.slice(0, 10) : ''),
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `prospectos-daniautoma-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const jsonContent = JSON.stringify({ exportedAt: new Date().toISOString(), leads: filteredLeads }, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `respaldo-leads-hq-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      setImportFeedback(null);
      const text = await file.text();
      const parsed = JSON.parse(text);
      const list = Array.isArray(parsed) ? parsed : Array.isArray(parsed.leads) ? parsed.leads : [];

      if (list.length === 0) {
        throw new Error('El JSON no contiene prospectos para importar.');
      }

      const res = await fetch('/api/hq/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: list }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error importando prospectos');

      setImportFeedback(
        `Importación completada: ${data.createdCount} nuevos, ${data.updatedCount} actualizados.`
      );
      onImportComplete?.();
    } catch (err: unknown) {
      setImportFeedback(getErrorMessage(err, 'Error leyendo archivo JSON.'));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="rounded-2xl bg-zinc-950/80 border border-zinc-800/90 overflow-hidden shadow-sm">
      {/* Cabecera del Módulo de Leads */}
      <div className="p-4 sm:p-5 border-b border-zinc-800/80 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-cyan-400" />
              Prospectos y Pipeline Comercial
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-500/30">
              {leads.length}
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Seguimiento de empresas y potenciales clientes de la agencia danIAutoma.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Tabla / Kanban */}
          <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'TABLE' ? 'bg-zinc-800 text-cyan-300' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Table2 className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('KANBAN')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors ${
                viewMode === 'KANBAN' ? 'bg-zinc-800 text-cyan-300' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Columns3 className="w-3.5 h-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredLeads.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium disabled:opacity-40 transition-colors"
            title="Exportar a Excel (CSV con separador punto y coma)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            disabled={filteredLeads.length === 0}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium disabled:opacity-40 transition-colors"
            title="Descargar respaldo JSON"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>JSON</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportJson}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-medium disabled:opacity-40 transition-colors"
            title="Importar respaldo JSON"
          >
            {importing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-violet-400" />
            )}
            <span>Importar</span>
          </button>

          <button
            type="button"
            onClick={onOpenNewLead}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nuevo Prospecto</span>
          </button>
        </div>
      </div>

      {importFeedback && (
        <div className="px-4 py-2 bg-cyan-950/30 border-b border-cyan-800/50 text-xs text-cyan-200 flex items-center justify-between">
          <span>{importFeedback}</span>
          <button
            type="button"
            onClick={() => setImportFeedback(null)}
            className="text-zinc-400 hover:text-white text-[11px]"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="p-3 border-b border-zinc-800/60 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Pestañas de estado */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs pb-1 sm:pb-0">
          {[
            { label: 'Todos', value: 'ALL' },
            { label: 'Nuevos', value: 'NEW' },
            { label: 'Analizados IA', value: 'ANALYZED' },
            { label: 'Contactados', value: 'CONTACTED' },
            { label: 'Respondieron', value: 'REPLIED' },
            { label: 'Reunión', value: 'MEETING' },
            { label: 'Ganados', value: 'WON' },
            { label: 'Perdidos', value: 'LOST' },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilterStatus(tab.value)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                filterStatus === tab.value
                  ? 'bg-zinc-800 text-cyan-300 border border-cyan-500/30 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Buscador */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o nicho..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:border-cyan-500 outline-hidden"
          />
        </div>
      </div>

      {/* Vista Tabla vs Kanban */}
      {loading ? (
        <div className="p-8 text-center text-zinc-500 text-xs">Cargando prospectos...</div>
      ) : filteredLeads.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-xs text-zinc-400">No se encontraron prospectos con este filtro.</p>
          <button
            type="button"
            onClick={onOpenNewLead}
            className="mt-2 text-xs text-cyan-400 hover:underline font-semibold"
          >
            + Agregar el primer prospecto
          </button>
        </div>
      ) : viewMode === 'KANBAN' ? (
        <HqLeadsKanban
          leads={filteredLeads}
          onEditLead={onEditLead}
          onDeleteLead={onDeleteLead}
          onUpdateStatus={onUpdateStatus}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-900/60 text-zinc-400 uppercase tracking-wider font-semibold border-b border-zinc-800/80 text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Prospecto / Empresa</th>
                <th className="py-2.5 px-4">Nicho</th>
                <th className="py-2.5 px-4">Score</th>
                <th className="py-2.5 px-4">Contacto</th>
                <th className="py-2.5 px-4">Próx. Acción</th>
                <th className="py-2.5 px-4">Valor Est.</th>
                <th className="py-2.5 px-4">Estado</th>
                <th className="py-2.5 px-4 text-center">Tareas</th>
                <th className="py-2.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-200">
              {filteredLeads.map((lead) => {
                const score = lead.finalScore ?? lead.provisionalScore;
                const waUrl = buildWhatsAppUrl(lead.phone);
                const dateIso = lead.nextActionDate ? lead.nextActionDate.slice(0, 10) : null;
                const isOverdue = Boolean(
                  dateIso && dateIso <= todayIso && lead.status !== 'WON' && lead.status !== 'LOST'
                );

                const radarHref = `/hq/radar/${encodeURIComponent(lead.placeId || lead.id)}?${new URLSearchParams({
                  name: lead.name || '',
                  niche: lead.niche || '',
                  address: lead.formattedAddress || lead.contactInfo || '',
                  phone: lead.phone || '',
                  website: lead.websiteUri || '',
                  googleMapsUri: lead.googleMapsUri || '',
                  rating: String(lead.rating || 0),
                  reviews: String(lead.userRatingCount || 0),
                  score: String(score || 0),
                }).toString()}`;

                return (
                  <tr key={lead.id} className="hover:bg-zinc-900/40 transition-colors group">
                    <td className="py-3 px-4 font-semibold text-zinc-100">
                      <div>
                        <p className="font-bold text-white">{lead.name}</p>
                        {lead.notes && (
                          <p className="text-[11px] text-zinc-400 font-normal line-clamp-1 mt-0.5">
                            {lead.notes}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300">
                        {lead.niche}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {typeof score === 'number' && score > 0 ? (
                        <RadarScoreBadge score={score} showLabel={false} size="sm" />
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-zinc-300">
                      <div className="flex items-center gap-2">
                        <span className="line-clamp-1 max-w-[200px]">{lead.contactInfo}</span>
                        {waUrl && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 shrink-0"
                            title="WhatsApp directo"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {dateIso ? (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${
                            isOverdue
                              ? 'bg-rose-950/60 border border-rose-700/60 text-rose-300'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-300'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          {dateIso}
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-cyan-300">
                      {lead.value ? `$${lead.value.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={lead.status}
                        onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadItem['status'])}
                        className="px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-semibold focus:border-cyan-500 outline-hidden cursor-pointer"
                      >
                        <option value="NEW">Nuevo</option>
                        <option value="ANALYZED">Analizado IA</option>
                        <option value="CONTACTED">Contactado</option>
                        <option value="REPLIED">Respondió</option>
                        <option value="MEETING">Reunión</option>
                        <option value="WON">Ganado 🎉</option>
                        <option value="LOST">Perdido</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-400">
                        <Layers className="w-3 h-3 text-zinc-500" />
                        {lead._count?.tasks ?? 0}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={radarHref}
                          className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 transition-colors"
                          title="Ver en Radar / Auditar"
                        >
                          <Compass className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => onEditLead(lead)}
                          className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800 transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteLead(lead.id)}
                          className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
