import {
  IWhatsAppAdapter,
  SendMessageOptions,
  SendMessageResult,
  WhatsAppStatusInfo,
} from './adapter';
import { prisma } from '@/lib/prisma';
import { ConnectionStatus, WhatsAppProvider } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

// Gestor de instancia Baileys viva en el proceso Node (Worker o API)
let baileysSocket: any = null;
let currentQrDataUrl: string | null = null;
let currentStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
let connectedPhone: string | null = null;

export class BaileysWhatsAppAdapter implements IWhatsAppAdapter {
  providerName: WhatsAppProvider = WhatsAppProvider.BAILEYS;

  async getStatus(): Promise<WhatsAppStatusInfo> {
    const channel = await prisma.channelConfig.findUnique({
      where: { type: 'WHATSAPP' },
    });

    return {
      provider: WhatsAppProvider.BAILEYS,
      status: currentStatus,
      phoneNumber: connectedPhone || channel?.waPhoneNumber,
      businessName: channel?.waBusinessName || 'Clínica Dental Lumen',
      qrCode: currentQrDataUrl || channel?.baileysQrCode,
    };
  }

  async connect(): Promise<void> {
    const sessionDir = process.env.WHATSAPP_SESSION_DIR || './whatsapp-session';
    const absoluteSessionDir = path.resolve(process.cwd(), sessionDir);

    if (!fs.existsSync(absoluteSessionDir)) {
      fs.mkdirSync(absoluteSessionDir, { recursive: true });
    }

    try {
      const baileysModule = await import('@whiskeysockets/baileys');
      const makeWASocket = baileysModule.default || baileysModule.makeWASocket;
      const { useMultiFileAuthState, DisconnectReason } = baileysModule;
      const pino = (await import('pino')).default;

      const { state, saveCreds } = await useMultiFileAuthState(absoluteSessionDir);

      currentStatus = ConnectionStatus.CONNECTING;
      await this.persistStatus();

      baileysSocket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Atendia', 'Chrome', '120.0.0.0'],
      });

      baileysSocket.ev.on('creds.update', saveCreds);

      baileysSocket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          // Generar código QR como Data URL PNG para mostrarlo grande en el panel
          currentQrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
          currentStatus = ConnectionStatus.WAITING_QR;
          await this.persistStatus();
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          currentStatus = ConnectionStatus.DISCONNECTED;
          currentQrDataUrl = null;
          await this.persistStatus();

          if (shouldReconnect) {
            console.log('[Baileys] Desconexión temporal. Reconectando en 5 segundos...');
            setTimeout(() => this.connect(), 5000);
          }
        } else if (connection === 'open') {
          currentStatus = ConnectionStatus.CONNECTED;
          currentQrDataUrl = null;
          const userJid = baileysSocket?.user?.id || '';
          connectedPhone = userJid.split(':')[0] || userJid.split('@')[0];
          console.log(`[Baileys] WhatsApp Conectado con éxito: ${connectedPhone}`);
          await this.persistStatus();
        }
      });
    } catch (err: any) {
      console.error('[Baileys] Error iniciando conexión:', err);
      currentStatus = ConnectionStatus.ERROR;
      await this.persistStatus();
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (baileysSocket) {
        await baileysSocket.logout();
        baileysSocket.end();
        baileysSocket = null;
      }
    } catch {}

    currentStatus = ConnectionStatus.DISCONNECTED;
    currentQrDataUrl = null;
    connectedPhone = null;
    await this.persistStatus();
  }

  async sendMessage(options: SendMessageOptions): Promise<SendMessageResult> {
    if (!baileysSocket || currentStatus !== ConnectionStatus.CONNECTED) {
      return {
        externalId: '',
        success: false,
        status: 'DISCONNECTED',
        error: 'El socket de WhatsApp Baileys no está conectado.',
      };
    }

    // Formatear destino a JID (ej: "34600111222@s.whatsapp.net")
    const cleanPhone = options.to.replace(/\D/g, '');
    const jid = `${cleanPhone}@s.whatsapp.net`;

    try {
      const sent = await baileysSocket.sendMessage(jid, { text: options.text });
      return {
        externalId: sent?.key?.id || 'baileys_' + Date.now(),
        success: true,
        status: 'SENT',
      };
    } catch (err: any) {
      return {
        externalId: '',
        success: false,
        status: 'FAILED',
        error: err.message,
      };
    }
  }

  async sendTyping(to: string): Promise<void> {
    if (!baileysSocket || currentStatus !== ConnectionStatus.CONNECTED) return;
    const cleanPhone = to.replace(/\D/g, '');
    const jid = `${cleanPhone}@s.whatsapp.net`;
    try {
      await baileysSocket.sendPresenceUpdate('composing', jid);
    } catch {}
  }

  private async persistStatus() {
    await prisma.channelConfig.update({
      where: { type: 'WHATSAPP' },
      data: {
        waProvider: WhatsAppProvider.BAILEYS,
        waStatus: currentStatus,
        waPhoneNumber: connectedPhone,
        baileysQrCode: currentQrDataUrl,
      },
    }).catch(() => {});
  }
}

