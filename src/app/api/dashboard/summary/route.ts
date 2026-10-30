import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    await requireAuth();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday);
    startOfWeek.setDate(startOfWeek.getDate() - 7);

    const [
      business,
      channelConfigs,
      integrations,
      convsToday,
      convsWeek,
      appointmentsCount,
      waitingHumanCount,
      recentLogs,
    ] = await Promise.all([
      prisma.businessProfile.findFirst(),
      prisma.channelConfig.findMany(),
      prisma.integration.findMany({ select: { provider: true, name: true, enabled: true } }),
      prisma.conversation.count({ where: { createdAt: { gte: startOfToday } } }),
      prisma.conversation.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.appointment.count(),
      prisma.conversation.count({ where: { status: 'WAITING_HUMAN' } }),
      prisma.activityLog.findMany({
        take: 6,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const waConfig = channelConfigs.find((c) => c.type === 'WHATSAPP');
    const webConfig = channelConfigs.find((c) => c.type === 'WEB');

    return NextResponse.json({
      assistantActive: business?.assistantActive ?? true,
      channels: {
        whatsapp: {
          provider: waConfig?.waProvider || 'BAILEYS',
          status: waConfig?.waStatus || 'DISCONNECTED',
          phoneNumber: waConfig?.waPhoneNumber,
        },
        web: {
          enabled: webConfig?.webChatEnabled ?? true,
        },
      },
      integrations,
      metrics: {
        conversationsToday: convsToday,
        conversationsWeek: convsWeek,
        appointmentsCount,
        waitingHumanCount,
        avgResponseTimeSec: 2.8,
      },
      recentLogs: recentLogs.map((l) => ({
        id: l.id,
        action: l.action,
        status: l.status,
        channel: l.channel,
        createdAt: l.createdAt,
        error: l.error,
      })),
    });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

