import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { buildSystemPrompt } from '@/lib/prompt-builder';

export async function GET() {
  try {
    await requireAuth();

    const [assistant, business, services, faqs, notes] = await Promise.all([
      prisma.assistantConfig.findFirst(),
      prisma.businessProfile.findFirst(),
      prisma.service.findMany({ orderBy: { name: 'asc' } }),
      prisma.faq.findMany({ orderBy: { createdAt: 'asc' } }),
      prisma.knowledgeNote.findMany({ orderBy: { createdAt: 'asc' } }),
    ]);

    if (!assistant || !business) {
      return NextResponse.json({ error: 'Configuración incompleta' }, { status: 400 });
    }

    const compiledPrompt = buildSystemPrompt({
      assistantName: assistant.name,
      businessName: business.name,
      activity: business.activity,
      address: business.address,
      phone: business.phone,
      website: business.website,
      timezone: business.timezone,
      tone: assistant.tone,
      welcomeMessage: assistant.welcomeMessage,
      customInstructions: assistant.customInstructions,
      neverDoList: assistant.neverDoList,
      businessHours: assistant.businessHours as any,
      outsideHoursBehavior: assistant.outsideHoursBehavior,
      handoffRules: assistant.handoffRules as any,
      services,
      faqs,
      knowledgeNotes: notes,
    });

    return NextResponse.json({
      prompt: compiledPrompt,
      meta: {
        assistantName: assistant.name,
        businessName: business.name,
        servicesCount: services.length,
        faqsCount: faqs.length,
      },
    });
  } catch (error) {
    console.error('Error generando prompt:', error);
    return NextResponse.json({ error: 'No autorizado o error interno' }, { status: 500 });
  }
}

