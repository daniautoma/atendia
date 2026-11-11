import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/auth';
import { runPageSpeedAudit } from '@/lib/radar/pageSpeedClient';
import { calculateCommercialScore, ScoreChecklistInput } from '@/lib/radar/scoringEngine';
import { prisma } from '@/lib/prisma';
import { hqErrorResponse } from '@/lib/hq/apiError';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      url,
      strategy = 'mobile',
      placeId,
      leadId,
      rating,
      userRatingCount,
      phone,
      formattedAddress,
      niche,
      businessStatus,
      aiChecklist,
    } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'Se requiere una URL válida para auditar.' }, { status: 400 });
    }

    const audit = await runPageSpeedAudit(url, strategy);

    let updatedLead = null;
    let recalculatedScore = null;

    // Si se pasa un leadId o placeId, actualizamos el registro en BD si existe
    if (leadId || placeId) {
      const existing = await prisma.hqLead.findFirst({
        where: leadId ? { id: leadId } : { placeId: placeId },
      });

      if (existing) {
        const storedAnalysis = existing.aiAnalysis as { checklist?: ScoreChecklistInput } | null;
        const existingChecklist = storedAnalysis?.checklist ?? aiChecklist ?? null;
        // Recalcular puntaje con las nuevas métricas de PageSpeed + estado operativo + checklist
        const scoreResult = calculateCommercialScore({
          websiteUri: existing.websiteUri || url,
          rating: existing.rating ?? rating,
          userRatingCount: existing.userRatingCount ?? userRatingCount,
          phone: existing.phone ?? phone,
          formattedAddress: existing.formattedAddress ?? formattedAddress,
          niche: existing.niche ?? niche,
          businessStatus: existing.businessStatus ?? businessStatus,
          pageSpeedPerformance: audit.performanceScore,
          pageSpeedSeo: audit.seoScore,
          aiChecklist: existingChecklist,
        });

        recalculatedScore = scoreResult;

        updatedLead = await prisma.hqLead.update({
          where: { id: existing.id },
          data: {
            pageSpeedAudit: audit as unknown as Prisma.InputJsonValue,
            finalScore: scoreResult.totalScore,
            scoreBreakdown: scoreResult.breakdown as unknown as Prisma.InputJsonValue,
          },
        });
      }
    }

    if (!recalculatedScore) {
      recalculatedScore = calculateCommercialScore({
        websiteUri: url,
        rating,
        userRatingCount,
        phone,
        formattedAddress,
        niche,
        businessStatus,
        pageSpeedPerformance: audit.performanceScore,
        pageSpeedSeo: audit.seoScore,
        aiChecklist: aiChecklist || null,
      });
    }

    return NextResponse.json({
      audit,
      recalculatedScore,
      lead: updatedLead,
    });
  } catch (error: unknown) {
    console.error('Error en POST /api/hq/radar/audit:', error);
    return hqErrorResponse(error, 'Error al ejecutar auditoría PageSpeed.');
  }
}

