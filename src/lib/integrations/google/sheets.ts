import { getValidAccessToken } from './oauth';
import { prisma } from '@/lib/prisma';
import { LogStatus } from '@prisma/client';

export interface LeadRecord {
  name?: string | null;
  phone?: string | null;
  channel?: 'WhatsApp' | 'Web' | string | null;
  serviceInterest?: string | null;
  leadStatus?: 'Potencial' | 'Solo Información' | 'Agendado' | string | null;
  summary?: string | null;
}

export interface AppointmentRecord {
  name: string;
  phone: string;
  service: string;
  dateTime: string | Date;
  status?: 'Activa' | 'Reprogramada' | 'Cancelada' | string;
  channel?: string;
}

export interface UpdateAppointmentOptions {
  phone?: string | null;
  patientName?: string | null;
  newDateTime?: string | Date | null;
  serviceName?: string | null;
  status: 'Activa' | 'Reprogramada' | 'Cancelada';
}

// Encabezados exactos para Hoja 1: "Leads"
export const LEADS_HEADERS = [
  'Fecha',
  'Nombre',
  'Teléfono',
  'Canal (WhatsApp/Web)',
  'Servicio de Interés',
  'Estado del Lead',
  'Resumen de Conversación',
];

// Encabezados exactos para Hoja 2: "Citas Agendadas"
export const APPOINTMENTS_HEADERS = [
  'Fecha de Agendamiento',
  'Nombre',
  'Teléfono',
  'Servicio',
  'Fecha y Hora de la Cita',
  'Estado (Activa/Reprogramada/Cancelada)',
];

function formatSVDate(dateInput: string | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  return d.toLocaleString('es-SV', {
    timeZone: 'America/El_Salvador',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function cleanDigits(val?: string | null): string {
  return (val || '').replace(/\D/g, '');
}

/**
 * Obtiene o crea la hoja de cálculo "Contactos Atendia" en Google Drive.
 */
async function getOrCreateSpreadsheet(token: string): Promise<string | null> {
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='Contactos Atendia' and trashed=false&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  let sheetId = '';
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      sheetId = data.files[0].id;
    }
  }

  if (sheetId) return sheetId;

  // Crear spreadsheet nueva con las 2 pestañas preconfiguradas
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: 'Contactos Atendia' },
      sheets: [
        {
          properties: { title: 'Leads' },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: LEADS_HEADERS.map((h) => ({
                    userEnteredValue: { stringValue: h },
                  })),
                },
              ],
            },
          ],
        },
        {
          properties: { title: 'Citas Agendadas' },
          data: [
            {
              startRow: 0,
              startColumn: 0,
              rowData: [
                {
                  values: APPOINTMENTS_HEADERS.map((h) => ({
                    userEnteredValue: { stringValue: h },
                  })),
                },
              ],
            },
          ],
        },
      ],
    }),
  });

  if (createRes.ok) {
    const created = await createRes.json();
    return created.spreadsheetId;
  }

  return null;
}

/**
 * Asegura que el documento de Google Sheets tenga las dos pestañas ("Leads" y "Citas Agendadas")
 * y que sus encabezados de columnas estén correctamente configurados.
 */
