import { PrismaClient, Role, ChannelType, WhatsAppProvider, ConnectionStatus, ConversationStatus, MessageSender } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando semilla de datos para Atendia (El Salvador)...');

  // 1. Usuarios: Administrador y Agente de Soporte
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@atendia.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234password';
  const adminHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminHash, role: Role.ADMIN },
    create: {
      email: adminEmail,
      name: 'Administrador Atendia',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });
  console.log(`✓ Administrador verificado: ${admin.email}`);

  const agentEmail = 'agente@atendia.local';
  const agentPassword = 'agente1234password';
  const agentHash = await bcrypt.hash(agentPassword, 10);

  const agent = await prisma.user.upsert({
    where: { email: agentEmail },
    update: { passwordHash: agentHash, role: Role.AGENT },
    create: {
      email: agentEmail,
      name: 'Carlos Martínez (Agente)',
      passwordHash: agentHash,
      role: Role.AGENT,
    },
  });
  console.log(`✓ Agente de soporte verificado: ${agent.email}`);

  // 2. Perfil del Negocio (Clínica Dental San Salvador)
  const business = await prisma.businessProfile.upsert({
    where: { id: 'default-business' },
    update: {
      name: 'Clínica Dental San Salvador',
      activity: 'Odontología integral y diseño de sonrisa',
      address: 'Paseo General Escalón #3700, Colonia Escalón, San Salvador',
      phone: '+503 2200 1234',
      website: 'https://dentalsansalvador.sv',
      timezone: 'America/El_Salvador',
    },
    create: {
      id: 'default-business',
      name: 'Clínica Dental San Salvador',
      activity: 'Odontología integral y diseño de sonrisa',
      address: 'Paseo General Escalón #3700, Colonia Escalón, San Salvador',
      phone: '+503 2200 1234',
      website: 'https://dentalsansalvador.sv',
      timezone: 'America/El_Salvador',
      assistantActive: true,
      agencyName: 'Agencia Atendia',
    },
  });
  console.log(`✓ Perfil de negocio verificado: ${business.name} (${business.timezone})`);

  // 3. Configuración del Asistente (DentalIA)
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
    customRule: 'Si el paciente solicita un plan de financiamiento o tiene consultas complejas sobre su historial clínico.',
  };

  const assistantConfig = await prisma.assistantConfig.upsert({
    where: { id: 'default-assistant' },
    update: {
      name: 'DentalIA',
      welcomeMessage: '¡Hola! Bienvenido a Clínica Dental San Salvador. Soy DentalIA, tu asistente virtual. ¿En qué podemos ayudarte hoy?',
      customInstructions: 'Sé amable, cercano y profesional. Si el paciente menciona dolor agudo, inflamación o un golpe, prioriza siempre ofrecerle una cita de urgencia para el mismo día o el siguiente disponible en San Salvador.',
      neverDoList: 'No dar diagnósticos médicos definitivos ni recetar medicamentos. No garantizar precios cerrados en tratamientos que requieran valoración clínica previa. No confirmar citas fuera del horario de la clínica sin validarlo.',
      businessHours,
      outsideHoursBehavior: 'APPOINTMENT_OR_MESSAGE',
      handoffRules,
    },
    create: {
      id: 'default-assistant',
      name: 'DentalIA',
      avatarUrl: null,
      tone: 'cercano',
      welcomeMessage: '¡Hola! Bienvenido a Clínica Dental San Salvador. Soy DentalIA, tu asistente virtual. ¿En qué podemos ayudarte hoy?',
      customInstructions: 'Sé amable, cercano y profesional. Si el paciente menciona dolor agudo, inflamación o un golpe, prioriza siempre ofrecerle una cita de urgencia para el mismo día o el siguiente disponible en San Salvador.',
      neverDoList: 'No dar diagnósticos médicos definitivos ni recetar medicamentos. No garantizar precios cerrados en tratamientos que requieran valoración clínica previa. No confirmar citas fuera del horario de la clínica sin validarlo.',
      businessHours,
      outsideHoursBehavior: 'APPOINTMENT_OR_MESSAGE',
      handoffRules,
      aiModel: 'anthropic/claude-haiku-5.5',
      aiModelFallback: 'anthropic/claude-haiku-5.5',
    },
  });
  console.log(`✓ Asistente configurado: ${assistantConfig.name}`);

  // 4. Servicios (en dólares de El Salvador - USD)
  const services = [
    {
      name: 'Primera Visita y Diagnóstico 3D',
      description: 'Evaluación odontológica completa con radiografía panorámica digital y plan de tratamiento personalizado sin costo.',
      durationMinutes: 45,
      price: 0,
      isPriceFrom: false,
      requiresEvaluation: false,
    },
    {
      name: 'Limpieza Dental e Higiene Profunda',
      description: 'Profilaxis con ultrasonidos, aeropulidor con bicarbonato y aplicación de flúor protector.',
      durationMinutes: 45,
      price: 35,
      isPriceFrom: false,
      requiresEvaluation: false,
    },
    {
      name: 'Blanqueamiento Dental LED',
      description: 'Tratamiento combinado en clínica con lámpara de luz fría y férulas personalizadas para mantenimiento en casa.',
      durationMinutes: 60,
      price: 220,
      isPriceFrom: true,
      requiresEvaluation: false,
    },
    {
      name: 'Ortodoncia Invisible',
      description: 'Alineadores transparentes y removibles de última generación diseñados por computadora tras escaneo 3D intraoral.',
      durationMinutes: 45,
      price: 1800,
      isPriceFrom: true,
      requiresEvaluation: true,
    },
    {
      name: 'Implante Dental de Titanio',
      description: 'Implante biocompatible con corona de zirconio sobre muñón personalizado.',
      durationMinutes: 60,
      price: 650,
      isPriceFrom: true,
      requiresEvaluation: true,
    },
    {
      name: 'Resina Estética / Obturación',
      description: 'Restauración estética de dientes con caries o fracturas leves con resina compuesta de alta estética.',
      durationMinutes: 30,
      price: 40,
      isPriceFrom: true,
      requiresEvaluation: false,
    },
    {
      name: 'Endodoncia Unirradicular/Multirradicular',
      description: 'Tratamiento de conductos radiculares para salvar piezas dentales con daño pulpar o infección.',
      durationMinutes: 60,
      price: 120,
      isPriceFrom: true,
      requiresEvaluation: true,
    },
    {
      name: 'Urgencia Odontológica',
      description: 'Atención prioritaria inmediata para alivio del dolor agudo, trauma dental o reparación de emergencia.',
      durationMinutes: 30,
      price: 30,
      isPriceFrom: false,
      requiresEvaluation: false,
    },
  ];

  for (const s of services) {
    const existing = await prisma.service.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.service.create({ data: s });
    } else {
      await prisma.service.update({ where: { id: existing.id }, data: s });
    }
  }
  console.log(`✓ ${services.length} servicios registrados en USD.`);

  // 5. Preguntas Frecuentes (10 FAQs localizadas a El Salvador)
  const faqs = [
    {
      question: '¿Dónde puedo estacionar cerca de la clínica?',
      answer: 'Disponemos de amplio estacionamiento privado y vigilado las 24 horas con seguridad justo al frente de nuestras instalaciones sobre el Paseo General Escalón, San Salvador.',
    },
    {
      question: '¿Trabajan con aseguradoras o planes médicos?',
      answer: 'Somos clínica privada independiente. Emitimos facturas detalladas y reportes médicos oficiales con número de Junta de Vigilancia para que tramites el reembolso con tu aseguradora de libre elección.',
    },
    {
      question: '¿Ofrecen opciones de financiamiento?',
      answer: 'Sí, contamos con financiamiento hasta en 24 cuotas con tarjetas de crédito locales y planes de pago en clínica presentando tu DUI y constancia de ingresos.',
    },
    {
      question: '¿El tratamiento de ortodoncia invisible duele?',
      answer: 'No produce dolor. Podrás sentir una ligera presión los primeros 2 días tras colocarte un nuevo alineador, lo cual confirma que los dientes se están alineando con éxito.',
    },
    {
      question: '¿Cuánto dura una sesión de blanqueamiento dental?',
      answer: 'La sesión en el consultorio dura unos 60 minutos con lámpara LED. Te entregamos un kit de mantenimiento para reforzar los resultados desde casa.',
    },
    {
      question: '¿Qué hago si tengo una urgencia fuera del horario?',
      answer: 'Si sufres de dolor insoportable o un golpe fuerte fuera de horario, acude de inmediato a un centro hospitalario de emergencias. Déjanos tu mensaje en este WhatsApp y a primera hora te contactaremos de manera prioritaria.',
    },
    {
      question: '¿La primera cita de evaluación tiene algún costo?',
      answer: 'La primera consulta diagnóstica, la revisión clínica intraoral y la radiografía panorámica digital son totalmente gratuitas y sin compromiso.',
    },
    {
      question: '¿Atienden a niños y adolescentes?',
      answer: 'Sí, disponemos de odontopediatras especializados que brindan una atención cálida y paciente en un ambiente relajado y amigable para los pequeños.',
    },
    {
      question: '¿Cuánto tiempo toma colocarse un implante dental?',
      answer: 'El procedimiento quirúrgico para colocar el implante toma aproximadamente 45 a 60 minutos bajo anestesia local indolora. Tras unas semanas de integración ósea, se coloca la corona definitiva.',
    },
    {
      question: '¿Cómo puedo cancelar o reprogramar una cita?',
      answer: 'Puedes solicitarlo directamente a través de este chat o llamándonos al +503 2200 1234 con al menos 24 horas de anticipación.',
    },
  ];

  for (const f of faqs) {
    const existing = await prisma.faq.findFirst({ where: { question: f.question } });
    if (!existing) {
      await prisma.faq.create({ data: f });
    } else {
      await prisma.faq.update({ where: { id: existing.id }, data: f });
    }
  }
  console.log(`✓ ${faqs.length} preguntas frecuentes registradas.`);

  // 6. Canales iniciales
  await prisma.channelConfig.upsert({
    where: { type: ChannelType.WHATSAPP },
    update: {
      waBusinessName: 'Clínica Dental San Salvador',
    },
    create: {
      type: ChannelType.WHATSAPP,
      waProvider: WhatsAppProvider.BAILEYS,
      waStatus: ConnectionStatus.DISCONNECTED,
      waBusinessName: 'Clínica Dental San Salvador',
      baileysSessionDir: process.env.WHATSAPP_SESSION_DIR || './whatsapp-session',
    },
  });

  await prisma.channelConfig.upsert({
    where: { type: ChannelType.WEB },
    update: {
      webChatTitle: 'Atención Clínica Dental San Salvador',
      webChatWelcome: '¡Hola! ¿Tienes alguna pregunta sobre nuestros tratamientos odontológicos o deseas reservar cita con nuestros doctores?',
    },
    create: {
      type: ChannelType.WEB,
      webChatEnabled: true,
      webChatColor: '#0d9488',
      webChatTitle: 'Atención Clínica Dental San Salvador',
      webChatWelcome: '¡Hola! ¿Tienes alguna pregunta sobre nuestros tratamientos odontológicos o deseas reservar cita con nuestros doctores?',
    },
  });
  console.log('✓ Canales de WhatsApp y Web Chat inicializados.');

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
      notes: 'Interesada en valoración de ortodoncia invisible en San Salvador.',
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
          text: 'Buenas tardes, quería consultar información sobre la ortodoncia invisible.',
          createdAt: new Date(Date.now() - 3600000 * 2),
        },
        {
          conversationId: conv1.id,
          sender: MessageSender.ASSISTANT,
          text: '¡Hola Elena! En Clínica Dental San Salvador trabajamos con alineadores transparentes y removibles hechos a la medida. La primera visita diagnóstica con escaneo 3D es totalmente gratuita. ¿Te gustaría agendar una cita para que el ortodoncista evalúe tu caso?',
          createdAt: new Date(Date.now() - 3600000 * 2 + 10000),
        },
        {
          conversationId: conv1.id,
          sender: MessageSender.CUSTOMER,
          text: 'Sí, por favor. ¿Tienen disponibilidad el próximo martes por la tarde?',
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
