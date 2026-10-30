import crypto from 'crypto';

export interface VerifyWebhookOptions {
  rawBody: string | Buffer;
  signatureHeader: string | null;
  signingSecret: string;
  toleranceSeconds?: number; // Por defecto 300s (5 minutos)
}

export interface VerificationResult {
  valid: boolean;
  reason?: string;
  timestamp?: number;
}

/**
 * Verifica la firma criptográfica HMAC-SHA256 según la especificación oficial de YCloud:
 * Header: YCloud-Signature: t={timestamp},s={signature}
 * Payload firmado: t.rawBody
 * Comparación segura con timingSafeEqual contra replay attacks y timing attacks.
 */
export function verifyYCloudWebhookSignature(options: VerifyWebhookOptions): VerificationResult {
  const { rawBody, signatureHeader, signingSecret, toleranceSeconds = 300 } = options;

  if (!signatureHeader) {
    return { valid: false, reason: 'Cabecera YCloud-Signature ausente' };
  }

  if (!signingSecret) {
    return { valid: false, reason: 'Secreto de webhook no configurado en el servidor' };
  }

  // 1. Extraer t y s de la cabecera
  const parts = signatureHeader.split(',');
  const tPart = parts.find((p) => p.trim().startsWith('t='));
  const sPart = parts.find((p) => p.trim().startsWith('s='));

  if (!tPart || !sPart) {
    return { valid: false, reason: 'Formato inválido de YCloud-Signature (se espera t=...,s=...)' };
  }

  const timestampStr = tPart.trim().substring(2);
  const signatureHex = sPart.trim().substring(2);
  const timestamp = parseInt(timestampStr, 10);

  if (isNaN(timestamp)) {
    return { valid: false, reason: 'Timestamp de firma inválido' };
  }

  // 2. Control de ventana de tiempo (Prevención de Replay Attacks)
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > toleranceSeconds) {
    return {
      valid: false,
      reason: `Firma fuera de la ventana de tolerancia de ${toleranceSeconds}s (recibido: ${timestamp}, actual: ${now})`,
    };
  }

  // 3. Reconstruir payload firmado: t.rawBody
  const bodyBuffer = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, 'utf8');
  const signedPayload = Buffer.concat([
    Buffer.from(`${timestamp}.`, 'utf8'),
    bodyBuffer,
  ]);

  // 4. Calcular HMAC-SHA256
  const computedHex = crypto
    .createHmac('sha256', signingSecret)
    .update(signedPayload)
    .digest('hex');

  // 5. Comparación segura en tiempo constante (timingSafeEqual)
  const receivedBuf = Buffer.from(signatureHex, 'hex');
  const computedBuf = Buffer.from(computedHex, 'hex');

  if (receivedBuf.length !== computedBuf.length) {
    return { valid: false, reason: 'Longitud de firma no coincide' };
  }

  const isMatch = crypto.timingSafeEqual(receivedBuf, computedBuf);
  if (!isMatch) {
    return { valid: false, reason: 'Discrepancia en la firma criptográfica' };
  }

  return { valid: true, timestamp };
}

