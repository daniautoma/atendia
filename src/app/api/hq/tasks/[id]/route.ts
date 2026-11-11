import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { HqTaskStatus, HqTaskPriority } from '@prisma/client';
import { hqErrorResponse } from '@/lib/hq/apiError';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const {
      title,
      description,
      status,
      priority,
      isAiGenerated,
      leadId,
      dueDate,
    } = body;

    const existing = await prisma.hqTask.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    let taskStatus: HqTaskStatus | undefined = undefined;
    if (status && Object.values(HqTaskStatus).includes(status as HqTaskStatus)) {
      taskStatus = status as HqTaskStatus;
    }

    let taskPriority: HqTaskPriority | undefined = undefined;
    if (priority && Object.values(HqTaskPriority).includes(priority as HqTaskPriority)) {
      taskPriority = priority as HqTaskPriority;
    }

    if (leadId) {
      const leadExists = await prisma.hqLead.findUnique({ where: { id: leadId } });
      if (!leadExists) {
        return NextResponse.json({ error: 'El prospecto asociado no existe' }, { status: 400 });
      }
    }

    const updated = await prisma.hqTask.update({
      where: { id },
      data: {
        title: title !== undefined ? String(title).trim() : undefined,
        description: description !== undefined ? (description ? String(description).trim() : null) : undefined,
        status: taskStatus,
        priority: taskPriority,
        isAiGenerated: isAiGenerated !== undefined ? !!isAiGenerated : undefined,
        leadId: leadId !== undefined ? leadId : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
      },
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            niche: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, task: updated });
  } catch (error: unknown) {
    return hqErrorResponse(error, 'Error al actualizar tarea', {
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

    const existing = await prisma.hqTask.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Tarea no encontrada' }, { status: 404 });
    }

    await prisma.hqTask.delete({ where: { id } });

    return NextResponse.json({ success: true, deleted: true });
  } catch (error: unknown) {
    return hqErrorResponse(error, 'Error al eliminar tarea', {
      defaultStatus: 401,
      authStatusForUnauthenticated: 401,
    });
  }
}

