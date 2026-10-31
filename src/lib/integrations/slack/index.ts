import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export async function sendSlackNotification(title: string, details: Record<string, string>) {
  const integration = await prisma.integration.findUnique({
    where: { provider: 'slack' },
  });

  if (!integration || !integration.enabled || !integration.credentialsEnc) {
    return false;
  }

  const { webhookUrl } = JSON.parse(decrypt(integration.credentialsEnc));
  if (!webhookUrl) return false;

  const fields = Object.entries(details).map(([k, v]) => ({
    type: 'mrkdwn',
    text: `*${k}:*\n${v}`,
  }));

  const payload = {
    text: title,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `🔔 Atendia: ${title}`,
          emoji: true,
        },
      },
      {
        type: 'section',
        fields,
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `*Hora oficial:* ${new Date().toLocaleTimeString('es-SV', { timeZone: 'America/El_Salvador' })} | America/El_Salvador`,
          },
        ],
      },
    ],
  };

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return res.ok;
}

