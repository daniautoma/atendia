import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { analyzeNichesComparison, NicheEmpiricalStats } from '@/lib/radar/geminiClient';
import { searchPlacesRadar, getOrUpdateRadarUsage } from '@/lib/radar/placesClient';
import { buildPlacesSearchText } from '@/lib/radar/elSalvadorGeo';
import { hqErrorResponse } from '@/lib/hq/apiError';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { zone, department, municipality, niches, empirical = true } = body;

    if (!Array.isArray(niches) || niches.length === 0) {
      return NextResponse.json({ error: 'Se requiere al menos un nicho a comparar.' }, { status: 400 });
    }

    const trimmedNiches = niches.map((n: unknown) => String(n).trim()).filter(Boolean).slice(0, 6);
    const effectiveZone =
      zone || [municipality, department].filter(Boolean).join(', ') || 'El Salvador';

    let empiricalStats: NicheEmpiricalStats[] | undefined = undefined;
    let latestUsageCount: number | undefined;
    let latestUsageLimit: number | undefined;

    if (empirical) {
      empiricalStats = [];

      for (const niche of trimmedNiches) {
        const searchQuery = buildPlacesSearchText({
          niche,
          department: department || undefined,
          municipality: municipality || undefined,
          freeTextLocation: !department && !municipality ? effectiveZone : undefined,
        });

        const res = await searchPlacesRadar({
          searchQuery,
          zone: effectiveZone,
          niche,
        });

        latestUsageCount = res.usageCount;
        latestUsageLimit = res.usageLimit;

        const businesses = res.businesses || [];
        const totalFound = businesses.length;
        const noWebsiteCount = businesses.filter((b) => b.platformType === 'none').length;
        const ownWebsiteCount = businesses.filter((b) => b.hasOwnWebsite).length;
        const socialOnlyCount = Math.max(0, totalFound - noWebsiteCount - ownWebsiteCount);
        const noWebsitePct =
          totalFound > 0 ? Math.round(((totalFound - ownWebsiteCount) / totalFound) * 100) : 0;

        const rated = businesses.filter((b) => typeof b.rating === 'number' && b.rating > 0);
        const avgRating =
          rated.length > 0
            ? Number((rated.reduce((acc, b) => acc + (b.rating || 0), 0) / rated.length).toFixed(1))
            : 0;
        const avgReviews =
          totalFound > 0
            ? Math.round(
                businesses.reduce((acc, b) => acc + (b.userRatingCount || 0), 0) / totalFound
              )
            : 0;
        const withPhoneCount = businesses.filter((b) => Boolean(b.phone)).length;
        const withPhonePct = totalFound > 0 ? Math.round((withPhoneCount / totalFound) * 100) : 0;

        empiricalStats.push({
          niche,
          totalFound,
          noWebsiteCount,
          socialOnlyCount,
          ownWebsiteCount,
          noWebsitePct,
          avgRating,
          avgReviews,
          withPhonePct,
          fromCache: res.fromCache,
        });
      }
    } else {
      const usage = await getOrUpdateRadarUsage(0);
      latestUsageCount = usage.placesCalls;
      latestUsageLimit = usage.limitAlert;
    }

    const comparison = await analyzeNichesComparison({
      zone: effectiveZone,
      niches: trimmedNiches,
      empiricalStats,
    });

    return NextResponse.json({
      comparison,
      usageCount: latestUsageCount,
      usageLimit: latestUsageLimit,
    });
  } catch (error: unknown) {
    console.error('Error en POST /api/hq/radar/gemini/niches:', error);
    return hqErrorResponse(error, 'Error al comparar nichos con Gemini.');
  }
}
