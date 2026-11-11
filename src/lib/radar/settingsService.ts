/**
 * Configuración centralizada del módulo Radar de Clientes (Perfil de vendedor y cuota)
 * danIAutoma HQ
 */

import { prisma } from '@/lib/prisma';

export type PitchTone = 'cercano' | 'formal' | 'persuasivo' | 'directo';

export interface RadarSellerProfile {
  sellerName: string;
  agencyName: string;
  servicesOffered: string[];
  valueProposition: string;
  defaultTone: PitchTone;
  placesMonthlyLimit: number;
}

export const DEFAULT_RADAR_SETTINGS: RadarSellerProfile = {
  sellerName: 'Daniel',
  agencyName: 'danIAutoma',
  servicesOffered: [
    'Agentes de IA para WhatsApp 24/7 con agendamiento automático (Atendia)',
    'Sitios web modernos de alta conversión optimizados para móvil',
    'Sistemas automatizados de citas, recordatorios y calificación de leads',
    'Optimización de reputación local y SEO en Google Maps',
  ],
  valueProposition:
    'Ayudamos a negocios en El Salvador a responder al instante por WhatsApp, agendar citas 24/7 con Inteligencia Artificial y convertir más visitas de Google Maps en clientes.',
  defaultTone: 'cercano',
  placesMonthlyLimit: 800,
};

export async function getRadarSettings(): Promise<RadarSellerProfile> {
  try {
    const row = await prisma.hqRadarSettings.findUnique({
      where: { id: 'default' },
    });

    if (!row) return DEFAULT_RADAR_SETTINGS;

    const services = Array.isArray(row.servicesOffered)
      ? (row.servicesOffered as unknown[]).map((s) => String(s)).filter(Boolean)
      : DEFAULT_RADAR_SETTINGS.servicesOffered;

    const validTones: PitchTone[] = ['cercano', 'formal', 'persuasivo', 'directo'];
    const tone = validTones.includes(row.defaultTone as PitchTone)
      ? (row.defaultTone as PitchTone)
      : DEFAULT_RADAR_SETTINGS.defaultTone;

    return {
      sellerName: row.sellerName || DEFAULT_RADAR_SETTINGS.sellerName,
      agencyName: row.agencyName || DEFAULT_RADAR_SETTINGS.agencyName,
      servicesOffered: services.length > 0 ? services : DEFAULT_RADAR_SETTINGS.servicesOffered,
      valueProposition: row.valueProposition || DEFAULT_RADAR_SETTINGS.valueProposition,
      defaultTone: tone,
      placesMonthlyLimit: row.placesMonthlyLimit > 0 ? row.placesMonthlyLimit : 800,
    };
  } catch {
    return DEFAULT_RADAR_SETTINGS;
  }
}

export async function updateRadarSettings(
  input: Partial<RadarSellerProfile>
): Promise<RadarSellerProfile> {
  const current = await getRadarSettings();

  const next: RadarSellerProfile = {
    sellerName: input.sellerName?.trim() || current.sellerName,
    agencyName: input.agencyName?.trim() || current.agencyName,
    servicesOffered:
      Array.isArray(input.servicesOffered) && input.servicesOffered.length > 0
        ? input.servicesOffered.map((s) => s.trim()).filter(Boolean)
        : current.servicesOffered,
    valueProposition: input.valueProposition?.trim() || current.valueProposition,
    defaultTone: input.defaultTone || current.defaultTone,
    placesMonthlyLimit:
      typeof input.placesMonthlyLimit === 'number' && input.placesMonthlyLimit > 0
        ? Math.round(input.placesMonthlyLimit)
        : current.placesMonthlyLimit,
  };

  await prisma.hqRadarSettings.upsert({
    where: { id: 'default' },
    update: {
      sellerName: next.sellerName,
      agencyName: next.agencyName,
      servicesOffered: next.servicesOffered,
      valueProposition: next.valueProposition,
      defaultTone: next.defaultTone,
      placesMonthlyLimit: next.placesMonthlyLimit,
    },
    create: {
      id: 'default',
      sellerName: next.sellerName,
      agencyName: next.agencyName,
      servicesOffered: next.servicesOffered,
      valueProposition: next.valueProposition,
      defaultTone: next.defaultTone,
      placesMonthlyLimit: next.placesMonthlyLimit,
    },
  });

  return next;
}

