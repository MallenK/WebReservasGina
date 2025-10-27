
import { GOOGLE_CLIENT_ID, DEMO_MODE, WORKING_HOURS, TIMEZONE } from '../constants';
import type { BookingDetails, GCalEvent, GCalFreeBusy } from '../types';
import { generateTimeSlots, generateICS, createMailtoLink } from '../utils/helpers';

// --- DEMO MODE ---
const demoEvents: GCalEvent[] = [];
if (DEMO_MODE) {
  const today = new Date();
  today.setHours(10, 0, 0, 0);
  demoEvents.push({
    id: 'demoevent1',
    summary: 'Fisioterapia - John Doe',
    start: { dateTime: today.toISOString() },
    end: { dateTime: new Date(today.getTime() + 30 * 60000).toISOString() },
    description: "Name: John Doe\nEmail: john@example.com\nPhone: \nReason: Back pain"
  });
}

// --- API HELPERS ---
const callGoogleApi = async <T,>(url: string, token: string | undefined, options: RequestInit = {}): Promise<T> => {
  if (DEMO_MODE) {
    throw new Error("API calls are disabled in DEMO_MODE");
  }
  if (!token) {
    throw new Error('Google API token is not available.');
  }
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const error = await response.json();
    console.error('Google API Error:', error);
    throw new Error(`Google API request failed: ${error.error.message}`);
  }
  return response.json();
};

// --- CALENDAR API ---

export const getAvailableSlots = async (date: Date, duration: number, token: string | undefined): Promise<string[]> => {
  const allPossibleSlots = generateTimeSlots(duration);

  if (DEMO_MODE) {
    const busySlots = demoEvents
      .filter(event => new Date(event.start.dateTime).toDateString() === date.toDateString())
      .map(event => new Date(event.start.dateTime));
    return allPossibleSlots.filter(slot => {
      const [h, m] = slot.split(':').map(Number);
      const slotDate = new Date(date);
      slotDate.setHours(h, m);
      return !busySlots.some(busy => busy.getTime() === slotDate.getTime());
    });
  }
  
  const timeMin = new Date(date);
  timeMin.setHours(0, 0, 0, 0);
  const timeMax = new Date(date);
  timeMax.setHours(23, 59, 59, 999);

  const body = {
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    timeZone: TIMEZONE,
    items: [{ id: 'primary' }],
  };

  const freeBusyData = await callGoogleApi<GCalFreeBusy>('https://www.googleapis.com/calendar/v3/freeBusy', token, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const busyTimes = freeBusyData.calendars.primary.busy;
  
  return allPossibleSlots.filter(slot => {
    const [hours, minutes] = slot.split(':').map(Number);
    const slotStart = new Date(date);
    slotStart.setHours(hours, minutes, 0, 0);
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);
    
    // Check if slot is in the future
    if (slotStart < new Date()) {
      return false;
    }

    // Check if slot overlaps with busy times
    return !busyTimes.some(busy => {
      const busyStart = new Date(busy.start);
      const busyEnd = new Date(busy.end);
      return slotStart < busyEnd && slotEnd > busyStart;
    });
  });
};

export const bookAppointment = async (details: BookingDetails, token: string | undefined): Promise<{ eventId: string, summary: string }> => {
  const eventTitle = `Fisioterapia - ${details.name}`;
  const eventDescription = `Name: ${details.name}\nEmail: ${details.email}\nPhone: ${details.phone}\nReason: ${details.reason}`;

  if (DEMO_MODE) {
    const eventId = `demo${Date.now()}`;
    const endDateTime = new Date(details.dateTime!.getTime() + details.duration * 60000);
    demoEvents.push({
      id: eventId,
      summary: eventTitle,
      description: eventDescription,
      start: { dateTime: details.dateTime!.toISOString() },
      end: { dateTime: endDateTime.toISOString() }
    });
    return { eventId, summary: eventTitle };
  }
  
  const event: Partial<GCalEvent> = {
    summary: eventTitle,
    description: eventDescription,
    start: {
      dateTime: details.dateTime!.toISOString(),
      timeZone: TIMEZONE,
    },
    end: {
      dateTime: new Date(details.dateTime!.getTime() + details.duration * 60000).toISOString(),
      timeZone: TIMEZONE,
    },
    attendees: [{ email: details.email }],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 60 },
      ],
    },
  };

  const createdEvent = await callGoogleApi<GCalEvent>('https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all', token, {
    method: 'POST',
    body: JSON.stringify(event),
  });
  
  // Try to send email, fallback to ICS/mailto
  try {
    await sendConfirmationEmail(details, createdEvent.id!);
  } catch (emailError) {
    console.warn("Gmail API not available or failed, using fallback.", emailError);
    generateICS(details);
    window.location.href = createMailtoLink(details);
  }

  return { eventId: createdEvent.id!, summary: createdEvent.summary! };
};

const parseDescription = (desc?: string): Omit<BookingDetails, 'id' | 'dateTime' | 'duration'> => {
  const details: Omit<BookingDetails, 'id' | 'dateTime' | 'duration'> = { name: '', email: '', phone: '', reason: '' };
  if (!desc) return details;
  const lines = desc.split('\n');
  lines.forEach(line => {
    const [key, ...valueParts] = line.split(': ');
    const value = valueParts.join(': ');
    if (key.toLowerCase() === 'name') details.name = value;
    if (key.toLowerCase() === 'email') details.email = value;
    if (key.toLowerCase() === 'phone') details.phone = value;
    if (key.toLowerCase() === 'reason') details.reason = value;
  });
  return details;
};

