import React from 'react';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateCommercialScore, ScoreFactor } from '@/lib/radar/scoringEngine';
import { classifyBusinessUrl } from '@/lib/radar/directoryDetector';
import { PageSpeedAuditResult } from '@/lib/radar/pageSpeedClient';
import { BusinessDiagnosis, CommercialPitches } from '@/lib/radar/geminiClient';
import { getRadarSettings } from '@/lib/radar/settingsService';
import { HqHeader } from '@/components/hq/HqHeader';
import { RadarBusinessDetailClient } from '@/components/hq/radar/RadarBusinessDetailClient';

interface RadarBusinessPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    name?: string;
    niche?: string;
    address?: string;
    phone?: string;
    website?: string;
    platformType?: string;
    googleMapsUri?: string;
    businessStatus?: string;
    rating?: string;
    reviews?: string;
    score?: string;
  }>;
}

export default async function RadarBusinessDetailPage({
  params,
  searchParams,
}: RadarBusinessPageProps) {
  await requireAdmin();

  const { id: placeId } = await params;
  const sParams = await searchParams;

  if (!placeId) {
    notFound();
  }

  const [existingLead, settings] = await Promise.all([
    prisma.hqLead.findFirst({
      where: {
        OR: [{ placeId }, { id: placeId }],
      },
    }),
    getRadarSettings(),
  ]);

  const businessName = existingLead?.name || sParams.name || 'Negocio Local';
  const niche = existingLead?.niche || sParams.niche || 'Sector Comercial';
  const formattedAddress =
    existingLead?.formattedAddress || sParams.address || 'Dirección en El Salvador';
  const phone = existingLead?.phone || sParams.phone || '';
  const websiteUri = existingLead?.websiteUri || sParams.website || '';
  const urlClass = classifyBusinessUrl(websiteUri);
  const platformType = existingLead?.platformType || sParams.platformType || urlClass.platformType;
  const googleMapsUri = existingLead?.googleMapsUri || sParams.googleMapsUri || undefined;
  const businessStatus = existingLead?.businessStatus || sParams.businessStatus || undefined;
  const rating = existingLead?.rating ?? (sParams.rating ? parseFloat(sParams.rating) : undefined);
  const userRatingCount =
    existingLead?.userRatingCount ?? (sParams.reviews ? parseInt(sParams.reviews, 10) : undefined);
  const initialAudit = existingLead?.pageSpeedAudit as unknown as PageSpeedAuditResult | null;
  const initialDiagnosis = existingLead?.aiAnalysis as unknown as BusinessDiagnosis | null;
  const initialPitches = existingLead?.pitches as unknown as CommercialPitches | null;

  const scoreResult = calculateCommercialScore({
    websiteUri,
    rating,
    userRatingCount,
    phone,
    formattedAddress,
    niche,
    businessStatus,
    pageSpeedPerformance: initialAudit?.performanceScore,
    pageSpeedSeo: initialAudit?.seoScore,
    aiChecklist: initialDiagnosis?.checklist || null,
  });

  const resolvedScoreResult =
    existingLead?.finalScore && Array.isArray(existingLead?.scoreBreakdown)
      ? {
          ...scoreResult,
          totalScore: existingLead.finalScore,
          breakdown: existingLead.scoreBreakdown as unknown as ScoreFactor[],
        }
      : scoreResult;

  return (
    <div className="min-h-screen bg-[#09090b]">
      <div className="print:hidden">
        <HqHeader />
      </div>
      <RadarBusinessDetailClient
        placeId={existingLead?.placeId || placeId}
        initialLead={
          existingLead
            ? {
                id: existingLead.id,
                status: existingLead.status,
                value: existingLead.value,
                notes: existingLead.notes,
                nextActionDate: existingLead.nextActionDate
                  ? existingLead.nextActionDate.toISOString()
                  : null,
              }
            : null
        }
        business={{
          name: businessName,
          niche,
          category: existingLead?.category || niche,
          formattedAddress,
          latitude: existingLead?.latitude ?? undefined,
          longitude: existingLead?.longitude ?? undefined,
          phone: phone || undefined,
          websiteUri: websiteUri || undefined,
          hasOwnWebsite: existingLead?.hasOwnWebsite ?? urlClass.isOwnedWebsite,
          platformType,
          googleMapsUri,
          businessStatus,
          rating,
          userRatingCount,
          provisionalScore:
            existingLead?.provisionalScore ??
            (sParams.score ? parseInt(sParams.score, 10) : scoreResult.totalScore),
        }}
        initialAudit={initialAudit}
        initialDiagnosis={initialDiagnosis}
        initialPitches={initialPitches}
        initialScoreResult={resolvedScoreResult}
        defaultTone={settings.defaultTone}
      />
    </div>
  );
}
