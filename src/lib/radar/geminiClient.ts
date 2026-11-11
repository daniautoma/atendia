/**
 * Cliente Google Gemini (gemini-2.5-flash) con @google/genai + UrlContext
 * danIAutoma HQ - Radar de Clientes
 */

import { GoogleGenAI } from '@google/genai';
import { classifyBusinessUrl } from './directoryDetector';
import { getRadarSettings, PitchTone, RadarSellerProfile } from './settingsService';

export interface AiWebsiteChecklist {
  hasHttps: boolean;
  isMobileResponsive: boolean;
  hasWhatsAppButton: boolean;
  hasOnlineBooking: boolean;
  hasContactForm: boolean;
  hasOutdatedCopyright: boolean;
  copyrightYear?: string;
  emailsFound?: string[];
  socialLinksFound?: string[];
  inspectedWithUrlContext?: boolean;
}

export interface BusinessDiagnosis {
  summary: string;
  weaknesses: string[];
  recommendedServices: string[];
  sellingAngle: string;
  urgency: 'ALTA' | 'MEDIA' | 'ESTRATEGICA';
  opportunityScoreEstimate?: number;
  checklist?: AiWebsiteChecklist;
}

export interface CommercialPitches {
  phoneScript30s: string;
  whatsAppMessage: string;
  emailMessage: string;
  tone: PitchTone;
}

export interface NicheEmpiricalStats {
  niche: string;
  totalFound: number;
  noWebsiteCount: number;
  socialOnlyCount: number;
  ownWebsiteCount: number;
  noWebsitePct: number; // Porcentaje sin web propia (sin web + solo redes/directorios)
  avgRating: number;
  avgReviews: number;
  withPhonePct: number;
  fromCache: boolean;
}

export interface NicheAnalysisItem {
  niche: string;
  digitalMaturity: 'BAJA' | 'MEDIA' | 'ALTA';
  saturationLevel: 'BAJA' | 'MEDIA' | 'ALTA';
  averageTicketUsd: string;
  recommendedPitch: string;
  priorityScore: number; // 0 - 100
  empirical?: NicheEmpiricalStats;
}

export interface NicheComparisonResult {
  zone: string;
  winnerNiche: string;
  strategicInsight: string;
  isEmpirical: boolean;
  niches: NicheAnalysisItem[];
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    throw new Error('Falta configurar GEMINI_API_KEY o GOOGLE_CLOUD_API_KEY en el entorno.');
  }
  return new GoogleGenAI({ apiKey });
}

function extractJsonFromText<T>(rawText: string): T {
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as T;
    }
    throw new Error('No se pudo extraer un objeto JSON válido de la respuesta de Gemini.');
  }
}

/**
 * Diagnóstico comercial estructurado + inspección real de sitio web con urlContext
 */
