/**
 * Algoritmo determinista de puntuación de oportunidades comerciales (0 - 100)
 * danIAutoma HQ - Radar de Clientes
 */

import { classifyBusinessUrl, UrlClassification } from './directoryDetector';

export interface ScoreFactor {
  factor: string;
  points: number;
  maxPoints: number;
  description: string;
  triggered: boolean;
  type?: 'positive' | 'neutral' | 'negative';
}

export interface CommercialScoreResult {
  totalScore: number;
  level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  levelLabel: string;
  levelColor: string;
  breakdown: ScoreFactor[];
  urlClassification: UrlClassification;
}

export interface ScoreChecklistInput {
  hasHttps?: boolean;
  isMobileResponsive?: boolean;
  hasWhatsAppButton?: boolean;
  hasOnlineBooking?: boolean;
  hasContactForm?: boolean;
  hasOutdatedCopyright?: boolean;
  copyrightYear?: string;
}

export interface BusinessScoreInput {
  websiteUri?: string | null;
  rating?: number | null;
  userRatingCount?: number | null;
  phone?: string | null;
  formattedAddress?: string | null;
  niche?: string | null;
  businessStatus?: string | null;
  pageSpeedPerformance?: number | null; // 0 - 100
  pageSpeedSeo?: number | null;         // 0 - 100
  aiChecklist?: ScoreChecklistInput | null;
}

