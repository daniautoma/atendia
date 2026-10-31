/**
 * Utilidades para normalización y validación de números de teléfono
 * adaptadas a El Salvador (+503) y telefonía WhatsApp (Baileys / Meta / YCloud).
 */

export interface PhoneValidationResult {
  isValid: boolean;
  phone: string | null;
  error?: string;
}

/**
 * Valida y normaliza un número telefónico de El Salvador.
 * En El Salvador los números tienen 8 dígitos (móviles 6xxx-xxxx, 7xxx-xxxx; fijos 2xxx-xxxx).
 * Acepta formatos como:
 * - "70123444", "7012-3444", "7012 3444"
 * - "+503 7012 3444", "+50370123444", "50370123444"
 * Rechaza números con longitudes inválidas o identificadores internos de WhatsApp (como LIDs de 15 dígitos).
 */
export function validateAndNormalizeElSalvadorPhone(
  input?: string | null
): PhoneValidationResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      phone: null,
      error: 'No se proporcionó un número de teléfono de contacto.',
    };
  }

  // Extraer únicamente los dígitos numéricos
  const digits = input.replace(/\D/g, '');

  // 1. Caso 8 dígitos locales (ej: "70123444", "22001234")
  if (digits.length === 8) {
    return {
      isValid: true,
      phone: `+503${digits}`,
    };
  }

  // 2. Caso 11 dígitos iniciando con código de país 503 (ej: "50370123444")
  if (digits.length === 11 && digits.startsWith('503')) {
    return {
      isValid: true,
      phone: `+${digits}`,
    };
  }

  // 3. Caso especial: si viene con prefijo internacional pero más de 11 dígitos
  // Si tiene exactamente 15 dígitos y empieza con 2444... es un LID de WhatsApp, NO un teléfono real
  if (digits.length >= 13) {
    return {
      isValid: false,
      phone: null,
      error: `El identificador proporcionado (${input}) es un código interno de dispositivo WhatsApp y no un teléfono válido. Se requiere un número telefónico de El Salvador (+503 de 8 dígitos).`,
    };
  }

  return {
    isValid: false,
    phone: null,
    error: `El número proporcionado (${input}) no es válido para El Salvador. Debe constar de 8 dígitos con prefijo +503 (ejemplo: +503 7012 3444 o 70123444).`,
  };
}

/**
 * Extrae el número de teléfono real y el LID de un mensaje entrante de Baileys.
 * Elimina cualquier sufijo de dispositivo multi-dispositivo (:0, :12, etc.).
 */
export function extractWhatsAppPhoneAndLid(msgKey: any): {
  phone: string | null;
  waLid: string | null;
  replyJid: string;
} {
  const allJids: string[] = [
    msgKey?.remoteJid,
    msgKey?.remoteJidAlt,
    msgKey?.participant,
    msgKey?.participantAlt,
  ].filter((j): j is string => typeof j === 'string' && j.trim().length > 0);

  // Buscar JID con terminación oficial de teléfono @s.whatsapp.net
  const phoneJid = allJids.find((j) => j.includes('@s.whatsapp.net'));
  // Buscar JID con terminación de LID @lid
  const lidJid = allJids.find((j) => j.includes('@lid'));

  let phone: string | null = null;
  if (phoneJid) {
    // userPart separa el ID de usuario del sufijo de dispositivo
    // Ej: "50370123444:12@s.whatsapp.net" -> "50370123444"
    const userPart = phoneJid.split('@')[0].split(':')[0];
    const digits = userPart.replace(/\D/g, '');
    const validation = validateAndNormalizeElSalvadorPhone(digits);
    if (validation.isValid && validation.phone) {
      phone = validation.phone;
    } else if (digits.length >= 8 && digits.length <= 13) {
      // Teléfono internacional si fuera de otro país
      phone = '+' + digits;
    }
  }

  // Preservar LID para entrega de mensajes por WhatsApp
  const waLid = lidJid || (msgKey?.remoteJid?.includes('@lid') ? msgKey.remoteJid : null);
  const replyJid = msgKey?.remoteJid || phoneJid || waLid || '';

  return {
    phone,
    waLid,
    replyJid,
  };
}
