import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyYCloudWebhookSignature } from '@/lib/channels/whatsapp/ycloud-signature';
import { decrypt } from '@/lib/crypto';
import { LogStatus, MessageSender, ChannelType, WhatsAppProvider } from '@prisma/client';
import { recordLeadInGoogleSheets } from '@/lib/integrations/google/sheets';

export async function POST(req: Request) {
  try {
    // 1. Obtener la configuración del canal WhatsApp y el secreto de webhook
    const channel = await prisma.channelConfig.findUnique({
      where: { type: 'WHATSAPP' },
    });

    const signatureHeader = req.headers.get('ycloud-signature');
    let signingSecret = '';
    if (channel?.ycloudWebhookSecretEnc) {
      try {
        signingSecret = decrypt(channel.ycloudWebhookSecretEnc);
      } catch {}
    }

    // 2. Extraer el raw body exacto para verificación criptográfica estricta
    const rawBody = await req.text();

    // 3. Verificación criptográfica si hay secreto configurado
    if (signingSecret) {
      const verification = verifyYCloudWebhookSignature({
        rawBody,
        signatureHeader,
        signingSecret,
        toleranceSeconds: 300,
      });

      if (!verification.valid) {
        console.warn('[YCloud Webhook] Firma inválida:', verification.reason);
        await prisma.activityLog.create({
          data: {
            action: 'ycloud.webhook_rejected',
            status: LogStatus.ERROR,
            details: { reason: verification.reason, signatureHeader },
          },
        }).catch(() => {});

        return NextResponse.json(
          { error: `Firma criptográfica inválida: ${verification.reason}` },
          { status: 401 }
        );
      }
    }

    // 4. Parsear el payload JSON verificado
    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Payload JSON no válido' }, { status: 400 });
    }

    const eventType = payload.type || 'unknown';
    const eventId = payload.id || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 5. Control de Idempotencia: comprobar si este evento ya fue procesado
    const existingLog = await prisma.activityLog.findFirst({
      where: {
        action: 'ycloud.webhook_received',
        details: { path: ['eventId'], equals: eventId },
      },
    });

    if (existingLog) {
      console.log(`[YCloud Webhook] Evento duplicado detectado (idempotencia aplicada): ${eventId}`);
      return NextResponse.json({ success: true, duplicate: true, eventId });
    }

    // Registrar en auditoría
    await prisma.activityLog.create({
      data: {
        action: 'ycloud.webhook_received',
        channel: ChannelType.WHATSAPP,
        status: LogStatus.INFO,
        details: {
          eventId,
          eventType,
          sender: payload.whatsappInboundMessage?.from || payload.whatsappMessage?.to,
        },
      },
    }).catch(() => {});

    // 6. Procesar mensaje entrante si es whatsapp.inbound_message.received
    if (eventType === 'whatsapp.inbound_message.received' && payload.whatsappInboundMessage) {
      const inbound = payload.whatsappInboundMessage;
      const fromPhone = inbound.from; // Número internacional (ej: "+50371234567")
      const text = inbound.text?.body || '';
      const bsuid = inbound.customerProfile?.id || inbound.from; // BSUID oficial de YCloud / Meta
      const customerName = inbound.customerProfile?.name || 'Cliente WhatsApp';

      // Crear o actualizar contacto unificado
      const contact = await prisma.contact.upsert({
        where: { phone: fromPhone },
        update: {
          name: customerName,
          ycloudBsuid: bsuid,
        },
        create: {
          name: customerName,
          phone: fromPhone,
          ycloudBsuid: bsuid,
        },
      });

      // Sincronizar automáticamente nuevo lead a Google Sheets
      recordLeadInGoogleSheets({
        name: customerName,
        phone: fromPhone,
        channel: 'WHATSAPP_YCLOUD',
        notes: text ? text.substring(0, 80) : 'Primer contacto YCloud',
      }).catch(() => {});

      // Crear o recuperar conversación activa
      let conversation = await prisma.conversation.findFirst({
        where: {
          contactId: contact.id,
          channel: ChannelType.WHATSAPP,
        },
        orderBy: { updatedAt: 'desc' },
      });

      if (!conversation) {
        conversation = await prisma.conversation.create({
          data: {
            contactId: contact.id,
            channel: ChannelType.WHATSAPP,
            waProvider: WhatsAppProvider.YCLOUD,
            status: 'BOT_ACTIVE',
          },
        });
      }

      // Guardar mensaje recibido
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: MessageSender.CUSTOMER,
          text: text || '[Mensaje multimedia o adjunto]',
          externalId: inbound.id,
        },
      });

      // Encolar trabajo para el worker (debounce de 8s y respuesta IA unificada)
      await prisma.workerJob.create({
        data: {
          type: 'PROCESS_INBOUND',
          payload: {
            conversationId: conversation.id,
            contactId: contact.id,
            channel: 'WHATSAPP_YCLOUD',
            text,
            to: fromPhone,
            bsuid,
          },
          scheduledFor: new Date(Date.now() + 8000), // Debounce de 8 segundos
        },
      });
    }

    // Responder 200 OK inmediatamente según especificación de YCloud
    return NextResponse.json({ success: true, eventId, eventType });
  } catch (error: any) {
    console.error('Error procesando webhook de YCloud:', error);
    return NextResponse.json({ error: 'Error interno de procesamiento' }, { status: 500 });
  }
}
