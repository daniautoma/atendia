/**
 * Cliente de Google Places API (New) para prospección comercial
 * danIAutoma HQ - Radar de Clientes
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { calculateCommercialScore, ScoreFactor } from './scoringEngine';
import { classifyBusinessUrl } from './directoryDetector';

interface GooglePlaceRaw {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  primaryType?: string;
  primaryTypeDisplayName?: { text: string };
  googleMapsUri?: string;
  businessStatus?: string;
}

export interface RadarBusiness {
  id: string; // place.id de Google
  name: string;
  formattedAddress: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  websiteUri?: string;
  hasOwnWebsite: boolean;
  platformType: string;
  platformName: string | null;
  rating?: number;
  userRatingCount?: number;
  category?: string;
  googleMapsUri?: string;
  businessStatus?: string;
  provisionalScore: number;
  scoreLevel: string;
  scoreColor: string;
  scoreBreakdown: ScoreFactor[];
  isSavedToCrm?: boolean;
  savedLeadId?: string;
  savedLeadStatus?: string;
}

export interface PlacesSearchResponse {
  businesses: RadarBusiness[];
  nextPageToken?: string;
  fromCache: boolean;
  usageCount: number;
  usageLimit: number;
}

const PLACES_FIELD_MASK = [
  'places.id',
  'places.displayName',
  'places.formattedAddress',
  'places.location',
  'places.internationalPhoneNumber',
  'places.nationalPhoneNumber',
  'places.websiteUri',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.primaryType',
  'places.primaryTypeDisplayName',
  'places.businessStatus',
  'nextPageToken',
].join(',');

/**
 * Obtiene o crea el registro de consumo mensual del Radar
 */
export async function getOrUpdateRadarUsage(incrementBy: number = 0) {
  const now = new Date();
  const monthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  let configuredLimit = 800;
  try {
    const settings = await prisma.hqRadarSettings.findUnique({
      where: { id: 'default' },
      select: { placesMonthlyLimit: true },
    });
    if (settings?.placesMonthlyLimit && settings.placesMonthlyLimit > 0) {
      configuredLimit = settings.placesMonthlyLimit;
    }
  } catch {
    // Fallback seguro si aún no existe la tabla o registro de settings
  }

  const usage = await prisma.hqRadarUsage.upsert({
    where: { monthYear },
    update: {
      placesCalls: { increment: incrementBy },
      limitAlert: configuredLimit,
    },
    create: {
      monthYear,
      placesCalls: incrementBy,
      limitAlert: configuredLimit,
    },
  });

  return usage;
}

/**
 * Busca negocios en Google Places API (New) aplicando caché de 48h y cálculo de score
 */
