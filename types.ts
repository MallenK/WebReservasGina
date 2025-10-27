export type View = 'book' | 'manage' | 'admin';

export interface BookingDetails {
  id?: string;
  name: string;
  email: string;
  phone: string;
  reason: string;
  dateTime: Date | null;
  duration: number;
}

// Simplified types for Google Calendar API responses
export interface GCalEvent {
  id?: string;
  summary?: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  // FIX: Added missing properties 'attendees' and 'reminders' to the GCalEvent interface
  // to align with the Google Calendar API and fix a type error in services/google.ts.
  attendees?: { email: string }[];
  reminders?: {
    useDefault: boolean;
    overrides: {
      method: 'email' | 'popup';
      minutes: number;
    }[];
  };
}

export interface GCalFreeBusy {
  kind: string;
  timeMin: string;
  timeMax: string;
  calendars: {
    primary: {
      busy: { start: string; end: string }[];
    };
  };
}
