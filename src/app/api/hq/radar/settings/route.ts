import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRadarSettings, updateRadarSettings } from '@/lib/radar/settingsService';
import { getOrUpdateRadarUsage } from '@/lib/radar/placesClient';
import { hqErrorResponse } from '@/lib/hq/apiError';

export async function GET() {
  try {
    await requireAdmin();

    const [settings, usage, totalCacheCount] = await Promise.all([
      getRadarSettings(),
      getOrUpdateRadarUsage(0),
      prisma.hqRadarSearchCache.count(),
    ]);

    return NextResponse.json({
      settings,
      usage: {
        monthYear: usage.monthYear,
        placesCalls: usage.placesCalls,
        limitAlert: usage.limitAlert,
      },
      cacheCount: totalCacheCount,
    });
  } catch (error: unknown) {
    return hqErrorResponse(error, 'Error al cargar ajustes de Radar.');
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      sellerName,
      agencyName,
      servicesOffered,
      valueProposition,
      defaultTone,
      placesMonthlyLimit,
      resetMonthlyUsage,
    } = body;

    const updated = await updateRadarSettings({
      sellerName,
      agencyName,
      servicesOffered,
      valueProposition,
      defaultTone,
      placesMonthlyLimit:
        typeof placesMonthlyLimit === 'number' ? placesMonthlyLimit : Number(placesMonthlyLimit) || undefined,
    });

    const now = new Date();
    const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const usage = await prisma.hqRadarUsage.upsert({
      where: { monthYear },
      update: {
        limitAlert: updated.placesMonthlyLimit,
        ...(resetMonthlyUsage === true ? { placesCalls: 0 } : {}),
      },
      create: {
        monthYear,
        placesCalls: 0,
        limitAlert: updated.placesMonthlyLimit,
      },
    });

    return NextResponse.json({
      settings: updated,
      usage: {
        monthYear: usage.monthYear,
        placesCalls: usage.placesCalls,
        limitAlert: usage.limitAlert,
      },
    });
  } catch (error: unknown) {
    return hqErrorResponse(error, 'Error al guardar ajustes de Radar.');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'all';

    const result =
      mode === 'expired'
        ? await prisma.hqRadarSearchCache.deleteMany({
            where: { expiresAt: { lt: new Date() } },
          })
        : await prisma.hqRadarSearchCache.deleteMany({});

    return NextResponse.json({ deletedCount: result.count });
  } catch (error: unknown) {
    return hqErrorResponse(error, 'Error al limpiar caché.');
  }
}

