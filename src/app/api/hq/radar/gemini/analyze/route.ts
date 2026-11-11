import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/auth';
import { diagnoseBusiness } from '@/lib/radar/geminiClient';
import { PageSpeedAuditResult } from '@/lib/radar/pageSpeedClient';
import { calculateCommercialScore } from '@/lib/radar/scoringEngine';
import { prisma } from '@/lib/prisma';
import { hqErrorResponse } from '@/lib/hq/apiError';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      businessName,
      niche,
      address,
      phone,
      websiteUri,
      platformType,
      rating,
      userRatingCount,
      businessStatus,
      pageSpeedAudit,
      leadId,
      placeId,
    } = body;

    if (!businessName || !niche) {
      return NextResponse.json({ error: 'Faltan campos obligatorios: businessName y niche.' }, { status: 400 });
    }

    const existing =
      leadId || placeId
        ? await prisma.hqLead.findFirst({
            where: leadId ? { id: leadId } : { placeId },
          })
        : null;

    const effectiveAudit = (pageSpeedAudit ||
      (existing?.pageSpeedAudit as PageSpeedAuditResult | null) ||
      undefined) as PageSpeedAuditResult | undefined;

    const diagnosis = await diagnoseBusiness({
      businessName,
      niche,
      address: address ?? existing?.formattedAddress ?? undefined,
      phone: phone ?? existing?.phone ?? undefined,
      websiteUri: websiteUri ?? existing?.websiteUri ?? undefined,
      platformType: platformType ?? existing?.platformType ?? undefined,
      rating: rating ?? existing?.rating ?? undefined,
      userRatingCount: userRatingCount ?? existing?.userRatingCount ?? undefined,
      pageSpeedAudit: effectiveAudit,
    });

    const recalculatedScore = calculateCommercialScore({
      websiteUri: existing?.websiteUri || websiteUri,
      rating: existing?.rating ?? rating,
      userRatingCount: existing?.userRatingCount ?? userRatingCount,
      phone: existing?.phone ?? phone,
      formattedAddress: existing?.formattedAddress ?? address,
      niche: existing?.niche ?? niche,
      businessStatus: existing?.businessStatus ?? businessStatus,
      pageSpeedPerformance: effectiveAudit?.performanceScore,
      pageSpeedSeo: effectiveAudit?.seoScore,
      aiChecklist: diagnosis.checklist || null,
    });

    let updatedLead = null;
    if (existing) {
      updatedLead = await prisma.hqLead.update({
        where: { id: existing.id },
        data: {
          aiAnalysis: diagnosis as unknown as Prisma.InputJsonValue,
          finalScore: recalculatedScore.totalScore,
          scoreBreakdown: recalculatedScore.breakdown as unknown as Prisma.InputJsonValue,
          status: existing.status === 'NEW' ? 'ANALYZED' : existing.status,
        },
      });
    }

    return NextResponse.json({
      diagnosis,
      recalculatedScore,
      lead: updatedLead,
    });
  } catch (error: unknown) {
    console.error('Error en POST /api/hq/radar/gemini/analyze:', error);
    return hqErrorResponse(error, 'Error al generar diagnóstico con Gemini.');
  }
}

