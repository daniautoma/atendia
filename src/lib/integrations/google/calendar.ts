import { getValidAccessToken } from './oauth';

export interface CalendarEventPayload {
  summary: string;
  description: string;
  startTime: string; // ISO String
  endTime: string;   // ISO String
  attendeeEmail?: string;
  timeZone?: string;
}

export async function createGoogleCalendarEvent(payload: CalendarEventPayload) {
  const token = await getValidAccessToken('google_calendar');
  const calendarId = 'primary';

  const body: any = {
    summary: payload.summary,
    description: payload.description,
    start: {
      dateTime: payload.startTime,
      timeZone: payload.timeZone || 'Europe/Madrid',
    },
    end: {
      dateTime: payload.endTime,
      timeZone: payload.timeZone || 'Europe/Madrid',
    },
  };

  if (payload.attendeeEmail) {
    body.attendees = [{ email: payload.attendeeEmail }];
  }

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Error al crear evento en Google Calendar: ${err}`);
  }

  return res.json();
}

export async function listGoogleCalendarEvents(timeMin: string, timeMax: string) {
  const token = await getValidAccessToken('google_calendar');
  const calendarId = 'primary';

  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    timeZone: 'Europe/Madrid',
  });

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params.toString()}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error('Error al listar eventos de Google Calendar');
  }

  const data = await res.json();
  return data.items || [];
}

export async function deleteGoogleCalendarEvent(eventId: string) {
  const token = await getValidAccessToken('google_calendar');
  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` },
  });

  return res.ok;
}

