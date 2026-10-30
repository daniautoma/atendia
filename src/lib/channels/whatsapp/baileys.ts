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

    // Usar estado en memoria o caer en el estado persistido si no está en proceso activo
    const status = currentStatus !== ConnectionStatus.DISCONNECTED
      ? currentStatus
      : (channel?.waStatus || ConnectionStatus.DISCONNECTED);

    return {
      provider: WhatsAppProvider.BAILEYS,
      status,
      phoneNumber: connectedPhone || channel?.waPhoneNumber,
      businessName: channel?.waBusinessName || 'Clínica Dental Lumen',
      qrCode: currentQrDataUrl || channel?.baileysQrCode,
    };
  }

  async connect(): Promise<void> {
    const sessionDir = process.env.WHATSAPP_SESSION_DIR || './whatsapp-session';
    const absoluteSessionDir = path.resolve(process.cwd(), sessionDir);

    // Si existen credenciales de sesión pero no llegaron a registrarse o están obsoletas,
    // limpiamos el directorio para forzar la emisión inmediata de un nuevo código QR limpio.
    if (fs.existsSync(absoluteSessionDir)) {
      const credsPath = path.join(absoluteSessionDir, 'creds.json');
      if (fs.existsSync(credsPath)) {
        try {
          const creds = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
          if (!creds.registered) {
            console.log('[Baileys] Sesión incompleta previa detectada. Limpiando para nuevo QR...');
            fs.rmSync(absoluteSessionDir, { recursive: true, force: true });
          }
        } catch {
          fs.rmSync(absoluteSessionDir, { recursive: true, force: true });
        }
      }
    }

    if (!fs.existsSync(absoluteSessionDir)) {
      fs.mkdirSync(absoluteSessionDir, { recursive: true });
    }

    try {
      // Si ya hay un socket abierto anterior, cerrarlo limpiamente
      if (baileysSocket) {
        try {
          baileysSocket.end();
        } catch {}
        baileysSocket = null;
      }

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
          console.log('[Baileys] Nuevo código QR generado y guardado para visualización.');
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[Baileys] Conexión cerrada. Status: ${statusCode}. Reconectar: ${shouldReconnect}`);

          currentStatus = ConnectionStatus.DISCONNECTED;
          currentQrDataUrl = null;
          await this.persistStatus();

          if (statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 403) {
            await this.disconnect();
          } else if (shouldReconnect) {
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

      // Manejo de mensajes entrantes vía WhatsApp
      baileysSocket.ev.on('messages.upsert', async ({ messages, type }: any) => {
        if (type !== 'notify') return;
        for (const msg of messages) {
          if (!msg.message || msg.key.fromMe) continue;
          const senderJid = msg.key.remoteJid;
          if (!senderJid || senderJid.endsWith('@g.us')) continue;

          const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
          if (!text.trim()) continue;

          const rawNumber = senderJid.split('@')[0].replace(/\D/g, '');
          const phone = '+' + rawNumber;
          const pushName = msg.pushName || 'Usuario WhatsApp';

          try {
            let contact = await prisma.contact.findUnique({ where: { phone } });
            if (!contact) {
              contact = await prisma.contact.create({
                data: {
                  name: pushName,
                  phone,
                  channel: 'WHATSAPP',
                },
              });
            }

            let conv = await prisma.conversation.findFirst({
              where: { contactId: contact.id },
              orderBy: { updatedAt: 'desc' },
            });

            if (!conv) {
              conv = await prisma.conversation.create({
                data: {
                  contactId: contact.id,
                  channel: 'WHATSAPP',
                  status: 'BOT',
                },
              });
            }

            await prisma.message.create({
              data: {
                conversationId: conv.id,
                sender: 'USER',
                content: text,
              },
            });

            // Encolar con debounce de 8 segundos
            const scheduledFor = new Date(Date.now() + 8000);
            await prisma.workerJob.create({
              data: {
                type: 'PROCESS_INBOUND',
                payload: {
                  conversationId: conv.id,
                  contactId: contact.id,
                  channel: 'WHATSAPP',
                  text,
                  to: phone,
                },
                scheduledFor,
              },
            });
          } catch (e) {
            console.error('[Baileys] Error procesando mensaje entrante:', e);
          }
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
        await baileysSocket.logout().catch(() => {});
        baileysSocket.end();
        baileysSocket = null;
      }
    } catch {}

    const sessionDir = process.env.WHATSAPP_SESSION_DIR || './whatsapp-session';
    const absoluteSessionDir = path.resolve(process.cwd(), sessionDir);
    if (fs.existsSync(absoluteSessionDir)) {
      try {
        fs.rmSync(absoluteSessionDir, { recursive: true, force: true });
      } catch {}
    }

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
