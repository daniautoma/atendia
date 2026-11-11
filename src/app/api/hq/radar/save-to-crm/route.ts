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
    const {
      placeId,
      name,
      niche,
      phone,
      formattedAddress,
      latitude,
      longitude,
      websiteUri,
      hasOwnWebsite,
      platformType,
      businessStatus,
      rating,
      userRatingCount,
      category,
      googleMapsUri,
      provisionalScore,
      finalScore,
      scoreBreakdown,
      pageSpeedAudit,
      aiAnalysis,
      pitches,
      notes,
      nextActionDate,
      status = 'NEW',
      value,
    } = body;

    if (!name || !niche) {
      return NextResponse.json({ error: 'El nombre y el nicho son obligatorios.' }, { status: 400 });
    }

    const urlInfo = classifyBusinessUrl(websiteUri);
    const resolvedHasOwnWeb =
      typeof hasOwnWebsite === 'boolean' ? hasOwnWebsite : urlInfo.isOwnedWebsite;
    const resolvedPlatformType = platformType || urlInfo.platformType;
    const parsedNextActionDate = nextActionDate ? new Date(nextActionDate) : undefined;
    const validStatus = Object.values(HqLeadStatus).includes(status as HqLeadStatus)
      ? (status as HqLeadStatus)
      : HqLeadStatus.NEW;

    const contactInfo = [phone, websiteUri, formattedAddress].filter(Boolean).join(' | ') || 'Sin datos de contacto';

    let lead;
    let isNew = false;

    if (placeId) {
      const existing = await prisma.hqLead.findUnique({
        where: { placeId },
      });

      if (existing) {
        lead = await prisma.hqLead.update({
          where: { id: existing.id },
          data: {
            name: name || existing.name,
            niche: niche || existing.niche,
            contactInfo: contactInfo || existing.contactInfo,
            phone: phone ?? existing.phone,
            formattedAddress: formattedAddress ?? existing.formattedAddress,
            latitude: latitude ?? existing.latitude,
            longitude: longitude ?? existing.longitude,
            websiteUri: websiteUri ?? existing.websiteUri,
            hasOwnWebsite: typeof hasOwnWebsite === 'boolean' ? hasOwnWebsite : existing.hasOwnWebsite,
            platformType: resolvedPlatformType ?? existing.platformType,
            businessStatus: businessStatus ?? existing.businessStatus,
            rating: rating ?? existing.rating,
            userRatingCount: userRatingCount ?? existing.userRatingCount,
            category: category ?? existing.category,
            googleMapsUri: googleMapsUri ?? existing.googleMapsUri,
            provisionalScore: provisionalScore ?? existing.provisionalScore,
            finalScore: finalScore ?? existing.finalScore,
            scoreBreakdown: (scoreBreakdown ?? existing.scoreBreakdown ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
            pageSpeedAudit: (pageSpeedAudit ?? existing.pageSpeedAudit ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
            aiAnalysis: (aiAnalysis ?? existing.aiAnalysis ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
            pitches: (pitches ?? existing.pitches ?? undefined) as
              | Prisma.InputJsonValue
              | undefined,
            notes: notes ?? existing.notes,
            nextActionDate: parsedNextActionDate ?? existing.nextActionDate,
            value: typeof value === 'number' ? value : existing.value,
          },
        });
      } else {
        isNew = true;
        lead = await prisma.hqLead.create({
          data: {
            placeId,
            name,
            niche,
            contactInfo,
            phone,
            formattedAddress,
            latitude,
            longitude,
            websiteUri,
            hasOwnWebsite: resolvedHasOwnWeb,
            platformType: resolvedPlatformType,
            businessStatus,
            rating,
            userRatingCount,
            category,
            googleMapsUri,
            provisionalScore,
            finalScore: finalScore ?? provisionalScore,
            scoreBreakdown: scoreBreakdown as Prisma.InputJsonValue | undefined,
            pageSpeedAudit: pageSpeedAudit as Prisma.InputJsonValue | undefined,
            aiAnalysis: aiAnalysis as Prisma.InputJsonValue | undefined,
            pitches: pitches as Prisma.InputJsonValue | undefined,
            notes,
            nextActionDate: parsedNextActionDate ?? null,
            status: aiAnalysis && validStatus === HqLeadStatus.NEW ? HqLeadStatus.ANALYZED : validStatus,
            value: typeof value === 'number' ? value : null,
          },
        });
      }
    } else {
      isNew = true;
      lead = await prisma.hqLead.create({
        data: {
          name,
          niche,
          contactInfo,
          phone,
          formattedAddress,
          latitude,
          longitude,
          websiteUri,
          hasOwnWebsite: resolvedHasOwnWeb,
          platformType: resolvedPlatformType,
          businessStatus,
          rating,
          userRatingCount,
          category,
          googleMapsUri,
          provisionalScore,
          finalScore: finalScore ?? provisionalScore,
          scoreBreakdown: scoreBreakdown as Prisma.InputJsonValue | undefined,
          pageSpeedAudit: pageSpeedAudit as Prisma.InputJsonValue | undefined,
          aiAnalysis: aiAnalysis as Prisma.InputJsonValue | undefined,
          pitches: pitches as Prisma.InputJsonValue | undefined,
          notes,
          nextActionDate: parsedNextActionDate ?? null,
          status: aiAnalysis && validStatus === HqLeadStatus.NEW ? HqLeadStatus.ANALYZED : validStatus,
          value: typeof value === 'number' ? value : null,
        },
      });
    }

    return NextResponse.json({
      lead,
      isNew,
      message: isNew ? 'Prospecto guardado exitosamente en HQ.' : 'Prospecto actualizado en HQ.',
    });
  } catch (error: unknown) {
    console.error('Error en POST /api/hq/radar/save-to-crm:', error);
    return hqErrorResponse(error, 'Error al guardar el prospecto en el CRM.');
  }
}

