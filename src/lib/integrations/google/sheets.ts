import { getValidAccessToken } from './oauth';
import { prisma } from '@/lib/prisma';
import { LogStatus } from '@prisma/client';

export interface LeadData {
  name?: string | null;
  phone?: string | null;
  service?: string | null;
  status?: 'Lead / Consultando' | 'Cita Agendada' | string | null;
  channel?: string | null;
  // Compatibilidad hacia atrás
  email?: string | null;
  notes?: string | null;
}

const SHEET_HEADERS = [
  'Fecha',
  'Teléfono',
  'Nombre',
  'Servicio de Interés',
  'Estado del Lead',
  'Canal',
];

/**
 * Función centralizada y automatizada para registrar o actualizar leads en Google Sheets.
 * Estructura de columnas exacta:
 * Fecha | Teléfono | Nombre | Servicio de Interés | Estado del Lead | Canal
 *
 * Flujo:
 * - Cuando el contacto escribe por primera vez: Se crea o busca la fila y se marca como "Lead / Consultando".
 * - Cuando se agenda una cita con éxito: Se busca la fila por su número de teléfono y se actualiza a "Cita Agendada",
 *   junto con el tratamiento de interés.
 */
export async function recordLeadInGoogleSheets(lead: LeadData): Promise<boolean> {
  try {
    const integration = await prisma.integration.findUnique({
      where: { provider: 'google_sheets' },
    });

    if (!integration || !integration.enabled || !integration.credentialsEnc) {
      return false; // Integración no configurada o inactiva
    }

    const token = await getValidAccessToken('google_sheets');

    // 1. Buscar o crear el archivo "Contactos Atendia" en Google Drive
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

    if (!sheetId) {
      // Crear hoja de cálculo con columnas de CRM de leads
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
              properties: { title: 'Contactos' },
              data: [
                {
                  startRow: 0,
                  startColumn: 0,
                  rowData: [
                    {
                      values: SHEET_HEADERS.map((h) => ({
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
        sheetId = created.spreadsheetId;
      }
    }

    if (!sheetId) return false;

    // 2. Obtener el nombre de la primera hoja y las filas existentes
    let sheetTitle = 'Contactos';
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (metaRes.ok) {
        const meta = await metaRes.json();
        if (meta.sheets && meta.sheets.length > 0) {
          sheetTitle = meta.sheets[0].properties.title || 'Contactos';
        }
      }
    } catch {}

    const encodedTitle = encodeURIComponent(sheetTitle);
    const rangeRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'${encodedTitle}'!A:F`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const rangeData = rangeRes.ok ? await rangeRes.json() : null;
    const existingRows: string[][] = rangeData?.values || [];

    // Si la hoja no tiene encabezados o tiene encabezados antiguos, escribir los encabezados correctos
    if (existingRows.length === 0 || existingRows[0]?.[1] !== 'Teléfono') {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'${encodedTitle}'!A1:F1?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [SHEET_HEADERS] }),
        }
      );
    }

    // Fecha en hora local de El Salvador
    const dateStr = new Date().toLocaleString('es-SV', {
      timeZone: 'America/El_Salvador',
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const targetPhoneDigits = (lead.phone || '').replace(/\D/g, '');
    let matchedRowIndex = -1; // 1-based index

    // Buscar si ya existe una fila con el mismo teléfono (comparando los últimos 8 dígitos)
    if (targetPhoneDigits.length >= 8 && existingRows.length > 1) {
      for (let i = 1; i < existingRows.length; i++) {
        const rowPhoneDigits = String(existingRows[i]?.[1] || '').replace(/\D/g, '');
        if (rowPhoneDigits.length >= 8) {
          if (
            rowPhoneDigits === targetPhoneDigits ||
            rowPhoneDigits.endsWith(targetPhoneDigits.slice(-8)) ||
            targetPhoneDigits.endsWith(rowPhoneDigits.slice(-8))
          ) {
            matchedRowIndex = i + 1; // Fila en Google Sheets (base 1)
            break;
          }
        }
      }
    }

    const leadStatus = lead.status || 'Lead / Consultando';
    const serviceName = lead.service || lead.notes || 'Consulta general';
    const channelName = lead.channel || 'WHATSAPP';
    const customerName = lead.name || 'Prospecto';

    // 3A. Si la fila ya existe: Actualizar estado y datos del lead
    if (matchedRowIndex !== -1) {
      const existingRow = existingRows[matchedRowIndex - 1] || [];
      const currentStatus = existingRow[4];

      // Si ya está como Cita Agendada y este evento es solo una consulta, no degradar
      const finalStatus =
        leadStatus === 'Cita Agendada'
          ? 'Cita Agendada'
          : currentStatus === 'Cita Agendada'
          ? 'Cita Agendada'
          : leadStatus;

      const finalName =
        customerName !== 'Cliente WhatsApp' && customerName !== 'Prospecto'
          ? customerName
          : existingRow[2] || customerName;

      const finalService =
        serviceName !== 'Consulta general' && serviceName !== 'Primer contacto Baileys'
          ? serviceName
          : existingRow[3] || serviceName;

      const updatedRow = [
        existingRow[0] || dateStr, // Mantener fecha inicial de captación
        lead.phone || existingRow[1] || '—',
        finalName,
        finalService,
        finalStatus,
        existingRow[5] || channelName,
      ];

      const updateRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'${encodedTitle}'!A${matchedRowIndex}:F${matchedRowIndex}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
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

        console.log(
          `[Google Sheets] Lead actualizado (Fila ${matchedRowIndex}): ${finalName} (${lead.phone}) -> Estado: ${finalStatus}`
        );
        return true;
      }
    } else {
      // 3B. Si no existe: Añadir nueva fila al final
      const newRow = [
        dateStr,
        lead.phone || '—',
        customerName,
        serviceName,
        leadStatus,
        channelName,
      ];

      const appendRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/'${encodedTitle}'!A:F:append?valueInputOption=USER_ENTERED`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: [newRow] }),
        }
      );

      if (appendRes.ok) {
        await prisma.activityLog.create({
          data: {
            action: 'sheets.lead_saved',
            status: LogStatus.SUCCESS,
            details: {
              name: customerName,
              phone: lead.phone,
              service: serviceName,
              status: leadStatus,
              channel: channelName,
            },
          },
        }).catch(() => {});

        console.log(
          `[Google Sheets] Nuevo lead guardado: ${customerName} (${lead.phone}) -> Estado: ${leadStatus}`
        );
        return true;
      }
    }

    return false;
  } catch (err: any) {
    console.warn('[Google Sheets] Omitiendo guardado en Sheets:', err?.message);
    return false;
  }
}

// Compatibilidad hacia atrás
export async function appendContactToGoogleSheet(contact: {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}) {
  return recordLeadInGoogleSheets({
    name: contact.name,
    phone: contact.phone,
    email: contact.email,
    notes: contact.notes,
    status: 'Lead / Consultando',
  });
}
