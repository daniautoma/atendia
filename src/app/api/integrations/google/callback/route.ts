import { NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/integrations/google/oauth';
import { prisma } from '@/lib/prisma';
import { encrypt } from '@/lib/crypto';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const stateRaw = searchParams.get('state');
  const appUrl = process.env.APP_URL || 'http://localhost:3000';

  if (!code) {
    const error = searchParams.get('error') || 'Autorización denegada por Google';
    return NextResponse.redirect(`${appUrl}/integraciones?error=${encodeURIComponent(error)}`);
  }

  let service = 'google_calendar';
  if (stateRaw) {
    try {
      const decoded = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf8'));
      if (decoded.service) service = decoded.service;
    } catch {}
  }

  try {
    const redirectUri = `${appUrl}/api/integrations/google/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    await prisma.integration.upsert({
      where: { provider: service },
      update: {
        enabled: true,
        credentialsEnc: encrypt(JSON.stringify(tokens)),
        lastSyncAt: new Date(),
      },
      create: {
        provider: service,
        name: service === 'google_calendar' ? 'Google Calendar' : service === 'gmail' ? 'Gmail' : 'Google Sheets',
        enabled: true,
        credentialsEnc: encrypt(JSON.stringify(tokens)),
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.redirect(`${appUrl}/integraciones?connected=${service}`);
  } catch (err: any) {
    console.error('Error en Google OAuth callback:', err);
    return NextResponse.redirect(`${appUrl}/integraciones?error=${encodeURIComponent(err.message)}`);
  }
}

