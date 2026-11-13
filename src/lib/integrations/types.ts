export type AuthType = 'OAUTH2' | 'API_KEY' | 'WEBHOOK_URL' | 'CUSTOM';

export interface IntegrationCapability {
  key: string;
  label: string;
  description: string;
  default: boolean;
}

export interface IntegrationDefinition {
  id: string; // 'google_calendar' | 'gmail' | 'google_sheets' | 'slack' | 'stripe' | 'webhooks'
  name: string;
  description: string;
  category: 'google' | 'notificaciones' | 'pagos' | 'desarrollador';
  authType: AuthType;
  scopes?: string[];
  capabilities: IntegrationCapability[];
}

export const INTEGRATIONS_CATALOG: IntegrationDefinition[] = [
  {
    id: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sincronización en tiempo real de citas. Permite al asistente consultar huecos libres, reservar citas y reprogramar o cancelarlas.',
    category: 'google',
    authType: 'OAUTH2',
    scopes: ['https://www.googleapis.com/auth/calendar.events'],
    capabilities: [
      { key: 'check_availability', label: 'Consultar disponibilidad', description: 'Permite leer huecos libres en el calendario', default: true },
      { key: 'create_events', label: 'Crear nuevas citas', description: 'Permite al asistente agendar citas confirmadas', default: true },
      { key: 'modify_events', label: 'Mover o cancelar citas', description: 'Permite modificar citas existentes si el cliente lo pide', default: true },
    ],
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Envío automático de confirmaciones de cita por correo electrónico y recepción del resumen diario de actividad para el equipo.',
    category: 'google',
    authType: 'OAUTH2',
    scopes: ['https://www.googleapis.com/auth/gmail.send'],
    capabilities: [
      { key: 'send_confirmation', label: 'Enviar confirmación de cita al cliente', description: 'Manda un email con detalles de la cita agendada', default: true },
      { key: 'send_daily_summary', label: 'Enviar resumen diario a las 20:00', description: 'Manda un email al equipo con las métricas del día', default: true },
    ],
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'Crea automáticamente una hoja de cálculo «Contactos Atendia» en tu Google Drive y registra cada cliente y cita sincronizados.',
    category: 'google',
    authType: 'OAUTH2',
    scopes: ['https://www.googleapis.com/auth/drive.file'],
    capabilities: [
      { key: 'sync_contacts', label: 'Sincronizar contactos', description: 'Añade y actualiza filas con nombres, teléfonos y notas', default: true },
      { key: 'sync_appointments', label: 'Registrar historial de citas', description: 'Añade registro de cada cita agendada', default: true },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Alertas inmediatas en tu canal de Slack cuando un cliente necesita atención humana urgente o cuando se reserva una nueva cita.',
    category: 'notificaciones',
    authType: 'WEBHOOK_URL',
    capabilities: [
      { key: 'notify_handoff', label: 'Avisar cuando se pasa a humano', description: 'Envía alerta con el motivo y datos del cliente', default: true },
      { key: 'notify_appointment', label: 'Avisar de nueva cita creada', description: 'Notifica en el canal cada vez que se agenda', default: true },
    ],
  },
  {
    id: 'telegram',
    name: 'Telegram (Alertas)',
    description: 'Alertas internas inmediatas a Telegram cuando un cliente requiere intervención humana (WAITING_HUMAN).',
    category: 'notificaciones',
    authType: 'CUSTOM',
    capabilities: [
      { key: 'notify_handoff', label: 'Avisar cuando se pasa a humano', description: 'Envía alerta con el motivo, cliente y botón para abrir el panel', default: true },
    ],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Cobro de depósitos o señales de reserva mediante enlaces de pago seguros de Stripe Checkout generados en la conversación.',
    category: 'pagos',
    authType: 'API_KEY',
    capabilities: [
      { key: 'require_deposit', label: 'Generar enlace de señal para cita', description: 'Genera un enlace de pago seguro para asegurar la cita', default: false },
      { key: 'check_payment', label: 'Verificar estado del pago', description: 'Confirma la cita automáticamente una vez pagada la señal', default: false },
    ],
  },
  {
    id: 'webhooks',
    name: 'Webhooks Salientes',
    description: 'Envío de eventos en tiempo real con payload JSON firmado criptográficamente con HMAC-SHA256 hacia tu CRM, Make o n8n.',
    category: 'desarrollador',
    authType: 'CUSTOM',
    capabilities: [
      { key: 'event_conversation_created', label: 'Evento: Conversación nueva', description: 'Se dispara cuando un nuevo cliente escribe', default: true },
      { key: 'event_appointment_booked', label: 'Evento: Cita agendada', description: 'Se dispara al confirmar una cita', default: true },
      { key: 'event_contact_updated', label: 'Evento: Contacto guardado', description: 'Se dispara al recopilar datos del cliente', default: true },
      { key: 'event_handoff_triggered', label: 'Evento: Derivación a humano', description: 'Se dispara cuando el asistente cede el control', default: true },
    ],
  },
];

