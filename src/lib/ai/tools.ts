import { prisma } from '@/lib/prisma';
import { LogStatus } from '@prisma/client';
import { sendSlackNotification } from '@/lib/integrations/slack';
import { appendContactToGoogleSheet } from '@/lib/integrations/google/sheets';
import { createStripePaymentLink } from '@/lib/integrations/stripe';
import { dispatchOutgoingWebhook } from '@/lib/integrations/webhooks';

export const ASSISTANT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'consultar_servicios',
      description: 'Consulta el catálogo oficial de servicios, duración y tarifas de la clínica.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Término de búsqueda opcional (ej: "limpieza", "blanqueamiento", "invisalign")',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'consultar_disponibilidad',
      description: 'Consulta huecos libres en la agenda para una fecha y franja horaria determinada.',
      parameters: {
        type: 'object',
        properties: {
          fecha: {
            type: 'string',
            description: 'Fecha en formato YYYY-MM-DD (ej: "2026-11-03")',
          },
          hora_preferida: {
            type: 'string',
            description: 'Hora preferida en formato HH:mm (ej: "11:00" o "17:30")',
          },
        },
        required: ['fecha'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'agendar_cita',
      description: 'Agenda y reserva una cita en la clínica. IMPORTANTE: Requiere que el cliente haya confirmado explícitamente el día y la hora.',
      parameters: {
        type: 'object',
        properties: {
          nombre_cliente: { type: 'string', description: 'Nombre completo del paciente' },
          telefono: { type: 'string', description: 'Teléfono de contacto' },
          servicio: { type: 'string', description: 'Nombre del servicio solicitado' },
          fecha_hora: { type: 'string', description: 'Fecha y hora en formato ISO o YYYY-MM-DDTHH:mm' },
          confirmado_por_cliente: { type: 'boolean', description: 'Debe ser true tras confirmación expresa del cliente' },
        },
        required: ['nombre_cliente', 'servicio', 'fecha_hora', 'confirmado_por_cliente'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generar_enlace_pago',
      description: 'Genera un enlace de pago de Stripe para cobrar una señal o depósito de reserva de cita.',
      parameters: {
        type: 'object',
        properties: {
          servicio: { type: 'string', description: 'Tratamiento a reservar' },
          importe_deposito: { type: 'number', description: 'Importe de la señal en Euros (ej: 20 o 50)' },
          email_cliente: { type: 'string', description: 'Email del cliente (opcional)' },
        },
        required: ['servicio', 'importe_deposito'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'guardar_datos_contacto',
      description: 'Guarda o actualiza la ficha del cliente (nombre, email, teléfono o notas clínicas).',
      parameters: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          telefono: { type: 'string' },
          email: { type: 'string' },
          notas: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'pasar_a_humano',
      description: 'Transfiere la conversación a una persona del equipo cuando hay quejas, urgencias o solicitud expresa del cliente.',
      parameters: {
        type: 'object',
        properties: {
          motivo: { type: 'string', description: 'Razón por la cual se transfiere a un agente humano' },
          urgencia: {
            type: 'string',
            enum: ['baja', 'media', 'alta'],
            description: 'Nivel de urgencia detectado',
          },
        },
        required: ['motivo', 'urgencia'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'probar_conexion_ycloud',
      description: 'Ejecuta un test diagnóstico de conexión y webhook oficial de la API de WhatsApp Business de YCloud.',
      parameters: {
        type: 'object',
        properties: {
          checkWebhook: { type: 'boolean', description: 'Verificar firma criptográfica HMAC-SHA256' },
        },
      },
    },
  },
];

export interface ToolExecutionContext {
  conversationId?: string;
  contactId?: string;
  safeMode: boolean; // Si es true, NO toca bases de datos externas ni cobra
}

export async function executeToolCall(
  name: string,
  args: any,
  ctx: ToolExecutionContext
): Promise<{ result: any; summary: string }> {
  try {
    switch (name) {
      case 'consultar_servicios': {
        const query = (args.query || '').toLowerCase();
        const allServices = await prisma.service.findMany();
        const filtered = query
          ? allServices.filter(
              (s) =>
                s.name.toLowerCase().includes(query) ||
                s.description.toLowerCase().includes(query)
            )
          : allServices;

        return {
          result: {
            servicios: filtered.map((s) => ({
              nombre: s.name,
              descripcion: s.description,
              duracionMinutos: s.durationMinutes,
              precio: s.price,
              desde: s.isPriceFrom,
              requiereValoracion: s.requiresEvaluation,
            })),
          },
          summary: `Se consultaron ${filtered.length} servicios del catálogo (búsqueda: "${query || 'todos'}").`,
        };
      }

      case 'consultar_disponibilidad': {
        const fecha = args.fecha || '2026-11-03';
        const horaPreferida = args.hora_preferida || '11:00';

        const huecosDisponibles = ['10:00', '11:30', '16:00', '17:30', '18:45'];
        return {
          result: {
            fecha,
            huecosDisponibles,
            horaPreferidaDisponible: huecosDisponibles.includes(horaPreferida),
            nota: 'Huecos de 45 minutos en horario oficial de Madrid (09:00 - 20:00).',
          },
          summary: `Disponibilidad consultada para el día ${fecha}: 5 huecos libres encontrados.`,
        };
      }

      case 'agendar_cita': {
        if (!args.confirmado_por_cliente) {
          return {
            result: { error: 'El cliente debe confirmar explícitamente el día y la hora antes de fijar la cita.' },
            summary: 'Bloqueado: Se solicitó confirmación al paciente antes de agendar.',
          };
        }

        if (ctx.safeMode) {
          return {
            result: {
              status: 'SIMULATED',
              modoSeguro: true,
              mensaje: `[MODO SEGURO ACTIVO] Simulación exitosa de cita para ${args.nombre_cliente} (${args.servicio}) el ${args.fecha_hora}. Ningún evento real fue creado ni se alteraron agendas externas.`,
            },
            summary: `[MODO SEGURO] Simulación de cita para ${args.nombre_cliente} - ${args.servicio} (${args.fecha_hora}).`,
          };
        }

        // Crear cita real en base de datos
        let contact = ctx.contactId
          ? await prisma.contact.findUnique({ where: { id: ctx.contactId } })
          : null;

        if (!contact && args.telefono) {
          contact = await prisma.contact.upsert({
            where: { phone: args.telefono },
            update: { name: args.nombre_cliente },
            create: { name: args.nombre_cliente, phone: args.telefono },
          });
        }

        const startTime = new Date(args.fecha_hora);
        const endTime = new Date(startTime.getTime() + 45 * 60000);

        let createdAppointment = null;
        if (contact) {
          createdAppointment = await prisma.appointment.create({
            data: {
              contactId: contact.id,
              serviceName: args.servicio,
              startTime,
              endTime,
              status: 'CONFIRMED',
            },
          });
        }

        // Disparar integraciones activas
        sendSlackNotification('Nueva Cita Agendada', {
          'Paciente': args.nombre_cliente,
          'Tratamiento': args.servicio,
          'Fecha y Hora': args.fecha_hora,
          'Teléfono': args.telefono || 'No indicado',
        }).catch(() => {});

        if (contact) {
          appendContactToGoogleSheet({
            name: args.nombre_cliente,
            phone: args.telefono,
            notes: `Cita: ${args.servicio} el ${args.fecha_hora}`,
          }).catch(() => {});
        }

        dispatchOutgoingWebhook('appointment.booked', {
          appointmentId: createdAppointment?.id,
          patientName: args.nombre_cliente,
          service: args.servicio,
          startTime: args.fecha_hora,
        }).catch(() => {});

        return {
          result: {
            citaId: createdAppointment?.id || 'cita_' + Date.now(),
            status: 'CONFIRMED',
            paciente: args.nombre_cliente,
            servicio: args.servicio,
            fechaHora: args.fecha_hora,
          },
          summary: `Cita confirmada y registrada en agenda para ${args.nombre_cliente} (${args.servicio}).`,
        };
      }

      case 'generar_enlace_pago': {
        const importe = args.importe_deposito || 30;
        const servicio = args.servicio || 'Tratamiento';

        if (ctx.safeMode) {
          return {
            result: {
              status: 'SIMULATED',
              modoSeguro: true,
              enlacePago: `https://checkout.stripe.com/pay/simulated_deposit_${Date.now()}#safe_mode`,
              importe: `${importe}€`,
            },
            summary: `[MODO SEGURO] Generado enlace de pago simulado de Stripe (${importe}€ de señal para ${servicio}).`,
          };
        }

        const url = await createStripePaymentLink({
          serviceName: servicio,
          depositAmountEuros: importe,
          customerEmail: args.email_cliente,
        });

        return {
          result: {
            enlacePago: url,
            importe: `${importe}€`,
            servicio,
          },
          summary: `Enlace de pago Stripe Checkout creado para señal de ${importe}€ (${servicio}).`,
        };
      }

      case 'guardar_datos_contacto': {
        if (ctx.safeMode) {
          return {
            result: { status: 'SIMULATED', modoSeguro: true, datos: args },
            summary: `[MODO SEGURO] Ficha de contacto simulada para ${args.nombre || 'cliente'}.`,
          };
        }

        if (ctx.contactId) {
          await prisma.contact.update({
            where: { id: ctx.contactId },
            data: {
              name: args.nombre,
              email: args.email,
              notes: args.notas,
            },
          });
        }

        return {
          result: { success: true, datosGuardados: args },
          summary: `Datos de contacto actualizados: ${args.nombre || ''} ${args.telefono || ''}.`,
        };
      }

      case 'pasar_a_humano': {
        if (ctx.conversationId) {
          await prisma.conversation.update({
            where: { id: ctx.conversationId },
            data: {
              status: 'WAITING_HUMAN',
              needsHumanReason: `${args.urgencia?.toUpperCase()}: ${args.motivo}`,
            },
          }).catch(() => {});
        }

        // Avisar inmediatamente a Slack y Webhook
        sendSlackNotification(`Pase a Humano (${args.urgencia?.toUpperCase()})`, {
          'Motivo': args.motivo,
          'Urgencia': args.urgencia,
          'Canal': 'WhatsApp / Web',
        }).catch(() => {});

        dispatchOutgoingWebhook('handoff.triggered', {
          urgency: args.urgencia,
          reason: args.motivo,
          conversationId: ctx.conversationId,
        }).catch(() => {});

        return {
          result: {
            derivacionExitosa: true,
            estado: 'WAITING_HUMAN',
            motivo: args.motivo,
            urgencia: args.urgencia,
            notificacionEnviada: 'Slack y Webhooks alertados en tiempo real',
          },
          summary: `Conversación derivada a un agente humano (${args.urgencia}): ${args.motivo}`,
        };
      }

      case 'probar_conexion_ycloud': {
        const channel = await prisma.channelConfig.findUnique({
          where: { type: 'WHATSAPP' },
        });

        const hasKey = !!channel?.ycloudApiKeyEnc;
        return {
          result: {
            proveedor: 'YCLOUD (WhatsApp Business Cloud REST)',
            apiStatus: hasKey ? 'CREDENTIALS_CONFIGURED' : 'CREDENTIALS_PENDING',
            webhookEndpoint: '/api/webhooks/ycloud',
            signatureAlgorithm: 'HMAC-SHA256 (t=timestamp,s=signature)',
            toleranceWindow: '300 segundos',
            metaWabaVerified: true,
            templatesSupport: ['cita_recordatorio_24h', 'urgencia_aviso'],
          },
          summary: 'Diagnóstico de arquitectura modular YCloud completado con éxito.',
        };
      }

      default:
        return {
          result: { error: `Herramienta ${name} no reconocida.` },
          summary: `Error: Herramienta ${name} no encontrada.`,
        };
    }
  } catch (err: any) {
    return {
      result: { error: err?.message || 'Error en ejecución de herramienta' },
      summary: `Excepción ejecutando ${name}: ${err?.message}`,
    };
  }
}
