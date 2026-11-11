/**
 * Utilidades compartidas de formato telefónico y enlaces de WhatsApp (El Salvador +503)
 * danIAutoma HQ - Radar de Clientes
 */

export function formatElSalvadorWhatsApp(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 8) {
    return `503${digits}`;
  }
  return digits;
}

export function buildWhatsAppUrl(phone?: string | null, message?: string): string | null {
  const digits = formatElSalvadorWhatsApp(phone);
  if (!digits) return null;
  if (message && message.trim()) {
    return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/${digits}`;
}