export async function diagnoseBusiness(data: {
  businessName: string;
  niche: string;
  address?: string;
  phone?: string;
  websiteUri?: string;
  platformType?: string;
  rating?: number;
  userRatingCount?: number;
  pageSpeedAudit?: {
    performanceScore?: number;
    seoScore?: number;
    accessibilityScore?: number;
  };
  sellerProfile?: RadarSellerProfile;
}): Promise<BusinessDiagnosis> {
  const ai = getGeminiClient();
  const seller = data.sellerProfile || (await getRadarSettings());
  const urlClass = classifyBusinessUrl(data.websiteUri);
  const canInspectUrl =
    Boolean(data.websiteUri && /^https?:\/\//i.test(data.websiteUri.trim())) &&
    (data.platformType ? data.platformType === 'owned' : urlClass.isOwnedWebsite);

  const systemInstruction = `Eres el Director de Estrategia Comercial de "${seller.agencyName}", una agencia tecnológica en El Salvador enfocada en:
${seller.servicesOffered.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Responde SIEMPRE exclusivamente en JSON válido sin texto introductorio ni bloques fuera del JSON.`;

  const prompt = `
Analiza el siguiente negocio ubicado en El Salvador:
- Nombre: ${data.businessName}
- Giro / Nicho: ${data.niche}
- Dirección: ${data.address || 'No especificada'}
- Teléfono: ${data.phone || 'Sin teléfono público'}
- Presencia web / Plataforma: ${data.websiteUri || 'SIN SITIO WEB'} (${data.platformType || urlClass.platformType})
- Calificación Google: ${data.rating ? `${data.rating} estrellas (${data.userRatingCount || 0} reseñas)` : 'Sin reseñas'}
${data.pageSpeedAudit ? `- Rendimiento Web (PageSpeed): Rendimiento ${data.pageSpeedAudit.performanceScore}/100, SEO ${data.pageSpeedAudit.seoScore}/100, Accesibilidad ${data.pageSpeedAudit.accessibilityScore}/100` : ''}

Devuelve EXCLUSIVAMENTE un objeto JSON válido con este formato exacto:
{
  "summary": "Breve diagnóstico de 2 a 3 oraciones sobre su estado comercial y digital actual.",
  "weaknesses": ["Debilidad 1 concreta", "Debilidad 2 concreta", "Debilidad 3 concreta"],
  "recommendedServices": ["Servicio 1 de ${seller.agencyName}", "Servicio 2 de ${seller.agencyName}"],
  "sellingAngle": "Enfoque persuasivo clave para hablar con el tomador de decisión (mencionar pérdida de clientes o falta de atención rápida).",
  "urgency": "ALTA" | "MEDIA" | "ESTRATEGICA",
  "checklist": {
    "hasHttps": ${data.websiteUri?.toLowerCase().startsWith('https://') ? 'true' : 'false'},
    "isMobileResponsive": true o false,
    "hasWhatsAppButton": true o false,
    "hasOnlineBooking": true o false,
    "hasContactForm": true o false,
    "hasOutdatedCopyright": true o false,
    "copyrightYear": "Año detectado o 'No detectado'",
    "emailsFound": ["correos encontrados en el sitio web o []"],
    "socialLinksFound": ["links a Instagram/Facebook/TikTok encontrados o []"]
  }
}
`;

  if (canInspectUrl && data.websiteUri) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Por favor inspecciona en vivo el sitio web ${data.websiteUri} y genera el diagnóstico JSON solicitado:\n\n${prompt}`,
        config: {
          systemInstruction,
          tools: [{ urlContext: {} }],
          temperature: 0.2,
        },
      });

      const parsed = extractJsonFromText<BusinessDiagnosis>(response.text || '');
      return {
        ...parsed,
        checklist: {
          hasHttps: parsed.checklist?.hasHttps ?? data.websiteUri.toLowerCase().startsWith('https://'),
          isMobileResponsive: parsed.checklist?.isMobileResponsive ?? true,
          hasWhatsAppButton: parsed.checklist?.hasWhatsAppButton ?? false,
          hasOnlineBooking: parsed.checklist?.hasOnlineBooking ?? false,
          hasContactForm: parsed.checklist?.hasContactForm ?? false,
          hasOutdatedCopyright: parsed.checklist?.hasOutdatedCopyright ?? false,
          copyrightYear: parsed.checklist?.copyrightYear || 'No detectado',
          emailsFound: Array.isArray(parsed.checklist?.emailsFound) ? parsed.checklist.emailsFound : [],
          socialLinksFound: Array.isArray(parsed.checklist?.socialLinksFound)
            ? parsed.checklist.socialLinksFound
            : [],
          inspectedWithUrlContext: true,
        },
      };
    } catch (urlErr) {
      console.warn('urlContext fallback a análisis sin herramienta en vivo:', urlErr);
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const parsed = extractJsonFromText<BusinessDiagnosis>(response.text || '{}');
    return {
      ...parsed,
      checklist: parsed.checklist
        ? {
            ...parsed.checklist,
            emailsFound: Array.isArray(parsed.checklist.emailsFound) ? parsed.checklist.emailsFound : [],
            socialLinksFound: Array.isArray(parsed.checklist.socialLinksFound)
              ? parsed.checklist.socialLinksFound
              : [],
            inspectedWithUrlContext: false,
          }
        : {
            hasHttps: Boolean(data.websiteUri?.toLowerCase().startsWith('https://')),
            isMobileResponsive: urlClass.isOwnedWebsite,
            hasWhatsAppButton: false,
            hasOnlineBooking: false,
            hasContactForm: false,
            hasOutdatedCopyright: false,
            copyrightYear: 'No verificable sin web propia',
            emailsFound: [],
            socialLinksFound: urlClass.platformType === 'social' && data.websiteUri ? [data.websiteUri] : [],
            inspectedWithUrlContext: false,
          },
    };
  } catch (err) {
    console.error('Error parseando JSON de Gemini diagnoseBusiness:', err);
    return {
      summary: `Negocio de ${data.niche} con oportunidades claras de digitalización y atención automatizada en El Salvador.`,
      weaknesses: [
        'Presencia web inexistente o suboptimizada para captación directa',
        'Atención manual lenta en WhatsApp fuera de horario laboral',
        'Falta de sistema automatizado de citas y seguimiento',
      ],
      recommendedServices: seller.servicesOffered.slice(0, 2),
      sellingAngle: 'Garantizar respuestas en segundos por WhatsApp y captar citas automáticamente sin perder prospectos.',
      urgency: 'ALTA',
      checklist: {
        hasHttps: Boolean(data.websiteUri?.toLowerCase().startsWith('https://')),
        isMobileResponsive: urlClass.isOwnedWebsite,
        hasWhatsAppButton: false,
        hasOnlineBooking: false,
        hasContactForm: false,
        hasOutdatedCopyright: false,
        copyrightYear: 'No detectado',
        emailsFound: [],
        socialLinksFound: [],
        inspectedWithUrlContext: false,
      },
    };
  }
}

/**
 * Generación de Guiones Comerciales (Llamada, WhatsApp, Email) usando el perfil editable de HQ
 */
export async function generateCommercialPitches(data: {
  businessName: string;
  niche: string;
  phone?: string;
  contactPerson?: string;
  diagnosis: BusinessDiagnosis;
  tone?: PitchTone;
  sellerProfile?: RadarSellerProfile;
}): Promise<CommercialPitches> {
  const ai = getGeminiClient();
  const seller = data.sellerProfile || (await getRadarSettings());
  const selectedTone = data.tone || seller.defaultTone || 'cercano';

  const prompt = `
Eres un copywriter y consultor de ventas B2B experto en el mercado de El Salvador.
Vendedor / Agencia:
- Nombre del asesor: ${seller.sellerName}
- Agencia: ${seller.agencyName}
- Propuesta de valor: ${seller.valueProposition}

Cliente potencial:
- Nombre del negocio: ${data.businessName}
- Giro: ${data.niche}
- Diagnóstico previo: ${data.diagnosis.summary}
- Debilidades detectadas: ${data.diagnosis.weaknesses.join(', ')}
- Servicios a ofrecer: ${data.diagnosis.recommendedServices.join(', ')}
- Ángulo de venta: ${data.diagnosis.sellingAngle}
- Tono solicitado: ${selectedTone}

Contexto cultural El Salvador:
- Trato cordial, profesional y respetuoso (usar "usted" con cercanía y calidez salvadoreña, sin modismos exagerados pero natural).
- Moneda: Dólares estadounidenses (USD / $).
- Si es llamada telefónica, debe durar máximo 30 segundos, enfocándose en pedir 10 minutos de reunión o demo.
- Mensaje de WhatsApp: Claro, con saltos de línea legibles, emojis sutiles (máximo 3), gancho directo al dolor y pregunta final sencilla.
- Correo: Asunto llamativo sin parecer spam, cuerpo estructurado en 3 párrafos y llamada a la acción.

Devuelve EXCLUSIVAMENTE un objeto JSON válido:
{
  "phoneScript30s": "Texto del guion telefónico para 30 segundos...",
  "whatsAppMessage": "Texto del mensaje para enviar por WhatsApp...",
  "emailMessage": "Asunto: ...\\n\\nCuerpo del correo...",
  "tone": "${selectedTone}"
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.4,
      },
    });

    const parsed = extractJsonFromText<CommercialPitches>(response.text || '{}');
    return {
      ...parsed,
      tone: parsed.tone || selectedTone,
    };
  } catch (err) {
    console.error('Error parseando JSON de Gemini generateCommercialPitches:', err);
    return {
      phoneScript30s: `Hola, buenos días, disculpe, ¿con el encargado o administrador de ${data.businessName}? Mucho gusto, le saluda ${seller.sellerName} de ${seller.agencyName}. Le llamo brevemente porque revisamos la presencia digital de su negocio y vimos oportunidades concretas para captar más clientes y automatizar citas 24/7 por WhatsApp. ¿Le quedarían bien 10 minutos esta semana para mostrarle una demo breve?`,
      whatsAppMessage: `¡Hola! 👋 Mucho gusto, le saluda ${seller.sellerName} de ${seller.agencyName}.\n\nEstuvimos revisando el perfil de ${data.businessName} y notamos un excelente potencial para captar más clientes en línea y automatizar sus respuestas/citas por WhatsApp 24/7.\n\n¿Le gustaría ver un demo rápido de 2 minutos aplicado a su negocio?`,
      emailMessage: `Asunto: Oportunidad de automatización y captación para ${data.businessName}\n\nEstimado equipo de ${data.businessName},\n\nLes escribe ${seller.sellerName} de ${seller.agencyName}.\n\nAl analizar su presencia digital en Google, detectamos oportunidades directas para convertir más búsquedas locales en citas y clientes automatizando la atención en WhatsApp 24/7.\n\n¿Podemos coordinar una llamada breve de 10 minutos esta semana para presentarle una propuesta adaptada a su negocio?\n\nAtentamente,\n${seller.sellerName} — ${seller.agencyName}\nEl Salvador`,
      tone: selectedTone,
    };
  }
}

