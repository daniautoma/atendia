import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { buildSystemPrompt } from '@/lib/prompt-builder';
import { callOpenRouter, OpenRouterMessage } from '@/lib/ai/openrouter';
import { ASSISTANT_TOOLS, executeToolCall } from '@/lib/ai/tools';
import { MessageSender, ChannelType } from '@prisma/client';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, sessionId, contactInfo } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
    }

    // Comprobar si el chat web está activo y si el negocio tiene el asistente encendido
    const [business, channelWeb] = await Promise.all([
      prisma.businessProfile.findFirst(),
      prisma.channelConfig.findUnique({ where: { type: 'WEB' } }),
    ]);

    if (!channelWeb?.webChatEnabled) {
      return NextResponse.json({ error: 'El chat web está desactivado temporalmente' }, { status: 403 });
    }

    // 1. Crear o recuperar contacto
    const effectiveSessionId = sessionId || `web_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    let contact = await prisma.contact.findFirst({
      where: { webSessionId: effectiveSessionId },
    });

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          webSessionId: effectiveSessionId,
          name: contactInfo?.name || 'Visitante Web',
          phone: contactInfo?.phone || null,
          email: contactInfo?.email || null,
        },
      });
    }

    // 2. Recuperar o crear conversación
    let conversation = await prisma.conversation.findFirst({
      where: {
        contactId: contact.id,
        channel: ChannelType.WEB,
      },
      orderBy: { updatedAt: 'desc' },
      include: { messages: { take: 15, orderBy: { createdAt: 'asc' } } },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          contactId: contact.id,
          channel: ChannelType.WEB,
          status: 'BOT_ACTIVE',
        },
        include: { messages: true },
      });
    }

    // Guardar mensaje del usuario
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: MessageSender.CUSTOMER,
        text: message,
      },
    });

    // Si la conversación ha sido tomada por un agente humano, no responde la IA
    if (conversation.status === 'WAITING_HUMAN') {
      return NextResponse.json({
        response: 'Un miembro de nuestro equipo ha tomado la conversación y te responderá en unos instantes.',
        sessionId: effectiveSessionId,
        waitingHuman: true,
      });
    }

    // Si el interruptor general del asistente está en pausa
    if (business && !business.assistantActive) {
      return NextResponse.json({
        response: 'El asistente se encuentra temporalmente en pausa. Por favor déjanos tu consulta y te atenderemos pronto.',
        sessionId: effectiveSessionId,
      });
    }

    // 3. Ejecutar IA con herramientas
    const [assistant, services, faqs, notes] = await Promise.all([
      prisma.assistantConfig.findFirst(),
      prisma.service.findMany({ orderBy: { name: 'asc' } }),
      prisma.faq.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.knowledgeNote.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    const systemPrompt = buildSystemPrompt({
      assistantName: assistant?.name || 'LumenIA',
      businessName: business?.name || 'Clínica Dental Lumen',
      activity: business?.activity || 'Odontología integral en Madrid',
      address: business?.address || 'Gran Vía 42, Madrid',
      phone: business?.phone || '+34 910 123 456',
      website: business?.website || 'https://clinicalumen.es',
      timezone: business?.timezone || 'Europe/Madrid',
      tone: assistant?.tone || 'cercano',
      welcomeMessage: assistant?.welcomeMessage || '',
      customInstructions: assistant?.customInstructions || '',
      neverDoList: assistant?.neverDoList || '',
      businessHours: (assistant?.businessHours as any) || {},
      outsideHoursBehavior: assistant?.outsideHoursBehavior || 'APPOINTMENT_OR_MESSAGE',
      handoffRules: (assistant?.handoffRules as any) || {},
      services,
      faqs,
      knowledgeNotes: notes,
    });

    const historyMessages = (conversation.messages || []).map((m) => ({
      role: m.sender === 'CUSTOMER' ? ('user' as const) : ('assistant' as const),
      content: m.text,
    }));

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
      { role: 'user', content: message },
    ];

    let finalAssistantText = '';
    const completion = await callOpenRouter({
      model: assistant?.aiModel || 'anthropic/claude-haiku-5.5',
      fallbackModel: assistant?.aiModelFallback || 'anthropic/claude-haiku-5.5',
      messages,
      tools: ASSISTANT_TOOLS,
    });

    if (completion.message.tool_calls && completion.message.tool_calls.length > 0) {
      for (const call of completion.message.tool_calls) {
        let args: any = {};
        try {
          args = JSON.parse(call.function.arguments || '{}');
        } catch {}

        const toolRes = await executeToolCall(call.function.name, args, {
          safeMode: false,
          conversationId: conversation.id,
          contactId: contact.id,
        });

        messages.push(completion.message);
        messages.push({
          role: 'tool' as any,
          tool_call_id: call.id,
          name: call.function.name,
          content: JSON.stringify(toolRes.result),
        });
      }

      const secondPass = await callOpenRouter({
        model: assistant?.aiModel || 'anthropic/claude-haiku-5.5',
        messages,
      });
      finalAssistantText = secondPass.message.content || 'He consultado tus datos con el equipo.';
    } else {
      finalAssistantText = completion.message.content || '¿En qué más te puedo ayudar hoy?';
    }

    // Guardar respuesta del asistente
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: MessageSender.ASSISTANT,
        text: finalAssistantText,
      },
    });

    return NextResponse.json({
      response: finalAssistantText,
      sessionId: effectiveSessionId,
    });
  } catch (error: any) {
    console.error('Error en /api/chat web:', error);
    return NextResponse.json({ error: error.message || 'Error en el chat' }, { status: 500 });
  }
}