async function ensureSpreadsheetTabsAndHeaders(sheetId: string, token: string): Promise<void> {
  try {
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!metaRes.ok) return;

    const meta = await metaRes.json();
    const existingSheets: { sheetId: number; title: string }[] =
      meta.sheets?.map((s: any) => s.properties) || [];

    const hasLeads = existingSheets.some((s) => s.title === 'Leads');
    const hasAppointments = existingSheets.some((s) => s.title === 'Citas Agendadas');

    const requests: any[] = [];

    // Si no tiene "Leads", renombrar la primera hoja o crearla
    if (!hasLeads) {
      const firstSheet = existingSheets[0];
      if (firstSheet && firstSheet.title !== 'Citas Agendadas') {
        requests.push({
          updateSheetProperties: {
            properties: {
              sheetId: firstSheet.sheetId,
              title: 'Leads',
            },
            fields: 'title',
          },
        });
      } else {
        requests.push({
          addSheet: {
            properties: { title: 'Leads' },
          },
        });
      }
    }

    // Si no tiene "Citas Agendadas", crearla
    if (!hasAppointments) {
      requests.push({
        addSheet: {
          properties: { title: 'Citas Agendadas' },
        },
      });
    }

    if (requests.length > 0) {
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      });
    }

    // Verificar encabezados de "Leads" (Columna B es 'Nombre', C es 'Teléfono')
    const leadsRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Leads'!A1:G1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const leadsData = leadsRes.ok ? await leadsRes.json() : null;
    if (
      !leadsData?.values ||
      leadsData.values.length === 0 ||
      leadsData.values[0]?.[1] !== 'Nombre' ||
      leadsData.values[0]?.[2] !== 'Teléfono'
    ) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Leads'!A1:G1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [LEADS_HEADERS] }),
        }
      );
    }

    // Verificar encabezados de "Citas Agendadas"
    const apptRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Citas Agendadas'!A1:F1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const apptData = apptRes.ok ? await apptRes.json() : null;
    if (
      !apptData?.values ||
      apptData.values.length === 0 ||
      apptData.values[0]?.[0] !== 'Fecha de Agendamiento'
    ) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Citas Agendadas'!A1:F1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [APPOINTMENTS_HEADERS] }),
        }
      );
    }
  } catch (err: any) {
    console.warn('[Google Sheets] Error al verificar pestañas de hojas:', err?.message);
  }
}

/**
 * -----------------------------------------------------------------------------------------
 * HOJA 1: "Leads"
 * Columnas: Fecha | Nombre | Teléfono | Canal (WhatsApp/Web) | Servicio de Interés | Estado del Lead | Resumen de Conversación
 * -----------------------------------------------------------------------------------------
 */
export async function saveOrUpdateLeadInSheets(lead: LeadRecord): Promise<boolean> {
  try {
    const integration = await prisma.integration.findUnique({
      where: { provider: 'google_sheets' },
    });

    if (!integration || !integration.enabled || !integration.credentialsEnc) {
      return false;
    }

    const token = await getValidAccessToken('google_sheets');
    const sheetId = await getOrCreateSpreadsheet(token);
    if (!sheetId) return false;

    await ensureSpreadsheetTabsAndHeaders(sheetId, token);

    // Leer filas existentes en Hoja 1: "Leads"
    const rangeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Leads'!A:G`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const rangeData = rangeRes.ok ? await rangeRes.json() : null;
    const existingRows: string[][] = rangeData?.values || [];

    const dateStr = formatSVDate(new Date());
    const targetDigits = cleanDigits(lead.phone);
    let matchedRowIndex = -1;

    // Buscar si ya existe por número de teléfono (Columna C es index 2)
    if (targetDigits.length >= 8 && existingRows.length > 1) {
      for (let i = 1; i < existingRows.length; i++) {
        const rowPhoneDigits = cleanDigits(existingRows[i]?.[2]);
        if (rowPhoneDigits.length >= 8) {
          if (
            rowPhoneDigits === targetDigits ||
            rowPhoneDigits.endsWith(targetDigits.slice(-8)) ||
            targetDigits.endsWith(rowPhoneDigits.slice(-8))
          ) {
            matchedRowIndex = i + 1; // Fila en base 1
            break;
          }
        }
      }
    }

    const leadName = lead.name || 'Prospecto';
    const channelName = lead.channel || 'WhatsApp';
    const serviceInterest = lead.serviceInterest || 'No especificado';
    const newStatus = lead.leadStatus || 'Solo Información';
    const summary = lead.summary || 'Consulta inicial';

    if (matchedRowIndex !== -1) {
      // Actualizar fila existente en "Leads"
      const existingRow = existingRows[matchedRowIndex - 1] || [];
      const currentStatus = existingRow[5];

      // No degradar un lead "Agendado" a "Solo Información"
      const finalStatus =
        newStatus === 'Agendado'
          ? 'Agendado'
          : currentStatus === 'Agendado'
          ? 'Agendado'
          : newStatus;

      const finalName =
        leadName !== 'Prospecto' && leadName !== 'Cliente WhatsApp'
          ? leadName
          : existingRow[1] || leadName;

      const finalService =
        serviceInterest !== 'No especificado'
          ? serviceInterest
          : existingRow[4] || serviceInterest;

      const updatedRow = [
        existingRow[0] || dateStr,
        finalName,
        lead.phone || existingRow[2] || '—',
        channelName,
        finalService,
        finalStatus,
        summary || existingRow[6] || 'Atendido por asistente IA',
      ];

      const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Leads'!A${matchedRowIndex}:G${matchedRowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [updatedRow] }),
        }
      );

      if (updateRes.ok) {
        await prisma.activityLog.create({
          data: {
            action: 'sheets.lead_updated',
            status: LogStatus.SUCCESS,
            details: {
              phone: lead.phone,
              name: finalName,
              service: finalService,
              status: finalStatus,
              row: matchedRowIndex,
            },
          },
        }).catch(() => {});
        console.log(`[Google Sheets CRM] Lead actualizado en pestaña Leads (Fila ${matchedRowIndex}): ${finalName} (${lead.phone}) -> ${finalStatus}`);
        return true;
      }
    } else {
      // Insertar nuevo lead en "Leads"
      const newRow = [
        dateStr,
        leadName,
        lead.phone || '—',
        channelName,
        serviceInterest,
        newStatus,
        summary,
      ];

      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Leads'!A:G:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [newRow] }),
        }
      );

      if (appendRes.ok) {
        await prisma.activityLog.create({
          data: {
            action: 'sheets.lead_saved',
            status: LogStatus.SUCCESS,
            details: {
              name: leadName,
              phone: lead.phone,
              service: serviceInterest,
              status: newStatus,
              channel: channelName,
            },
          },
        }).catch(() => {});
        console.log(`[Google Sheets CRM] Nuevo lead registrado en pestaña Leads: ${leadName} (${lead.phone}) -> ${newStatus}`);
        return true;
      }
    }

    return false;
  } catch (err: any) {
    console.warn('[Google Sheets CRM] Error en saveOrUpdateLeadInSheets:', err?.message);
    return false;
  }
}

