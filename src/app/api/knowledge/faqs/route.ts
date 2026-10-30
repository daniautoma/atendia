import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const faqSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(3, 'La pregunta debe tener al menos 3 caracteres'),
  answer: z.string().min(3, 'La respuesta debe tener al menos 3 caracteres'),
});

export async function GET() {
  try {
    await requireAuth();
    const faqs = await prisma.faq.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(faqs);
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const parsed = faqSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    }

    const created = await prisma.faq.create({
      data: parsed.data,
    });
    return NextResponse.json({ success: true, faq: created });
  } catch (error) {
    console.error('Error al crear FAQ:', error);
    return NextResponse.json({ error: 'Error al crear FAQ' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const parsed = faqSchema.safeParse(body);
    if (!parsed.success || !parsed.data.id) {
      return NextResponse.json({ error: 'ID y datos válidos requeridos' }, { status: 400 });
    }

    const { id, ...data } = parsed.data;
    const updated = await prisma.faq.update({
      where: { id },
      data,
    });
    return NextResponse.json({ success: true, faq: updated });
  } catch (error) {
    console.error('Error al actualizar FAQ:', error);
    return NextResponse.json({ error: 'Error al actualizar FAQ' }, { status: 500 });
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

    await prisma.faq.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar FAQ:', error);
    return NextResponse.json({ error: 'Error al eliminar FAQ' }, { status: 500 });
  }
}

