import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import {
  createGoogleCalendarEvent,
  updateGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from '@/lib/integrations/google/calendar';
import { recordLeadInGoogleSheets } from '@/lib/integrations/google/sheets';
import { sendGmailEmail } from '@/lib/integrations/google/gmail';

export async function GET() {
  try {
    await requireAuth();

    const appointments = await prisma.appointment.findMany({
      orderBy: { startTime: 'asc' },
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
    const { action, appointmentId } = body;

    // Acción heredada: sincronización manual a Google Calendar
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
        description: `Cita en Clínica Dental San Salvador.\nPaciente: ${appt.contact.name || 'Paciente'}\nTeléfono: ${appt.contact.phone || 'No indicado'}\nTratamiento: ${appt.serviceName}`,
        startTime: appt.startTime.toISOString(),
        endTime: appt.endTime.toISOString(),
        attendeeEmail: appt.contact.email || undefined,
        timeZone: 'America/El_Salvador',
      });

      if (res?.id) {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { googleCalendarEventId: res.id },
        });
      }

      return NextResponse.json({ success: true, googleEvent: res });
    }

    // Creación manual de nueva cita desde el panel
    const { patientName, phone, email, serviceName, startTime, endTime, notes } = body;

    if (!patientName || !serviceName || !startTime) {
      return NextResponse.json(
        { error: 'Faltan campos obligatorios: patientName, serviceName y startTime son requeridos.' },
        { status: 400 }
      );
    }

    // 1. Crear o actualizar contacto
    let contact;
    if (phone && phone.trim()) {
      contact = await prisma.contact.upsert({
        where: { phone: phone.trim() },
        update: {
          name: patientName,
          email: email || undefined,
        },
        create: {
          name: patientName,
          phone: phone.trim(),
          email: email || undefined,
        },
      });
    } else {
      contact = await prisma.contact.create({
        data: {
          name: patientName,
          email: email || undefined,
        },
      });
    }

    // 2. Calcular fechas
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date(start.getTime() + 45 * 60000);

    // 3. Crear cita en la base de datos
    let appointment = await prisma.appointment.create({
      data: {
        contactId: contact.id,
        serviceName,
        startTime: start,
        endTime: end,
        notes: notes || undefined,
        status: 'CONFIRMED',
      },
      include: {
        contact: true,
      },
    });

    // 4. Integración Google Calendar: Si está activa, crear evento automáticamente
    try {
      const calIntegration = await prisma.integration.findUnique({
        where: { provider: 'google_calendar' },
      });

      if (calIntegration?.enabled) {
        const calRes = await createGoogleCalendarEvent({
          summary: `Cita: ${patientName} - ${serviceName}`,
          description: `Cita agendada en Clínica Dental San Salvador.\nPaciente: ${patientName}\nTeléfono: ${phone || '—'}\nTratamiento: ${serviceName}${notes ? '\nNotas: ' + notes : ''}`,
          startTime: start.toISOString(),
          endTime: end.toISOString(),
          attendeeEmail: email || undefined,
          timeZone: 'America/El_Salvador',
        });

        if (calRes?.id) {
          appointment = await prisma.appointment.update({
            where: { id: appointment.id },
            data: { googleCalendarEventId: calRes.id },
            include: { contact: true },
          });
        }
      }
    } catch (gcalErr: any) {
      console.warn('[Appointments API] Error al sincronizar con Google Calendar:', gcalErr?.message);
    }

    // 5. Integración Google Sheets: guardar lead y actualizar a Cita Agendada en el CRM
    recordLeadInGoogleSheets({
      name: patientName,
      phone: phone || null,
      email: email || null,
      channel: 'PANEL_MANUAL',
      service: serviceName,
      status: 'Cita Agendada',
      notes: `Cita: ${serviceName} el ${start.toLocaleString('es-SV', { timeZone: 'America/El_Salvador' })}`,
    }).catch(() => {});

    // 6. Integración Gmail: Disparar correo de confirmación al paciente si hay email
    if (email && email.trim()) {
      (async () => {
        try {
          const gmailIntegration = await prisma.integration.findUnique({
            where: { provider: 'gmail' },
          });

          if (gmailIntegration?.enabled) {
            const formattedDate = start.toLocaleDateString('es-SV', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              timeZone: 'America/El_Salvador',
            });
            const formattedTime = start.toLocaleTimeString('es-SV', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/El_Salvador',
            });

            const htmlBody = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 24px; color: #1e293b;">
                <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                  <div style="background-color: #0d9488; padding: 24px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Clínica Dental San Salvador</h1>
                    <p style="color: #ccfbf1; margin: 6px 0 0; font-size: 13px;">Confirmación de Cita Odontológica</p>
                  </div>
                  <div style="padding: 24px;">
                    <p style="font-size: 15px; margin: 0 0 16px;">¡Hola, <strong>${patientName}</strong>!</p>
                    <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 20px;">
                      Tu cita ha sido agendada con éxito en nuestra clínica en San Salvador:
                    </p>
                    <div style="background-color: #f0fdfa; border-left: 4px solid #0d9488; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
                      <p style="margin: 0 0 6px; font-size: 14px;"><strong>Tratamiento:</strong> ${serviceName}</p>
                      <p style="margin: 0 0 6px; font-size: 14px;"><strong>Fecha:</strong> ${formattedDate}</p>
                      <p style="margin: 0 0 6px; font-size: 14px;"><strong>Hora (El Salvador):</strong> ${formattedTime}</p>
                      <p style="margin: 0; font-size: 14px;"><strong>Ubicación:</strong> Paseo General Escalón #3700, San Salvador</p>
                    </div>
                    <h4 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin: 0 0 8px;">Recomendaciones para tu visita:</h4>
                    <ul style="font-size: 13px; color: #475569; line-height: 1.6; margin: 0 0 20px; padding-left: 18px;">
                      <li>Presentarse 10 minutos antes de la hora indicada.</li>
                      <li>Estacionamiento privado y seguro para pacientes.</li>
                      <li>Presentar tu DUI o documento de identificación en recepción.</li>
                      <li>En caso de necesitar cancelar o reprogramar, avísanos con al menos 4 horas de anticipación.</li>
                    </ul>
                    <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; color: #64748b; font-size: 12px;">
                      <p style="margin: 0 0 4px;"><strong>Clínica Dental San Salvador</strong></p>
                      <p style="margin: 0;">Teléfono / WhatsApp: +503 2200 1234 | San Salvador, El Salvador</p>
                    </div>
                  </div>
                </div>
              </div>
            `;

            await sendGmailEmail({
              to: email.trim(),
              subject: `Confirmación de Cita Odontológica - ${patientName} (${serviceName})`,
              htmlBody,
            });
          }
        } catch (mailErr: any) {
          console.warn('[Appointments API] Error al enviar email de confirmación:', mailErr?.message);
        }
      })();
    }

    return NextResponse.json({ success: true, appointment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error del servidor' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    await requireAuth();
    const body = await req.json();
    const { id, startTime, endTime, serviceName, status, notes } = body;

    if (!id) {
      return NextResponse.json({ error: 'El parámetro id es requerido' }, { status: 400 });
    }

    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: { contact: true },
    });

    if (!appt) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    // 1. Reflejar cambios en Google Calendar si la cita estaba sincronizada
    if (appt.googleCalendarEventId) {
      try {
        const calIntegration = await prisma.integration.findUnique({
          where: { provider: 'google_calendar' },
        });

        if (calIntegration?.enabled) {
          if (status === 'CANCELLED') {
            await deleteGoogleCalendarEvent(appt.googleCalendarEventId).catch(() => {});
          } else {
            const startStr = startTime ? new Date(startTime).toISOString() : appt.startTime.toISOString();
            const endStr = endTime ? new Date(endTime).toISOString() : appt.endTime.toISOString();

            await updateGoogleCalendarEvent(appt.googleCalendarEventId, {
              summary: `Cita: ${appt.contact.name || 'Paciente'} - ${serviceName || appt.serviceName}`,
              description: `Cita en Clínica Dental San Salvador.\nPaciente: ${appt.contact.name || 'Paciente'}\nTeléfono: ${appt.contact.phone || '—'}\nTratamiento: ${serviceName || appt.serviceName}${notes !== undefined ? '\nNotas: ' + notes : ''}`,
              startTime: startStr,
              endTime: endStr,
              attendeeEmail: appt.contact.email || undefined,
              timeZone: 'America/El_Salvador',
            }).catch((err) => {
              console.warn('[Appointments API] Error actualizando evento en Google Calendar:', err?.message);
            });
          }
        }
      } catch (err: any) {
        console.warn('[Appointments API] Error de sincronización en actualización:', err?.message);
      }
    }

    // 2. Actualizar cita en la base de datos
    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        startTime: startTime ? new Date(startTime) : undefined,
        endTime: endTime ? new Date(endTime) : undefined,
        serviceName: serviceName || undefined,
        status: status || undefined,
        notes: notes !== undefined ? notes : undefined,
        googleCalendarEventId: status === 'CANCELLED' ? null : undefined,
      },
      include: { contact: true },
    });

    return NextResponse.json({ success: true, appointment: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al actualizar cita' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAuth();

    const url = new URL(req.url);
    let id = url.searchParams.get('id');

    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'El id de la cita es requerido' }, { status: 400 });
    }

    const appt = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!appt) {
      return NextResponse.json({ error: 'Cita no encontrada' }, { status: 404 });
    }

    // Si tiene evento en Google Calendar, eliminarlo también en la nube
    if (appt.googleCalendarEventId) {
      try {
        const calIntegration = await prisma.integration.findUnique({
          where: { provider: 'google_calendar' },
        });

        if (calIntegration?.enabled) {
          await deleteGoogleCalendarEvent(appt.googleCalendarEventId).catch(() => {});
        }
      } catch (err: any) {
        console.warn('[Appointments API] Error eliminando evento de Google Calendar:', err?.message);
      }
    }

    // Eliminar registro local
    await prisma.appointment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Cita eliminada correctamente' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error al eliminar cita' }, { status: 500 });
  }
}
