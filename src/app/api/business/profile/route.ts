import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function GET() {
  try {
    await requireAuth();
    let business = await prisma.businessProfile.findFirst();
    if (!business) {
      business = await prisma.businessProfile.create({
        data: {
          name: 'Clínica Dental San Salvador',
          activity: 'Odontología integral y diseño de sonrisa',
          address: 'Paseo General Escalón #3700, Colonia Escalón, San Salvador',
          phone: '+503 2200 1234',
          website: 'https://dentalsansalvador.sv',
          timezone: 'America/El_Salvador',
        },
      });
    }
    return NextResponse.json(business);
  } catch {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();

    const business = await prisma.businessProfile.findFirst();
    if (!business) {
      return NextResponse.json({ error: 'Perfil de negocio no encontrado' }, { status: 404 });
    }

    const updated = await prisma.businessProfile.update({
      where: { id: business.id },
      data: {
        name: body.name ?? business.name,
        activity: body.activity ?? business.activity,
        address: body.address ?? business.address,
        phone: body.phone ?? business.phone,
        website: body.website ?? business.website,
        timezone: body.timezone ?? business.timezone,
        assistantActive: body.assistantActive !== undefined ? body.assistantActive : business.assistantActive,
        agencyName: body.agencyName ?? business.agencyName,
        agencyLogo: body.agencyLogo !== undefined ? body.agencyLogo : business.agencyLogo,
      },
    });

    return NextResponse.json({ success: true, business: updated });
  } catch (error) {
    console.error('Error al actualizar perfil de negocio:', error);
    return NextResponse.json({ error: 'Error al actualizar perfil' }, { status: 500 });
  }
}

