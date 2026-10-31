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
import { recordLeadInGoogleSheets } from '@/lib/integrations/google/sheets';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

// Gestor de instancia Baileys viva EXCLUSIVAMENTE en el proceso Worker
let baileysSocket: any = null;
let currentQrDataUrl: string | null = null;
let currentStatus: ConnectionStatus = ConnectionStatus.DISCONNECTED;
let connectedPhone: string | null = null;
let isConnecting = false;
let reconnectAttempts = 0;
let reconnectTimeout: NodeJS.Timeout | null = null;

export class BaileysWhatsAppAdapter implements IWhatsAppAdapter {
  providerName: WhatsAppProvider = WhatsAppProvider.BAILEYS;

  private getSessionDir(): string {
    const sessionDir = process.env.WHATSAPP_SESSION_DIR || './whatsapp-session';
    return path.resolve(process.cwd(), sessionDir);
  }

  /**
   * Purgado físico y seguro de los archivos de autenticación en disco.
   * Itera archivo por archivo para evitar bloqueos EPERM/EBUSY en Windows.
   */
  clearAuthFiles(): void {
    const authDir = this.getSessionDir();
    if (fs.existsSync(authDir)) {
      try {
        const files = fs.readdirSync(authDir);
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(authDir, file));
          } catch (err) {
            console.warn(`[Baileys] No se pudo borrar ${file}:`, err);
          }
        }
        console.log('[Baileys] Archivos de sesión purgados exitosamente de disco.');
      } catch (e) {
        console.error('[Baileys] Error limpiando directorio de auth:', e);
      }
    }
  }

  // Compatibilidad hacia atrás
  cleanSessionFolder(): void {
    this.clearAuthFiles();
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
      businessName: channel?.waBusinessName || 'Clínica Dental San Salvador',
      qrCode: currentQrDataUrl || channel?.baileysQrCode,
    };
  }

  async connect(forceFresh = false): Promise<void> {
    if (baileysSocket && currentStatus === ConnectionStatus.CONNECTED && !forceFresh) {
      return;
    }

    if (isConnecting && !forceFresh) {
      return;
    }

    isConnecting = true;

    if (forceFresh) {
      console.log('[Baileys] Solicitado forceFresh: desconectando socket previo y purgando disco...');
      await this.disconnect();
      // Pausa de 1 segundo para garantizar que el SO libere los descriptores de archivo
      await new Promise((r) => setTimeout(r, 1000));
      currentQrDataUrl = null;
      currentStatus = ConnectionStatus.WAITING_QR;
      await this.persistStatus();
    }

    const sessionDir = this.getSessionDir();
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }

    try {
      // Siempre cerrar y limpiar cualquier socket previo antes de crear uno nuevo
      if (baileysSocket) {
        try {
          baileysSocket.ev.removeAllListeners('connection.update');
          baileysSocket.ev.removeAllListeners('creds.update');
          baileysSocket.ev.removeAllListeners('messages.upsert');
          baileysSocket.end();
        } catch {}
        baileysSocket = null;
      }

      const baileysModule = await import('@whiskeysockets/baileys');
      const makeWASocket = baileysModule.default || baileysModule.makeWASocket;
      const { useMultiFileAuthState, DisconnectReason, Browsers } = baileysModule;
      const pino = (await import('pino')).default;

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

      if (currentStatus !== ConnectionStatus.WAITING_QR) {
        currentStatus = ConnectionStatus.CONNECTING;
        await this.persistStatus();
      }

      baileysSocket = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu('Chrome'),
        connectTimeoutMs: 60000,
        keepAliveIntervalMs: 25000,
      });

      baileysSocket.ev.on('creds.update', saveCreds);

      baileysSocket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;
        const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
        const errMsg = lastDisconnect?.error?.message;

        fs.appendFileSync(
          'baileys-debug.log',
          `[${new Date().toISOString()}] connection=${connection}, hasQr=${!!qr}, statusCode=${statusCode}, errMsg=${errMsg}\n`
        );

        if (qr) {
          // Generar código QR PNG y persistirlo en PostgreSQL
          currentQrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
          currentStatus = ConnectionStatus.WAITING_QR;
          await this.persistStatus();
          console.log('[Baileys] Código QR generado y guardado en BD.');
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const isRegistered = !!(state?.creds as any)?.registered;
          baileysSocket = null;

          console.log(`[Baileys] Conexión cerrada (status ${statusCode}, registrado: ${isRegistered}).`);

          if (statusCode === DisconnectReason.loggedOut) {
            console.log('[Baileys] Sesión desvinculada por el usuario (loggedOut). Purgando credenciales...');
            this.clearAuthFiles();
            currentStatus = ConnectionStatus.DISCONNECTED;
            currentQrDataUrl = null;
            connectedPhone = null;
            isConnecting = false;
            reconnectAttempts = 0;
            await this.persistStatus();
          } else {
            // Reconexión con Backoff exponencial seguro
            reconnectAttempts++;
            const delay = Math.min(2000 * Math.pow(1.5, reconnectAttempts), 30000);
            console.log(`[Baileys] Reconectando sesión en ${Math.round(delay / 1000)}s (intento ${reconnectAttempts})...`);
            if (reconnectTimeout) clearTimeout(reconnectTimeout);
            reconnectTimeout = setTimeout(() => {
              isConnecting = false;
              this.connect(false);
            }, delay);
          }
        } else if (connection === 'open') {
          reconnectAttempts = 0;
          if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
          }
          currentStatus = ConnectionStatus.CONNECTED;
          currentQrDataUrl = null; // Conexión abierta: ya no se necesita QR
          isConnecting = false;
          const userJid = baileysSocket?.user?.id || '';
          connectedPhone = userJid.split(':')[0] || userJid.split('@')[0];
          console.log(`[Baileys] ✅ WhatsApp CONECTADO con éxito: ${connectedPhone}`);
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

            // 1. Crear o actualizar contacto guardando su senderJid en waLid
            const contact = await prisma.contact.upsert({
              where: { phone },
              update: {
                name: pushName,
                waLid: senderJid,
              },
              create: {
                name: pushName,
                phone,
                waLid: senderJid,
              },
            });

            // Sincronizar nuevo lead en Google Sheets
            recordLeadInGoogleSheets({
              name: pushName,
              phone,
              channel: 'WHATSAPP_BAILEYS',
              notes: text ? text.substring(0, 80) : 'Primer contacto Baileys',
            }).catch(() => {});

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

            console.log(`[Baileys] Mensaje guardado en BD y encolado en WorkerJob (Conv ID: ${conv.id})`);
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
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    reconnectAttempts = 0;

    if (baileysSocket) {
      try {
        baileysSocket.ev.removeAllListeners('connection.update');
        baileysSocket.ev.removeAllListeners('creds.update');
        baileysSocket.ev.removeAllListeners('messages.upsert');
        await baileysSocket.logout().catch(() => {});
        baileysSocket.end();
      } catch (err) {
        console.warn('[Baileys] Error cerrando socket:', err);
      }
      baileysSocket = null;
    }

    this.clearAuthFiles();

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

    let jid = options.waLid || options.to;
    if (!jid.includes('@')) {
      const clean = jid.replace(/\D/g, '');
      if (options.recipientBsuid?.endsWith('@lid')) {
        jid = options.recipientBsuid;
      } else if (clean.length > 13) {
        // Los LIDs de WhatsApp típicamente tienen 15 dígitos
        jid = `${clean}@lid`;
      } else {
        jid = `${clean}@s.whatsapp.net`;
      }
    }

    try {
      console.log(`[Baileys] Enviando mensaje WhatsApp a destino ${jid}: "${options.text.substring(0, 50)}..."`);
      const sent = await baileysSocket.sendMessage(jid, { text: options.text });
      return {
        externalId: sent?.key?.id || 'baileys_' + Date.now(),
        success: true,
        status: 'SENT',
      };
    } catch (err: any) {
      console.error(`[Baileys] Error enviando mensaje a ${jid}:`, err?.message);
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
    let jid = to;
    if (!jid.includes('@')) {
      const clean = jid.replace(/\D/g, '');
      jid = clean.length > 13 ? `${clean}@lid` : `${clean}@s.whatsapp.net`;
    }
    try {
      await baileysSocket.sendPresenceUpdate('composing', jid);
    } catch {}
  }

  private async persistStatus() {
    fs.appendFileSync(
      'baileys-debug.log',
      `[${new Date().toISOString()}] persistStatus: status=${currentStatus}, hasQr=${!!currentQrDataUrl}\n`
    );

    const data: any = {
      waProvider: WhatsAppProvider.BAILEYS,
      waStatus: currentStatus,
      waPhoneNumber: connectedPhone,
    };

    if (currentQrDataUrl) {
      data.baileysQrCode = currentQrDataUrl;
    } else if (currentStatus === ConnectionStatus.CONNECTED || currentStatus === ConnectionStatus.DISCONNECTED) {
      data.baileysQrCode = null;
    }

    await prisma.channelConfig.update({
      where: { type: 'WHATSAPP' },
      data,
    }).catch((err) => {
      fs.appendFileSync('baileys-debug.log', `[${new Date().toISOString()}] persistStatus ERROR: ${err?.message}\n`);
    });
  }
}
