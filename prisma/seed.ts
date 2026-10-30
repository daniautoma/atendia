import { PrismaClient, Role, ChannelType, WhatsAppProvider, ConnectionStatus, ConversationStatus, MessageSender } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando semilla de datos para Atendia...');

  // 1. Usuario Administrador
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@atendia.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin1234password';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      name: 'Administrador Atendia',
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`✓ Administrador verificado: ${admin.email}`);

  // 2. Perfil del Negocio (Clínica Dental Lumen)
  const business = await prisma.businessProfile.upsert({
    where: { id: 'default-business' },
    update: {},
    create: {
      id: 'default-business',
      name: 'Clínica Dental Lumen',
      activity: 'Odontología integral y estética dental',
      address: 'Calle Gran Vía 42, 2º B, 28013 Madrid',
      phone: '+34 910 123 456',
      website: 'https://clinicalumen.es',
      timezone: 'Europe/Madrid',
      assistantActive: true,
      agencyName: 'Agencia Atendia',
    },
  });
  console.log(`✓ Perfil de negocio verificado: ${business.name}`);

  // 3. Configuración del Asistente (LumenIA)
  const businessHours = {
    monday: { open: '09:00', close: '20:00', enabled: true },
    tuesday: { open: '09:00', close: '20:00', enabled: true },
    wednesday: { open: '09:00', close: '20:00', enabled: true },
    thursday: { open: '09:00', close: '20:00', enabled: true },
    friday: { open: '09:00', close: '20:00', enabled: true },
    saturday: { open: '10:00', close: '14:00', enabled: true },
    sunday: { open: '00:00', close: '00:00', enabled: false },
  };

  const handoffRules = {
    onComplaint: true,
    onUrgency: true,
    onHumanRequest: true,
    onUnknownAnswer: true,
    customRule: 'Si el paciente solicita un presupuesto financiado o tiene dudas complejas sobre su historial clínico.',
  };

  const assistantConfig = await prisma.assistantConfig.upsert({
    where: { id: 'default-assistant' },
    update: {},
    create: {
      id: 'default-assistant',
      name: 'LumenIA',
      avatarUrl: null,
      tone: 'cercano',
      welcomeMessage: '¡Hola! Bienvenido a Clínica Dental Lumen. Soy LumenIA, tu asistente virtual. ¿En qué podemos ayudarte hoy?',
      customInstructions: 'Sé amable, cercano y profesional. Si el paciente menciona dolor agudo, inflamación o un golpe, prioriza siempre ofrecerle una cita de urgencia para el mismo día o el siguiente disponible.',
      neverDoList: 'No dar diagnósticos médicos definitivos ni recetar medicamentos. No garantizar precios cerrados en tratamientos que requieran valoración clínica previa. No confirmar citas fuera del horario de la clínica sin validarlo.',
      businessHours,
      outsideHoursBehavior: 'APPOINTMENT_OR_MESSAGE',
      handoffRules,
      aiModel: 'anthropic/claude-haiku-5.5',
      aiModelFallback: 'anthropic/claude-haiku-5.5',
    },
  });
  console.log(`✓ Asistente configurado: ${assistantConfig.name}`);

  // 4. Servicios (8 servicios reales de la clínica)
  const services = [
    {
      name: 'Primera Visita y Diagnóstico 3D',
      description: 'Revisión odontológica completa con radiografía panorámica digital y plan de tratamiento personalizado sin compromiso.',
      durationMinutes: 45,
      price: 0,
      isPriceFrom: false,
      requiresEvaluation: false,
    },
    {
      name: 'Limpieza Dental e Higiene Profunda',
      description: 'Eliminación exhaustiva de sarro y placa bacteriana mediante ultrasonidos, aeropulidor con bicarbonato y flúor protector.',
      durationMinutes: 45,
      price: 55,
      isPriceFrom: false,
      requiresEvaluation: false,
    },
    {
      name: 'Blanqueamiento Dental LED',
      description: 'Tratamiento combinado de sesión clínica con lámpara de luz fría y kit de férulas a medida con gel para mantenimiento domiciliario.',
      durationMinutes: 60,
      price: 290,
      isPriceFrom: true,
      requiresEvaluation: false,
    },
    {
      name: 'Ortodoncia Invisible (Invisalign)',
      description: 'Alineadores transparentes y removibles diseñados por ordenador tras escaneo intraoral 3D de alta precisión.',
      durationMinutes: 45,
      price: 2400,
      isPriceFrom: true,
      requiresEvaluation: true,
    },
    {
      name: 'Implante Dental de Titanio',
      description: 'Implante biocompatible de primera marca con corona de zirconio sobre muñón personalizado.',
      durationMinutes: 60,
      price: 850,
      isPriceFrom: true,
      requiresEvaluation: true,
    },
    {
      name: 'Empaste Dental Estético (Composite)',
      description: 'Restauración estética de dientes con caries o pequeñas fracturas utilizando resina compuesta de alta resistencia mimética.',
      durationMinutes: 30,
      price: 60,
      isPriceFrom: true,
      requiresEvaluation: false,
    },
    {
      name: 'Endodoncia Unirradicular/Multirradicular',
      description: 'Tratamiento y sellado de conductos radiculares para conservar la pieza dental afectada por infección profunda.',
      durationMinutes: 60,
      price: 140,
      isPriceFrom: true,
      requiresEvaluation: true,
    },
    {
      name: 'Urgencia Dental (Dolor o Rotura)',
      description: 'Hueco prioritario en agenda para diagnóstico de urgencia, alivio del dolor agudo o reparación provisional de urgencia.',
      durationMinutes: 30,
      price: 45,
      isPriceFrom: false,
      requiresEvaluation: false,
    },
  ];

  for (const s of services) {
    const existing = await prisma.service.findFirst({ where: { name: s.name } });
    if (!existing) {
      await prisma.service.create({ data: s });
    }
  }
  console.log(`✓ ${services.length} servicios registrados.`);

  // 5. Preguntas Frecuentes (10 FAQs)
  const faqs = [
    {
      question: '¿Dónde aparcar cerca de la clínica?',
      answer: 'Hay un parking público en la Plaza de los Mostenses, a solo 2 minutos a pie de la clínica. Además, estamos a 1 minuto del Metro Plaza de España y Santo Domingo.',
    },
    {
      question: '¿Trabajáis con seguros médicos o mutuas?',
      answer: 'Somos clínica privada independiente para garantizar los mejores materiales y tiempos de tratamiento. No obstante, te entregamos informes y facturas oficiales para que solicites el reembolso a tu aseguradora si dispones de póliza de libre elección.',
    },
    {
      question: '¿Ofrecéis opciones de financiación?',
      answer: 'Sí, disponemos de financiación a tu medida hasta en 36 meses sin intereses, gestionada de forma ágil en la propia clínica con tu DNI y última nómina.',
    },
    {
      question: '¿El tratamiento de ortodoncia invisible duele?',
      answer: 'No duele. Es posible experimentar una ligera sensación de presión durante las primeras 24-48 horas tras cambiar a un nuevo alineador, lo cual indica que los dientes se están moviendo adecuadamente.',
    },
    {
      question: '¿Cuánto dura una sesión de blanqueamiento?',
      answer: 'La sesión en clínica dura aproximadamente 60 minutos. Posteriormente continuarás el tratamiento en casa durante 10 a 14 noches con férulas personalizadas para fijar el tono blanco óptimo.',
    },
    {
      question: '¿Qué hago si tengo una urgencia fuera de vuestro horario?',
      answer: 'Si tienes dolor insoportable o traumatismo fuera de horario, te recomendamos acudir al hospital de urgencias más cercano. Puedes dejarnos tu mensaje aquí y a primera hora en cuanto abramos nos pondremos en contacto contigo de forma prioritaria.',
    },
    {
      question: '¿La primera consulta tiene algún coste?',
      answer: 'La primera visita diagnóstica, la exploración clínica completa y la radiografía panorámica digital son totalmente gratuitas y sin ningún compromiso.',
    },
    {
      question: '¿Atendéis a niños pequeños?',
      answer: 'Sí, contamos con un equipo especializado en odontopediatría con un protocolo adaptado para que los más pequeños se sientan cómodos y tranquilos en un entorno cercano.',
    },
    {
      question: '¿Cuánto tarda en colocarse un implante dental?',
      answer: 'La intervención quirúrgica para colocar el implante dura entre 45 y 60 minutos con anestesia local indolora. Tras un periodo de integración ósea de unas 8 a 10 semanas se coloca la corona definitiva.',
    },
    {
      question: '¿Cómo puedo cancelar o reprogramar una cita?',
      answer: 'Puedes solicitarlo directamente a través de este chat o llamándonos al 910 123 456 con un mínimo de 24 horas de antelación para poder ofrecer el hueco a otro paciente.',
    },
  ];

  for (const f of faqs) {
    const existing = await prisma.faq.findFirst({ where: { question: f.question } });
    if (!existing) {
      await prisma.faq.create({ data: f });
    }
  }
  console.log(`✓ ${faqs.length} preguntas frecuentes registradas.`);

  // 6. Canales iniciales
  await prisma.channelConfig.upsert({
    where: { type: ChannelType.WHATSAPP },
    update: {},
    create: {
      type: ChannelType.WHATSAPP,
      waProvider: WhatsAppProvider.BAILEYS,
      waStatus: ConnectionStatus.DISCONNECTED,
      baileysSessionDir: process.env.WHATSAPP_SESSION_DIR || './whatsapp-session',
    },
  });

  await prisma.channelConfig.upsert({
    where: { type: ChannelType.WEB },
    update: {},
    create: {
      type: ChannelType.WEB,
      webChatEnabled: true,
      webChatColor: '#0d9488',
      webChatTitle: 'Atención Clínica Lumen',
      webChatWelcome: '¡Hola! ¿Tienes alguna pregunta sobre nuestros tratamientos o deseas reservar cita con nuestros doctores?',
    },
  });
  console.log('✓ Canales de WhatsApp y Web Chat inicializados.');

  // 7. Integraciones (todas empiezan desconectadas)
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
  console.log('✓ 6 integraciones del catálogo inicializadas (desconectadas).');

  // 8. Contacto y Conversaciones de ejemplo
  const contact1 = await prisma.contact.upsert({
    where: { phone: '+34600111222' },
    update: {},
    create: {
      name: 'Elena Rodríguez',
      phone: '+34600111222',
      email: 'elena.rodriguez@ejemplo.com',
      notes: 'Interesada en valoración de ortodoncia invisible.',
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
          text: 'Buenas tardes, quería información sobre la ortodoncia invisible.',
          createdAt: new Date(Date.now() - 3600000 * 2),
        },
        {
          conversationId: conv1.id,
          sender: MessageSender.ASSISTANT,
          text: '¡Hola Elena! En Clínica Dental Lumen trabajamos con Invisalign, una ortodoncia con alineadores transparentes y removibles hechos a medida. La primera visita diagnóstica con escáner 3D es totalmente gratuita. ¿Te gustaría agendar una cita para que el ortodoncista valore tu caso?',
          createdAt: new Date(Date.now() - 3600000 * 2 + 10000),
        },
        {
          conversationId: conv1.id,
          sender: MessageSender.CUSTOMER,
          text: 'Sí, por favor. ¿Tenéis hueco el próximo martes por la tarde?',
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