export const listEvents = async (start: Date, end: Date, token: string | undefined): Promise<BookingDetails[]> => {
    if (DEMO_MODE) {
        return demoEvents.map(e => ({
            id: e.id!,
            ...parseDescription(e.description),
            dateTime: new Date(e.start.dateTime),
            duration: (new Date(e.end.dateTime).getTime() - new Date(e.start.dateTime).getTime()) / 60000,
        }));
    }

    const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
    url.searchParams.append('timeMin', start.toISOString());
    url.searchParams.append('timeMax', end.toISOString());
    url.searchParams.append('singleEvents', 'true');
    url.searchParams.append('orderBy', 'startTime');

    const data = await callGoogleApi<{ items: GCalEvent[] }>(url.toString(), token);
    return data.items.map(item => ({
        id: item.id!,
        ...parseDescription(item.description),
        dateTime: new Date(item.start.dateTime),
        duration: (new Date(item.end.dateTime).getTime() - new Date(item.start.dateTime).getTime()) / 60000,
        name: item.summary?.replace('Fisioterapia - ', '') || 'Blocked Time'
    }));
};

export const getEvent = async (eventId: string, token: string | undefined): Promise<BookingDetails | null> => {
    if (DEMO_MODE) {
        const event = demoEvents.find(e => e.id === eventId);
        return event ? {
            id: event.id!,
             ...parseDescription(event.description),
            dateTime: new Date(event.start.dateTime),
            duration: (new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / 60000,
        } : null;
    }
    try {
        const event = await callGoogleApi<GCalEvent>(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`, token);
        if (!event) return null;
        return {
            id: event.id!,
            ...parseDescription(event.description),
            dateTime: new Date(event.start.dateTime),
            duration: (new Date(event.end.dateTime).getTime() - new Date(event.start.dateTime).getTime()) / 60000,
        };
    } catch (e) {
        console.error("Event not found or error fetching", e);
        return null;
    }
};

export const cancelAppointment = async (details: BookingDetails, token: string | undefined) => {
    if (DEMO_MODE) {
        const index = demoEvents.findIndex(e => e.id === details.id);
        if (index > -1) {
            demoEvents.splice(index, 1);
        }
        return;
    }
    await callGoogleApi(`https://www.googleapis.com/calendar/v3/calendars/primary/events/${details.id}?sendUpdates=all`, token, {
        method: 'DELETE'
    });
    // Try sending cancellation email
    try {
      await sendCancellationEmail(details);
    } catch(e){
        console.warn("Could not send cancellation email", e)
    }
};

export const blockTime = async (date: string, startTime: string, endTime: string, token: string | undefined) => {
    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    if (DEMO_MODE) {
        demoEvents.push({
            id: `demo-block-${Date.now()}`,
            summary: 'Blocked Time',
            start: { dateTime: startDateTime.toISOString() },
            end: { dateTime: endDateTime.toISOString() }
        });
        return;
    }

    const event = {
        summary: 'Blocked Time',
        start: { dateTime: startDateTime.toISOString(), timeZone: TIMEZONE },
        end: { dateTime: endDateTime.toISOString(), timeZone: TIMEZONE },
    };

    await callGoogleApi('https://www.googleapis.com/calendar/v3/calendars/primary/events', token, {
        method: 'POST',
        body: JSON.stringify(event),
    });
};

// --- GMAIL API ---

const sendEmail = async (to: string, subject: string, body: string, token?: string) => {
  const rawMessage = [
    `From: me`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/html; charset=utf-8`,
    '',
    body,
  ].join('\n');

  const base64EncodedEmail = btoa(unescape(encodeURIComponent(rawMessage))).replace(/\+/g, '-').replace(/\//g, '_');
  
  await callGoogleApi('https://www.googleapis.com/gmail/v1/users/me/messages/send', token, {
    method: 'POST',
    body: JSON.stringify({ raw: base64EncodedEmail }),
  });
};

const sendConfirmationEmail = async (details: BookingDetails, eventId: string, token?: string) => {
  const subject = "Confirmación de tu cita de fisioterapia";
  const body = `
    <h1>Hola ${details.name},</h1>
    <p>Tu cita ha sido confirmada con éxito.</p>
    <p><strong>Fecha y Hora:</strong> ${details.dateTime?.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}</p>
    <p><strong>Duración:</strong> ${details.duration} minutos</p>
    <p><strong>Ubicación:</strong> Calle Fisioterapia 123, Madrid</p>
    <p>Para gestionar tu cita (cancelar o reprogramar), utiliza el siguiente código en nuestra web:</p>
    <p style="font-family: monospace; background-color: #f0f0f0; padding: 10px; border-radius: 5px;">${eventId}</p>
    <p>¡Gracias!</p>
    <p>Gina Fisio</p>
  `;
  await sendEmail(details.email, subject, body, token);
};

const sendCancellationEmail = async (details: BookingDetails, token?: string) => {
  const subject = "Cancelación de tu cita de fisioterapia";
  const body = `
    <h1>Hola ${details.name},</h1>
    <p>Tu cita programada para el <strong>${details.dateTime?.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}</strong> ha sido cancelada.</p>
    <p>Si esto ha sido un error, por favor, vuelve a reservar en nuestra página web.</p>
    <p>Saludos,</p>
    <p>Gina Fisio</p>
  `;
  await sendEmail(details.email, subject, body, token);
};
