import {
  IWhatsAppAdapter,
  SendMessageOptions,
  SendMessageResult,
  WhatsAppStatusInfo,
} from './adapter';
import { prisma } from '@/lib/prisma';
import {
  ConnectionStatus,
  WhatsAppProvider,
  ChannelType,
  ConversationStatus,
  MessageSender,
} from '@prisma/client';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

// Gestor de instancia Baileys viva en el proceso Node (Worker o API)
let baileysSocket: any = null;
let currentQrDataUrl: string | null = null;
let currentStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
let connectedPhone: string | null = null;
let isConnecting = false;

export class BaileysWhatsAppAdapter implements IWhatsAppAdapter {
  providerName: WhatsAppProvider = WhatsAppProvider.BAILEYS;

  private getSessionDir(): string {
    const sessionDir = process.env.WHATSAPP_SESSION_DIR || './whatsapp-session';
    return path.resolve(process.cwd(), sessionDir);
  }

  cleanSessionFolder(): void {
    const dir = this.getSessionDir();
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log('[Baileys] Carpeta de sesión eliminada para reinicio limpio.');
      } catch (e) {
        console.error('[Baileys] Error eliminando carpeta de sesión:', e);
      }
    }
  }

  async getStatus(): Promise<WhatsAppStatusInfo> {
    const channel = await prisma.channelConfig.findUnique({
      where: { type: 'WHATSAPP' },
    });

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

  async connect(forceFresh = false): Promise<void> {
    // Si ya está conectado y no se forzó reinicio, no hacer nada
    if (baileysSocket && currentStatus === ConnectionStatus.CONNECTED && !forceFresh) {
      return;
    }

    // Evitar llamadas concurrentes mientras se conecta
    if (isConnecting && !forceFresh) {
      return;
    }

    isConnecting = true;

    if (forceFresh) {
      await this.disconnect();
      this.cleanSessionFolder();
    }

    const sessionDir = this.getSessionDir();
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    try {
      if (baileysSocket && forceFresh) {
        try {
          baileysSocket.end();
        } catch {}
        baileysSocket = null;
      }

      const baileysModule = await import('@whiskeysockets/baileys');
      const makeWASocket = baileysModule.default || baileysModule.makeWASocket;
      const { useMultiFileAuthState, DisconnectReason, Browsers } = baileysModule;
      const pino = (await import('pino')).default;

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

      currentStatus = ConnectionStatus.CONNECTING;
      await this.persistStatus();

      // Usar perfil oficial reconocido por WhatsApp Business
      baileysSocket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: Browsers.appropriate('Desktop'),
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
      });

      baileysSocket.ev.on('creds.update', saveCreds);

      baileysSocket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          // Generar código QR como Data URL PNG para mostrarlo grande en el panel
          currentQrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
          currentStatus = ConnectionStatus.WAITING_QR;
          await this.persistStatus();
          console.log('[Baileys] Código QR listo para escanear.');
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const isRegistered = !!(state?.creds as any)?.registered;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          console.log(`[Baileys] Conexión cerrada (status ${statusCode}, registrado: ${isRegistered}).`);

          currentQrDataUrl = null;

          if (statusCode === DisconnectReason.loggedOut || (statusCode === 428 && !isRegistered)) {
            console.log('[Baileys] Sesión expirada o desvinculada. Limpiando para nuevo intento limpio...');
            currentStatus = ConnectionStatus.DISCONNECTED;
            connectedPhone = null;
            await this.persistStatus();
            this.cleanSessionFolder();
          } else if (shouldReconnect) {
            currentStatus = ConnectionStatus.CONNECTING;
            await this.persistStatus();
            console.log('[Baileys] Reconectando sesión tras cierre temporal...');
            setTimeout(() => {
              isConnecting = false;
              this.connect(false);
            }, 2500);
          }
        } else if (connection === 'open') {
          currentStatus = ConnectionStatus.CONNECTED;
          currentQrDataUrl = null;
          isConnecting = false;
          const userJid = baileysSocket?.user?.id || '';
          connectedPhone = userJid.split(':')[0] || userJid.split('@')[0];
          console.log(`[Baileys] WhatsApp Conectado exitosamente con número: ${connectedPhone}`);
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

          const text =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            msg.message.imageMessage?.caption ||
            '';
          if (!text.trim()) continue;

          const rawNumber = senderJid.split('@')[0].replace(/\D/g, '');
          const phone = '+' + rawNumber;
          const pushName = msg.pushName || 'Cliente WhatsApp';

          try {
            console.log(`[Baileys] Mensaje entrante de ${phone} (${pushName}): "${text}"`);

            // 1. Crear o actualizar contacto
            const contact = await prisma.contact.upsert({
              where: { phone },
              update: {
                name: pushName,
                waLid: msg.key.participant || undefined,
              },
              create: {
                name: pushName,
                phone,
                waLid: msg.key.participant || undefined,
              },
            });

            // 2. Crear o recuperar conversación
            let conv = await prisma.conversation.findFirst({
              where: {
                contactId: contact.id,
                channel: ChannelType.WHATSAPP,
              },
              orderBy: { updatedAt: 'desc' },
            });

            if (!conv) {
              conv = await prisma.conversation.create({
                data: {
                  contactId: contact.id,
                  channel: ChannelType.WHATSAPP,
                  waProvider: WhatsAppProvider.BAILEYS,
                  status: ConversationStatus.BOT_ACTIVE,
                },
              });
            }

            // 3. Guardar mensaje en BD
            await prisma.message.create({
              data: {
                conversationId: conv.id,
                sender: MessageSender.CUSTOMER,
                text,
                externalId: msg.key.id || undefined,
              },
            });

            // Actualizar conversación
            await prisma.conversation.update({
              where: { id: conv.id },
              data: {
                lastMessageAt: new Date(),
                unreadCount: { increment: 1 },
              },
            });

            // 4. Encolar con debounce de 8 segundos en WorkerJob
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

            console.log(`[Baileys] Mensaje registrado en BD y encolado en WorkerJob (ID Conv: ${conv.id})`);
          } catch (e) {
            console.error('[Baileys] Error procesando mensaje entrante:', e);
          }
        }
      });
    } catch (err: any) {
      console.error('[Baileys] Error iniciando conexión:', err);
      currentStatus = ConnectionStatus.ERROR;
      await this.persistStatus();
    } finally {
      isConnecting = false;
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

    this.cleanSessionFolder();

    currentStatus = ConnectionStatus.DISCONNECTED;
    currentQrDataUrl = null;
    connectedPhone = null;
    isConnecting = false;
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
