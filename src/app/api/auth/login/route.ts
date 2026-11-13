import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { createSessionToken } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Introduce un correo electrónico válido'),
  password: z.string().min(1, 'Introduce la contraseña'),
});

// Control básico en memoria contra ataques de fuerza bruta
interface RateLimitRecord {
  attempts: number;
  blockedUntil?: number;
}
const loginAttempts = new Map<string, RateLimitRecord>();

function cleanOldAttempts() {
  const now = Date.now();
  for (const [key, record] of loginAttempts.entries()) {
    if (record.blockedUntil && record.blockedUntil < now) {
      loginAttempts.delete(key);
    }
  }
}

export async function POST(req: Request) {
  try {
    cleanOldAttempts();

    // Obtener IP o identificador para control de intentos
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
               req.headers.get('x-real-ip') ||
               '127.0.0.1';

    const rateKey = `rate_${ip}`;
    const rateData = loginAttempts.get(rateKey) || { attempts: 0 };

    if (rateData.blockedUntil && rateData.blockedUntil > Date.now()) {
      const waitSeconds = Math.ceil((rateData.blockedUntil - Date.now()) / 1000);
      return NextResponse.json(
        { error: `Demasiados intentos de acceso fallidos. Por favor, espera ${waitSeconds} segundos.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Datos de acceso no válidos' },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    let isValid = false;
    if (user) {
      isValid = await bcrypt.compare(password, user.passwordHash);
    } else {
      // Simular tiempo de hash para mitigar timing attacks si el usuario no existe
      await bcrypt.compare(password, '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012');
    }

    if (!isValid) {
      // Retardo progresivo para mitigar fuerza bruta automatizada
      rateData.attempts += 1;
      if (rateData.attempts >= 5) {
        // Bloquear durante 15 minutos tras 5 intentos erróneos
        rateData.blockedUntil = Date.now() + 15 * 60 * 1000;
      }
      loginAttempts.set(rateKey, rateData);

      // Retardo defensivo de 600ms
      await new Promise((resolve) => setTimeout(resolve, 600));

      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Acceso exitoso: reiniciar contador
    loginAttempts.delete(rateKey);

    const token = await createSessionToken({
      userId: user!.id,
      email: user!.email,
      name: user!.name,
      role: user!.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user!.id,
        email: user!.email,
        name: user!.name,
        role: user!.role,
      },
    });

    response.cookies.set('atendia_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 días
    });

    return response;
  } catch (error) {
    console.error('Error en /api/auth/login:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
