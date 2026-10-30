import { getValidAccessToken } from './oauth';

export async function appendContactToGoogleSheet(contact: {
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
}) {
  const token = await getValidAccessToken('google_sheets');

  // 1. Buscar o crear la hoja "Contactos Atendia"
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=name='Contactos Atendia'&spaces=drive`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  let sheetId = '';
  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      sheetId = data.files[0].id;
    }
  }

  if (!sheetId) {
    // Crear hoja nueva con cabeceras
    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
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
                      { userEnteredValue: { stringValue: 'Fecha Registro' } },
                      { userEnteredValue: { stringValue: 'Nombre' } },
                      { userEnteredValue: { stringValue: 'Teléfono' } },
                      { userEnteredValue: { stringValue: 'Email' } },
                      { userEnteredValue: { stringValue: 'Notas / Tratamiento' } },
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

  if (!sheetId) throw new Error('No se pudo encontrar o crear la hoja de Google Sheets');

  // 2. Añadir fila
  const dateStr = new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' });
  const rowValues = [
    [
      dateStr,
      contact.name || 'Sin nombre',
      contact.phone || 'Sin teléfono',
      contact.email || '',
      contact.notes || '',
    ],
  ];

  const appendRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Contactos!A:E:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values: rowValues }),
    }
  );

  return appendRes.ok;
}

