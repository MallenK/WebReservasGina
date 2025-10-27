
import { WORKING_HOURS } from '../constants';
import type { BookingDetails } from '../types';

export const getNextAvailableDate = (startDate: Date): Date => {
  let date = new Date(startDate);
  while (true) {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, ...
    if (dayOfWeek !== 0) { // Not Sunday
      const hours = WORKING_HOURS[dayOfWeek];
      if (hours) {
        return date;
      }
    }
    date.setDate(date.getDate() + 1);
  }
};

export const generateTimeSlots = (duration: number): string[] => {
  const slots: string[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const workingHours = WORKING_HOURS[dayOfWeek];

  if (!workingHours) return [];

  workingHours.forEach(([start, end]) => {
    let currentTime = new Date();
    currentTime.setHours(start, 0, 0, 0);

    const endTime = new Date();
    endTime.setHours(end, 0, 0, 0);

    while (currentTime.getTime() + duration * 60000 <= endTime.getTime()) {
      slots.push(currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
      currentTime.setMinutes(currentTime.getMinutes() + 30); // Slots are every 30 mins
    }
  });

  return slots;
};

const formatIcsDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

export const generateICS = (details: BookingDetails) => {
    const start = details.dateTime!;
    const end = new Date(start.getTime() + details.duration * 60000);

    const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//GinaPhysio//Booking//EN',
        'BEGIN:VEVENT',
        `UID:${Date.now()}@ginaphysio.com`,
        `DTSTAMP:${formatIcsDate(new Date())}`,
        `DTSTART:${formatIcsDate(start)}`,
        `DTEND:${formatIcsDate(end)}`,
        `SUMMARY:Fisioterapia - ${details.name}`,
        `DESCRIPTION:Razón: ${details.reason}\\nNombre: ${details.name}\\nEmail: ${details.email}\\nTeléfono: ${details.phone}`,
        'LOCATION:Calle Fisioterapia 123, Madrid',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'cita-fisioterapia.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const createMailtoLink = (details: BookingDetails): string => {
    const subject = encodeURIComponent(`Confirmación de Cita: ${details.name} - ${details.dateTime?.toLocaleDateString()}`);
    const body = encodeURIComponent(
        `Hola Gina,\n\nPor favor, confirma mi cita:\n\n` +
        `Nombre: ${details.name}\n` +
        `Email: ${details.email}\n` +
        `Teléfono: ${details.phone}\n` +
        `Fecha: ${details.dateTime?.toLocaleString()}\n` +
        `Razón: ${details.reason}\n\n` +
        `Gracias`
    );
    return `mailto:gina.physio@example.com?subject=${subject}&body=${body}`;
};
