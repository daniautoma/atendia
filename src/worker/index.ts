import 'dotenv/config';
import { prisma } from '../lib/prisma';
import { getWhatsAppAdapter } from '../lib/channels/whatsapp/factory';
import { buildSystemPrompt } from '../lib/prompt-builder';
import { callOpenRouter, OpenRouterMessage } from '../lib/ai/openrouter';
import { ASSISTANT_TOOLS, executeToolCall } from '../lib/ai/tools';
import { sendGmailEmail } from '../lib/integrations/google/gmail';
import { MessageSender, LogStatus, ConnectionStatus } from '@prisma/client';

console.log('⚙️ [Worker Atendia] Worker de fondo en ejecución.');

let isProcessingJobs = false;

/**
 * 1. Procesa trabajos encolados de mensajes entrantes (Inbound) con Debounce de 8 segundos
 */
async function processWorkerJobs() {
  if (isProcessingJobs) return;
  isProcessingJobs = true;

  try {
    const now = new Date();
    // Buscar trabajos pendientes cuya fecha programada ya haya llegado
    const pendingJobs = await prisma.workerJob.findMany({
      where: {
        status: 'PENDING',
        scheduledFor: { lte: now },
      },
      take: 5,
      orderBy: { scheduledFor: 'asc' },
    });

    for (const job of pendingJobs) {
      await prisma.workerJob.update({
        where: { id: job.id },
        data: { status: 'PROCESSING', attempts: { increment: 1 } },
      });

      try {
        const payload = job.payload as any;

        if (job.type === 'PROCESS_INBOUND') {
          await handleInboundMessageJob(payload);
        } else if (job.type === 'SEND_REMINDER') {
          await handleAppointmentReminderJob(payload);
        } else if (job.type === 'DAILY_SUMMARY') {
          await handleDailySummaryJob();
        } else if (job.type === 'WHATSAPP_CONNECT') {
          console.log('[Worker] Ejecutando orden WHATSAPP_CONNECT...');
          const adapter = await getWhatsAppAdapter('BAILEYS');
          await adapter.connect(false);
        } else if (job.type === 'WHATSAPP_RESET') {
          console.log('[Worker] Ejecutando orden WHATSAPP_RESET (Desconexión limpia + Espera 1s + Nuevo Socket)...');
          const adapter = await getWhatsAppAdapter('BAILEYS');
          await adapter.disconnect();
          await new Promise((r) => setTimeout(r, 1000));
          await adapter.connect(true);
        } else if (job.type === 'WHATSAPP_DISCONNECT') {
          console.log('[Worker] Ejecutando orden WHATSAPP_DISCONNECT...');
          const adapter = await getWhatsAppAdapter('BAILEYS');
          await adapter.disconnect();
        } else if (job.type === 'SEND_OUTBOUND') {
          console.log(`[Worker] Enviando mensaje saliente a ${payload.to}...`);
          const adapter = await getWhatsAppAdapter(payload.provider);
          await adapter.sendMessage({
            to: payload.to,
            text: payload.text,
            recipientBsuid: payload.recipientBsuid,
            waLid: payload.waLid,
          });
          console.log(`[Worker] Mensaje saliente enviado con éxito a ${payload.to}`);
        }

        await prisma.workerJob.update({
          where: { id: job.id },
          data: { status: 'COMPLETED' },
        });
      } catch (err: any) {
        console.error(`[Worker] Error ejecutando trabajo ${job.id}:`, err);
        await prisma.workerJob.update({
          where: { id: job.id },
          data: { status: 'FAILED', error: err?.message || 'Error desconocido' },
        });
      }
    }
  } catch (error) {
    console.error('[Worker] Error consultando WorkerJob:', error);
  } finally {
    isProcessingJobs = false;
  }
}

