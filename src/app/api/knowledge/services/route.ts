import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const serviceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().min(5, 'La descripción es obligatoria'),
  durationMinutes: z.number().int().min(5, 'Duración mínima 5 min'),
  price: z.number().nullable().optional(),
  isPriceFrom: z.boolean().default(false),
  requiresEvaluation: z.boolean().default(false),
});

export async function GET() {
  try {
    await requireAuth();
    const services = await prisma.service.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(services);
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const parsed = serviceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const created = await prisma.service.create({
      data: parsed.data,
    });
    return NextResponse.json({ success: true, service: created });
  } catch (error) {
    console.error('Error al crear servicio:', error);
    return NextResponse.json({ error: 'Error al crear servicio' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const parsed = serviceSchema.safeParse(body);
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json({ error: 'ID y datos válidos requeridos' }, { status: 400 });
    }

    const { id, ...data } = parsed.data;
    const updated = await prisma.service.update({
      where: { id },
      data,
    });
    return NextResponse.json({ success: true, service: updated });
  } catch (error) {
    console.error('Error al actualizar servicio:', error);
    return NextResponse.json({ error: 'Error al actualizar servicio' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
    }

    await prisma.service.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar servicio:', error);
    return NextResponse.json({ error: 'Error al eliminar servicio' }, { status: 500 });
  }
}

