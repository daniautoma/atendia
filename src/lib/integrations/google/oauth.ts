import { prisma } from '@/lib/prisma';
import { encrypt, decrypt } from '@/lib/crypto';

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  expiry_date?: number;
}

export function getGoogleOAuthUrl(service: 'google_calendar' | 'gmail' | 'google_sheets', redirectUri: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID no está configurado en las variables de entorno.');
  }

  const scopesMap: Record<string, string[]> = {
    google_calendar: ['https://www.googleapis.com/auth/calendar.events'],
    gmail: ['https://www.googleapis.com/auth/gmail.send'],
    google_sheets: ['https://www.googleapis.com/auth/drive.file', 'https://www.googleapis.com/auth/spreadsheets'],
  };

  const scopes = scopesMap[service] || [];
  const state = Buffer.from(JSON.stringify({ service })).toString('base64url');

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: scopes.join(' '),
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<GoogleTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Credenciales de Google OAuth no configuradas en el servidor.');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Fallo al intercambiar código OAuth con Google: ${errText}`);
  }

  const data = await response.json();
  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    scope: data.scope,
    token_type: data.token_type,
    expiry_date: Date.now() + (data.expires_in || 3600) * 1000,
  };
}

export async function getValidAccessToken(provider: string): Promise<string> {
  const integration = await prisma.integration.findUnique({
    where: { provider },
  });

  if (!integration || !integration.credentialsEnc || !integration.enabled) {
    throw new Error(`La integración ${provider} no está conectada.`);
  }

  const decryptedJson = decrypt(integration.credentialsEnc);
  const tokens: GoogleTokens = JSON.parse(decryptedJson);

  // Si el token aún es válido con margen de 5 minutos
  if (tokens.expiry_date && tokens.expiry_date > Date.now() + 300000 && tokens.access_token) {
    return tokens.access_token;
  }

  // Si expiró, refrescar usando refresh_token
  if (!tokens.refresh_token) {
    if (tokens.access_token) return tokens.access_token;
    throw new Error(`No hay refresh_token disponible para ${provider}. Reconecta la integración.`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId || '',
      client_secret: clientSecret || '',
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });

  if (!refreshRes.ok) {
    throw new Error(`No se pudo refrescar el token de Google para ${provider}.`);
  }

  const refreshedData = await refreshRes.json();
  const updatedTokens: GoogleTokens = {
    ...tokens,
    access_token: refreshedData.access_token,
    expiry_date: Date.now() + (refreshedData.expires_in || 3600) * 1000,
  };

  // Guardar cifrado nuevamente
  await prisma.integration.update({
    where: { provider },
    data: {
      credentialsEnc: encrypt(JSON.stringify(updatedTokens)),
      lastSyncAt: new Date(),
    },
  });

  return updatedTokens.access_token;
}

