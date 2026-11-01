/**
 * Utilidad de Alertas Unidireccionales de Telegram para Atendia.
 *
 * Envía notificaciones internas al administrador cuando un paciente
 * requiere intervención humana (WAITING_HUMAN).
 *
 * Soporta configuración dual:
 * 1. Base de datos (prioridad, editable desde /integraciones sin reiniciar servidor)
 * 2. Variables de entorno .env (TELEGRAM_BOT_TOKEN y TELEGRAM_ADMIN_CHAT_ID)
 */

import { prisma } from '@/lib/prisma';
import { decrypt } from '@/lib/crypto';

export async function getTelegramCredentials(): Promise<{
  token: string | null;
  chatId: string | null;
  source: 'database' | 'environment' | 'none';
}> {
  // 1. Prioridad: Base de datos (permite cambios en caliente sin reiniciar Next.js)
  try {
    const dbIntegration = await prisma.integration.findUnique({
      where: { provider: 'telegram' },
    });

    if (dbIntegration && dbIntegration.enabled && dbIntegration.credentialsEnc) {
      const creds = JSON.parse(decrypt(dbIntegration.credentialsEnc));
      const dbToken = (creds.botToken || creds.token || '').trim().replace(/^["']|["']$/g, '');
      const dbChatId = (creds.chatId || creds.adminChatId || '').trim().replace(/^["']|["']$/g, '');

      if (dbToken && dbChatId) {
        return { token: dbToken, chatId: dbChatId, source: 'database' };
      }
    }
  } catch {
    // Si la BD no está disponible temporalmente, pasar al .env
  }

  // 2. Fallback: Variables de entorno .env
  const envToken = process.env.TELEGRAM_BOT_TOKEN?.trim().replace(/^["']|["']$/g, '');
  const envChatId = process.env.TELEGRAM_ADMIN_CHAT_ID?.trim().replace(/^["']|["']$/g, '');

  if (envToken && envChatId) {
    return { token: envToken, chatId: envChatId, source: 'environment' };
  }

  return { token: null, chatId: null, source: 'none' };
}

export async function sendTelegramAlert(message: string): Promise<boolean> {
  try {
    const { token, chatId, source } = await getTelegramCredentials();

    if (!token || !chatId) {
      console.warn('[Telegram Alert] No enviado: TELEGRAM_BOT_TOKEN o TELEGRAM_ADMIN_CHAT_ID no configurados (ni en BD ni en .env).');
      return false;
    }

    const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => null);

      // Si falla por caracteres especiales en Markdown, reintentar como texto plano
      if (
        res.status === 400 &&
        typeof errorData?.description === 'string' &&
        errorData.description.toLowerCase().includes('entity')
      ) {
        const fallbackRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
          }),
        });

        if (fallbackRes.ok) {
          console.log(`[Telegram Alert] Entregada (texto plano fallback) a chat_id: ${chatId} (origen: ${source})`);
          return true;
        }
      }

      console.error('[Telegram Alert Error]: Fallo al enviar mensaje a Telegram:', {
        status: res.status,
        statusText: res.statusText,
        error: errorData,
      });
      return false;
    }

    console.log(`[Telegram Alert] Alerta entregada con éxito a chat_id: ${chatId} (origen: ${source})`);
    return true;
  } catch (error) {
    console.error('[Telegram Alert Exception]: Error al conectar con Telegram API:', error);
    return false;
  }
}

/**
 * Función de diagnóstico y prueba de credenciales de Telegram.
 * Permite probar credenciales personalizadas (antes de guardar) o las actuales.
 */
export async function testTelegramAlert(customToken?: string, customChatId?: string): Promise<{
  ok: boolean;
  message: string;
  chatId?: string;
  source?: string;
  rawResponse?: any;
}> {
  let token = customToken?.trim().replace(/^["']|["']$/g, '');
  let chatId = customChatId?.trim().replace(/^["']|["']$/g, '');
  let source = 'personalizado';

  if (!token || !chatId) {
    const creds = await getTelegramCredentials();
    token = creds.token || undefined;
    chatId = creds.chatId || undefined;
    source = creds.source;
  }

  if (!token || !chatId) {
    return {
      ok: false,
      message: 'Faltan credenciales: Ingresa TELEGRAM_BOT_TOKEN y TELEGRAM_ADMIN_CHAT_ID en .env o guárdalas en /integraciones.',
      source,
    };
  }

  try {
    const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
    const now = new Date().toLocaleTimeString('es-SV', { timeZone: 'America/El_Salvador' });
    const text = `🔔 *Prueba de Alertas Atendia*\n¡Tu bot de Telegram está vinculado y funcionando al 100%!\n*Origen de credenciales:* ${source}\n*Hora oficial:* ${now} (El Salvador)`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        ok: false,
        message: `Telegram API retornó error ${res.status}: ${data?.description || res.statusText}`,
        chatId,
        source,
        rawResponse: data,
      };
    }

    return {
      ok: true,
      message: `Mensaje de prueba enviado exitosamente al chat ${chatId}`,
      chatId,
      source,
      rawResponse: data,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Error de red al conectar con Telegram: ${err.message}`,
      chatId,
      source,
    };
  }
}
