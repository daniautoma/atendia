import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = Buffer.from(
  process.env.AUTH_SECRET || 'f40774fb662aa468e7d12a0194acee0d05eba6fffd94ba6879462b8f7e9732c0',
  'utf8'
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();

  // 1. Rutas públicas que no requieren autenticación
  if (
    pathname.startsWith('/login') ||
    pathname.startsWith('/demo') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/webhooks') ||
    pathname.startsWith('/api/chat') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.') // Archivos estáticos
  ) {
    return NextResponse.next();
  }

  // 2. Verificar existencia de la cookie de sesión
  const sessionCookie = request.cookies.get('atendia_session')?.value;

  if (!sessionCookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Verificar validez criptográfica del JWT y extraer rol
  let userRole = 'AGENT';
  try {
    const { payload } = await jwtVerify(sessionCookie, SECRET_KEY);
    userRole = (payload as any).role || 'AGENT';
  } catch {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sesión inválida o expirada' }, { status: 401 });
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Protección estricta para Cuartel General (/hq y /api/hq) — Exclusivo ADMIN
  if (pathname.startsWith('/hq') || pathname.startsWith('/api/hq')) {
    if (userRole !== 'ADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { error: 'Acceso denegado: Cuartel General es exclusivo para Administrador' },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL('/conversaciones', request.url));
    }
    return NextResponse.next();
  }

  // 5. Aplicar control de acceso por roles (RBAC) para rol AGENT
  if (userRole === 'AGENT') {
    // Si es una petición a la API
    if (pathname.startsWith('/api/')) {
      const isAllowedApi =
        pathname.startsWith('/api/conversations') ||
        pathname.startsWith('/api/appointments') ||
        (method === 'GET' && pathname === '/api/knowledge/services') ||
        (method === 'GET' && pathname === '/api/knowledge/faqs') ||
        (method === 'GET' && pathname === '/api/business/profile');

      if (!isAllowedApi) {
        return NextResponse.json(
          { error: 'Acceso denegado: se requieren permisos de Administrador' },
          { status: 403 }
        );
      }
      return NextResponse.next();
    }

    // Si es navegación a páginas del panel
    const isAllowedPage =
      pathname.startsWith('/conversaciones') ||
      pathname.startsWith('/calendario') ||
      pathname.startsWith('/conocimiento');

    if (!isAllowedPage) {
      // Redirigir al agente a /conversaciones si intenta acceder a /, /ajustes, /integraciones, etc.
      return NextResponse.redirect(new URL('/conversaciones', request.url));
    }
  }

  // Rol ADMIN tiene acceso total
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
