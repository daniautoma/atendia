'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isToday,
  parseISO,
} from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  XCircle,
  CalendarDays,
  List,
  CalendarRange,
  Trash2,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';

interface Contact {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

interface Appointment {
  id: string;
  serviceName: string;
  startTime: string;
  endTime: string;
  status: string;
  notes: string | null;
  googleCalendarEventId: string | null;
  contact: Contact;
}

type ViewMode = 'month' | 'week' | 'agenda';

export default function CalendarioPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // New Appointment Form state
  const [formData, setFormData] = useState({
    patientName: '',
    phone: '',
    email: '',
    serviceName: 'Limpieza Dental Ultrasónica',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00',
    durationMinutes: 45,
    notes: '',
  });

  // Services list for dropdown
  const [servicesList, setServicesList] = useState<string[]>([
    'Limpieza Dental Ultrasónica',
    'Blanqueamiento Dental LED',
    'Consulta y Diagnóstico General',
    'Endodoncia Unirradicular',
    'Ortodoncia / Alineadores Invisibles',
    'Implante Dental de Titanio',
    'Extracción Simple / Muela del Juicio',
  ]);

  // Cargar citas desde API
  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/appointments');
      const data = await res.json();
      if (data.appointments) {
        setAppointments(data.appointments);
      }
    } catch (err) {
      console.error('Error cargando citas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
    // Cargar servicios reales si existen
    fetch('/api/knowledge/services')
      .then((r) => r.json())
      .then((d) => {
        if (d.services && d.services.length > 0) {
          setServicesList(d.services.map((s: any) => s.name));
        }
      })
      .catch(() => {});
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ text, type });
    setTimeout(() => setFeedbackMessage(null), 4500);
  };

  // Navegación de fechas
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate((d) => subMonths(d, 1));
    } else if (viewMode === 'week') {
      setCurrentDate((d) => subWeeks(d, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate((d) => addMonths(d, 1));
    } else if (viewMode === 'week') {
      setCurrentDate((d) => addWeeks(d, 1));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Filtrado de citas
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appt) => {
      const matchSearch =
        searchQuery === '' ||
        (appt.contact.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (appt.contact.phone || '').includes(searchQuery) ||
        appt.serviceName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'CONFIRMED' && appt.status !== 'CANCELLED') ||
        (statusFilter === 'CANCELLED' && appt.status === 'CANCELLED');

      return matchSearch && matchStatus;
    });
  }, [appointments, searchQuery, statusFilter]);

  // Manejo de creación manual de cita
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.patientName.trim()) {
      showToast('Por favor introduce el nombre del paciente', 'error');
      return;
    }

    try {
      setActionLoading(true);
      const startDateTime = new Date(`${formData.date}T${formData.time}:00`);
      const endDateTime = new Date(startDateTime.getTime() + formData.durationMinutes * 60000);

      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName: formData.patientName.trim(),
          phone: formData.phone.trim() || undefined,
          email: formData.email.trim() || undefined,
          serviceName: formData.serviceName,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          notes: formData.notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al agendar la cita');
      }

      showToast(
        data.appointment?.googleCalendarEventId
          ? '✓ Cita agendada y sincronizada con Google Calendar'
          : '✓ Cita agendada correctamente en la agenda'
      );

      setIsNewModalOpen(false);
      setFormData({
        patientName: '',
        phone: '',
        email: '',
        serviceName: servicesList[0] || 'Limpieza Dental',
        date: format(new Date(), 'yyyy-MM-dd'),
        time: '10:00',
        durationMinutes: 45,
        notes: '',
      });
      await fetchAppointments();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Manejo de reprogramación / actualización
  const handleUpdateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;

    try {
      setActionLoading(true);
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedAppointment.id,
          serviceName: selectedAppointment.serviceName,
          startTime: selectedAppointment.startTime,
          endTime: selectedAppointment.endTime,
          notes: selectedAppointment.notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al actualizar');

      showToast('✓ Cita actualizada correctamente');
      setIsEditing(false);
      setSelectedAppointment(null);
      await fetchAppointments();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancelar cita (status CANCELLED y remover de Google Calendar)
  const handleCancelAppointment = async (id: string) => {
    if (!confirm('¿Deseas cancelar esta cita? Si está sincronizada en Google Calendar, el evento será eliminado.')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch('/api/appointments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: 'CANCELLED',
        }),
      });

      if (!res.ok) throw new Error('Error al cancelar cita');

      showToast('Cita cancelada y retirada de Google Calendar');
      setSelectedAppointment(null);
      await fetchAppointments();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Eliminar definitivamente de la base de datos
  const handleDeleteAppointment = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar definitivamente esta cita de la base de datos?')) {
      return;
    }

    try {
      setActionLoading(true);
      const res = await fetch(`/api/appointments?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Error al eliminar');

      showToast('Cita eliminada de la base de datos');
      setSelectedAppointment(null);
      await fetchAppointments();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Días para la vista mensual
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Semana inicia en lunes
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const monthDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // Días para la vista semanal
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-stone-50">
      <Header
        title="Calendario Odontológico"
        subtitle="Gestión de citas, agenda clínica y sincronización automática con Google Calendar"
      />

      {/* Alerta flotante de feedback */}
      {feedbackMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border flex items-center gap-2 text-sm font-medium transition-all transform animate-in fade-in slide-in-from-bottom-2 ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <XCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Barra de Controles Superior */}
      <div className="px-8 pt-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 bg-white">
        {/* Navegación y Título de Fecha */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-stone-100 rounded-xl p-1 border border-stone-200">
            <button
              onClick={handlePrev}
              className="p-1.5 rounded-lg hover:bg-white text-stone-700 transition-colors"
              title="Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handleToday}
              className="px-3 py-1 text-xs font-semibold hover:bg-white rounded-lg text-stone-700 transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 rounded-lg hover:bg-white text-stone-700 transition-colors"
              title="Siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-lg font-bold text-stone-900 capitalize min-w-[200px]">
            {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : "'Semana del' d 'de' MMMM", {
              locale: es,
            })}
          </h2>

          <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-50 text-teal-800 text-[11px] font-semibold border border-teal-200">
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            Zona Horaria: America/El_Salvador (GMT-6)
          </span>
        </div>

        {/* Buscador, Filtro de Vista y Botón Nueva Cita */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Selector de Vistas */}
          <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
            <button
              onClick={() => setViewMode('month')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'month'
                  ? 'bg-white text-teal-800 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Mes</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'week'
                  ? 'bg-white text-teal-800 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5" />
              <span>Semana</span>
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'agenda'
                  ? 'bg-white text-teal-800 shadow-2xs font-bold'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista</span>
            </button>
          </div>

          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-2xs cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Cita</span>
          </button>
        </div>
      </div>

      {/* Contenido Principal según ViewMode */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600" />
          </div>
        ) : viewMode === 'month' ? (
          /* =================== VISTA MENSUAL =================== */
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden flex flex-col min-h-[640px]">
            {/* Cabecera de días de la semana */}
            <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/80 text-stone-600 text-xs font-bold py-2.5 text-center">
              <div>Lun</div>
              <div>Mar</div>
              <div>Mié</div>
              <div>Jue</div>
              <div>Vie</div>
              <div>Sáb</div>
              <div>Dom</div>
            </div>

            {/* Rejilla de días */}
            <div className="grid grid-cols-7 grid-rows-5 flex-1 divide-x divide-y divide-stone-100">
              {monthDays.map((day, idx) => {
                const dayAppts = filteredAppointments.filter((a) =>
                  isSameDay(parseISO(a.startTime), day)
                );
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isDayToday = isToday(day);

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        date: format(day, 'yyyy-MM-dd'),
                      }));
                    }}
                    className={`min-h-[110px] p-2 transition-colors flex flex-col ${
                      !isCurrentMonth ? 'bg-stone-50/40 text-stone-300' : 'bg-white'
                    } ${isDayToday ? 'ring-2 ring-teal-500 ring-inset' : ''} hover:bg-stone-50/70`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          isDayToday
                            ? 'bg-teal-700 text-white'
                            : isCurrentMonth
                            ? 'text-stone-800'
                            : 'text-stone-400'
                        }`}
                      >
                        {format(day, 'd')}
                      </span>
                      {dayAppts.length > 0 && (
                        <span className="text-[10px] bg-stone-100 text-stone-600 font-semibold px-1.5 py-0.5 rounded-full">
                          {dayAppts.length}
                        </span>
                      )}
                    </div>

                    {/* Citas del día */}
                    <div className="space-y-1 overflow-y-auto max-h-[90px] pr-0.5">
                      {dayAppts.map((appt) => {
                        const isCancelled = appt.status === 'CANCELLED';
                        return (
                          <div
                            key={appt.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAppointment(appt);
                            }}
                            className={`px-2 py-1 rounded-lg text-[11px] font-medium border cursor-pointer truncate transition-transform hover:scale-[1.02] ${
                              isCancelled
                                ? 'bg-stone-100 text-stone-400 border-stone-200 line-through'
                                : appt.googleCalendarEventId
                                ? 'bg-teal-50 text-teal-900 border-teal-200 hover:bg-teal-100/80'
                                : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100/80'
                            }`}
                          >
                            <div className="flex items-center gap-1 font-semibold truncate">
                              <span className="font-mono text-[10px]">
                                {format(parseISO(appt.startTime), 'HH:mm')}
                              </span>
                              <span className="truncate">{appt.contact.name || 'Paciente'}</span>
                            </div>
                            <div className="text-[10px] opacity-75 truncate">{appt.serviceName}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'week' ? (
          /* =================== VISTA SEMANAL =================== */
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden flex flex-col min-h-[600px]">
            <div className="grid grid-cols-7 border-b border-stone-200 bg-stone-50/80 text-stone-600 text-xs font-bold py-3 text-center divide-x divide-stone-100">
              {weekDays.map((day, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-stone-400 font-normal uppercase text-[10px]">
                    {format(day, 'EEE', { locale: es })}
                  </span>
                  <span
                    className={`text-sm font-bold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full ${
                      isToday(day) ? 'bg-teal-700 text-white' : 'text-stone-800'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 flex-1 divide-x divide-stone-100 p-2 min-h-[500px]">
              {weekDays.map((day, i) => {
                const dayAppts = filteredAppointments.filter((a) =>
                  isSameDay(parseISO(a.startTime), day)
                );

                return (
                  <div key={i} className="p-2 space-y-2">
                    {dayAppts.length === 0 ? (
                      <div className="text-center py-8 text-stone-300 text-xs italic">
                        Sin citas
                      </div>
                    ) : (
                      dayAppts.map((appt) => (
                        <div
                          key={appt.id}
                          onClick={() => setSelectedAppointment(appt)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer shadow-2xs transition-all hover:shadow-xs ${
                            appt.status === 'CANCELLED'
                              ? 'bg-stone-100 text-stone-400 border-stone-200 line-through'
                              : 'bg-white border-teal-200 hover:border-teal-400'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 mb-1">
                            <span>{format(parseISO(appt.startTime), 'HH:mm')}</span>
                            {appt.googleCalendarEventId && (
                              <span className="text-teal-700 text-[10px] font-bold">✓ GCal</span>
                            )}
                          </div>
                          <p className="font-bold text-stone-900 truncate">
                            {appt.contact.name || 'Paciente'}
                          </p>
                          <p className="text-[11px] text-teal-800 font-medium truncate">
                            {appt.serviceName}
                          </p>
                          {appt.contact.phone && (
                            <p className="text-[10px] text-stone-400 mt-1 truncate">
                              {appt.contact.phone}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* =================== VISTA LISTA / AGENDA =================== */
          <div className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden p-6 space-y-6">
            {/* Barra de filtros de lista */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por paciente, teléfono o servicio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-200 bg-stone-50/50 focus:bg-white focus:outline-teal-600 focus:border-teal-600"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs text-stone-500 font-medium">Estado:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 font-medium text-stone-700 focus:outline-teal-600"
                >
                  <option value="ALL">Todas las citas ({appointments.length})</option>
                  <option value="CONFIRMED">Confirmadas</option>
                  <option value="CANCELLED">Canceladas</option>
                </select>
              </div>
            </div>

            {filteredAppointments.length === 0 ? (
              <div className="text-center py-16 text-stone-400 text-xs">
                No se encontraron citas con los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-stone-200 text-stone-400 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="pb-3">Fecha y Hora</th>
                      <th className="pb-3">Paciente</th>
                      <th className="pb-3">Contacto</th>
                      <th className="pb-3">Tratamiento</th>
                      <th className="pb-3">Estado</th>
                      <th className="pb-3">Sincronización</th>
                      <th className="pb-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredAppointments.map((appt) => (
                      <tr key={appt.id} className="hover:bg-stone-50/70 transition-colors">
                        <td className="py-3.5 font-mono text-stone-800 font-medium">
                          {format(parseISO(appt.startTime), "EEEE d 'de' MMMM, HH:mm", {
                            locale: es,
                          })}
                        </td>
                        <td className="py-3.5 font-bold text-stone-900">
                          {appt.contact.name || 'Paciente sin nombre'}
                        </td>
                        <td className="py-3.5 text-stone-500 font-mono">
                          <div>{appt.contact.phone || '—'}</div>
                          {appt.contact.email && (
                            <div className="text-[10px] text-stone-400">{appt.contact.email}</div>
                          )}
                        </td>
                        <td className="py-3.5 text-teal-800 font-semibold">{appt.serviceName}</td>
                        <td className="py-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-md font-semibold text-[11px] ${
                              appt.status === 'CANCELLED'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-emerald-50 text-emerald-700'
                            }`}
                          >
                            {appt.status === 'CANCELLED' ? 'Cancelada' : 'Confirmada'}
                          </span>
                        </td>
                        <td className="py-3.5">
                          {appt.googleCalendarEventId ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Google Calendar</span>
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[11px]">Local</span>
                          )}
                        </td>
                        <td className="py-3.5 text-right">
                          <button
                            onClick={() => setSelectedAppointment(appt)}
                            className="px-3 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold text-[11px] transition-colors"
                          >
                            Gestionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= MODAL: NUEVA CITA MANUAL ================= */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Agendar Cita Odontológica</h3>
                  <p className="text-xs text-stone-500">
                    Se creará en la agenda y sincronizará en Google Calendar si está habilitado
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Nombre Completo del Paciente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lic. Carlos Henríquez"
                  value={formData.patientName}
                  onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-teal-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Teléfono (+503 El Salvador)
                  </label>
                  <input
                    type="text"
                    placeholder="+503 7123 4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-teal-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Correo Electrónico (Gmail)
                  </label>
                  <input
                    type="email"
                    placeholder="paciente@correo.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Tratamiento / Servicio Solicitado *
                </label>
                <select
                  value={formData.serviceName}
                  onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-teal-600 bg-white"
                >
                  {servicesList.map((srv, idx) => (
                    <option key={idx} value={srv}>
                      {srv}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-teal-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Hora *</label>
                  <input
                    type="time"
                    required
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-teal-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Duración</label>
                  <select
                    value={formData.durationMinutes}
                    onChange={(e) =>
                      setFormData({ ...formData, durationMinutes: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-teal-600 bg-white"
                  >
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>60 min</option>
                    <option value={90}>90 min</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Notas Clínicas o Motivo de Consulta
                </label>
                <textarea
                  rows={2}
                  placeholder="Ej: Paciente refiere dolor en molar superior derecho."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 focus:outline-teal-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-stone-600 hover:bg-stone-100"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Confirmar y Guardar Cita</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL: DETALLE / EDITAR CITA ================= */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                  {selectedAppointment.contact.name?.[0] || 'P'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    {selectedAppointment.contact.name || 'Paciente'}
                  </h3>
                  <p className="text-xs text-stone-500 font-mono">
                    ID: {selectedAppointment.id.substring(0, 10)}...
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedAppointment(null);
                  setIsEditing(false);
                }}
                className="text-stone-400 hover:text-stone-600 p-1"
              >
                ✕
              </button>
            </div>

            {isEditing ? (
              /* MODO EDICIÓN / REPROGRAMACIÓN */
              <form onSubmit={handleUpdateAppointment} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Tratamiento</label>
                  <select
                    value={selectedAppointment.serviceName}
                    onChange={(e) =>
                      setSelectedAppointment({
                        ...selectedAppointment,
                        serviceName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white"
                  >
                    {servicesList.map((srv, idx) => (
                      <option key={idx} value={srv}>
                        {srv}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Fecha y Hora Inicio
                    </label>
                    <input
                      type="datetime-local"
                      value={format(parseISO(selectedAppointment.startTime), "yyyy-MM-dd'T'HH:mm")}
                      onChange={(e) => {
                        const newStart = new Date(e.target.value);
                        const duration =
                          new Date(selectedAppointment.endTime).getTime() -
                          new Date(selectedAppointment.startTime).getTime();
                        const newEnd = new Date(newStart.getTime() + duration);
                        setSelectedAppointment({
                          ...selectedAppointment,
                          startTime: newStart.toISOString(),
                          endTime: newEnd.toISOString(),
                        });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-700 mb-1">
                      Fecha y Hora Fin
                    </label>
                    <input
                      type="datetime-local"
                      value={format(parseISO(selectedAppointment.endTime), "yyyy-MM-dd'T'HH:mm")}
                      onChange={(e) => {
                        setSelectedAppointment({
                          ...selectedAppointment,
                          endTime: new Date(e.target.value).toISOString(),
                        });
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">Notas</label>
                  <textarea
                    rows={2}
                    value={selectedAppointment.notes || ''}
                    onChange={(e) =>
                      setSelectedAppointment({
                        ...selectedAppointment,
                        notes: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl text-stone-600 hover:bg-stone-100"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-teal-700 hover:bg-teal-800 text-white shadow-2xs cursor-pointer"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            ) : (
              /* MODO VISTA DE DETALLES */
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-900">
                      {selectedAppointment.serviceName}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                        selectedAppointment.status === 'CANCELLED'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {selectedAppointment.status === 'CANCELLED' ? 'Cancelada' : 'Confirmada'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-stone-600 font-mono">
                    <Clock className="w-3.5 h-3.5 text-stone-400" />
                    <span>
                      {format(
                        parseISO(selectedAppointment.startTime),
                        "EEEE d 'de' MMMM yyyy, HH:mm",
                        { locale: es }
                      )}{' '}
                      - {format(parseISO(selectedAppointment.endTime), 'HH:mm')}
                    </span>
                  </div>

                  {selectedAppointment.contact.phone && (
                    <div className="flex items-center gap-2 text-xs text-stone-600 font-mono">
                      <Phone className="w-3.5 h-3.5 text-stone-400" />
                      <span>{selectedAppointment.contact.phone}</span>
                    </div>
                  )}

                  {selectedAppointment.contact.email && (
                    <div className="flex items-center gap-2 text-xs text-stone-600">
                      <Mail className="w-3.5 h-3.5 text-stone-400" />
                      <span>{selectedAppointment.contact.email}</span>
                    </div>
                  )}

                  {selectedAppointment.notes && (
                    <div className="pt-2 border-t border-stone-200/60 text-xs text-stone-600 italic">
                      "{selectedAppointment.notes}"
                    </div>
                  )}
                </div>

                {/* Estado de Integración Google Calendar */}
                <div className="p-3 rounded-xl border flex items-center justify-between text-xs bg-white border-stone-200">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        selectedAppointment.googleCalendarEventId
                          ? 'bg-emerald-500'
                          : 'bg-amber-400'
                      }`}
                    />
                    <span className="text-stone-700 font-medium">Google Calendar:</span>
                  </div>
                  {selectedAppointment.googleCalendarEventId ? (
                    <span className="text-emerald-700 font-semibold text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Sincronizado en tiempo real
                    </span>
                  ) : (
                    <span className="text-stone-400 text-[11px]">Guardado localmente</span>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="flex items-center justify-between pt-3 border-t border-stone-100">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteAppointment(selectedAppointment.id)}
                      disabled={actionLoading}
                      className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Eliminar de la BD"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {selectedAppointment.status !== 'CANCELLED' && (
                      <button
                        onClick={() => handleCancelAppointment(selectedAppointment.id)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors"
                      >
                        Cancelar Cita
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-800 text-xs font-bold border border-teal-200 transition-colors"
                    >
                      Reprogramar / Editar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

