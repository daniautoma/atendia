import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getWhatsAppAdapter } from '@/lib/channels/whatsapp/factory';
import { MessageSender } from '@prisma/client';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth();
    const { id } = await params;

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        contact: true,
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    }

    return NextResponse.json({ conversation });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = await req.json();
    const { text, action } = body; // action: 'TAKE_CONTROL' | 'HANDOVER_TO_BOT' | 'SEND_MESSAGE'

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: { contact: true },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    }

    // 1. Cambiar estado a Agente Humano (Tomar el control)
    if (action === 'TAKE_CONTROL') {
      const updated = await prisma.conversation.update({
        where: { id },
        data: {
          status: 'WAITING_HUMAN',
          needsHumanReason: `Tomado manualmente por ${session.name}`,
        },
      });
      return NextResponse.json({ success: true, conversation: updated });
    }

    // 2. Devolver la conversación al Asistente IA
    if (action === 'HANDOVER_TO_BOT') {
      const updated = await prisma.conversation.update({
        where: { id },
        data: {
          status: 'BOT_ACTIVE',
          needsHumanReason: null,
        },
      });
      return NextResponse.json({ success: true, conversation: updated });
    }

    // 3. Enviar mensaje manual escrito por una persona del equipo
    if (text && typeof text === 'string') {
      const createdMsg = await prisma.message.create({
        data: {
          conversationId: id,
          sender: MessageSender.AGENT,
          text,
        },
      });

      // Actualizar fecha de la conversación
      await prisma.conversation.update({
        where: { id },
        data: { updatedAt: new Date(), lastMessageAt: new Date() },
      });

      // Si es de WhatsApp, enviarlo al cliente por el adaptador correspondiente
      if (conversation.channel === 'WHATSAPP' && conversation.contact?.phone) {
        const adapter = await getWhatsAppAdapter(conversation.waProvider || undefined);
        await adapter.sendMessage({
          to: conversation.contact.phone,
          text,
          recipientBsuid: conversation.contact.ycloudBsuid || undefined,
        });
      }

      return NextResponse.json({ success: true, message: createdMsg });
    }

    return NextResponse.json({ error: 'Petición no reconocida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error en /api/conversations/[id]:', error);
    return NextResponse.json({ error: error.message || 'Error en conversación' }, { status: 500 });
  }
}

