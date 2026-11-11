import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { HqTaskStatus, HqTaskPriority, Prisma } from '@prisma/client';
import { hqErrorResponse } from '@/lib/hq/apiError';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status');
    const priorityParam = searchParams.get('priority');
    const leadIdParam = searchParams.get('leadId');

    const whereClause: Prisma.HqTaskWhereInput = {};

    if (statusParam && Object.values(HqTaskStatus).includes(statusParam as HqTaskStatus)) {
      whereClause.status = statusParam as HqTaskStatus;
    }

    if (priorityParam && Object.values(HqTaskPriority).includes(priorityParam as HqTaskPriority)) {
      whereClause.priority = priorityParam as HqTaskPriority;
    }

    if (leadIdParam) {
      whereClause.leadId = leadIdParam;
    }

    const tasks = await prisma.hqTask.findMany({
      where: whereClause,
      include: {
        lead: {
          select: {
            id: true,
            name: true,
            niche: true,
          },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({ tasks });
  } catch (error: unknown) {
    return hqErrorResponse(error, 'Error en consulta de tareas', {
      defaultStatus: 401,
      authStatusForUnauthenticated: 401,
    });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
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

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json({ error: 'El título de la tarea es requerido' }, { status: 400 });
    }

    let taskStatus: HqTaskStatus = HqTaskStatus.TODO;
    if (status && Object.values(HqTaskStatus).includes(status as HqTaskStatus)) {
      taskStatus = status as HqTaskStatus;
    }

    let taskPriority: HqTaskPriority = HqTaskPriority.MEDIUM;
    if (priority && Object.values(HqTaskPriority).includes(priority as HqTaskPriority)) {
      taskPriority = priority as HqTaskPriority;
    }

    // Si viene leadId, verificar que exista
    if (leadId) {
      const leadExists = await prisma.hqLead.findUnique({ where: { id: leadId } });
      if (!leadExists) {
        return NextResponse.json({ error: 'El prospecto asociado no existe' }, { status: 400 });
      }
    }

    const task = await prisma.hqTask.create({
      data: {
        title: title.trim(),
        description: description ? String(description).trim() : null,
        status: taskStatus,
        priority: taskPriority,
        isAiGenerated: !!isAiGenerated,
        leadId: leadId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
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

    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (error: unknown) {
    return hqErrorResponse(error, 'Error al crear tarea', {
      defaultStatus: 401,
      authStatusForUnauthenticated: 401,
    });
  }
}