/**
 * -----------------------------------------------------------------------------------------
 * HOJA 2: "Citas Agendadas"
 * Columnas: Fecha de Agendamiento | Nombre | Teléfono | Servicio | Fecha y Hora de la Cita | Estado (Activa/Reprogramada/Cancelada)
 * -----------------------------------------------------------------------------------------
 */
export async function recordAppointmentInSheets(appt: AppointmentRecord): Promise<boolean> {
  try {
    const integration = await prisma.integration.findUnique({
      where: { provider: 'google_sheets' },
    });

    if (!integration || !integration.enabled || !integration.credentialsEnc) {
      return false;
    }

    const token = await getValidAccessToken('google_sheets');
    const sheetId = await getOrCreateSpreadsheet(token);
    if (!sheetId) return false;

    await ensureSpreadsheetTabsAndHeaders(sheetId, token);

    const bookingDateStr = formatSVDate(new Date());
    const appointmentDateStr = formatSVDate(appt.dateTime);

    const newAppointmentRow = [
      bookingDateStr,
      appt.name,
      appt.phone,
      appt.service,
      appointmentDateStr,
      appt.status || 'Activa',
    ];

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Citas Agendadas'!A:F:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: [newAppointmentRow] }),
      }
    );

    // Sincronizar simultáneamente en Hoja 1: "Leads" marcando estado "Agendado"
    saveOrUpdateLeadInSheets({
      name: appt.name,
      phone: appt.phone,
      channel: appt.channel || 'WhatsApp',
      serviceInterest: appt.service,
      leadStatus: 'Agendado',
      summary: `Cita formal reservada para el ${appointmentDateStr}`,
    }).catch(() => {});

    if (appendRes.ok) {
      await prisma.activityLog.create({
        data: {
          action: 'sheets.appointment_saved',
          status: LogStatus.SUCCESS,
          details: {
            name: appt.name,
            phone: appt.phone,
            service: appt.service,
            appointmentDate: appointmentDateStr,
            status: appt.status || 'Activa',
          },
        },
      }).catch(() => {});
      console.log(`[Google Sheets CRM] Cita registrada en pestaña Citas Agendadas: ${appt.name} (${appt.phone}) - ${appt.service}`);
      return true;
    }

    return false;
  } catch (err: any) {
    console.warn('[Google Sheets CRM] Error en recordAppointmentInSheets:', err?.message);
    return false;
  }
}

/**
 * Actualiza el estado de una cita en Hoja 2: "Citas Agendadas" (por ejemplo: Cancelada o Reprogramada).
 */
