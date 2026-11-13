import { PrismaClient, Role, ChannelType, WhatsAppProvider, ConnectionStatus, ConversationStatus, MessageSender } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando semilla de datos para danIAutoma (El Salvador)...');

  // 1. Usuarios: Administrador y Agente de Soporte
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@daniautoma.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234password';
  const adminHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminHash, role: Role.ADMIN, name: 'Administrador danIAutoma' },
    create: {
      email: adminEmail,
      name: 'Administrador danIAutoma',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });
  console.log(`✓ Administrador verificado: ${admin.email}`);

  const agentEmail = process.env.AGENT_EMAIL || 'agente@daniautoma.com';
  const agentPassword = process.env.AGENT_PASSWORD || 'agente1234password';
  const agentHash = await bcrypt.hash(agentPassword, 10);

  const agent = await prisma.user.upsert({
    where: { email: agentEmail },
    update: { passwordHash: agentHash, role: Role.AGENT, name: 'Carlos Martínez (Agente danIAutoma)' },
    create: {
      email: agentEmail,
      name: 'Carlos Martínez (Agente danIAutoma)',
      passwordHash: agentHash,
      role: Role.AGENT,
    },
  });
  console.log(`✓ Agente de soporte verificado: ${agent.email}`);

  // 2. Perfil Oficial del Negocio (danIAutoma)
  const business = await prisma.businessProfile.upsert({
    where: { id: 'default-business' },
    update: {
      name: 'danIAutoma',
      activity: 'Agencia de Automatización con IA, Agentes de WhatsApp y Desarrollo Web',
      address: 'San Salvador, El Salvador (Atención Digital y Consultoría Remota)',
      phone: '+503 7000 0000',
      website: 'https://daniautoma.com',
      timezone: 'America/El_Salvador',
      agencyName: 'danIAutoma',
      assistantActive: true,
    },
    create: {
      id: 'default-business',
      name: 'danIAutoma',
      activity: 'Agencia de Automatización con IA, Agentes de WhatsApp y Desarrollo Web',
      address: 'San Salvador, El Salvador (Atención Digital y Consultoría Remota)',
      phone: '+503 7000 0000',
      website: 'https://daniautoma.com',
      timezone: 'America/El_Salvador',
      assistantActive: true,
      agencyName: 'danIAutoma',
    },
  });
  console.log(`✓ Perfil de negocio verificado: ${business.name} (${business.timezone})`);

  // 3. Configuración del Asistente (Asistente danIAutoma)
  const businessHours = {
    monday: { open: '08:00', close: '18:00', enabled: true },
    tuesday: { open: '08:00', close: '18:00', enabled: true },
    wednesday: { open: '08:00', close: '18:00', enabled: true },
    thursday: { open: '08:00', close: '18:00', enabled: true },
    friday: { open: '08:00', close: '18:00', enabled: true },
    saturday: { open: '08:00', close: '13:00', enabled: true },
    sunday: { open: '00:00', close: '00:00', enabled: false },
  };

  const handoffRules = {
    onComplaint: true,
    onUrgency: true,
    onHumanRequest: true,
    onUnknownAnswer: true,
    customRule: 'Solicitud de proyecto complejo, presupuesto a medida o soporte técnico urgente',
  };

  const assistantConfig = await prisma.assistantConfig.upsert({
    where: { id: 'default-assistant' },
    update: {
      name: 'Asistente danIAutoma',
      welcomeMessage: '¡Hola! 👋 Soy el asistente virtual de danIAutoma. ¿Te gustaría conocer cómo automatizar la atención y citas de tu negocio con IA o agendar una llamada de diagnóstico gratuito?',
      customInstructions: 'Sé cercano, consultivo, claro y orientado a ayudar a dueños de negocios locales (clínicas, talleres, academias, inmobiliarias, comercios) a no perder clientes por tardar en responder. Trata al cliente o prospecto con cordialidad y tuteo respetuoso. Tu objetivo principal es resolver dudas sobre nuestros servicios y agendar una Llamada de Diagnóstico Gratuito (30 min).',
      neverDoList: 'No inventar servicios o precios que no estén en el catálogo oficial de danIAutoma. No garantizar resultados sin un diagnóstico previo del caso. No confirmar citas fuera del horario disponible ni los domingos.',
      businessHours,
      outsideHoursBehavior: 'APPOINTMENT_OR_MESSAGE',
      handoffRules,
      aiModel: 'openai/gpt-4o-mini',
      aiModelFallback: 'openai/gpt-4o-mini',
    },
    create: {
      id: 'default-assistant',
      name: 'Asistente danIAutoma',
      avatarUrl: null,
      tone: 'cercano',
      welcomeMessage: '¡Hola! 👋 Soy el asistente virtual de danIAutoma. ¿Te gustaría conocer cómo automatizar la atención y citas de tu negocio con IA o agendar una llamada de diagnóstico gratuito?',
      customInstructions: 'Sé cercano, consultivo, claro y orientado a ayudar a dueños de negocios locales (clínicas, talleres, academias, inmobiliarias, comercios) a no perder clientes por tardar en responder. Trata al cliente o prospecto con cordialidad y tuteo respetuoso. Tu objetivo principal es resolver dudas sobre nuestros servicios y agendar una Llamada de Diagnóstico Gratuito (30 min).',
      neverDoList: 'No inventar servicios o precios que no estén en el catálogo oficial de danIAutoma. No garantizar resultados sin un diagnóstico previo del caso. No confirmar citas fuera del horario disponible ni los domingos.',
      businessHours,
      outsideHoursBehavior: 'APPOINTMENT_OR_MESSAGE',
      handoffRules,
      aiModel: 'openai/gpt-4o-mini',
      aiModelFallback: 'openai/gpt-4o-mini',
    },
  });
  console.log(`✓ Asistente configurado: ${assistantConfig.name}`);

  // 4. Limpieza Total de Servicios y Registro del Catálogo Oficial danIAutoma (USD)
  await prisma.service.deleteMany({});
  console.log('✓ Tabla de servicios limpiada.');

  const services = [
    {
      name: 'Llamada de Diagnóstico Estratégico',
      description: 'Sesión 1 a 1 para analizar los procesos del negocio y diseñar una propuesta de automatización a medida.',
      durationMinutes: 30,
      price: 0,
      isPriceFrom: false,
      requiresEvaluation: false,
    },
    {
      name: 'Agente de IA Omnicanal (WhatsApp + Web + CRM)',
      description: 'Implementación de asistente virtual entrenado con la información del negocio, agenda automática de citas y bandeja compartida.',
      durationMinutes: 60,
      price: 350,
      isPriceFrom: true,
      requiresEvaluation: false,
    },
    {
      name: 'Automatización de Procesos con n8n',
      description: 'Integración entre formularios web, WhatsApp, Google Sheets, correo y herramientas internas para eliminar tareas repetitivas.',
      durationMinutes: 60,
      price: 200,
      isPriceFrom: true,
      requiresEvaluation: false,
    },
    {
      name: 'Landing Page de Alta Conversión',
      description: 'Diseño y desarrollo web ultra rápido optimizado para captar clientes y conectado con WhatsApp e IA.',
      durationMinutes: 60,
      price: 250,
      isPriceFrom: true,
      requiresEvaluation: false,
    },
  ];

  for (const s of services) {
    await prisma.service.create({ data: s });
  }
  console.log(`✓ ${services.length} servicios oficiales de danIAutoma registrados en USD.`);

  // 5. Limpieza Total de FAQs y Registro de FAQs Oficiales danIAutoma
  await prisma.faq.deleteMany({});
  await prisma.knowledgeNote.deleteMany({});
  console.log('✓ Tablas de FAQs y notas de conocimiento limpiadas.');

  const faqs = [
    {
      question: '¿Puedo usar mi número actual de WhatsApp?',
      answer: 'Sí, podemos conectar el agente directamente a tu número actual de WhatsApp Business (mediante conexión QR o la API Oficial de Meta/Cloud API según tus necesidades) sin perder tus contactos ni historial previo.',
    },
    {
      question: '¿Cuánto tiempo tarda la implementación?',
      answer: 'La puesta en marcha estándar toma entre 3 a 5 días hábiles, incluyendo el entrenamiento con la información de tu negocio, pruebas de agendamiento y conexión con tus herramientas internas.',
    },
    {
      question: '¿Qué costos de consumo de IA / OpenRouter tiene?',
      answer: 'El consumo de IA es ultra accesible (fracciones de centavo por conversación mediante modelos avanzados y eficientes como GPT-4o mini). Ofrecemos planes de soporte continuo, monitoreo y optimización de prompts adaptados a tu volumen de clientes.',
    },
    {
      question: '¿Se conecta con Google Calendar y mi CRM?',
      answer: 'Sí, el asistente consulta tu disponibilidad en tiempo real, agenda citas en Google Calendar respetando tus horarios hábiles y registra cada nuevo contacto (lead) en Google Sheets o tu CRM preferido.',
    },
    {
      question: '¿Cómo funciona la delegación a humanos (handoff)?',
      answer: 'Si un cliente pide hablar con una persona o solicita un presupuesto complejo fuera del alcance del bot, el sistema transfiere la conversación automáticamente, notifica a tu equipo y permite intervenir directamente desde el panel sin fricción.',
    },
    {
      question: '¿Qué incluye la Llamada de Diagnóstico Estratégico?',
      answer: 'Es una sesión gratuita de 30 minutos vía Google Meet donde analizamos el embudo de atención de tu negocio, detectamos cuellos de botella y te mostramos una demostración en vivo de cómo funcionaría la IA en tu caso específico.',
    },
    {
      question: '¿Qué tipo de soporte técnico y mantenimiento ofrecen?',
      answer: 'Brindamos soporte continuo para actualización de información, ajuste de prompts, revisión de logs de conversación, resolución de incidencias técnicas y optimización mensual de conversiones.',
    },
    {
      question: '¿Puedo integrar formularios web o pasarelas de pago?',
      answer: 'Totalmente. Con nuestras automatizaciones en n8n podemos vincular tu web o landing page con WhatsApp, enviar enlaces de cobro (Stripe/Wompi), disparar correos de confirmación y sincronizar tus bases de datos.',
    },
    {
      question: '¿Cómo garantizan que la IA no invente información (alucinaciones)?',
      answer: 'Configuramos reglas de seguridad estrictas (Guardrails) y entrenamos al asistente exclusivamente con la base de conocimiento oficial de tu negocio (servicios, precios, políticas y FAQs). Si no tiene la certeza de un dato, consulta al equipo humano.',
    },
    {
      question: '¿Cómo puedo cancelar o reprogramar una cita de diagnóstico?',
      answer: 'Puedes solicitarlo directamente a través de este chat o enviándonos un mensaje por WhatsApp con al menos 4 horas de anticipación.',
    },
  ];

  for (const f of faqs) {
    await prisma.faq.create({ data: f });
  }
  console.log(`✓ ${faqs.length} preguntas frecuentes oficiales registradas.`);

  // 6. Canales iniciales
  await prisma.channelConfig.upsert({
    where: { type: ChannelType.WHATSAPP },
    update: {
      waBusinessName: 'danIAutoma',
    },
    create: {
      type: ChannelType.WHATSAPP,
      waProvider: WhatsAppProvider.BAILEYS,
      waStatus: ConnectionStatus.DISCONNECTED,
      waBusinessName: 'danIAutoma',
      baileysSessionDir: process.env.WHATSAPP_SESSION_DIR || './whatsapp-session',
    },
  });

  await prisma.channelConfig.upsert({
    where: { type: ChannelType.WEB },
    update: {
      webChatTitle: 'Asistente danIAutoma',
      webChatWelcome: '¡Hola! 👋 Soy el asistente virtual de danIAutoma. ¿Te gustaría conocer cómo automatizar la atención y citas de tu negocio con IA o agendar una llamada de diagnóstico gratuito?',
      webChatColor: '#6366f1',
    },
    create: {
      type: ChannelType.WEB,
      webChatEnabled: true,
      webChatColor: '#6366f1',
      webChatTitle: 'Asistente danIAutoma',
      webChatWelcome: '¡Hola! 👋 Soy el asistente virtual de danIAutoma. ¿Te gustaría conocer cómo automatizar la atención y citas de tu negocio con IA o agendar una llamada de diagnóstico gratuito?',
    },
  });
  console.log('✓ Canales de WhatsApp y Web Chat inicializados con identidad danIAutoma.');

  // 7. Integraciones
  const integrations = [
    { provider: 'google_calendar', name: 'Google Calendar' },
    { provider: 'gmail', name: 'Gmail' },
    { provider: 'google_sheets', name: 'Google Sheets' },
    { provider: 'slack', name: 'Slack' },
    { provider: 'stripe', name: 'Stripe' },
    { provider: 'webhooks', name: 'Webhooks Salientes' },
  ];

  for (const intg of integrations) {
    await prisma.integration.upsert({
      where: { provider: intg.provider },
      update: {},
      create: {
        provider: intg.provider,
        name: intg.name,
        enabled: false,
        config: {},
      },
    });
  }
  console.log('✓ 6 integraciones del catálogo inicializadas.');

  // 8. Contacto y Conversaciones de ejemplo (El Salvador +503)
  const contact1 = await prisma.contact.upsert({
    where: { phone: '+50371234567' },
    update: {},
    create: {
      name: 'Elena Rodríguez',
      phone: '+50371234567',
      email: 'elena.rodriguez@ejemplo.com',
      notes: 'Interesada en implementar un Agente de IA para WhatsApp y automatización con n8n en San Salvador.',
    },
  });

  const conv1 = await prisma.conversation.upsert({
    where: { id: 'sample-conv-1' },
    update: {},
    create: {
      id: 'sample-conv-1',
      contactId: contact1.id,
      channel: ChannelType.WHATSAPP,
      waProvider: WhatsAppProvider.BAILEYS,
      status: ConversationStatus.BOT_ACTIVE,
      lastMessageAt: new Date(),
    },
  });

  const msgCount = await prisma.message.count({ where: { conversationId: conv1.id } });
  if (msgCount === 0) {
    await prisma.message.createMany({
      data: [
        {
          conversationId: conv1.id,
          sender: MessageSender.CUSTOMER,
          text: 'Buenas tardes, quería consultar información sobre los agentes de IA para WhatsApp.',
          createdAt: new Date(Date.now() - 3600000 * 2),
        },
        {
          conversationId: conv1.id,
          sender: MessageSender.ASSISTANT,
          text: '¡Hola Elena! En danIAutoma desarrollamos agentes de IA omnicanales (WhatsApp + Web + CRM) entrenados con toda la información de tu negocio, capaces de atender 24/7 y agendar citas en Google Calendar. Ofrecemos una Llamada de Diagnóstico Estratégico de 30 minutos totalmente gratuita. ¿Te gustaría agendar una llamada para revisar tu caso?',
          createdAt: new Date(Date.now() - 3600000 * 2 + 10000),
        },
        {
          conversationId: conv1.id,
          sender: MessageSender.CUSTOMER,
          text: 'Sí, me parece excelente. ¿Tienen disponibilidad el próximo martes por la tarde?',
          createdAt: new Date(Date.now() - 3600000),
        },
      ],
    });
  }

  console.log('✓ Conversaciones de ejemplo creadas.');
  console.log('Semilla de datos completada con éxito.');
}

main()
  .catch((e) => {
    console.error('Error al ejecutar la semilla:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
