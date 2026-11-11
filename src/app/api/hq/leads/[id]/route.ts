import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { HqLeadStatus } from '@prisma/client';
import { hqErrorResponse } from '@/lib/hq/apiError';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { name, niche, contactInfo, status, value, notes, nextActionDate, phone, websiteUri } = body;

    const existing = await prisma.hqLead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Prospecto no encontrado' }, { status: 404 });
    }

    let leadStatus: HqLeadStatus | undefined = undefined;
    if (status && Object.values(HqLeadStatus).includes(status as HqLeadStatus)) {
      leadStatus = status as HqLeadStatus;
    }

    const updated = await prisma.hqLead.update({
      where: { id },
      data: {
        name: name !== undefined ? String(name).trim() : undefined,
        niche: niche !== undefined ? String(niche).trim() : undefined,
        contactInfo: contactInfo !== undefined ? String(contactInfo).trim() : undefined,
        phone: phone !== undefined ? (phone ? String(phone).trim() : null) : undefined,
        websiteUri: websiteUri !== undefined ? (websiteUri ? String(websiteUri).trim() : null) : undefined,
        status: leadStatus,
        value: value !== undefined ? (value === null ? null : parseFloat(value) || 0) : undefined,
        notes: notes !== undefined ? (notes ? String(notes).trim() : null) : undefined,
        nextActionDate:
          nextActionDate !== undefined
            ? nextActionDate
              ? new Date(nextActionDate)
              : null
            : undefined,
      },
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: unknown) {
    return hqErrorResponse(error, 'Error al actualizar prospecto', {
      defaultStatus: 401,
      authStatusForUnauthenticated: 401,
    });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const existing = await prisma.hqLead.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Prospecto no encontrado' }, { status: 404 });
    }

    await prisma.hqLead.delete({ where: { id } });

    return NextResponse.json({ success: true, deleted: true });
  } catch (error: unknown) {
    return hqErrorResponse(error, 'Error al eliminar prospecto', {
      defaultStatus: 401,
      authStatusForUnauthenticated: 401,
    });
  }
}

