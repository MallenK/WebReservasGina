import React, { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { ADMIN_PASSWORD, DEMO_MODE } from '../constants';
import { listEvents, blockTime } from '../services/google';
import type { BookingDetails } from '../types';
import CalendarView from './CalendarView';

interface AdminPanelProps {
  token: string | undefined;
  requestToken: () => void;
  isAuthenticated: boolean;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ token, requestToken, isAuthenticated }) => {
  const { t } = useLocalization();
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(DEMO_MODE);
  const [view, setView] = useState<'today' | 'week' | 'calendar'>('today');
  const [appointments, setAppointments] = useState<BookingDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [blockDate, setBlockDate] = useState(new Date().toISOString().split('T')[0]);
  const [blockStartTime, setBlockStartTime] = useState('09:00');
  const [blockEndTime, setBlockEndTime] = useState('10:00');
  const [isBlocking, setIsBlocking] = useState(false);
  const [calendarDate, setCalendarDate] = useState(new Date());


  const fetchAppointments = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      let start: Date;
      let end: Date;

      if (view === 'calendar') {
        start = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
        end = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
      } else {
        start = new Date();
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        if (view === 'today') {
          end.setHours(23, 59, 59, 999);
        } else { // week
          end.setDate(start.getDate() + 7);
        }
      }
      
      const events = await listEvents(start, end, token);
      setAppointments(events);
    } catch (e) {
      setError(t('errorFetchingAppointments'));
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, token, view, t, calendarDate]);

  useEffect(() => {
    if (loggedIn) {
      fetchAppointments();
    }
  }, [loggedIn, view, fetchAppointments, calendarDate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setLoggedIn(true);
      localStorage.setItem('gina-physio-admin', 'true');
    } else {
      alert(t('incorrectPassword'));
    }
  };
  
   useEffect(() => {
    if (localStorage.getItem('gina-physio-admin') === 'true') {
        setLoggedIn(true);
    }
  }, []);

  const handleBlockTime = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBlocking(true);
    try {
        await blockTime(blockDate, blockStartTime, blockEndTime, token);
        alert(t('timeBlockedSuccess'));
        fetchAppointments();
    } catch (err) {
        alert(t('errorBlockingTime'));
        console.error(err);
    } finally {
        setIsBlocking(false);
    }
  };

  if (!loggedIn) {
    return (
      <div className="max-w-sm mx-auto">
        <h2 className="text-xl font-bold mb-4 text-center">{t('adminLogin')}</h2>
        <form onSubmit={handleLogin}>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">{t('password')}</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
            required
          />
          <button type="submit" className="mt-4 w-full bg-teal-600 text-white py-2 rounded-md font-semibold hover:bg-teal-700">
            {t('login')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div>
        {!isAuthenticated && !DEMO_MODE && (
            <div className="p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 mb-6">
                <p className="font-bold">{t('authRequired')}</p>
                <p>{t('authRequiredAdmin')}</p>
                 <button onClick={requestToken} className="mt-2 px-3 py-1 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 transition-colors">{t('signInWithGoogle')}</button>
            </div>
        )}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2">
            <div className="flex space-x-2 border-b mb-4">
                <button onClick={() => setView('today')} className={`px-4 py-2 ${view === 'today' ? 'font-semibold border-b-2 border-teal-500 text-teal-600' : 'text-gray-500'}`}>{t('today')}</button>
                <button onClick={() => setView('week')} className={`px-4 py-2 ${view === 'week' ? 'font-semibold border-b-2 border-teal-500 text-teal-600' : 'text-gray-500'}`}>{t('week')}</button>
                <button onClick={() => setView('calendar')} className={`px-4 py-2 ${view === 'calendar' ? 'font-semibold border-b-2 border-teal-500 text-teal-600' : 'text-gray-500'}`}>{t('calendar')}</button>
            </div>
            {loading && <div>{t('loadingAppointments')}</div>}
            {error && <div className="text-red-500">{error}</div>}
            
            {view !== 'calendar' && (
              <>
                {!loading && appointments.length === 0 && <div>{t('noAppointments')}</div>}
                <ul className="space-y-4">
                    {appointments.sort((a,b) => a.dateTime!.getTime() - b.dateTime!.getTime()).map(app => (
                        <li key={app.id} className="p-4 bg-gray-50 rounded-lg border">
                            <p className="font-bold">{app.name} <span className="font-normal text-gray-600 text-sm">- {app.email}</span></p>
                            <p className="text-sm text-teal-700">{app.dateTime?.toLocaleString([], {weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} ({t('minutes', {count: app.duration})})</p>
                            <p className="text-sm mt-1">{app.reason}</p>
                        </li>
                    ))}
                </ul>
              </>
            )}

            {view === 'calendar' && !loading && !error && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <CalendarView appointments={appointments} currentDate={calendarDate} onDateChange={setCalendarDate} />
              </div>
            )}
        </div>
        <div>
            <h3 className="text-lg font-semibold mb-4 border-b pb-2">{t('blockTime')}</h3>
            <form onSubmit={handleBlockTime} className="space-y-4">
                 <div>
                    <label htmlFor="block-date" className="block text-sm font-medium text-gray-700">{t('date')}</label>
                    <input type="date" id="block-date" value={blockDate} onChange={e => setBlockDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"/>
                 </div>
                 <div className="flex gap-4">
                     <div>
                        <label htmlFor="block-start" className="block text-sm font-medium text-gray-700">{t('startTime')}</label>
                        <input type="time" id="block-start" value={blockStartTime} onChange={e => setBlockStartTime(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"/>
                     </div>
                     <div>
                        <label htmlFor="block-end" className="block text-sm font-medium text-gray-700">{t('endTime')}</label>
                        <input type="time" id="block-end" value={blockEndTime} onChange={e => setBlockEndTime(e.target.value)} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"/>
                     </div>
                 </div>
                 <button type="submit" disabled={isBlocking} className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400">
                    {isBlocking ? t('blocking') : t('block')}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;