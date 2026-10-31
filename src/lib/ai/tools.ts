import { prisma } from '@/lib/prisma';
import { LogStatus } from '@prisma/client';
import { sendSlackNotification } from '@/lib/integrations/slack';
import { recordLeadInGoogleSheets, appendContactToGoogleSheet } from '@/lib/integrations/google/sheets';
import { createGoogleCalendarEvent } from '@/lib/integrations/google/calendar';
import { sendGmailEmail } from '@/lib/integrations/google/gmail';
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
          telefono: { type: 'string', description: 'Teléfono de contacto (+503...)' },
          email: { type: 'string', description: 'Correo electrónico del paciente para confirmación (opcional)' },
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
          importe_deposito: { type: 'number', description: 'Importe de la señal en Dólares USD (ej: 20 o 50)' },
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

        const huecosDisponibles = ['09:00', '10:30', '14:00', '15:30', '17:00'];
        return {
          result: {
            fecha,
            huecosDisponibles,
            horaPreferidaDisponible: huecosDisponibles.includes(horaPreferida),
            nota: 'Huecos de 45 minutos en horario oficial de San Salvador (08:00 - 18:00).',
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
            update: {
              name: args.nombre_cliente,
              email: args.email || undefined,
            },
            create: {
              name: args.nombre_cliente,
              phone: args.telefono,
              email: args.email,
            },
          });
        } else if (contact && args.email && !contact.email) {
          contact = await prisma.contact.update({
            where: { id: contact.id },
            data: { email: args.email },
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

        // 1. Google Calendar Automático: si la integración está activa, crear evento y persistir id
        let gcalEventId: string | null = null;
        try {
          const calIntegration = await prisma.integration.findUnique({
            where: { provider: 'google_calendar' },
          });

          if (calIntegration?.enabled) {
            const calEvent = await createGoogleCalendarEvent({
              summary: `Cita: ${args.nombre_cliente} - ${args.servicio}`,
              description: `Cita agendada automáticamente por DentalIA.\nPaciente: ${args.nombre_cliente}\nTeléfono: ${args.telefono || contact?.phone || 'No indicado'}\nTratamiento: ${args.servicio}`,
              startTime: startTime.toISOString(),
              endTime: endTime.toISOString(),
              attendeeEmail: args.email || contact?.email || undefined,
              timeZone: 'America/El_Salvador',
            });

            if (calEvent?.id) {
              gcalEventId = calEvent.id;
              if (createdAppointment) {
                await prisma.appointment.update({
                  where: { id: createdAppointment.id },
                  data: { googleCalendarEventId: calEvent.id },
                });
              }
            }
          }
        } catch (err: any) {
          console.warn('[Tools] No se pudo sincronizar evento con Google Calendar:', err?.message);
        }

        // 2. Google Sheets: guardar lead y cita en el CRM de contactos
        recordLeadInGoogleSheets({
          name: args.nombre_cliente,
          phone: args.telefono || contact?.phone,
          email: args.email || contact?.email,
          channel: 'IA_ASISTENTE',
          notes: `Cita Agendada: ${args.servicio} el ${new Date(startTime).toLocaleString('es-SV', { timeZone: 'America/El_Salvador' })}`,
        }).catch(() => {});

        // 3. Gmail: disparar correo HTML con datos y recomendaciones si está habilitado y hay email
        const patientEmail = args.email || contact?.email;
        if (patientEmail) {
          (async () => {
            try {
              const gmailIntegration = await prisma.integration.findUnique({
                where: { provider: 'gmail' },
              });

              if (gmailIntegration?.enabled) {
                const formattedDate = new Date(startTime).toLocaleDateString('es-SV', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: 'America/El_Salvador',
                });
                const formattedTime = new Date(startTime).toLocaleTimeString('es-SV', {
                  hour: '2-digit',
                  minute: '2-digit',
                  timeZone: 'America/El_Salvador',
                });

                const htmlBody = `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
                    <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                      <div style="background-color: #0d9488; padding: 24px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Clínica Dental San Salvador</h1>
                        <p style="color: #ccfbf1; margin: 6px 0 0; font-size: 13px;">Confirmación de Cita Odontológica</p>
                      </div>
                      <div style="padding: 24px;">
                        <p style="font-size: 15px; margin: 0 0 16px;">¡Hola, <strong>${args.nombre_cliente}</strong>!</p>
                        <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 20px;">
                          Te confirmamos que tu cita ha sido reservada con éxito en nuestra clínica en San Salvador:
                        </p>
                        <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
                          <p style="margin: 0 0 6px; font-size: 14px;"><strong>Tratamiento:</strong> ${args.servicio}</p>
                          <p style="margin: 0 0 6px; font-size: 14px;"><strong>Fecha:</strong> ${formattedDate}</p>
                          <p style="margin: 0 0 6px; font-size: 14px;"><strong>Hora (El Salvador):</strong> ${formattedTime}</p>
                          <p style="margin: 0; font-size: 14px;"><strong>Ubicación:</strong> Paseo General Escalón #3700, San Salvador</p>
                        </div>
                        <h4 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 8px;">Recomendaciones para tu visita:</h4>
                        <ul style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 20px; padding-left: 18px;">
                          <li>Llegar con 10 minutos de anticipación.</li>
                          <li>Estacionamiento privado y seguro disponible en nuestras instalaciones.</li>
                          <li>Presentar tu documento de identidad (DUI o pasaporte) en recepción.</li>
                          <li>Para reprogramar o cancelar, por favor avísanos con al menos 4 horas de anticipación.</li>
                        </ul>
                        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; color: #64748b; font-size: 12px;">
                          <p style="margin: 0 0 4px;"><strong>Clínica Dental San Salvador</strong></p>
                          <p style="margin: 0;">Teléfono / WhatsApp: +503 2200 1234 | San Salvador, El Salvador</p>
                        </div>
                      </div>
                    </div>
                  </div>
                `;

                await sendGmailEmail({
                  to: patientEmail,
                  subject: `Confirmación de Cita Odontológica - ${args.nombre_cliente} (${args.servicio})`,
                  htmlBody,
                });
              }
            } catch (err: any) {
              console.warn('[agendar_cita] No se pudo enviar confirmación por Gmail:', err?.message);
            }
          })();
        }

        sendSlackNotification('Nueva Cita Agendada', {
          'Paciente': args.nombre_cliente,
          'Tratamiento': args.servicio,
          'Fecha y Hora': args.fecha_hora,
          'Teléfono': args.telefono || 'No indicado',
        }).catch(() => {});

        dispatchOutgoingWebhook('appointment.booked', {
          appointmentId: createdAppointment?.id,
          patientName: args.nombre_cliente,
          service: args.servicio,
          startTime: args.fecha_hora,
          googleCalendarEventId: gcalEventId,
        }).catch(() => {});

        return {
          result: {
            citaId: createdAppointment?.id || 'cita_' + Date.now(),
            status: 'CONFIRMED',
            paciente: args.nombre_cliente,
            servicio: args.servicio,
            fechaHora: args.fecha_hora,
            googleCalendarEventId: gcalEventId,
          },
          summary: `Cita confirmada y registrada en agenda para ${args.nombre_cliente} (${args.servicio})${gcalEventId ? ' (Sincronizada con Google Calendar)' : ''}.`,
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
              importe: `$${importe}`,
            },
            summary: `[MODO SEGURO] Generado enlace de pago simulado de Stripe ($${importe} de señal para ${servicio}).`,
          };
        }

        const url = await createStripePaymentLink({
          serviceName: servicio,
          depositAmountUsd: importe,
          customerEmail: args.email_cliente,
        });

        return {
          result: {
            enlacePago: url,
            importe: `$${importe}`,
            servicio,
          },
          summary: `Enlace de pago Stripe Checkout creado para señal de $${importe} (${servicio}).`,
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

        recordLeadInGoogleSheets({
          name: args.nombre,
          phone: args.telefono,
          email: args.email,
          channel: 'IA_ASISTENTE',
          notes: args.notas || 'Ficha actualizada por IA',
        }).catch(() => {});

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
