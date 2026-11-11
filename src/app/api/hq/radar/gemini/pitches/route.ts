import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireAdmin } from '@/lib/auth';
import { generateCommercialPitches } from '@/lib/radar/geminiClient';
import { prisma } from '@/lib/prisma';
import { hqErrorResponse } from '@/lib/hq/apiError';

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      businessName,
      niche,
      phone,
      contactPerson,
      diagnosis,
      tone,
      leadId,
      placeId,
    } = body;

    if (!businessName || !niche || !diagnosis) {
      return NextResponse.json({ error: 'Faltan campos obligatorios: businessName, niche y diagnosis.' }, { status: 400 });
    }

    const pitches = await generateCommercialPitches({
      businessName,
      niche,
      phone,
      contactPerson,
      diagnosis,
      tone,
    });

    let updatedLead = null;
    if (leadId || placeId) {
      const existing = await prisma.hqLead.findFirst({
        where: leadId ? { id: leadId } : { placeId },
      });

      if (existing) {
        updatedLead = await prisma.hqLead.update({
          where: { id: existing.id },
          data: {
            pitches: pitches as unknown as Prisma.InputJsonValue,
          },
        });
      }
    }

    return NextResponse.json({
      pitches,
      lead: updatedLead,
    });
  } catch (error: unknown) {
    console.error('Error en POST /api/hq/radar/gemini/pitches:', error);
    return hqErrorResponse(error, 'Error al generar guiones comerciales con Gemini.');
  }
}

