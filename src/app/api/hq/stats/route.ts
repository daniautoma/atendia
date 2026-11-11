import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { HqLeadStatus, HqTaskStatus } from '@prisma/client';
import { hqErrorResponse } from '@/lib/hq/apiError';

export async function GET() {
  try {
    await requireAdmin();

    const [
      newLeads,
      analyzedLeads,
      contactedLeads,
      repliedLeads,
      meetingLeads,
      wonLeads,
      lostLeads,
      todoTasks,
      inProgressTasks,
      doneTasks,
      activeGoal,
    ] = await Promise.all([
      prisma.hqLead.count({ where: { status: HqLeadStatus.NEW } }),
      prisma.hqLead.count({ where: { status: HqLeadStatus.ANALYZED } }),
      prisma.hqLead.count({ where: { status: HqLeadStatus.CONTACTED } }),
      prisma.hqLead.count({ where: { status: HqLeadStatus.REPLIED } }),
      prisma.hqLead.count({ where: { status: HqLeadStatus.MEETING } }),
      prisma.hqLead.count({ where: { status: HqLeadStatus.WON } }),
      prisma.hqLead.count({ where: { status: HqLeadStatus.LOST } }),
      prisma.hqTask.count({ where: { status: HqTaskStatus.TODO } }),
      prisma.hqTask.count({ where: { status: HqTaskStatus.IN_PROGRESS } }),
      prisma.hqTask.count({ where: { status: HqTaskStatus.DONE } }),
      prisma.hqWeeklyGoal.findFirst({
        orderBy: { weekStartDate: 'desc' },
      }),
    ]);

    const totalLeads = newLeads + analyzedLeads + contactedLeads + repliedLeads + meetingLeads + wonLeads + lostLeads;
    const totalTasks = todoTasks + inProgressTasks + doneTasks;

    return NextResponse.json({
      stats: {
        totalLeads,
        totalTasks,
        leadsByStatus: {
          NEW: newLeads,
          ANALYZED: analyzedLeads,
          CONTACTED: contactedLeads,
          REPLIED: repliedLeads,
          MEETING: meetingLeads,
          WON: wonLeads,
          LOST: lostLeads,
        },
        tasksByStatus: {
          TODO: todoTasks,
          IN_PROGRESS: inProgressTasks,
          DONE: doneTasks,
        },
        activeGoal,
      },
    });
  } catch (error: unknown) {
    return hqErrorResponse(error, 'Error de autenticación', {
      defaultStatus: 401,
      authStatusForUnauthenticated: 401,
    });
  }
}

