import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { getGoogleOAuthUrl } from '@/lib/integrations/google/oauth';

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const service = (searchParams.get('service') as any) || 'google_calendar';

    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const redirectUri = `${appUrl}/api/integrations/google/callback`;

    const oauthUrl = getGoogleOAuthUrl(service, redirectUri);
    return NextResponse.redirect(oauthUrl);
  } catch (error: any) {
    console.error('Error iniciando Google OAuth:', error);
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    return NextResponse.redirect(`${appUrl}/integraciones?error=${encodeURIComponent(error.message)}`);
  }
}