async function handleInboundMessageJob(payload: {
  conversationId: string;
  contactId: string;
  channel: string;
  text: string;
  to: string;
  bsuid?: string;
}) {
  const { conversationId, contactId, channel, to, bsuid } = payload;

  const [conversation, business] = await Promise.all([
    prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { take: 20, orderBy: { createdAt: 'asc' } },
        contact: true,
      },
    }),
    prisma.businessProfile.findFirst(),
  ]);

  if (!conversation) return;

  // Si el asistente está pausado o la conversación está en manos de una persona, no responder
  if (conversation.status === 'WAITING_HUMAN' || (business && !business.assistantActive)) {
    return;
  }

  // Activar estado 'escribiendo' en el canal antes de responder
  const adapter = await getWhatsAppAdapter();
  await adapter.sendTyping(to).catch(() => {});

  // Preparar contexto del asistente
  const [assistant, services, faqs, notes] = await Promise.all([
    prisma.assistantConfig.findFirst(),
    prisma.service.findMany({ orderBy: { name: 'asc' } }),
    prisma.faq.findMany({ orderBy: { createdAt: 'asc' } }),
    prisma.knowledgeNote.findMany({ orderBy: { createdAt: 'asc' } }),
  ]);

  const systemPrompt = buildSystemPrompt({
    assistantName: assistant?.name || 'DentalIA',
    businessName: business?.name || 'Clínica Dental San Salvador',
    activity: business?.activity || 'Odontología integral y diseño de sonrisa',
    address: business?.address || 'Paseo General Escalón #3700, San Salvador',
    phone: business?.phone || '+503 2200 1234',
    website: business?.website || 'https://dentalsansalvador.sv',
    timezone: business?.timezone || 'America/El_Salvador',
    tone: assistant?.tone || 'cercano',
    welcomeMessage: assistant?.welcomeMessage || '',
    customInstructions: assistant?.customInstructions || '',
    neverDoList: assistant?.neverDoList || '',
    businessHours: (assistant?.businessHours as any) || {},
    outsideHoursBehavior: assistant?.outsideHoursBehavior || 'APPOINTMENT_OR_MESSAGE',
    handoffRules: (assistant?.handoffRules as any) || {},
    services,
    faqs,
    knowledgeNotes: notes,
  });

  const historyMessages = (conversation.messages || []).map((m) => ({
    role: m.sender === 'CUSTOMER' ? ('user' as const) : ('assistant' as const),
    content: m.text,
  }));

  const messages: OpenRouterMessage[] = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
  ];

  let finalAssistantText = '';
  const completion = await callOpenRouter({
    model: assistant?.aiModel || 'anthropic/claude-haiku-5.5',
    fallbackModel: assistant?.aiModelFallback || 'anthropic/claude-haiku-5.5',
    messages,
    tools: ASSISTANT_TOOLS,
  });

  let executedTools = [];
  if (completion.message.tool_calls && completion.message.tool_calls.length > 0) {
    for (const call of completion.message.tool_calls) {
      let args: any = {};
      try {
        args = JSON.parse(call.function.arguments || '{}');
      } catch {}

      const toolRes = await executeToolCall(call.function.name, args, {
        safeMode: false,
        conversationId: conversation.id,
        contactId,
      });

      executedTools.push(call.function.name);
      messages.push(completion.message);
      messages.push({
        role: 'tool' as any,
        tool_call_id: call.id,
        name: call.function.name,
        content: JSON.stringify(toolRes.result),
      });
    }

    const secondPass = await callOpenRouter({
      model: assistant?.aiModel || 'anthropic/claude-haiku-5.5',
      messages,
    });
    finalAssistantText = secondPass.message.content || 'He consultado tu solicitud.';
  } else {
    finalAssistantText = completion.message.content || '¿En qué te puedo ayudar hoy?';
  }

  // Guardar mensaje generado por el asistente
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      sender: MessageSender.ASSISTANT,
      text: finalAssistantText,
      toolCalls: executedTools.length > 0 ? executedTools : undefined,
    },
  });

  // Enviar mensaje hacia WhatsApp mediante el adaptador
  await adapter.sendMessage({
    to: conversation.contact?.waLid || to,
    text: finalAssistantText,
    recipientBsuid: conversation.contact?.ycloudBsuid || bsuid,
    waLid: conversation.contact?.waLid || undefined,
  });

  console.log(`[Worker] Respuesta de DentalIA enviada a ${conversation.contact?.waLid || to} (${executedTools.length} tools usadas)`);
}

/**
 * 2. Tarea Programada: Recordatorio de citas por WhatsApp 24 horas antes
 */
async function checkUpcomingAppointments() {
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in25Hours = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const appointments = await prisma.appointment.findMany({
      where: {
        startTime: { gte: in24Hours, lte: in25Hours },
        reminderSent: false,
        status: 'CONFIRMED',
      },
      include: { contact: true },
    });

    for (const appt of appointments) {
      if (appt.contact?.phone) {
        const adapter = await getWhatsAppAdapter();
        const dateStr = appt.startTime.toLocaleDateString('es-SV', {
          timeZone: 'America/El_Salvador',
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        });

        const reminderText = `Hola ${appt.contact.name || ''}, te recordamos tu cita de mañana para ${appt.serviceName} a las ${dateStr} en Clínica Dental San Salvador (Paseo General Escalón #3700). Si necesitas reprogramarla o cancelarla, avísanos por este medio. ¡Te esperamos!`;

        await adapter.sendMessage({
          to: appt.contact.phone,
          text: reminderText,
          template: {
            name: 'cita_recordatorio_24h',
            language: 'es',
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: appt.contact.name || 'Paciente' },
                  { type: 'text', text: appt.serviceName },
                  { type: 'text', text: dateStr },
                ],
              },
            ],
          },
        });

        await prisma.appointment.update({
          where: { id: appt.id },
          data: { reminderSent: true },
        });

        await prisma.activityLog.create({
          data: {
            action: 'appointment.reminder_sent',
            status: LogStatus.SUCCESS,
            details: {
              appointmentId: appt.id,
              phone: appt.contact.phone,
              service: appt.serviceName,
            },
          },
        });

        console.log(`[Worker] Recordatorio enviado a ${appt.contact.phone} para cita de ${appt.serviceName}`);
      }
    }
  } catch (err) {
    console.error('[Worker] Error revisando recordatorios:', err);
  }
}

