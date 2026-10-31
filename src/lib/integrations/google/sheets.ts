import { getValidAccessToken } from './oauth';
import { prisma } from '@/lib/prisma';
import { LogStatus } from '@prisma/client';

export interface LeadData {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  channel?: string | null;
  notes?: string | null;
}

/**
 * Función centralizada para registrar leads/contactos en Google Sheets.
 * Verifica primero si la integración está habilitada para evitar errores si no está configurada.
 */
export async function recordLeadInGoogleSheets(lead: LeadData): Promise<boolean> {
  try {
    const integration = await prisma.integration.findUnique({
      where: { provider: 'google_sheets' },
    });

    if (!integration || !integration.enabled || !integration.credentialsEnc) {
      return false; // Integración no activa
    }

    const token = await getValidAccessToken('google_sheets');

    // 1. Buscar o crear la hoja "Contactos Atendia"
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='Contactos Atendia'&spaces=drive`,
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
      // Crear hoja nueva con cabeceras de CRM de leads
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
                      values: [
                        { userEnteredValue: { stringValue: 'Fecha y Hora (El Salvador)' } },
                        { userEnteredValue: { stringValue: 'Nombre' } },
                        { userEnteredValue: { stringValue: 'Teléfono (+503)' } },
                        { userEnteredValue: { stringValue: 'Email' } },
                        { userEnteredValue: { stringValue: 'Canal de Entrada' } },
                        { userEnteredValue: { stringValue: 'Tratamiento / Notas' } },
                      ],
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

    // 2. Añadir fila formateada con hora salvadoreña
    const dateStr = new Date().toLocaleString('es-SV', {
      timeZone: 'America/El_Salvador',
      dateStyle: 'short',
      timeStyle: 'short',
    });

    const rowValues = [
      [
        dateStr,
        lead.name || 'Prospecto sin nombre',
        lead.phone || 'Sin teléfono',
        lead.email || '—',
        lead.channel || 'WHATSAPP',
        lead.notes || 'Nuevo contacto ingresado',
      ],
    ];

    const appendRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Contactos!A:F:append?valueInputOption=USER_ENTERED`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: rowValues }),
      }
    );

    if (appendRes.ok) {
      await prisma.activityLog.create({
        data: {
          action: 'sheets.lead_saved',
          status: LogStatus.SUCCESS,
          details: {
            leadName: lead.name,
            phone: lead.phone,
            channel: lead.channel,
          },
        },
      }).catch(() => {});
      console.log(`[Google Sheets] Lead guardado en hoja de cálculo: ${lead.name} (${lead.phone})`);
      return true;
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
  });
}
