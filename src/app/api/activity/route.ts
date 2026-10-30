import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const channel = searchParams.get('channel');
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let whereClause: any = {};
    if (channel && channel !== 'ALL') {
      whereClause.channel = channel;
    }
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const logs = await prisma.activityLog.findMany({
      where: whereClause,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ logs });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