async function handleAppointmentReminderJob(payload: any) {
  // Manejo directo de recordatorios encolados
}

/**
 * 3. Tarea Programada: Resumen diario al equipo a las 20:00 vía Gmail
 */
async function checkDailySummarySchedule() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('es-SV', {
    timeZone: 'America/El_Salvador',
    hour: '2-digit',
    minute: '2-digit',
  });
  const timeStr = formatter.format(now);

  // A las 20:00 en hora de El Salvador
  if (timeStr === '20:00') {
    await handleDailySummaryJob();
  }
}

async function handleDailySummaryJob() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [convCount, apptCount, waitingCount, admin] = await Promise.all([
      prisma.conversation.count({ where: { updatedAt: { gte: today } } }),
      prisma.appointment.count({ where: { createdAt: { gte: today } } }),
      prisma.conversation.count({ where: { status: 'WAITING_HUMAN' } }),
      prisma.user.findFirst({ where: { role: 'ADMIN' } }),
    ]);

    const recipient = admin?.email || process.env.ADMIN_EMAIL || 'admin@atendia.local';

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; rounded: 12px;">
        <h2 style="color: #0f766e;">Resumen Diario de Atención — Atendia</h2>
        <p>Aquí tienes el balance de actividad de hoy en <b>Clínica Dental San Salvador</b>:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><b>Conversaciones atendidas hoy:</b></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #0f766e; font-size: 18px;"><b>${convCount}</b></td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><b>Citas agendadas por el asistente:</b></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: #059669; font-size: 18px;"><b>${apptCount}</b></td>
          </tr>
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;"><b>Conversaciones esperando a humano:</b></td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: ${waitingCount > 0 ? '#b91c1c' : '#374151'}; font-size: 18px;"><b>${waitingCount}</b></td>
          </tr>
        </table>
        <p style="margin-top: 24px; font-size: 12px; color: #6b7280;">Informe generado automáticamente a las 20:00 (America/El_Salvador) por Atendia.</p>
      </div>
    `;

    await sendGmailEmail({
      to: recipient,
      subject: `Resumen de Atención Atendia — ${new Date().toLocaleDateString('es-SV', { timeZone: 'America/El_Salvador' })}`,
      htmlBody,
    });

    console.log(`[Worker] Resumen diario enviado por Gmail a ${recipient}`);
  } catch (err) {
    console.log('[Worker] Resumen diario omitido (Gmail no conectado o en desarrollo):', (err as any)?.message);
  }
}

/**
 * Bucle maestro del worker (cada 1.5s para trabajos, cada 60s para citas)
 */
async function runWorkerLoop() {
  console.log('✓ [Worker] Bucle de procesamiento de colas y debounce activado.');

  // Inicializar adaptador de WhatsApp Baileys si ya estaba previamente conectado
  try {
    const waConfig = await prisma.channelConfig.findUnique({ where: { type: 'WHATSAPP' } });
    if (waConfig?.waProvider === 'BAILEYS' && waConfig?.waStatus === 'CONNECTED') {
      console.log('📱 [Worker] Conectando sesión existente de Baileys WhatsApp en background...');
      const adapter = await getWhatsAppAdapter('BAILEYS');
      await adapter.connect(false);
    }
  } catch (err) {
    console.error('[Worker] Error iniciando Baileys:', err);
  }

  let tickCount = 0;
  while (true) {
    try {
      await processWorkerJobs();

      // Cada 100 ticks (~60 segundos), revisar citas y resúmenes
      tickCount++;
      if (tickCount >= 100) {
        tickCount = 0;
        await checkUpcomingAppointments();
        await checkDailySummarySchedule();
      }

      await new Promise((resolve) => setTimeout(resolve, 600));
    } catch (err) {
      console.error('[Worker] Error en el bucle principal:', err);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

runWorkerLoop();

process.on('SIGINT', async () => {
  console.log('[Worker] Deteniendo worker...');
  await prisma.$disconnect();
  process.exit(0);
});
