'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { LeadItem } from './HqNewLeadModal';
import {
  Calendar,
  Compass,
  Edit2,
  Trash2,
  MessageSquare,
  Globe,
} from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/radar/phoneUtils';
import { RadarScoreBadge } from './radar/RadarScoreBadge';

interface HqLeadsKanbanProps {
  leads: LeadItem[];
  onEditLead: (lead: LeadItem) => void;
  onDeleteLead: (leadId: string) => void;
  onUpdateStatus: (leadId: string, status: LeadItem['status']) => void;
}

const LEAD_COLUMNS: Array<{
  status: LeadItem['status'];
  title: string;
  accent: string;
  badgeClass: string;
}> = [
  { status: 'NEW', title: 'Nuevos', accent: 'border-zinc-700/80', badgeClass: 'bg-zinc-800 text-zinc-300' },
  { status: 'ANALYZED', title: 'Analizados IA', accent: 'border-cyan-800/60', badgeClass: 'bg-cyan-950 text-cyan-300' },
  { status: 'CONTACTED', title: 'Contactados', accent: 'border-sky-800/60', badgeClass: 'bg-sky-950 text-sky-300' },
  { status: 'REPLIED', title: 'Respondieron', accent: 'border-teal-800/60', badgeClass: 'bg-teal-950 text-teal-300' },
  { status: 'MEETING', title: 'Reunión / Demo', accent: 'border-violet-800/60', badgeClass: 'bg-violet-950 text-violet-300' },
  { status: 'WON', title: 'Ganados', accent: 'border-emerald-800/60', badgeClass: 'bg-emerald-950 text-emerald-300' },
  { status: 'LOST', title: 'Perdidos', accent: 'border-rose-900/50', badgeClass: 'bg-rose-950 text-rose-300' },
];

export function HqLeadsKanban({
  leads,
  onEditLead,
  onDeleteLead,
  onUpdateStatus,
}: HqLeadsKanbanProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<LeadItem['status'] | null>(null);

  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="p-4 overflow-x-auto">
      <div className="flex gap-3 min-w-[1260px]">
        {LEAD_COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.status);
          const isOver = dragOverCol === col.status;

          return (
            <div
              key={col.status}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col.status);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={() => {
                if (draggedId) {
                  onUpdateStatus(draggedId, col.status);
                }
                setDraggedId(null);
                setDragOverCol(null);
              }}
              className={`flex-1 min-w-[210px] flex flex-col rounded-xl bg-zinc-900/50 border ${
                isOver ? 'border-cyan-500 bg-cyan-950/15' : col.accent
              } min-h-[420px] transition-colors`}
            >
              <div className="p-3 border-b border-zinc-800/80 flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-200">{col.title}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${col.badgeClass}`}>
                  {colLeads.length}
                </span>
              </div>

              <div className="flex-1 p-2.5 space-y-2.5 overflow-y-auto max-h-[560px]">
                {colLeads.map((lead) => {
                  const score = lead.finalScore ?? lead.provisionalScore;
                  const waUrl = buildWhatsAppUrl(lead.phone);
                  const dateIso = lead.nextActionDate ? lead.nextActionDate.slice(0, 10) : null;
                  const isOverdue = Boolean(dateIso && dateIso <= todayIso && lead.status !== 'WON' && lead.status !== 'LOST');

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
                    <div
                      key={lead.id}
                      draggable
                      onDragStart={(e) => {
                        setDraggedId(lead.id);
                        e.dataTransfer.setData('text/plain', lead.id);
                      }}
                      className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800/80 hover:border-zinc-700 cursor-grab active:cursor-grabbing space-y-2 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <p className="text-xs font-bold text-zinc-100 line-clamp-2">{lead.name}</p>
                        {typeof score === 'number' && score > 0 && (
                          <RadarScoreBadge score={score} showLabel={false} size="sm" />
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 truncate max-w-[140px]">
                          {lead.niche}
                        </span>
                        {lead.value ? (
                          <span className="font-mono font-semibold text-cyan-300">
                            ${lead.value.toFixed(0)}
                          </span>
                        ) : null}
                      </div>

                      {dateIso && (
                        <div
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono ${
                            isOverdue
                              ? 'bg-rose-950/60 border border-rose-700/60 text-rose-300'
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-400'
                          }`}
                        >
                          <Calendar className="w-3 h-3" />
                          <span>{dateIso}</span>
                        </div>
                      )}

                      {lead.notes && (
                        <p className="text-[11px] text-zinc-400 line-clamp-2">{lead.notes}</p>
                      )}

                      <div className="pt-1.5 border-t border-zinc-800/60 flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1">
                          {waUrl && (
                            <a
                              href={waUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25"
                              title="WhatsApp"
                            >
                              <MessageSquare className="w-3 h-3" />
                            </a>
                          )}
                          {lead.websiteUri && (
                            <a
                              href={lead.websiteUri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 rounded bg-zinc-800 text-zinc-300 hover:text-cyan-300"
                              title="Sitio Web"
                            >
                              <Globe className="w-3 h-3" />
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Link
                            href={radarHref}
                            className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800"
                            title="Ver ficha Radar / IA"
                          >
                            <Compass className="w-3.5 h-3.5" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => onEditLead(lead)}
                            className="p-1 rounded text-zinc-400 hover:text-cyan-300 hover:bg-zinc-800"
                            title="Editar"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteLead(lead.id)}
                            className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {colLeads.length === 0 && (
                  <div className="py-10 text-center text-[11px] text-zinc-600 italic">
                    Arrastra prospectos aquí
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

