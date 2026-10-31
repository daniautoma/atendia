import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export interface StripePaymentLinkOptions {
  serviceName: string;
  depositAmountUsd: number; // Ej: $20 de señal
  customerEmail?: string;
  customerName?: string;
}

export async function createStripePaymentLink(options: StripePaymentLinkOptions): Promise<string> {
  const integration = await prisma.integration.findUnique({
    where: { provider: 'stripe' },
  });

  let apiKey = process.env.STRIPE_RESTRICTED_KEY;
  if (integration?.credentialsEnc && integration.enabled) {
    try {
      const parsed = JSON.parse(decrypt(integration.credentialsEnc));
      if (parsed.restrictedKey) apiKey = parsed.restrictedKey;
    } catch {}
  }

  // Si no hay clave real configurada, retornamos enlace de prueba seguro
  if (!apiKey || apiKey.trim() === '') {
    return `https://checkout.stripe.com/pay/simulated_deposit_${Date.now()}#deposit=${options.depositAmountUsd}`;
  }

  // Llamada a la API oficial de Stripe para crear Payment Link / Checkout Session
  const appUrl = process.env.APP_URL || 'http://localhost:3000';
  const amountCents = Math.round(options.depositAmountUsd * 100);

  const body = new URLSearchParams({
    'payment_method_types[0]': 'card',
    'mode': 'payment',
    'line_items[0][price_data][currency]': 'usd',
    'line_items[0][price_data][unit_amount]': amountCents.toString(),
    'line_items[0][price_data][product_data][name]': `Señal de reserva: ${options.serviceName}`,
    'line_items[0][quantity]': '1',
    'success_url': `${appUrl}/demo?pago_exitoso=true`,
    'cancel_url': `${appUrl}/demo?pago_cancelado=true`,
  });

  if (options.customerEmail) {
    body.append('customer_email', options.customerEmail);
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al generar enlace de Stripe: ${err}`);
  }

  const session = await res.json();
  return session.url;
}

