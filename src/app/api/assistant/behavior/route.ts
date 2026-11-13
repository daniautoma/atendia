import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    await requireAuth();
    let config = await prisma.assistantConfig.findFirst();
    if (!config) {
      config = await prisma.assistantConfig.create({
        data: {
          name: 'Asistente danIAutoma',
          tone: 'cercano',
          welcomeMessage: '¡Hola! 👋 Soy el asistente virtual de danIAutoma. ¿Te gustaría conocer cómo automatizar la atención y citas de tu negocio con IA o agendar una llamada de diagnóstico gratuito?',
          customInstructions: 'Sé cercano, consultivo, claro y orientado a ayudar a dueños de negocios locales (clínicas, talleres, academias, inmobiliarias, comercios) a no perder clientes por tardar en responder. Trata al cliente o prospecto con cordialidad y tuteo respetuoso. Tu objetivo principal es resolver dudas sobre nuestros servicios y agendar una Llamada de Diagnóstico Gratuito (30 min).',
          neverDoList: 'No inventar servicios o precios que no estén en el catálogo oficial de danIAutoma. No garantizar resultados sin un diagnóstico previo. No confirmar citas fuera del horario disponible ni los domingos.',
          businessHours: {
            monday: { open: '08:00', close: '18:00', enabled: true },
            tuesday: { open: '08:00', close: '18:00', enabled: true },
            wednesday: { open: '08:00', close: '18:00', enabled: true },
            thursday: { open: '08:00', close: '18:00', enabled: true },
            friday: { open: '08:00', close: '18:00', enabled: true },
            saturday: { open: '08:00', close: '13:00', enabled: true },
            sunday: { open: '00:00', close: '00:00', enabled: false },
          },
          outsideHoursBehavior: 'APPOINTMENT_OR_MESSAGE',
          handoffRules: {
            onComplaint: true,
            onUrgency: true,
            onHumanRequest: true,
            onUnknownAnswer: true,
            customRule: 'Solicitud de proyecto complejo, presupuesto a medida o soporte técnico urgente',
          },
        },
      });
    }
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();

    const config = await prisma.assistantConfig.findFirst();
    if (!config) {
      return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 });
    }

    const updated = await prisma.assistantConfig.update({
      where: { id: config.id },
      data: {
        name: body.name ?? config.name,
        avatarUrl: body.avatarUrl !== undefined ? body.avatarUrl : config.avatarUrl,
        tone: body.tone ?? config.tone,
        welcomeMessage: body.welcomeMessage ?? config.welcomeMessage,
        customInstructions: body.customInstructions ?? config.customInstructions,
        neverDoList: body.neverDoList ?? config.neverDoList,
        businessHours: body.businessHours ?? config.businessHours,
        outsideHoursBehavior: body.outsideHoursBehavior ?? config.outsideHoursBehavior,
        handoffRules: body.handoffRules ?? config.handoffRules,
        systemPromptOverride: body.systemPromptOverride !== undefined ? body.systemPromptOverride : config.systemPromptOverride,
      },
    });

    return NextResponse.json({ success: true, config: updated });
  } catch (error) {
    console.error('Error al actualizar comportamiento:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}