/**
 * Análisis comparativo de nichos en El Salvador (con soporte empírico real desde Google Places)
 */
export async function analyzeNichesComparison(params: {
  zone: string;
  niches: string[];
  empiricalStats?: NicheEmpiricalStats[];
}): Promise<NicheComparisonResult> {
  const ai = getGeminiClient();
  const seller = await getRadarSettings();
  const hasEmpirical = Array.isArray(params.empiricalStats) && params.empiricalStats.length > 0;

  const empiricalBlock = hasEmpirical
    ? `\nMÉTRICAS REALES RECOPILADAS EN VIVO DE GOOGLE PLACES PARA "${params.zone}, EL SALVADOR":\n${JSON.stringify(
        params.empiricalStats,
        null,
        2
      )}\n\nBasa tu ranking y puntuaciones en ESTOS DATOS REALES (% sin sitio web propio, promedio de reseñas que refleja demanda/liquidez, valoración media y disponibilidad telefónica).`
    : '';

  const prompt = `
Eres un analista de mercado B2B salvadoreño para la agencia "${seller.agencyName}" (${seller.valueProposition}).
Evalúa los siguientes sectores comerciales en la zona de: "${params.zone}, El Salvador".

Sectores a comparar:
${params.niches.map((n, i) => `${i + 1}. ${n}`).join('\n')}
${empiricalBlock}

Criterios de evaluación para ${seller.agencyName}:
1. Madurez digital del sector en la zona (BAJA, MEDIA, ALTA).
2. Nivel de saturación/competencia en la zona (BAJA, MEDIA, ALTA).
3. Ticket promedio estimado por cliente final en El Salvador (en USD).
4. Facilidad de venta y urgencia de automatización / web moderna.
5. Puntuación de prioridad comercial (0 a 100).

Devuelve EXCLUSIVAMENTE un objeto JSON válido con esta estructura:
{
  "zone": "${params.zone}",
  "winnerNiche": "Nombre del nicho más rentable y con mayor urgencia de compra",
  "strategicInsight": "Explicación estratégica basada en los datos reales (o estimación de zona) de por qué este nicho es el mejor objetivo.",
  "niches": [
    {
      "niche": "Nombre exacto del nicho",
      "digitalMaturity": "BAJA" | "MEDIA" | "ALTA",
      "saturationLevel": "BAJA" | "MEDIA" | "ALTA",
      "averageTicketUsd": "$50 - $150",
      "recommendedPitch": "Ángulo o propuesta ganadora para este sector",
      "priorityScore": 85
    }
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.25,
      },
    });

    const parsed = extractJsonFromText<NicheComparisonResult>(response.text || '{}');

    // Unir métricas empíricas por nicho y ordenar por prioridad descendente
    const statsMap = new Map<string, NicheEmpiricalStats>(
      (params.empiricalStats || []).map((st) => [st.niche.toLowerCase(), st])
    );

    const mergedNiches = (parsed.niches || []).map((item) => ({
      ...item,
      empirical: statsMap.get(item.niche.toLowerCase()),
    }));

    mergedNiches.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0));

    return {
      zone: parsed.zone || params.zone,
      winnerNiche: parsed.winnerNiche || mergedNiches[0]?.niche || params.niches[0] || '',
      strategicInsight: parsed.strategicInsight || '',
      isEmpirical: hasEmpirical,
      niches: mergedNiches,
    };
  } catch (err) {
    console.error('Error parseando JSON de Gemini analyzeNichesComparison:', err);
    const statsMap = new Map<string, NicheEmpiricalStats>(
      (params.empiricalStats || []).map((st) => [st.niche.toLowerCase(), st])
    );

    return {
      zone: params.zone,
      winnerNiche: params.niches[0] || 'Clínicas Dentales',
      strategicInsight:
        'Prioriza sectores con alta recurrencia de citas y alto porcentaje de negocios sin web propia para maximizar cierres.',
      isEmpirical: hasEmpirical,
      niches: params.niches.map((n, i) => ({
        niche: n,
        digitalMaturity: 'MEDIA',
        saturationLevel: 'MEDIA',
        averageTicketUsd: '$40 - $120',
        recommendedPitch: 'Automatización de citas 24/7 y confirmación de asistencia por WhatsApp',
        priorityScore: Math.max(40, 85 - i * 6),
        empirical: statsMap.get(n.toLowerCase()),
      })),
    };
  }
}
