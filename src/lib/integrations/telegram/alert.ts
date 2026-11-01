/**
 * Utilidad de Alertas Unidireccionales de Telegram para Atendia.
 *
 * Envía notificaciones internas al administrador cuando un paciente
 * requiere intervención humana (WAITING_HUMAN).
 */

function getCleanCredentials() {
  const rawToken = process.env.TELEGRAM_BOT_TOKEN;
  const rawChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

  const token = rawToken?.trim().replace(/^["']|["']$/g, '');
  const chatId = rawChatId?.trim().replace(/^["']|["']$/g, '');

  return { token, chatId };
}

export async function sendTelegramAlert(message: string): Promise<boolean> {
  try {
    const { token, chatId } = getCleanCredentials();

    // Si las variables de entorno no están configuradas, se alerta en consola y se omite
    if (!token || !chatId) {
      console.warn('[Telegram Alert] Advertencia: TELEGRAM_BOT_TOKEN o TELEGRAM_ADMIN_CHAT_ID no configurados en el entorno.');
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

      // Si falla por caracteres especiales de Markdown en el texto dinámico,
      // reintentamos como texto plano para garantizar la entrega de la alerta.
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
          console.log(`[Telegram Alert] Alerta entregada (texto plano fallback) a chat_id: ${chatId}`);
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

    console.log(`[Telegram Alert] Alerta entregada exitosamente a chat_id: ${chatId}`);
    return true;
  } catch (error) {
    // Manejo de errores silencioso para no interrumpir el flujo principal de Atendia
    console.error('[Telegram Alert Exception]: Error al conectar con Telegram API:', error);
    return false;
  }
}

/**
 * Función de diagnóstico y prueba directa de credenciales de Telegram.
 */
export async function testTelegramAlert(): Promise<{
  ok: boolean;
  message: string;
  chatId?: string;
  hasToken: boolean;
  hasChatId: boolean;
  rawResponse?: any;
}> {
  const { token, chatId } = getCleanCredentials();

  if (!token || !chatId) {
    return {
      ok: false,
      message: 'Faltan credenciales en el archivo .env (TELEGRAM_BOT_TOKEN o TELEGRAM_ADMIN_CHAT_ID)',
      hasToken: !!token,
      hasChatId: !!chatId,
    };
  }

  try {
    const endpoint = `https://api.telegram.org/bot${token}/sendMessage`;
    const now = new Date().toLocaleTimeString('es-SV', { timeZone: 'America/El_Salvador' });
    const text = `🔔 *Prueba de Alertas Atendia*\nTu bot de Telegram está vinculado y funcionando correctamente.\n*Hora:* ${now} (El Salvador)`;

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
        hasToken: true,
        hasChatId: true,
        rawResponse: data,
      };
    }

    return {
      ok: true,
      message: 'Mensaje de prueba enviado exitosamente a Telegram',
      chatId,
      hasToken: true,
      hasChatId: true,
      rawResponse: data,
    };
  } catch (err: any) {
    return {
      ok: false,
      message: `Error de red al conectar con Telegram: ${err.message}`,
      hasToken: true,
      hasChatId: true,
    };
  }
}
