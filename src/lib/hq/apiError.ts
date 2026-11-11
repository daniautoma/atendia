import { NextResponse } from 'next/server';
import { getErrorMessage } from './errorUtils';

export function hqErrorResponse(
  error: unknown,
  fallback: string,
  options?: { defaultStatus?: number; authStatusForUnauthenticated?: number }
) {
  const message = getErrorMessage(error, fallback);
  const defaultStatus = options?.defaultStatus ?? 500;
  const unauthStatus = options?.authStatusForUnauthenticated ?? 403;

  if (message.includes('Acceso denegado')) {
    return NextResponse.json({ error: message }, { status: 403 });
  }
  if (message.includes('No autenticado') || message.includes('No autorizado')) {
    return NextResponse.json({ error: message }, { status: unauthStatus });
  }

  return NextResponse.json({ error: message }, { status: defaultStatus });
}

