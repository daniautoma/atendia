import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY no está definida en las variables de entorno.');
  }
  const key = Buffer.from(keyHex, 'hex');
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY debe ser una cadena hexadecimal de 32 bytes (64 caracteres).');
  }
  return key;
}

/**
 * Cifra un texto utilizando AES-256-GCM.
 * Formato devuelto: ivHex:authTagHex:encryptedHex
 */
export function encrypt(text: string): string {
  if (!text) return '';
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Descifra una cadena previamente cifrada con encrypt().
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return '';
  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de texto cifrado no válido. Se esperaba iv:authTag:encryptedData');
  }

  const [ivHex, authTagHex, dataHex] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encryptedData = Buffer.from(dataHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Enmascara credenciales sensibles para mostrarlas en el panel de forma segura.
 * Ejemplo: "sk_live_123456789abcdef" -> "sk_li...cdef"
 */
export function maskSecret(secret?: string | null): string {
  if (!secret) return '';
  const clean = secret.trim();
  if (clean.length <= 8) return '••••••••';
  const start = clean.slice(0, 5);
  const end = clean.slice(-4);
  return `${start}••••${end}`;
}

