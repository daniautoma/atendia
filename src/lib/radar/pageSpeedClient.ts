/**
 * Cliente de Google PageSpeed Insights v5
 * danIAutoma HQ - Radar de Clientes
 */

export interface PageSpeedAuditResult {
  url: string;
  strategy: 'mobile' | 'desktop';
  performanceScore: number;
  seoScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  metrics: {
    firstContentfulPaint?: string;
    largestContentfulPaint?: string;
    totalBlockingTime?: string;
    cumulativeLayoutShift?: string;
    speedIndex?: string;
  };
  screenshotBase64?: string; // data:image/jpeg;base64,...
  auditedAt: string;
}

export async function runPageSpeedAudit(
  targetUrl: string,
  strategy: 'mobile' | 'desktop' = 'mobile'
): Promise<PageSpeedAuditResult> {
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY || process.env.GEMINI_API_KEY || '';
  
  // Normalizar URL
  let validUrl = targetUrl.trim();
  if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
    validUrl = `https://${validUrl}`;
  }

  const queryParams = new URLSearchParams({
    url: validUrl,
    strategy,
  });

  queryParams.append('category', 'PERFORMANCE');
  queryParams.append('category', 'SEO');
  queryParams.append('category', 'ACCESSIBILITY');
  queryParams.append('category', 'BEST_PRACTICES');

  if (apiKey) {
    queryParams.append('key', apiKey);
  }

  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${queryParams.toString()}`;

  const response = await fetch(endpoint, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error en PageSpeed Insights:', response.status, errorText);
    throw new Error(`Error en auditoría PageSpeed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const lh = data.lighthouseResult;

  if (!lh || !lh.categories) {
    throw new Error('La respuesta de Lighthouse no contiene categorías de auditoría válidas.');
  }

  const performanceScore = Math.round((lh.categories.performance?.score ?? 0) * 100);
  const seoScore = Math.round((lh.categories.seo?.score ?? 0) * 100);
  const accessibilityScore = Math.round((lh.categories.accessibility?.score ?? 0) * 100);
  const bestPracticesScore = Math.round((lh.categories['best-practices']?.score ?? 0) * 100);

  const metrics = {
    firstContentfulPaint: lh.audits?.['first-contentful-paint']?.displayValue,
    largestContentfulPaint: lh.audits?.['largest-contentful-paint']?.displayValue,
    totalBlockingTime: lh.audits?.['total-blocking-time']?.displayValue,
    cumulativeLayoutShift: lh.audits?.['cumulative-layout-shift']?.displayValue,
    speedIndex: lh.audits?.['speed-index']?.displayValue,
  };

  const screenshotBase64 = lh.audits?.['final-screenshot']?.details?.data || undefined;

  return {
    url: validUrl,
    strategy,
    performanceScore,
    seoScore,
    accessibilityScore,
    bestPracticesScore,
    metrics,
    screenshotBase64,
    auditedAt: new Date().toISOString(),
  };
}

