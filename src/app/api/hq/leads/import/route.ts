import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { HqLeadStatus } from '@prisma/client';
import { hqErrorResponse } from '@/lib/hq/apiError';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const rawLeads = Array.isArray(body.leads) ? body.leads : Array.isArray(body) ? body : [];

    if (rawLeads.length === 0) {
      return NextResponse.json({ error: 'El archivo JSON no contiene prospectos válidos.' }, { status: 400 });
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of rawLeads) {
      const name = typeof item?.name === 'string' ? item.name.trim() : '';
      const niche = typeof item?.niche === 'string' ? item.niche.trim() : 'Prospecto Importado';
      if (!name) continue;

      const placeId = typeof item.placeId === 'string' && item.placeId.trim() ? item.placeId.trim() : null;
      const validStatus = Object.values(HqLeadStatus).includes(item.status as HqLeadStatus)
        ? (item.status as HqLeadStatus)
        : HqLeadStatus.NEW;
      const contactInfo =
        item.contactInfo ||
        [item.phone, item.websiteUri, item.formattedAddress].filter(Boolean).join(' | ') ||
        'Sin datos de contacto';

      const dataPayload = {
        name,
        niche,
        contactInfo: String(contactInfo),
        status: validStatus,
        value: typeof item.value === 'number' ? item.value : null,
        notes: item.notes ? String(item.notes) : null,
        formattedAddress: item.formattedAddress ?? null,
        latitude: typeof item.latitude === 'number' ? item.latitude : null,
        longitude: typeof item.longitude === 'number' ? item.longitude : null,
        phone: item.phone ?? null,
        websiteUri: item.websiteUri ?? null,
        hasOwnWebsite: Boolean(item.hasOwnWebsite),
        platformType: item.platformType ?? null,
        businessStatus: item.businessStatus ?? null,
        rating: typeof item.rating === 'number' ? item.rating : null,
        userRatingCount: typeof item.userRatingCount === 'number' ? item.userRatingCount : null,
        category: item.category ?? null,
        googleMapsUri: item.googleMapsUri ?? null,
        nextActionDate: item.nextActionDate ? new Date(item.nextActionDate) : null,
        provisionalScore: typeof item.provisionalScore === 'number' ? item.provisionalScore : null,
        finalScore: typeof item.finalScore === 'number' ? item.finalScore : null,
        scoreBreakdown: item.scoreBreakdown ?? undefined,
        pageSpeedAudit: item.pageSpeedAudit ?? undefined,
        aiAnalysis: item.aiAnalysis ?? undefined,
        pitches: item.pitches ?? undefined,
      };

      if (placeId) {
        const existing = await prisma.hqLead.findUnique({ where: { placeId } });
        if (existing) {
          await prisma.hqLead.update({
            where: { id: existing.id },
            data: dataPayload,
          });
          updatedCount++;
          continue;
        }
      }

      await prisma.hqLead.create({
        data: {
          ...dataPayload,
          placeId,
        },
      });
      createdCount++;
    }

    return NextResponse.json({
      createdCount,
      updatedCount,
      totalProcessed: createdCount + updatedCount,
    });
  } catch (error: unknown) {
    console.error('Error en POST /api/hq/leads/import:', error);
    return hqErrorResponse(error, 'Error importando prospectos.');
  }
}

