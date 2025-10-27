
import React, { useState } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { getEvent, cancelAppointment } from '../services/google';
import type { BookingDetails } from '../types';

interface ManageViewProps {
  token: string | undefined;
  requestToken: () => void;
  isAuthenticated: boolean;
}

const ManageView: React.FC<ManageViewProps> = ({ token, requestToken, isAuthenticated }) => {
  const { t } = useLocalization();
  const [eventId, setEventId] = useState('');
  const [appointment, setAppointment] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cancellationState, setCancellationState] = useState<'idle'|'cancelling'|'success'>('idle');

  const handleFindAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
        requestToken();
        return;
    }
    setLoading(true);
    setError(null);
    setAppointment(null);
    setCancellationState('idle');
    try {
      const event = await getEvent(eventId, token);
      if(event){
          setAppointment(event);
      } else {
          setError(t('appointmentNotFound'));
      }
    } catch (err) {
      setError(t('errorFindingAppointment'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleCancel = async () => {
    if (!appointment || !appointment.id) return;
    setCancellationState('cancelling');
    try {
      await cancelAppointment(appointment, token);
      setCancellationState('success');
      setAppointment(null);
      setEventId('');
    } catch (err) {
      setError(t('errorCancelling'));
      console.error(err);
      setCancellationState('idle');
    }
  }

  if (cancellationState === 'success') {
    return (
        <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-teal-700 mb-4">{t('cancellationSuccessTitle')}</h2>
            <p>{t('cancellationSuccessMessage')}</p>
        </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">{t('manageYourAppointment')}</h2>
      <form onSubmit={handleFindAppointment} className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          type="text"
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          placeholder={t('enterManagementCode')}
          className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"
          required
        />
        <button type="submit" disabled={loading} className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700 disabled:bg-gray-400">
          {loading ? t('searching') : t('findAppointment')}
        </button>
      </form>
      
      {error && <div className="text-red-500 text-center p-4 bg-red-50 rounded-md">{error}</div>}

      {appointment && (
        <div className="bg-gray-50 p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">{t('appointmentDetails')}</h3>
          <div className="space-y-2">
            <p><strong>{t('name')}:</strong> {appointment.name}</p>
            <p><strong>{t('email')}:</strong> {appointment.email}</p>
            <p><strong>{t('date')}:</strong> {appointment.dateTime?.toLocaleDateString()}</p>
            <p><strong>{t('time')}:</strong> {appointment.dateTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>{t('duration')}:</strong> {t('minutes', { count: appointment.duration })}</p>
            <p><strong>{t('reason')}:</strong> {appointment.reason}</p>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => alert(t('rescheduleComingSoon'))} 
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 w-full"
              >
                {t('reschedule')}
              </button>
              <button 
                onClick={handleCancel}
                disabled={cancellationState === 'cancelling'}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 w-full disabled:bg-gray-400"
              >
                {cancellationState === 'cancelling' ? t('cancelling') : t('cancelAppointment')}
              </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManageView;
