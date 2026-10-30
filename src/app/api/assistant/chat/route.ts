import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { buildSystemPrompt } from '@/lib/prompt-builder';
import { callOpenRouter, OpenRouterMessage } from '@/lib/ai/openrouter';
import { ASSISTANT_TOOLS, executeToolCall } from '@/lib/ai/tools';
import { LogStatus } from '@prisma/client';

export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const {
      message,
      conversationId,
      safeMode = true,
      simulateChannel = 'WHATSAPP_YCLOUD',
      history = [],
    } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
    }

    const timeline: Array<{
      step: string;
      title: string;
      detail?: any;
      timestamp: string;
    }> = [];

    const nowMadrid = new Date().toLocaleTimeString('es-ES', { timeZone: 'Europe/Madrid' });

    // 1. Mensaje recibido
    timeline.push({
      step: 'INBOUND',
      title: `Mensaje recibido (${simulateChannel})`,
      detail: { text: message, safeMode },
      timestamp: nowMadrid,
    });

    // 2. Obtener contexto de configuración
    const [assistant, business, services, faqs, notes] = await Promise.all([
      prisma.assistantConfig.findFirst(),
      prisma.businessProfile.findFirst(),
      prisma.service.findMany({ orderBy: { name: 'asc' } }),
      prisma.faq.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.knowledgeNote.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    const systemPrompt = buildSystemPrompt({
      assistantName: assistant?.name || 'LumenIA',
      businessName: business?.name || 'Clínica Dental Lumen',
      activity: business?.activity || 'Odontología integral y estética dental',
      address: business?.address || 'Calle Gran Vía 42, Madrid',
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

    timeline.push({
      step: 'PROMPT_COMPILED',
      title: 'Contexto estructurado en zona horaria Europe/Madrid',
      detail: {
        servicesCount: services.length,
        faqsCount: faqs.length,
        promptLengthChars: systemPrompt.length,
        model: assistant?.aiModel || 'anthropic/claude-haiku-5.5',
      },
      timestamp: nowMadrid,
    });

    // 3. Preparar array de mensajes (con últimos 20 turnos de historial)
    const formattedHistory: OpenRouterMessage[] = (history || []).slice(-20).map((h: any) => ({
      role: h.sender === 'CUSTOMER' || h.role === 'user' ? 'user' : 'assistant',
      content: h.text || h.content || '',
    }));

    const messages: OpenRouterMessage[] = [
      { role: 'system', content: systemPrompt },
      ...formattedHistory,
      { role: 'user', content: message },
    ];

    const model = assistant?.aiModel || 'anthropic/claude-haiku-5.5';
    const fallbackModel = assistant?.aiModelFallback || 'anthropic/claude-haiku-5.5';

    let currentTurn = 0;
    const maxToolIterations = 5;
    const executedTools: any[] = [];
    let finalAssistantText = '';

    while (currentTurn < maxToolIterations) {
      currentTurn++;

      const completion = await callOpenRouter({
        model,
        fallbackModel,
        messages,
        tools: ASSISTANT_TOOLS,
        temperature: 0.2,
      });

      const assistantMsg = completion.message;
      messages.push(assistantMsg);

      if (completion.wasFallback) {
        timeline.push({
          step: 'FALLBACK_TRIGGERED',
          title: `Fallback activado: ${completion.modelUsed}`,
          detail: { originalModel: model, fallbackModel },
          timestamp: nowMadrid,
        });
      }

      // Si el modelo solicita ejecutar tools
      if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
        for (const call of assistantMsg.tool_calls) {
          const toolName = call.function.name;
          let toolArgs: any = {};
          try {
            toolArgs = JSON.parse(call.function.arguments || '{}');
          } catch {
            toolArgs = {};
          }

          timeline.push({
            step: 'TOOL_INVOKED',
            title: `Llamada a herramienta: ${toolName}`,
            detail: { args: toolArgs, safeMode },
            timestamp: nowMadrid,
          });

          // Ejecutar la herramienta
          const toolResult = await executeToolCall(toolName, toolArgs, {
            safeMode,
            conversationId,
          });

          executedTools.push({
            tool: toolName,
            args: toolArgs,
            result: toolResult.result,
            summary: toolResult.summary,
          });

          timeline.push({
            step: 'TOOL_RESULT',
            title: `Resultado de ${toolName}`,
            detail: toolResult.result,
            timestamp: nowMadrid,
          });

          // Registrar en ActivityLog
          await prisma.activityLog.create({
            data: {
              action: `tool.${toolName}`,
              status: LogStatus.INFO,
              details: {
                args: toolArgs,
                summary: toolResult.summary,
                safeMode,
                simulateChannel,
              },
            },
          }).catch(() => {});

          // Inyectar el resultado al contexto de mensajes
          messages.push({
            role: 'tool',
            tool_call_id: call.id,
            name: toolName,
            content: JSON.stringify(toolResult.result),
          });
        }
      } else {
        // Respuesta final del asistente
        finalAssistantText = assistantMsg.content || '';
        break;
      }
    }

    timeline.push({
      step: 'RESPONSE_READY',
      title: 'Respuesta generada para el cliente',
      detail: { textLength: finalAssistantText.length, toolCallsCount: executedTools.length },
      timestamp: nowMadrid,
    });

    return NextResponse.json({
      success: true,
      response: finalAssistantText,
      toolCalls: executedTools,
      timeline,
      safeMode,
      modelUsed: model,
    });
  } catch (error: any) {
    console.error('Error en /api/assistant/chat:', error);
    return NextResponse.json({ error: error?.message || 'Error en el asistente' }, { status: 500 });
  }
}

