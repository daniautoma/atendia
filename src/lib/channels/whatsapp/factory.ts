import { IWhatsAppAdapter } from './adapter';
import { BaileysWhatsAppAdapter } from './baileys';
import { YCloudWhatsAppAdapter } from './ycloud';
import { prisma } from '@/lib/prisma';
import { WhatsAppProvider } from '@prisma/client';

let baileysInstance: BaileysWhatsAppAdapter | null = null;
let ycloudInstance: YCloudWhatsAppAdapter | null = null;

export async function getWhatsAppAdapter(provider?: WhatsAppProvider): Promise<IWhatsAppAdapter> {
  let targetProvider = provider;

  if (!targetProvider) {
    const channel = await prisma.channelConfig.findUnique({
      where: { type: 'WHATSAPP' },
    });
    targetProvider = channel?.waProvider || WhatsAppProvider.BAILEYS;
  }

  if (targetProvider === WhatsAppProvider.YCLOUD) {
    if (!ycloudInstance) {
      ycloudInstance = new YCloudWhatsAppAdapter();
    }
    return ycloudInstance;
  }

  if (!baileysInstance) {
    baileysInstance = new BaileysWhatsAppAdapter();
  }
  return baileysInstance;
}

