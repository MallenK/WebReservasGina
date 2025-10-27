
// TODO: Replace with your actual Google Cloud Client ID
export const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// If GOOGLE_CLIENT_ID is not replaced, demo mode will be enabled.
export const DEMO_MODE = GOOGLE_CLIENT_ID.startsWith('YOUR_');

export const SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.send'
].join(' ');

export const TIMEZONE = 'Europe/Madrid';

// 1: Mon, 2: Tue, ..., 6: Sat
export const WORKING_HOURS: { [key: number]: [number, number][] } = {
  1: [[9, 14], [16, 20]], // Monday
  2: [[9, 14], [16, 20]], // Tuesday
  3: [[9, 14], [16, 20]], // Wednesday
  4: [[9, 14], [16, 20]], // Thursday
  5: [[9, 14], [16, 20]], // Friday
  6: [[10, 14]],          // Saturday
};

// TODO: Replace with a more secure method if deploying seriously
export const ADMIN_PASSWORD = 'physio-password';
