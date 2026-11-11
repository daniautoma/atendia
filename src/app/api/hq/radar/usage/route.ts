import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { getOrUpdateRadarUsage } from '@/lib/radar/placesClient';
import { hqErrorResponse } from '@/lib/hq/apiError';

export async function GET() {
  try {
    await requireAdmin();

    const usage = await getOrUpdateRadarUsage(0);

    return NextResponse.json({
      monthYear: usage.monthYear,
      placesCalls: usage.placesCalls,
      limitAlert: usage.limitAlert,
      remaining: Math.max(0, usage.limitAlert - usage.placesCalls),
      isNearLimit: usage.placesCalls >= usage.limitAlert * 0.8,
      isOverLimit: usage.placesCalls >= usage.limitAlert,
    });
  } catch (error: unknown) {
    console.error('Error en GET /api/hq/radar/usage:', error);
    return hqErrorResponse(error, 'Error al obtener consumo de Radar.');
  }
}

