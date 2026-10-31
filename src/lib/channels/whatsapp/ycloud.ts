import {
  IWhatsAppAdapter,
  SendMessageOptions,
  SendMessageResult,
  WhatsAppStatusInfo,
} from './adapter';
import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import { ConnectionStatus, WhatsAppProvider } from '@prisma/client';

export class YCloudWhatsAppAdapter implements IWhatsAppAdapter {
  providerName: WhatsAppProvider = WhatsAppProvider.YCLOUD;
  private baseUrl = 'https://api.ycloud.com/v2';

  private async getCredentials(): Promise<{ apiKey: string; fromNumberId?: string; wabaId?: string }> {
    const channel = await prisma.channelConfig.findUnique({
      where: { type: 'WHATSAPP' },
    });

    if (!channel?.ycloudApiKeyEnc) {
      throw new Error('API Key de YCloud no configurada en Canales.');
    }

    const apiKey = decrypt(channel.ycloudApiKeyEnc);
    return {
      apiKey,
      fromNumberId: channel.ycloudPhoneNumberId || undefined,
      wabaId: channel.ycloudWabaId || undefined,
    };
  }

  async getStatus(): Promise<WhatsAppStatusInfo> {
    const channel = await prisma.channelConfig.findUnique({
      where: { type: 'WHATSAPP' },
    });

    if (!channel?.ycloudApiKeyEnc) {
      return {
        provider: WhatsAppProvider.YCLOUD,
        status: ConnectionStatus.DISCONNECTED,
        phoneNumber: null,
        businessName: null,
        lastError: 'Falta configurar la API Key de YCloud',
      };
    }

    try {
      const { apiKey } = await this.getCredentials();
      // Diagnóstico contra endpoint oficial de cuentas o phone numbers
      const res = await fetch(`${this.baseUrl}/whatsapp/phoneNumbers`, {
        headers: {
          'X-API-Key': apiKey,
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        const firstNum = data.items?.[0];
        return {
          provider: WhatsAppProvider.YCLOUD,
          status: ConnectionStatus.CONNECTED,
          phoneNumber: firstNum?.phoneNumber || channel.waPhoneNumber || '+503 Oficial WABA',
          businessName: firstNum?.verifiedName || channel.waBusinessName || 'Clínica Dental San Salvador',
          wabaId: firstNum?.wabaId || channel.ycloudWabaId,
        };
      }

      return {
        provider: WhatsAppProvider.YCLOUD,
        status: ConnectionStatus.ERROR,
        lastError: `Respuesta de YCloud HTTP ${res.status}`,
      };
    } catch (e: any) {
      return {
        provider: WhatsAppProvider.YCLOUD,
        status: ConnectionStatus.ERROR,
        lastError: e.message,
      };
    }
  }

  async connect(): Promise<void> {
    // Para YCloud, verificar validez de clave y marcar estado CONNECTED
    const status = await this.getStatus();
    await prisma.channelConfig.update({
      where: { type: 'WHATSAPP' },
      data: {
        waProvider: WhatsAppProvider.YCLOUD,
        waStatus: status.status,
        waPhoneNumber: status.phoneNumber,
        waBusinessName: status.businessName,
      },
    });
  }

  async disconnect(): Promise<void> {
    await prisma.channelConfig.update({
      where: { type: 'WHATSAPP' },
      data: {
        waStatus: ConnectionStatus.DISCONNECTED,
      },
    });
  }

  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    const { apiKey, fromNumberId } = await this.getCredentials();

    let payload: any = {
      to: options.to,
      from: fromNumberId,
    };

    if (options.template) {
      // Envío de plantilla aprobada de WhatsApp Business (para recordatorios de cita fuera de 24h)
      payload.type = 'template';
      payload.template = {
        name: options.template.name,
        language: { code: options.template.language || 'es' },
        components: options.template.components || [],
      };
    } else {
      // Mensaje de texto estándar dentro de la ventana de atención de 24h
      payload.type = 'text';
      payload.text = {
        body: options.text,
      };
    }

    const res = await fetch(`${this.baseUrl}/whatsapp/messages/send`, {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        externalId: '',
        success: false,
        status: 'FAILED',
        error: data.message || `HTTP ${res.status}`,
      };
    }

    return {
      externalId: data.id || 'ycloud_' + Date.now(),
      success: true,
      status: data.status || 'SENT',
    };
  }

  async sendTyping(to: string): Promise<void> {
    // YCloud no requiere llamada explícita para typing en WABA estándar
  }
}