export async function searchPlacesRadar(params: {
  searchQuery: string;
  zone: string;
  niche: string;
  pageToken?: string;
  forceRefresh?: boolean;
}): Promise<PlacesSearchResponse> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Falta configurar GOOGLE_CLOUD_API_KEY en las variables de entorno.');
  }

  const normalizedKey = `v2:${params.zone.trim().toLowerCase()}:${params.niche.trim().toLowerCase()}:${params.pageToken || 'p1'}`;
  const now = new Date();

  // 1. Verificar si existe en la caché persistente de 48h (salvo forceRefresh)
  if (!params.forceRefresh) {
    const cached = await prisma.hqRadarSearchCache.findUnique({
      where: { cacheKey: normalizedKey },
    });

    if (cached && cached.expiresAt > now) {
      const rawBusinesses = cached.results as unknown as RadarBusiness[];
      const enriched = await enrichWithCrmStatus(rawBusinesses);
      const usage = await getOrUpdateRadarUsage(0);

      return {
        businesses: enriched,
        nextPageToken: cached.nextPageToken || undefined,
        fromCache: true,
        usageCount: usage.placesCalls,
        usageLimit: usage.limitAlert,
      };
    }
  }

  // 2. Realizar petición real a Google Places API (New)
  const endpoint = 'https://places.googleapis.com/v1/places:searchText';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': PLACES_FIELD_MASK,
    },
    body: JSON.stringify({
      textQuery: params.searchQuery,
      languageCode: 'es',
      regionCode: 'SV',
      pageSize: 20,
      pageToken: params.pageToken || undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error Google Places API:', response.status, errorText);
    throw new Error(`Error en Google Places API (${response.status}): ${errorText}`);
  }

  // Incrementar contador mensual de cuota
  const usage = await getOrUpdateRadarUsage(1);

  const data = await response.json();
  const rawPlaces = data.places || [];

  // 3. Procesar y calcular score comercial de cada negocio
  const businesses: RadarBusiness[] = (rawPlaces as GooglePlaceRaw[]).map((p) => {
    const websiteUri = p.websiteUri || undefined;
    const phone = p.internationalPhoneNumber || p.nationalPhoneNumber || undefined;
    const scoreResult = calculateCommercialScore({
      websiteUri,
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      phone,
      formattedAddress: p.formattedAddress,
      niche: params.niche,
      businessStatus: p.businessStatus,
    });

    const urlClass = classifyBusinessUrl(websiteUri);

    return {
      id: p.id,
      name: p.displayName?.text || 'Sin nombre',
      formattedAddress: p.formattedAddress || 'Dirección no disponible',
      latitude: p.location?.latitude,
      longitude: p.location?.longitude,
      phone,
      websiteUri,
      hasOwnWebsite: urlClass.isOwnedWebsite,
      platformType: urlClass.platformType,
      platformName: urlClass.platformName,
      rating: p.rating,
      userRatingCount: p.userRatingCount,
      category: p.primaryTypeDisplayName?.text || p.primaryType || params.niche,
      googleMapsUri: p.googleMapsUri,
      businessStatus: p.businessStatus,
      provisionalScore: scoreResult.totalScore,
      scoreLevel: scoreResult.level,
      scoreColor: scoreResult.levelColor,
      scoreBreakdown: scoreResult.breakdown,
    };
  });

  // Ordenar por oportunidad comercial descendente (los de mayor score primero)
  businesses.sort((a, b) => b.provisionalScore - a.provisionalScore);

  // 4. Guardar en caché con TTL de 48 horas
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const jsonResults = businesses as unknown as Prisma.InputJsonValue;
  await prisma.hqRadarSearchCache.upsert({
    where: { cacheKey: normalizedKey },
    update: {
      results: jsonResults,
      nextPageToken: data.nextPageToken || null,
      expiresAt,
    },
    create: {
      cacheKey: normalizedKey,
      zone: params.zone,
      niche: params.niche,
      results: jsonResults,
      nextPageToken: data.nextPageToken || null,
      expiresAt,
    },
  });

  // 5. Cruzar con la base de datos de HqLead para indicar si ya está guardado
  const enriched = await enrichWithCrmStatus(businesses);

  return {
    businesses: enriched,
    nextPageToken: data.nextPageToken || undefined,
    fromCache: false,
    usageCount: usage.placesCalls,
    usageLimit: usage.limitAlert,
  };
}

/**
 * Cruza la lista de negocios con los leads ya guardados en HqLead
 */
async function enrichWithCrmStatus(businesses: RadarBusiness[]): Promise<RadarBusiness[]> {
  const placeIds = businesses.map((b) => b.id).filter(Boolean);
  if (placeIds.length === 0) return businesses;

  const existingLeads = await prisma.hqLead.findMany({
    where: { placeId: { in: placeIds } },
    select: { id: true, placeId: true, status: true },
  });

  const leadMap = new Map<string, { id: string; status: string }>();
  existingLeads.forEach((lead) => {
    if (lead.placeId) {
      leadMap.set(lead.placeId, { id: lead.id, status: lead.status });
    }
  });

  return businesses.map((b) => {
    const match = leadMap.get(b.id);
    if (match) {
      return {
        ...b,
        isSavedToCrm: true,
        savedLeadId: match.id,
        savedLeadStatus: match.status,
      };
    }
    return {
      ...b,
      isSavedToCrm: false,
    };
  });
}

