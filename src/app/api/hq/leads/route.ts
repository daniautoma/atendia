import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { HqLeadStatus, Prisma } from '@prisma/client';
import { hqErrorResponse } from '@/lib/hq/apiError';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const search = searchParams.get('search')?.trim().toLowerCase();

    const whereClause: Prisma.HqLeadWhereInput = {};

    if (statusParam && Object.values(HqLeadStatus).includes(statusParam as HqLeadStatus)) {
      whereClause.status = statusParam as HqLeadStatus;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { niche: { contains: search, mode: 'insensitive' } },
        { contactInfo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const leads = await prisma.hqLead.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ leads });
  } catch (error: unknown) {
    return hqErrorResponse(error, 'Error en consulta de prospectos', {
      defaultStatus: 401,
      authStatusForUnauthenticated: 401,
    });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { name, niche, contactInfo, status, value, notes, nextActionDate, phone, websiteUri } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del prospecto es requerido' }, { status: 400 });
    }
    if (!niche || typeof niche !== 'string' || !niche.trim()) {
      return NextResponse.json({ error: 'El nicho es requerido' }, { status: 400 });
    }
    if (!contactInfo || typeof contactInfo !== 'string' || !contactInfo.trim()) {
      return NextResponse.json({ error: 'La información de contacto es requerida' }, { status: 400 });
    }

    let leadStatus: HqLeadStatus = HqLeadStatus.NEW;
    if (status && Object.values(HqLeadStatus).includes(status as HqLeadStatus)) {
      leadStatus = status as HqLeadStatus;
    }

    const lead = await prisma.hqLead.create({
      data: {
        name: name.trim(),
        niche: niche.trim(),
        contactInfo: contactInfo.trim(),
        phone: phone ? String(phone).trim() : null,
        websiteUri: websiteUri ? String(websiteUri).trim() : null,
        status: leadStatus,
        value: typeof value === 'number' ? value : value ? parseFloat(value) : null,
        notes: notes ? String(notes).trim() : null,
        nextActionDate: nextActionDate ? new Date(nextActionDate) : null,
      },
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error: unknown) {
    return hqErrorResponse(error, 'Error al crear prospecto', {
      defaultStatus: 401,
      authStatusForUnauthenticated: 401,
    });
  }
}

