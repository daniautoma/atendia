import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { createGoogleCalendarEvent } from '@/lib/integrations/google/calendar';

export async function GET() {
  try {
    await requireAuth();

    const appointments = await prisma.appointment.findMany({
      orderBy: { startTime: 'desc' },
      include: {
        contact: true,
      },
    });

    return NextResponse.json({ appointments });
  } catch (err: any) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const { appointmentId, action } = body;

    if (action === 'SYNC_CALENDAR' && appointmentId) {
      const appt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { contact: true },
      });

      if (!appt) {
        return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
      }

      const res = await createGoogleCalendarEvent({
        summary: `Cita: ${appt.contact.name || 'Paciente'} - ${appt.serviceName}`,
        description: `Cita agendada en Atendia.\nPaciente: ${appt.contact.name || 'Paciente'}\nTeléfono: ${appt.contact.phone || 'No indicado'}\nTratamiento: ${appt.serviceName}`,
        startTime: appt.startTime.toISOString(),
        endTime: appt.endTime.toISOString(),
        attendeeEmail: appt.contact.email || undefined,
        timeZone: 'Europe/Madrid',
      });

      return NextResponse.json({ success: true, googleEvent: res });
    }

    return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

