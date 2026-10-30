import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { INTEGRATIONS_CATALOG } from '@/lib/integrations/types';
import { decrypt, maskSecret } from '@/lib/crypto';

export async function GET() {
  try {
    await requireAuth();

    const dbIntegrations = await prisma.integration.findMany();
    const dbMap = new Map(dbIntegrations.map((i) => [i.provider, i]));

    const result = INTEGRATIONS_CATALOG.map((cat) => {
      const dbRecord = dbMap.get(cat.id);
      let maskedCreds: Record<string, string> = {};

      if (dbRecord?.credentialsEnc) {
        try {
          const decrypted = JSON.parse(decrypt(dbRecord.credentialsEnc));
          for (const [k, v] of Object.entries(decrypted)) {
            if (typeof v === 'string') {
              maskedCreds[k] = maskSecret(v);
            }
          }
        } catch {}
      }

      return {
        ...cat,
        enabled: dbRecord?.enabled ?? false,
        config: (dbRecord?.config as any) || {},
        lastSyncAt: dbRecord?.lastSyncAt,
        maskedCreds,
      };
    });

    return NextResponse.json({
      integrations: result,
      hasGoogleConfig: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    });
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

