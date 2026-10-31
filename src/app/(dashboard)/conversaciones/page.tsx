'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import {
  MessageSquare,
  User,
  Bot,
  UserCheck,
  Send,
  Wrench,
  Clock,
  ChevronDown,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Phone,
  Globe,
} from 'lucide-react';

export default function ConversacionesPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<any | null>(null);
  const [filter, setFilter] = useState<'all' | 'needs_attention' | 'whatsapp' | 'web'>('all');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingConv, setLoadingConv] = useState(false);
  const [inputText, setInputText] = useState('');
  const [expandedTools, setExpandedTools] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const prevMessagesCountRef = useRef(0);
  const prevWaitingCountRef = useRef(0);

  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  const fetchList = async () => {
    try {
      const res = await fetch(`/api/conversations?filter=${filter}`);
      const data = await res.json();
      if (data.conversations) {
        setConversations(data.conversations);
        const currentWaiting = data.conversations.filter((c: any) => c.status === 'WAITING_HUMAN').length;
        if (currentWaiting > prevWaitingCountRef.current && prevWaitingCountRef.current !== 0) {
          playChime();
        }
        prevWaitingCountRef.current = currentWaiting;

        if (!selectedId && data.conversations.length > 0) {
          setSelectedId(data.conversations[0].id);
        }
      }
    } catch {} finally {
      setLoadingList(false);
    }
  };

  const fetchActiveConversation = async (id: string, isSilent = false) => {
    if (!isSilent) setLoadingConv(true);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const data = await res.json();
      if (data.conversation) {
        setActiveConv(data.conversation);
      }
    } catch {} finally {
      if (!isSilent) setLoadingConv(false);
    }
  };

  useEffect(() => {
    fetchList();
    const interval = setInterval(fetchList, 3000);
    return () => clearInterval(interval);
  }, [filter]);

  useEffect(() => {
    if (selectedId) {
      fetchActiveConversation(selectedId, false);
      const interval = setInterval(() => {
        fetchActiveConversation(selectedId, true);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [selectedId]);

  useEffect(() => {
    const currentCount = activeConv?.messages?.length || 0;
    if (currentCount > prevMessagesCountRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    prevMessagesCountRef.current = currentCount;
  }, [activeConv?.messages?.length]);

  const handleAction = async (action: 'TAKE_CONTROL' | 'HANDOVER_TO_BOT') => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/conversations/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        fetchActiveConversation(selectedId);
        fetchList();
      }
    } catch {}
  };

  const handleSendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !inputText.trim()) return;

    const text = inputText;
    setInputText('');

    try {
      const res = await fetch(`/api/conversations/${selectedId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, action: 'SEND_MESSAGE' }),
      });
      if (res.ok) {
        fetchActiveConversation(selectedId);
        fetchList();
      }
    } catch {}
  };

  const toggleTools = (msgId: string) => {
    setExpandedTools((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const waitingCount = conversations.filter((c) => c.status === 'WAITING_HUMAN').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-50">
      <Header
        title="Bandeja de Conversaciones"
        subtitle="Atención omnicanal unificada: supervisa a DentalIA y toma el control humano cuando sea necesario"
      />

      {/* Alerta Visual de Pase a Humano */}
      {waitingCount > 0 && (
        <div className="bg-amber-600 text-white px-5 py-2 text-xs font-semibold flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-200"></span>
            </span>
            <span>¡Atención requerida! Hay {waitingCount} conversación(es) esperando respuesta humana</span>
          </div>
          <button
            onClick={() => setFilter('needs_attention')}
            className="underline hover:text-amber-100 cursor-pointer text-[11px] font-bold"
          >
            Filtrar pendientes
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* COLUMNA IZQUIERDA: LISTA DE CONVERSACIONES */}
        <div className="w-80 md:w-96 bg-white border-r border-stone-200 flex flex-col shrink-0">
          {/* Filtros */}
          <div className="p-3 border-b border-stone-100 flex gap-1.5 overflow-x-auto text-[11px] font-semibold">
            {[
              { id: 'all', label: 'Todas' },
              { id: 'needs_attention', label: 'Esperan Humano' },
              { id: 'whatsapp', label: 'WhatsApp' },
              { id: 'web', label: 'Web' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                  filter === f.id
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Lista scrollable */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {conversations.length === 0 ? (
              <div className="text-center py-12 text-stone-400 text-xs">
                No hay conversaciones en esta vista.
              </div>
            ) : (
              conversations.map((c) => {
                const isSelected = selectedId === c.id;
                const isWaiting = c.status === 'WAITING_HUMAN';
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`p-3.5 transition-colors cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-teal-50/70 border-l-4 border-l-teal-600'
                        : 'hover:bg-stone-50/80'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="font-bold text-xs text-stone-900 truncate">
                          {c.contactName}
                        </span>
                        {c.channel === 'WHATSAPP' ? (
                          <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 rounded font-semibold">
                            WA
                          </span>
                        ) : (
                          <span className="bg-teal-100 text-teal-800 text-[9px] px-1.5 py-0.2 rounded font-semibold">
                            Web
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-stone-400">
                        {new Date(c.lastMessageAt).toLocaleTimeString('es-SV', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'America/El_Salvador',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-stone-500 truncate">{c.lastMessage}</p>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-stone-400 font-mono truncate">
                        {c.contactPhone}
                      </span>
                      {isWaiting ? (
                        <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse">
                          Requiere atención
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full font-medium">
                          LumenIA activo
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: CONVERSACIÓN SELECCIONADA */}
        <div className="flex-1 flex flex-col bg-stone-50 overflow-hidden">
          {activeConv ? (
            <>
              {/* Cabecera del chat activo con botón Tomar Control */}
              <div className="px-6 py-3.5 bg-white border-b border-stone-200 flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                    {activeConv.contact?.name?.[0] || 'C'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-stone-900">
                      {activeConv.contact?.name || 'Paciente'}
                    </h4>
                    <p className="text-[11px] text-stone-500">
                      {activeConv.contact?.phone || activeConv.contact?.webSessionId} • {activeConv.channel}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {activeConv.status === 'WAITING_HUMAN' ? (
                    <button
                      onClick={() => handleAction('HANDOVER_TO_BOT')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <Bot className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Devolver al asistente</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction('TAKE_CONTROL')}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Tomar el control</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Banner de motivo si espera humano */}
              {activeConv.status === 'WAITING_HUMAN' && (
                <div className="px-6 py-2 bg-rose-50 border-b border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    <b>Atención humana requerida:</b> {activeConv.needsHumanReason || 'El paciente solicita hablar con una persona.'}
                  </span>
                </div>
              )}

              {/* Mensajes del hilo */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {activeConv.messages?.map((m: any) => {
                  const isCustomer = m.sender === 'CUSTOMER';
                  const isAssistant = m.sender === 'ASSISTANT';
                  const isAgent = m.sender === 'AGENT';

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        isCustomer ? 'items-start' : 'items-end'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mb-1 px-1">
                        {isCustomer && <span className="font-semibold text-stone-600">Paciente</span>}
                        {isAssistant && <span className="font-semibold text-teal-700 flex items-center gap-1"><Bot className="w-2.5 h-2.5" /> DentalIA</span>}
                        {isAgent && (
                          <span className="font-semibold text-purple-700 flex items-center gap-1">
                            <User className="w-2.5 h-2.5" />
                            {m.senderName ? `Enviado por ${m.senderName}` : 'Agente Humano'}
                          </span>
                        )}
                        <span>•</span>
                        <span>
                          {new Date(m.createdAt).toLocaleTimeString('es-SV', {
                            hour: '2-digit',
                            minute: '2-digit',
                            timeZone: 'America/El_Salvador',
                          })}
                        </span>
                      </div>

                      <div
                        className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed shadow-2xs ${
                          isCustomer
                            ? 'bg-white text-stone-900 border border-stone-200 rounded-tl-xs'
                            : isAssistant
                            ? 'bg-teal-700 text-white rounded-tr-xs'
                            : 'bg-purple-700 text-white rounded-tr-xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.text}</p>

                        {/* Desplegable de Tools si es mensaje del asistente */}
                        {isAssistant && m.toolCalls && m.toolCalls.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-teal-600/60">
                            <button
                              onClick={() => toggleTools(m.id)}
                              className="text-[10px] text-teal-200 hover:text-white flex items-center gap-1 cursor-pointer font-mono"
                            >
                              <Wrench className="w-2.5 h-2.5" />
                              <span>{m.toolCalls.length} herramienta(s) llamada(s)</span>
                              <ChevronDown className="w-2.5 h-2.5" />
                            </button>

                            {expandedTools[m.id] && (
                              <div className="mt-1.5 p-2 bg-teal-900/40 rounded-lg text-[10px] font-mono space-y-1">
                                {m.toolCalls.map((t: string, idx: number) => (
                                  <div key={idx} className="text-teal-200">• {t}</div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Barra inferior para responder manualmente */}
              <div className="p-4 bg-white border-t border-stone-200">
                <form onSubmit={handleSendManual} className="flex gap-2">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Escribe una respuesta como miembro del equipo..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim()}
                    className="px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar como Agente</span>
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-stone-400 text-xs">
              Selecciona una conversación para ver el historial y tomar el control.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
