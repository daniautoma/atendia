import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';
import crypto from 'crypto';

export type WebhookEvent =
  | 'conversation.created'
  | 'appointment.booked'
  | 'contact.updated'
  | 'handoff.triggered';

export async function dispatchOutgoingWebhook(event: WebhookEvent, payload: Record<string, any>) {
  const integration = await prisma.integration.findUnique({
    where: { provider: 'webhooks' },
  });

  if (!integration || !integration.enabled || !integration.credentialsEnc) {
    return false;
  }

  let endpointUrl = '';
  let secret = '';
  try {
    const creds = JSON.parse(decrypt(integration.credentialsEnc));
    endpointUrl = creds.endpointUrl;
    secret = creds.secret;
  } catch {
    return false;
  }

  if (!endpointUrl) return false;

  const timestamp = Math.floor(Date.now() / 1000);
  const bodyString = JSON.stringify({
    event,
    timestamp,
    business: 'Clínica Dental San Salvador',
    data: payload,
  });

  const hmac = crypto.createHmac('sha256', secret || 'default_secret');
  hmac.update(`${timestamp}.${bodyString}`);
  const signature = hmac.digest('hex');

  try {
    const res = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Atendia-Timestamp': timestamp.toString(),
        'X-Atendia-Signature': `sha256=${signature}`,
      },
      body: bodyString,
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch (err) {
    console.warn(`[Webhooks] Error enviando evento ${event} a ${endpointUrl}:`, err);
    return false;
  }
}

