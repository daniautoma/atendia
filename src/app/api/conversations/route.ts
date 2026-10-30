import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter') || 'all'; // all, needs_attention, whatsapp, web

    let whereClause: any = {};

    if (filter === 'needs_attention') {
      whereClause.status = 'WAITING_HUMAN';
    } else if (filter === 'whatsapp') {
      whereClause.channel = 'WHATSAPP';
    } else if (filter === 'web') {
      whereClause.channel = 'WEB';
    }

    const conversations = await prisma.conversation.findMany({
      where: whereClause,
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // último mensaje para preview
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const formatted = conversations.map((c) => ({
      id: c.id,
      contactName: c.contact?.name || 'Contacto sin nombre',
      contactPhone: c.contact?.phone || c.contact?.webSessionId || '',
      channel: c.channel,
      waProvider: c.waProvider,
      status: c.status,
      needsHumanReason: c.needsHumanReason,
      updatedAt: c.updatedAt,
      lastMessage: c.messages?.[0]?.text || 'Conversación iniciada',
      lastMessageAt: c.messages?.[0]?.createdAt || c.updatedAt,
      unreadCount: c.unreadCount,
    }));

    return NextResponse.json({ conversations: formatted });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

