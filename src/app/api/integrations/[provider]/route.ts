import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { encrypt, decrypt } from '@/lib/crypto';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    await requireAuth();
    const { provider } = await params;
    const body = await req.json();

    const current = await prisma.integration.findUnique({
      where: { provider },
    });

    let newCredentialsEnc = current?.credentialsEnc;
    if (body.credentials) {
      // Si ya existían credenciales previas, combinamos
      let existing: any = {};
      if (current?.credentialsEnc) {
        try {
          existing = JSON.parse(decrypt(current.credentialsEnc));
        } catch {}
      }
      const merged = { ...existing, ...body.credentials };
      newCredentialsEnc = encrypt(JSON.stringify(merged));
    }

    const updated = await prisma.integration.upsert({
      where: { provider },
      update: {
        enabled: body.enabled !== undefined ? body.enabled : current?.enabled,
        config: body.config !== undefined ? body.config : current?.config,
        credentialsEnc: newCredentialsEnc,
        lastSyncAt: new Date(),
      },
      create: {
        provider,
        name: body.name || provider,
        enabled: body.enabled ?? true,
        config: body.config || {},
        credentialsEnc: newCredentialsEnc,
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, integration: updated });
  } catch (error: any) {
    console.error('Error al actualizar integración:', error);
    return NextResponse.json({ error: error?.message || 'Error al guardar' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    await requireAuth();
    const { provider } = await params;

    await prisma.integration.update({
      where: { provider },
      data: {
        enabled: false,
        credentialsEnc: null,
      },
    });

    return NextResponse.json({ success: true, disconnected: true });
  } catch (error: any) {
    console.error('Error al desconectar integración:', error);
    return NextResponse.json({ error: 'Error al desconectar' }, { status: 500 });
  }
}

