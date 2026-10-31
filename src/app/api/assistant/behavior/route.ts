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
          name: 'DentalIA',
          tone: 'cercano',
          welcomeMessage: '¡Hola! Bienvenido a Clínica Dental San Salvador. Soy DentalIA, tu asistente virtual. ¿En qué podemos ayudarte hoy?',
          customInstructions: 'Sé amable y empático.',
          neverDoList: 'No dar diagnósticos médicos.',
          businessHours: {
            monday: { open: '09:00', close: '20:00', enabled: true },
            tuesday: { open: '09:00', close: '20:00', enabled: true },
            wednesday: { open: '09:00', close: '20:00', enabled: true },
            thursday: { open: '09:00', close: '20:00', enabled: true },
            friday: { open: '09:00', close: '20:00', enabled: true },
            saturday: { open: '10:00', close: '14:00', enabled: true },
            sunday: { open: '00:00', close: '00:00', enabled: false },
          },
          outsideHoursBehavior: 'APPOINTMENT_OR_MESSAGE',
          handoffRules: {
            onComplaint: true,
            onUrgency: true,
            onHumanRequest: true,
            onUnknownAnswer: true,
            customRule: '',
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
      },
    });

    return NextResponse.json({ success: true, config: updated });
  } catch (error) {
    console.error('Error al actualizar comportamiento:', error);
    return NextResponse.json({ error: 'Error al actualizar configuración' }, { status: 500 });
  }
}

