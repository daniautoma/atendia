import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { searchPlacesRadar } from '@/lib/radar/placesClient';
import { buildPlacesSearchText } from '@/lib/radar/elSalvadorGeo';
import { hqErrorResponse } from '@/lib/hq/apiError';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const niche = searchParams.get('niche') || 'Clínicas Dentales';
    const department = searchParams.get('department') || undefined;
    const municipality = searchParams.get('municipality') || undefined;
    const freeText = searchParams.get('q') || undefined;
    const pageToken = searchParams.get('pageToken') || undefined;
    const forceRefresh = searchParams.get('forceRefresh') === '1';

    const query = buildPlacesSearchText({
      niche,
      department,
      municipality,
      freeTextLocation: freeText,
    });

    const zoneLabel = [municipality, department, freeText].filter(Boolean).join(' ') || 'El Salvador';

    const result = await searchPlacesRadar({
      searchQuery: query,
      zone: zoneLabel,
      niche,
      pageToken,
      forceRefresh,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error('Error en GET /api/hq/radar/search:', error);
    return hqErrorResponse(error, 'Error al buscar negocios en Radar.');
  }
}

