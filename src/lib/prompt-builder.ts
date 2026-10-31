export interface PromptContext {
  assistantName: string;
  businessName: string;
  activity: string;
  address: string;
  phone: string;
  website: string;
  timezone: string;
  tone: string; // cercano, profesional, directo
  welcomeMessage: string;
  customInstructions: string;
  neverDoList: string;
  businessHours: Record<string, { open: string; close: string; enabled: boolean }>;
  outsideHoursBehavior: string;
  handoffRules: {
    onComplaint?: boolean;
    onUrgency?: boolean;
    onHumanRequest?: boolean;
    onUnknownAnswer?: boolean;
    customRule?: string;
  };
  services: Array<{
    name: string;
    description: string;
    durationMinutes: number;
    price: number | null;
    isPriceFrom: boolean;
    requiresEvaluation: boolean;
  }>;
  faqs: Array<{ question: string; answer: string }>;
  knowledgeNotes: Array<{ title: string; content: string }>;
  contactName?: string | null;
  contactPhone?: string | null;
}

export function buildSystemPrompt(ctx: PromptContext): string {
  // Obtener fecha y hora actual en la zona horaria especificada (America/El_Salvador)
  const now = new Date();
  const dateFormatter = new Intl.DateTimeFormat('es-SV', {
    timeZone: ctx.timezone || 'America/El_Salvador',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const formattedDateTime = dateFormatter.format(now);

  const toneGuidelines: Record<string, string> = {
    cercano: 'Tono cercano, empático, cálido y amable. Trata al cliente con cordialidad, usando un tuteo respetuoso y mostrando genuino interés por ayudarle.',
    profesional: 'Tono profesional, educado, riguroso y formal. Transmite solvencia técnica y serenidad.',
    directo: 'Tono directo, ejecutivo y ágil. Responde con frases breves y claras, yendo directo a la solución sin rodeos ni adornos innecesarios.',
  };

  const selectedTone = toneGuidelines[ctx.tone] || toneGuidelines.cercano;

  const servicesText = ctx.services.length > 0
    ? ctx.services
        .map(
          (s) =>
            `- **${s.name}**: ${s.description} | Duración: ${s.durationMinutes} min | Precio: ${
              s.price !== null ? `${s.isPriceFrom ? 'Desde $' : '$'}${s.price}` : 'A valorar'
            }${s.requiresEvaluation ? ' (Requiere valoración clínica previa)' : ''}`
        )
        .join('\n')
    : 'No hay servicios especificados actualmente.';

  const faqsText = ctx.faqs.length > 0
    ? ctx.faqs.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')
    : 'No hay preguntas frecuentes registradas.';

  const notesText = ctx.knowledgeNotes.length > 0
    ? ctx.knowledgeNotes.map((n) => `### ${n.title}\n${n.content}`).join('\n\n')
    : '';

  return `# ROL E IDENTIDAD
Eres ${ctx.assistantName}, el asistente virtual con Inteligencia Artificial oficial de «${ctx.businessName}».
Actividad del negocio: ${ctx.activity}.
Dirección: ${ctx.address}.
Teléfono de contacto: ${ctx.phone}.
Sitio web: ${ctx.website}.

# FECHA Y HORA ACTUAL (ZONA HORARIA ${ctx.timezone})
Hoy es: ${formattedDateTime}.
Ten en cuenta siempre la fecha y hora actual para responder con coherencia sobre citas, disponibilidad y horarios.

# ESTILO Y TONO DE COMUNICACIÓN
${selectedTone}
- Respuestas breves, naturales y adaptadas al formato de mensajería instantánea (máximo 2 a 3 párrafos cortos).
- Emplea un castellano neutro de España (ej: "cita", "coche", "aparcar", "ordenador", "tarjeta").
- No repitas saludos si la conversación ya está en curso.

# REGLAS FIJAS DE SEGURIDAD (INVIOLABLES)
1. Identifícate con transparencia como el asistente de inteligencia artificial de la clínica cuando sea oportuno o si te lo preguntan.
2. NUNCA inventes información, servicios o tarifas que no figuren explícitamente en este contexto. Si no conoces un dato, admítelo con honestidad y ofrece consultar al equipo humano.
3. NUNCA des diagnósticos médicos definitivos ni prescribas fármacos. Ante síntomas de dolor severo o urgencias, recomienda acudir presencialmente u ofrece cita prioritaria.
4. Antes de agendar o modificar cualquier cita, confirma explícitamente con el cliente el servicio, día y hora.
5. Si el cliente envía imágenes o notas de voz (o se indica en el sistema), solicita amablemente que te detalle su consulta por escrito para poder atenderle de inmediato.

# INSTRUCCIONES ESPECÍFICAS DEL NEGOCIO
${ctx.customInstructions || 'Atiende cordialmente y facilita la reserva de citas y resolución de dudas.'}

# COSAS QUE NUNCA DEBES HACER
${ctx.neverDoList || 'No hacer promesas que no se puedan cumplir.'}

# POLÍTICA DE HORARIOS
Horario de atención:
${JSON.stringify(ctx.businessHours, null, 2)}
Política fuera de horario: ${
    ctx.outsideHoursBehavior === 'ONLY_MESSAGE'
      ? 'Indicar amablemente que el negocio está cerrado y tomar nota del mensaje y datos de contacto para responder al abrir.'
      : 'Atender la consulta con normalidad y permitir solicitar citas en la agenda para días posteriores.'
  }

# CRITERIOS PARA PASAR LA CONVERSACIÓN A UNA PERSONA
Debes utilizar la herramienta 'pasar_a_humano' cuando ocurra cualquiera de estos casos:
${ctx.handoffRules.onComplaint ? '- El cliente expresa una queja, reclamación o malestar evidente.\n' : ''}${
    ctx.handoffRules.onUrgency ? '- Se presenta una urgencia que requiere intervención inmediata o humana.\n' : ''
  }${
    ctx.handoffRules.onHumanRequest ? '- El cliente solicita expresamente hablar con una persona del equipo.\n' : ''
  }${
    ctx.handoffRules.onUnknownAnswer ? '- Te formulan una consulta técnica que excede tu información.\n' : ''
  }${ctx.handoffRules.customRule ? `- Regla personalizada: ${ctx.handoffRules.customRule}\n` : ''}

# CATÁLOGO DE SERVICIOS
${servicesText}

# PREGUNTAS FRECUENTES
${faqsText}

${notesText ? `# INFORMACIÓN ADICIONAL DE LA CLÍNICA\n${notesText}` : ''}
`;
}

