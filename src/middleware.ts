import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = Buffer.from(
  process.env.AUTH_SECRET || 'f40774fb662aa468e7d12a0194acee0d05eba6fffd94ba6879462b8f7e9732c0',
  'utf8'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas públicas que no requieren autenticación
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/demo') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/chat') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') // archivos estáticos como favicon.ico, logos, etc.
  ) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get('atendia_session')?.value;

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    await jwtVerify(sessionCookie, SECRET_KEY);
    return NextResponse.next();
  } catch {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