export async function updateAppointmentStatusInSheets(options: UpdateAppointmentOptions): Promise<boolean> {
  try {
    const integration = await prisma.integration.findUnique({
      where: { provider: 'google_sheets' },
    });

    if (!integration || !integration.enabled || !integration.credentialsEnc) {
      return false;
    }

    const token = await getValidAccessToken('google_sheets');
    const sheetId = await getOrCreateSpreadsheet(token);
    if (!sheetId) return false;

    await ensureSpreadsheetTabsAndHeaders(sheetId, token);

    const rangeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Citas Agendadas'!A:F`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const rangeData = rangeRes.ok ? await rangeRes.json() : null;
    const rows: string[][] = rangeData?.values || [];

    const targetDigits = cleanDigits(options.phone);
    let matchedRowIndex = -1;

    // Buscar la cita por teléfono (Columna C es index 2)
    if (targetDigits.length >= 8 && rows.length > 1) {
      // Recorrer desde la última fila hacia atrás para tomar la cita más reciente
      for (let i = rows.length - 1; i >= 1; i--) {
        const rowPhoneDigits = cleanDigits(rows[i]?.[2]);
        if (
          rowPhoneDigits === targetDigits ||
          rowPhoneDigits.endsWith(targetDigits.slice(-8)) ||
          targetDigits.endsWith(rowPhoneDigits.slice(-8))
        ) {
          matchedRowIndex = i + 1; // Base 1
          break;
        }
      }
    }

    // Búsqueda alternativa por nombre del cliente si no se encontró por teléfono
    if (matchedRowIndex === -1 && options.patientName && rows.length > 1) {
      const targetName = options.patientName.toLowerCase().trim();
      for (let i = rows.length - 1; i >= 1; i--) {
        const rowName = (rows[i]?.[1] || '').toLowerCase().trim();
        if (rowName && (rowName === targetName || rowName.includes(targetName) || targetName.includes(rowName))) {
          matchedRowIndex = i + 1;
          break;
        }
      }
    }

    if (matchedRowIndex !== -1) {
      const existingRow = rows[matchedRowIndex - 1] || [];
      const updatedRow = [...existingRow];

      // Actualizar fecha y hora si fue reprogramada
      if (options.newDateTime) {
        updatedRow[4] = formatSVDate(options.newDateTime);
      }
      if (options.serviceName) {
        updatedRow[3] = options.serviceName;
      }
      // Actualizar estado (Activa, Reprogramada, Cancelada) en columna F (index 5)
      updatedRow[5] = options.status;

      const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'Citas Agendadas'!A${matchedRowIndex}:F${matchedRowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [updatedRow] }),
        }
      );

      if (updateRes.ok) {
        console.log(`[Google Sheets CRM] Cita actualizada en Citas Agendadas (Fila ${matchedRowIndex}) -> Estado: ${options.status}`);
        return true;
      }
    }

    return false;
  } catch (err: any) {
    console.warn('[Google Sheets CRM] Error en updateAppointmentStatusInSheets:', err?.message);
    return false;
  }
}

/**
 * -----------------------------------------------------------------------------------------
 * Funciones de compatibilidad hacia atrás
 * -----------------------------------------------------------------------------------------
 */
export async function recordLeadInGoogleSheets(lead: {
  name?: string | null;
  phone?: string | null;
  service?: string | null;
  status?: string | null;
  channel?: string | null;
  email?: string | null;
  notes?: string | null;
}): Promise<boolean> {
  if (lead.status === 'Cita Agendada' && lead.name && lead.phone) {
    return recordAppointmentInSheets({
      name: lead.name,
      phone: lead.phone,
      service: lead.service || lead.notes || 'Llamada de Diagnóstico Estratégico',
      dateTime: new Date(),
      status: 'Activa',
      channel: lead.channel || 'WhatsApp',
    });
  }

  return saveOrUpdateLeadInSheets({
    name: lead.name,
    phone: lead.phone,
    channel: lead.channel,
    serviceInterest: lead.service || 'No especificado',
    leadStatus: lead.status === 'Cita Agendada' ? 'Agendado' : 'Solo Información',
    summary: lead.notes || 'Consulta registrada',
  });
}

export async function appendContactToGoogleSheet(contact: {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}) {
  return saveOrUpdateLeadInSheets({
    name: contact.name,
    phone: contact.phone,
    serviceInterest: 'No especificado',
    leadStatus: 'Potencial',
    summary: contact.notes || 'Contacto manual',
  });
}
