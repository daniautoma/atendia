import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getWhatsAppAdapter } from '@/lib/channels/whatsapp/factory';
import { encrypt, maskSecret } from '@/lib/crypto';
import { ConnectionStatus, WhatsAppProvider } from '@prisma/client';

export async function GET() {
  try {
    await requireAuth();

    const [channelWa, channelWeb] = await Promise.all([
      prisma.channelConfig.findUnique({ where: { type: 'WHATSAPP' } }),
      prisma.channelConfig.findUnique({ where: { type: 'WEB' } }),
    ]);

    const adapter = await getWhatsAppAdapter(channelWa?.waProvider || WhatsAppProvider.BAILEYS);
    const liveStatus = await adapter.getStatus();

    return NextResponse.json({
      whatsapp: {
        provider: channelWa?.waProvider || WhatsAppProvider.BAILEYS,
        status: liveStatus.status,
        phoneNumber: liveStatus.phoneNumber || channelWa?.waPhoneNumber,
        businessName: liveStatus.businessName || channelWa?.waBusinessName,
        qrCode: liveStatus.qrCode || channelWa?.baileysQrCode,
        wabaId: channelWa?.ycloudWabaId,
        phoneNumberId: channelWa?.ycloudPhoneNumberId,
        hasApiKey: !!channelWa?.ycloudApiKeyEnc,
        hasWebhookSecret: !!channelWa?.ycloudWebhookSecretEnc,
        maskedApiKey: channelWa?.ycloudApiKeyEnc ? maskSecret(channelWa.ycloudApiKeyEnc) : null,
      },
      web: {
        enabled: channelWeb?.webChatEnabled ?? true,
        color: channelWeb?.webChatColor || '#0d9488',
        title: channelWeb?.webChatTitle || 'Atención Clínica Lumen',
        welcome: channelWeb?.webChatWelcome || '¡Hola! ¿En qué podemos ayudarte?',
      },
      appUrl: process.env.APP_URL || 'http://localhost:3000',
    });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();

    // Actualizar configuración de WhatsApp
    if (body.whatsapp) {
      const wa = body.whatsapp;
      const updateData: any = {
        waProvider: wa.provider,
      };

      if (wa.apiKey) {
        updateData.ycloudApiKeyEnc = encrypt(wa.apiKey);
      }
      if (wa.webhookSecret) {
        updateData.ycloudWebhookSecretEnc = encrypt(wa.webhookSecret);
      }
      if (wa.wabaId !== undefined) {
        updateData.ycloudWabaId = wa.wabaId;
      }
      if (wa.phoneNumberId !== undefined) {
        updateData.ycloudPhoneNumberId = wa.phoneNumberId;
      }
      if (wa.phoneNumber !== undefined) {
        updateData.waPhoneNumber = wa.phoneNumber;
      }

      await prisma.channelConfig.update({
        where: { type: 'WHATSAPP' },
        data: updateData,
      });

      // Si se solicitó acción de conexión/desconexión
      if (wa.action === 'CONNECT') {
        const adapter = await getWhatsAppAdapter(wa.provider);
        await adapter.connect();
      } else if (wa.action === 'DISCONNECT') {
        const adapter = await getWhatsAppAdapter(wa.provider);
        await adapter.disconnect();
      }
    }

    // Actualizar configuración del Chat Web
    if (body.web) {
      const web = body.web;
      await prisma.channelConfig.update({
        where: { type: 'WEB' },
        data: {
          webChatEnabled: web.enabled,
          webChatColor: web.color,
          webChatTitle: web.title,
          webChatWelcome: web.welcome,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al actualizar canales:', error);
    return NextResponse.json({ error: error?.message || 'Error al guardar' }, { status: 500 });
  }
}

