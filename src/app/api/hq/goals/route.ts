import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { hqErrorResponse } from '@/lib/hq/apiError';

export async function GET() {
  try {
    await requireAdmin();

    const goal = await prisma.hqWeeklyGoal.findFirst({
      orderBy: { weekStartDate: 'desc' },
    });

    return NextResponse.json({ goal });
  } catch (error: unknown) {
    return hqErrorResponse(error, 'Error en consulta de objetivo semanal', {
      defaultStatus: 401,
      authStatusForUnauthenticated: 401,
    });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { id, visionText, aiFeedback, weekStartDate, weekEndDate, isCompleted } = body;

    if (!visionText || typeof visionText !== 'string' || !visionText.trim()) {
      return NextResponse.json({ error: 'El texto de la visión semanal es requerido' }, { status: 400 });
    }

    if (!weekStartDate || !weekEndDate) {
      return NextResponse.json({ error: 'Las fechas de inicio y fin de la semana son requeridas' }, { status: 400 });
    }

    // Si viene ID, actualizar el existente
    if (id) {
      const existing = await prisma.hqWeeklyGoal.findUnique({ where: { id } });
      if (existing) {
        const updated = await prisma.hqWeeklyGoal.update({
          where: { id },
          data: {
            visionText: visionText.trim(),
            aiFeedback: aiFeedback !== undefined ? (aiFeedback ? String(aiFeedback).trim() : null) : undefined,
            weekStartDate: new Date(weekStartDate),
            weekEndDate: new Date(weekEndDate),
            isCompleted: isCompleted !== undefined ? !!isCompleted : undefined,
          },
        });
        return NextResponse.json({ success: true, goal: updated });
      }
    }

    // Crear un nuevo objetivo semanal
    const created = await prisma.hqWeeklyGoal.create({
      data: {
        visionText: visionText.trim(),
        aiFeedback: aiFeedback ? String(aiFeedback).trim() : null,
        weekStartDate: new Date(weekStartDate),
        weekEndDate: new Date(weekEndDate),
        isCompleted: !!isCompleted,
      },
    });

    return NextResponse.json({ success: true, goal: created }, { status: 201 });
  } catch (error: unknown) {
    return hqErrorResponse(error, 'Error al guardar objetivo semanal', {
      defaultStatus: 401,
      authStatusForUnauthenticated: 401,
    });
  }
}