export function calculateCommercialScore(input: BusinessScoreInput): CommercialScoreResult {
  const urlInfo = classifyBusinessUrl(input.websiteUri);
  const breakdown: ScoreFactor[] = [];
  let totalScore = 0;

  // Factor 1: Presencia Web (oportunidad principal de digitalización)
  if (urlInfo.platformType === 'none') {
    totalScore += 45;
    breakdown.push({
      factor: 'Sin sitio web registrado',
      points: 45,
      maxPoints: 45,
      description: 'El negocio no cuenta con sitio web en Google Maps. Oportunidad directa de web + agente IA.',
      triggered: true,
      type: 'positive',
    });
  } else if (
    urlInfo.platformType === 'social' ||
    urlInfo.platformType === 'directory' ||
    urlInfo.platformType === 'linkhub'
  ) {
    totalScore += 38;
    breakdown.push({
      factor: 'Dependencia exclusiva de redes o directorios',
      points: 38,
      maxPoints: 45,
      description: `Utiliza ${urlInfo.platformName || 'red social/directorio'} en lugar de dominio propio y embudo de conversión.`,
      triggered: true,
      type: 'positive',
    });
  } else {
    totalScore += 10;
    breakdown.push({
      factor: 'Cuenta con sitio web propio',
      points: 10,
      maxPoints: 45,
      description: 'Tiene dominio propio; la oportunidad depende de rendimiento técnico, SEO y automatización de citas/WhatsApp.',
      triggered: false,
      type: 'neutral',
    });
  }

  // Factor 2: Tracción comercial y solvencia (volumen real de reseñas)
  const reviewCount = input.userRatingCount ?? 0;
  let reviewPts = 0;
  let reviewDesc = '';
  let reviewTriggered = false;
  let reviewType: ScoreFactor['type'] = 'neutral';

  if (reviewCount >= 50) {
    reviewPts = 20;
    reviewDesc = `Negocio muy activo y consolidado (${reviewCount} reseñas), con alta capacidad de inversión.`;
    reviewTriggered = true;
    reviewType = 'positive';
  } else if (reviewCount >= 15) {
    reviewPts = 14;
    reviewDesc = `Actividad comercial constante (${reviewCount} reseñas en Google Maps).`;
    reviewTriggered = true;
    reviewType = 'positive';
  } else if (reviewCount > 0) {
    reviewPts = 6;
    reviewDesc = `Presencia inicial con ${reviewCount} reseña(s) verificadas.`;
    reviewTriggered = true;
    reviewType = 'neutral';
  } else {
    reviewPts = -10;
    reviewDesc = 'Sin reseñas públicas; baja actividad aparente o ficha sin validar por clientes.';
    reviewTriggered = true;
    reviewType = 'negative';
  }
  totalScore += reviewPts;
  breakdown.push({
    factor: 'Tracción comercial en Google Maps',
    points: reviewPts,
    maxPoints: 20,
    description: reviewDesc,
    triggered: reviewTriggered,
    type: reviewType,
  });

  // Factor 3: Reputación promedio (negocios valorados que pierden citas por atención manual)
  const rating = input.rating ?? 0;
  let ratingPts = 0;
  let ratingDesc = 'Sin calificación suficiente para evaluar reputación.';
  let ratingTriggered = false;
  let ratingType: ScoreFactor['type'] = 'neutral';

  if (rating >= 4.4 && reviewCount >= 10) {
    ratingPts = 12;
    ratingDesc = `Excelente reputación (${rating.toFixed(1)}★): servicio probado ideal para escalar con IA.`;
    ratingTriggered = true;
    ratingType = 'positive';
  } else if (rating >= 3.8 && reviewCount > 0) {
    ratingPts = 6;
    ratingDesc = `Buena valoración promedio (${rating.toFixed(1)}★).`;
    ratingTriggered = true;
    ratingType = 'positive';
  } else if (reviewCount > 0 && rating > 0 && rating < 3.5) {
    ratingPts = -5;
    ratingDesc = `Valoración baja (${rating.toFixed(1)}★): posible problema operativo previo a automatización.`;
    ratingTriggered = true;
    ratingType = 'negative';
  }
  totalScore += ratingPts;
  breakdown.push({
    factor: 'Reputación y satisfacción de clientes',
    points: ratingPts,
    maxPoints: 12,
    description: ratingDesc,
    triggered: ratingTriggered,
    type: ratingType,
  });

  // Factor 4: Contactabilidad directa (teléfono publicado)
  const hasPhone = Boolean(input.phone && input.phone.trim());
  const phonePts = hasPhone ? 15 : -15;
  totalScore += phonePts;
  breakdown.push({
    factor: hasPhone ? 'Teléfono directo verificado' : 'Sin teléfono publicado',
    points: phonePts,
    maxPoints: 15,
    description: hasPhone
      ? 'Contacto directo disponible para prospección inmediata por llamada o WhatsApp.'
      : 'La ficha carece de teléfono público, dificultando el contacto comercial directo.',
    triggered: true,
    type: hasPhone ? 'positive' : 'negative',
  });

  // Factor 5: Estado operativo en Google Maps
  const isClosed =
    input.businessStatus === 'CLOSED_TEMPORARILY' ||
    input.businessStatus === 'CLOSED_PERMANENTLY';
  if (isClosed) {
    totalScore -= 50;
  }
  breakdown.push({
    factor: isClosed ? 'Negocio cerrado temporal o permanentemente' : 'Negocio operativo en Google Maps',
    points: isClosed ? -50 : 0,
    maxPoints: 0,
    description: isClosed
      ? `Estado reportado por Google: ${input.businessStatus}. Prospecto no recomendable.`
      : 'Horario y operación reportados como activos.',
    triggered: isClosed,
    type: isClosed ? 'negative' : 'neutral',
  });

  // Recalibración por Auditoría PageSpeed (solo sitios web propios)
  if (urlInfo.isOwnedWebsite && typeof input.pageSpeedPerformance === 'number') {
    const perf = input.pageSpeedPerformance;
    let perfPts = 0;
    let perfDesc = `Rendimiento móvil aceptable (${perf}/100).`;
    let perfTriggered = false;
    let perfType: ScoreFactor['type'] = 'neutral';

    if (perf < 50) {
      perfPts = 22;
      perfDesc = `Rendimiento móvil crítico (${perf}/100 en PageSpeed): el sitio pierde tráfico móvil.`;
      perfTriggered = true;
      perfType = 'positive';
    } else if (perf < 75) {
      perfPts = 12;
      perfDesc = `Rendimiento móvil mejorable (${perf}/100 en PageSpeed).`;
      perfTriggered = true;
      perfType = 'positive';
    } else if (perf >= 90) {
      perfPts = -20;
      perfDesc = `Web rápida y bien optimizada (${perf}/100): menor urgencia de rediseño web.`;
      perfTriggered = true;
      perfType = 'negative';
    }

    totalScore += perfPts;
    breakdown.push({
      factor: 'Rendimiento móvil (PageSpeed Insights)',
      points: perfPts,
      maxPoints: 22,
      description: perfDesc,
      triggered: perfTriggered,
      type: perfType,
    });
  }

  if (urlInfo.isOwnedWebsite && typeof input.pageSpeedSeo === 'number') {
    const seo = input.pageSpeedSeo;
    const badSeo = seo < 60;
    if (badSeo) {
      totalScore += 10;
    }
    breakdown.push({
      factor: 'SEO técnico (< 60 en PageSpeed)',
      points: badSeo ? 10 : 0,
      maxPoints: 10,
      description: badSeo
        ? `SEO técnico deficiente (${seo}/100): pierde visibilidad orgánica local.`
        : `SEO técnico base adecuado (${seo}/100).`,
      triggered: badSeo,
      type: badSeo ? 'positive' : 'neutral',
    });
  }

  // Recalibración por Checklist Técnico IA (urlContext cuando tiene web propia)
  if (urlInfo.isOwnedWebsite && input.aiChecklist) {
    const cl = input.aiChecklist;

    if (cl.hasWhatsAppButton === false) {
      totalScore += 10;
      breakdown.push({
        factor: 'Sin botón/widget de WhatsApp en la web',
        points: 10,
        maxPoints: 10,
        description: 'Oportunidad directa para implementar Atendia / Agente de IA 24/7 en WhatsApp.',
        triggered: true,
        type: 'positive',
      });
    }

    if (cl.hasOnlineBooking === false) {
      totalScore += 10;
      breakdown.push({
        factor: 'Sin sistema de citas o reservas online',
        points: 10,
        maxPoints: 10,
        description: 'Captación manual de clientes sin agendamiento automatizado.',
        triggered: true,
        type: 'positive',
      });
    }

    if (cl.hasHttps === false) {
      totalScore += 10;
      breakdown.push({
        factor: 'Sitio sin HTTPS seguro',
        points: 10,
        maxPoints: 10,
        description: 'El navegador muestra advertencia de sitio no seguro ante clientes potenciales.',
        triggered: true,
        type: 'positive',
      });
    }

    if (cl.isMobileResponsive === false) {
      totalScore += 15;
      breakdown.push({
        factor: 'Diseño web no adaptado a móviles',
        points: 15,
        maxPoints: 15,
        description: 'Experiencia deficiente en teléfonos, afectando conversión local.',
        triggered: true,
        type: 'positive',
      });
    }

    if (cl.hasOutdatedCopyright === true) {
      totalScore += 5;
      breakdown.push({
        factor: 'Señales de sitio desactualizado',
        points: 5,
        maxPoints: 5,
        description: `Copyright antiguo detectado (${cl.copyrightYear || 'desactualizado'}).`,
        triggered: true,
        type: 'positive',
      });
    }
  }

  // Limitar puntaje entre 0/5 y 100
  const floorScore = isClosed ? 0 : 5;
  totalScore = Math.min(100, Math.max(floorScore, Math.round(totalScore)));

  // Clasificación de nivel
  let level: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';
  let levelLabel: string;
  let levelColor: string;

  if (totalScore >= 75) {
    level = 'CRITICAL';
    levelLabel = 'Oportunidad Crítica';
    levelColor = '#ef4444'; // Red
  } else if (totalScore >= 50) {
    level = 'HIGH';
    levelLabel = 'Oportunidad Alta';
    levelColor = '#f59e0b'; // Amber
  } else if (totalScore >= 30) {
    level = 'MODERATE';
    levelLabel = 'Oportunidad Media';
    levelColor = '#06b6d4'; // Cyan
  } else {
    level = 'LOW';
    levelLabel = 'Presencia Estable';
    levelColor = '#10b981'; // Green
  }

  return {
    totalScore,
    level,
    levelLabel,
    levelColor,
    breakdown,
    urlClassification: urlInfo,
  };
}

