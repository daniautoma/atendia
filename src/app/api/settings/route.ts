import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

// Modelos recomendados con soporte de tools en OpenRouter con precios aproximados por 1M tokens
export const POPULAR_TOOL_MODELS = [
  {
    id: 'anthropic/claude-haiku-5.5',
    name: 'Claude 3.5 Haiku',
    provider: 'Anthropic',
    inputCostPer1M: 0.8,
    outputCostPer1M: 4.0,
    contextLength: 200000,
    recommended: true,
    description: 'Ultra rápido, inteligente y económico. Ideal para WhatsApp y atención en tiempo real.',
  },
  {
    id: 'anthropic/claude-3.5-sonnet',
    name: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
    contextLength: 200000,
    recommended: false,
    description: 'Máxima capacidad de razonamiento para casos clínicos y agendas complejas.',
  },
  {
    id: 'openai/gpt-4o-mini',
    name: 'GPT-4o mini',
    provider: 'OpenAI',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.6,
    contextLength: 128000,
    recommended: false,
    description: 'Muy económico y rápido con soporte nativo de function calling.',
  },
  {
    id: 'openai/gpt-4o',
    name: 'GPT-4o',
    provider: 'OpenAI',
    inputCostPer1M: 2.5,
    outputCostPer1M: 10.0,
    contextLength: 128000,
    recommended: false,
    description: 'Modelo insignia multimodelo con excelente soporte de herramientas.',
  },
  {
    id: 'meta-llama/llama-3.3-70b-instruct',
    name: 'Llama 3.3 70B Instruct',
    provider: 'Meta',
    inputCostPer1M: 0.35,
    outputCostPer1M: 0.4,
    contextLength: 131072,
    recommended: false,
    description: 'Código abierto potente con llamada a herramientas estructuradas.',
  },
  {
    id: 'google/gemini-2.0-flash-001',
    name: 'Gemini 2.0 Flash',
    provider: 'Google',
    inputCostPer1M: 0.1,
    outputCostPer1M: 0.4,
    contextLength: 1048576,
    recommended: false,
    description: 'Nueva generación ultrarrápida de Google con soporte nativo de herramientas y 1M de contexto.',
  },
];

export async function GET() {
  try {
    await requireAuth();

    const [business, assistant, users] = await Promise.all([
      prisma.businessProfile.findFirst(),
      prisma.assistantConfig.findFirst(),
      prisma.user.findMany({
        select: { id: true, email: true, name: true, role: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return NextResponse.json({
      business,
      assistant: {
        aiModel: assistant?.aiModel || 'anthropic/claude-haiku-5.5',
        aiModelFallback: assistant?.aiModelFallback || 'anthropic/claude-haiku-5.5',
      },
      models: POPULAR_TOOL_MODELS,
      users,
      hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
    });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await requireAuth();
    const body = await req.json();

    // Actualizar datos del negocio / agencia
    if (body.business) {
      const currentBusiness = await prisma.businessProfile.findFirst();
      if (currentBusiness) {
        await prisma.businessProfile.update({
          where: { id: currentBusiness.id },
          data: {
            agencyName: body.business.agencyName ?? currentBusiness.agencyName,
            agencyLogo: body.business.agencyLogo !== undefined ? body.business.agencyLogo : currentBusiness.agencyLogo,
            timezone: body.business.timezone ?? currentBusiness.timezone,
          },
        });
      }
    }

    // Actualizar modelo de IA
    if (body.assistant) {
      const currentAssistant = await prisma.assistantConfig.findFirst();
      if (currentAssistant) {
        await prisma.assistantConfig.update({
          where: { id: currentAssistant.id },
          data: {
            aiModel: body.assistant.aiModel ?? currentAssistant.aiModel,
            aiModelFallback: body.assistant.aiModelFallback ?? currentAssistant.aiModelFallback,
          },
        });
      }
    }

    // Crear o modificar usuario (si es admin)
    if (body.newUser && session.role === 'ADMIN') {
      const { email, password, name, role } = body.newUser;
      if (email && password) {
        const passwordHash = await bcrypt.hash(password, 10);
        await prisma.user.create({
          data: {
            email: email.toLowerCase().trim(),
            passwordHash,
            name: name || 'Miembro del equipo',
            role: role || 'AGENT',
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al guardar ajustes:', error);
    return NextResponse.json({ error: error?.message || 'Error al actualizar ajustes' }, { status: 500 });
  }
}

