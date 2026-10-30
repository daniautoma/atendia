import { ConnectionStatus, WhatsAppProvider } from '@prisma/client';

export interface SendMessageOptions {
  to: string;            // Número de teléfono en formato internacional E.164 (ej: "+34600111222")
  text: string;
  recipientBsuid?: string; // BSUID / WA_ID específico para YCloud / Meta
  template?: {
    name: string;
    language: string;
    components?: any[];
  };
}

export interface SendMessageResult {
  externalId: string;
  success: boolean;
  status: string;
  error?: string;
}

export interface WhatsAppStatusInfo {
  provider: WhatsAppProvider;
  status: ConnectionStatus;
  phoneNumber?: string | null;
  businessName?: string | null;
  qrCode?: string | null;
  wabaId?: string | null;
  lastError?: string | null;
}

/**
 * Interfaz común para todos los proveedores de WhatsApp.
 * Permite alternar entre Baileys y YCloud sin tocar la lógica de negocio del asistente.
 */
export interface IWhatsAppAdapter {
  providerName: WhatsAppProvider;
  getStatus(): Promise<WhatsAppStatusInfo>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(options: SendMessageOptions): Promise<SendMessageResult>;
  sendTyping(to: string): Promise<void>;
}

