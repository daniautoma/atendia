import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HqLeadStatus, Prisma } from '@prisma/client';
import { classifyBusinessUrl } from '@/lib/radar/directoryDetector';
import { hqErrorResponse } from '@/lib/hq/apiError';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const items = Array.isArray(body.businesses) ? body.businesses : [];

    if (items.length === 0) {
      return NextResponse.json({ error: 'Debes seleccionar al menos un negocio.' }, { status: 400 });
    }

    const savedLeads = [];

    for (const item of items) {
      if (!item?.name) continue;
      const placeId = item.id || item.placeId || null;
      const urlInfo = classifyBusinessUrl(item.websiteUri);
      const contactInfo =
        [item.phone, item.websiteUri, item.formattedAddress].filter(Boolean).join(' | ') ||
        'Sin datos de contacto';

      if (placeId) {
        const existing = await prisma.hqLead.findUnique({ where: { placeId } });
        if (existing) {
          const updated = await prisma.hqLead.update({
            where: { id: existing.id },
            data: {
              name: item.name || existing.name,
              niche: item.category || item.niche || existing.niche,
              contactInfo,
              phone: item.phone ?? existing.phone,
              formattedAddress: item.formattedAddress ?? existing.formattedAddress,
              latitude: item.latitude ?? existing.latitude,
              longitude: item.longitude ?? existing.longitude,
              websiteUri: item.websiteUri ?? existing.websiteUri,
              hasOwnWebsite:
                typeof item.hasOwnWebsite === 'boolean' ? item.hasOwnWebsite : urlInfo.isOwnedWebsite,
              platformType: item.platformType || urlInfo.platformType || existing.platformType,
              businessStatus: item.businessStatus ?? existing.businessStatus,
              rating: item.rating ?? existing.rating,
              userRatingCount: item.userRatingCount ?? existing.userRatingCount,
              category: item.category ?? existing.category,
              googleMapsUri: item.googleMapsUri ?? existing.googleMapsUri,
              provisionalScore: item.provisionalScore ?? existing.provisionalScore,
              finalScore: item.finalScore ?? existing.finalScore ?? item.provisionalScore,
              scoreBreakdown:
                (item.scoreBreakdown ?? existing.scoreBreakdown ?? undefined) as
                  | Prisma.InputJsonValue
                  | undefined,
            },
          });
          savedLeads.push(updated);
          continue;
        }
      }

      const created = await prisma.hqLead.create({
        data: {
          placeId,
          name: String(item.name),
          niche: String(item.category || item.niche || 'Prospecto Radar'),
          contactInfo,
          phone: item.phone ?? null,
          formattedAddress: item.formattedAddress ?? null,
          latitude: item.latitude ?? null,
          longitude: item.longitude ?? null,
          websiteUri: item.websiteUri ?? null,
          hasOwnWebsite:
            typeof item.hasOwnWebsite === 'boolean' ? item.hasOwnWebsite : urlInfo.isOwnedWebsite,
          platformType: item.platformType || urlInfo.platformType,
          businessStatus: item.businessStatus ?? null,
          rating: item.rating ?? null,
          userRatingCount: item.userRatingCount ?? null,
          category: item.category ?? null,
          googleMapsUri: item.googleMapsUri ?? null,
          provisionalScore: item.provisionalScore ?? null,
          finalScore: item.finalScore ?? item.provisionalScore ?? null,
          scoreBreakdown: (item.scoreBreakdown ?? undefined) as Prisma.InputJsonValue | undefined,
          status: HqLeadStatus.NEW,
        },
      });
      savedLeads.push(created);
    }

    return NextResponse.json({
      savedCount: savedLeads.length,
      leads: savedLeads,
    });
  } catch (error: unknown) {
    console.error('Error en POST /api/hq/radar/save-batch:', error);
    return hqErrorResponse(error, 'Error guardando lote de prospectos.');
  }
}

