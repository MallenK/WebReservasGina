
import React, { useState, useEffect, useCallback } from 'react';
import { useLocalization } from '../hooks/useLocalization';
import { getAvailableSlots } from '../services/google';
import type { BookingDetails } from '../types';
import { getNextAvailableDate, generateTimeSlots } from '../utils/helpers';
import { bookAppointment } from '../services/google';

interface BookingViewProps {
  token: string | undefined;
  requestToken: () => void;
  isAuthenticated: boolean;
}

const BookingView: React.FC<BookingViewProps> = ({ token, requestToken, isAuthenticated }) => {
  const { t } = useLocalization();
  const [duration, setDuration] = useState(30);
  const [selectedDate, setSelectedDate] = useState<Date>(() => getNextAvailableDate(new Date()));
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<BookingDetails, 'id'>>({
      name: '',
      email: '',
      phone: '',
      reason: '',
      dateTime: null,
      duration: 30,
  });
  const [bookingState, setBookingState] = useState<'idle' | 'booking' | 'success' | 'error'>('idle');
  const [bookingResult, setBookingResult] = useState<{ id: string, summary: string } | null>(null);

  const fetchSlots = useCallback(async (date: Date, dur: number) => {
    setLoadingSlots(true);
    setError(null);
    setAvailableSlots([]);
    try {
      const slots = await getAvailableSlots(date, dur, token);
      setAvailableSlots(slots);
    } catch (err) {
      setError(t('errorFetchingSlots'));
      console.error(err);
    } finally {
      setLoadingSlots(false);
    }
  }, [token, t]);

  useEffect(() => {
    fetchSlots(selectedDate, duration);
  }, [selectedDate, duration, fetchSlots]);

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setForm(prev => ({ ...prev, dateTime: null }));
  };

  const handleDurationChange = (newDuration: number) => {
    setDuration(newDuration);
    setForm(prev => ({ ...prev, duration: newDuration, dateTime: null }));
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({...prev, [e.target.name]: e.target.value }));
  };
  
  const handleTimeSelect = (time: string) => {
    const [hours, minutes] = time.split(':');
    const newDateTime = new Date(selectedDate);
    newDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
    setForm(prev => ({...prev, dateTime: newDateTime }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
        requestToken();
        return;
    }
    if (!form.dateTime) {
        alert(t('selectTimeSlot'));
        return;
    }
    setBookingState('booking');
    try {
      const result = await bookAppointment(form as BookingDetails, token);
      setBookingState('success');
      setBookingResult({ id: result.eventId, summary: result.summary });
    } catch (err) {
      setBookingState('error');
      console.error(err);
    }
  };

  const renderCalendar = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dates = Array.from({ length: 14 }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      return date;
    });

    return (
      <div className="grid grid-cols-7 gap-2">
        {dates.map(date => {
          const day = date.getDay();
          const isWeekend = day === 0; // Sunday
          const isSelected = date.toDateString() === selectedDate.toDateString();
          return (
            <button
              key={date.toISOString()}
              disabled={isWeekend}
              onClick={() => handleDateChange(date)}
              className={`p-2 rounded-md text-center ${
                isSelected ? 'bg-teal-600 text-white' : 'bg-gray-100 hover:bg-teal-100'
              } ${isWeekend ? 'text-gray-400 cursor-not-allowed' : ''}`}
            >
              <div className="text-xs">{date.toLocaleDateString(undefined, { weekday: 'short' })}</div>
              <div>{date.getDate()}</div>
            </button>
          );
        })}
      </div>
    );
  };
  
  if (bookingState === 'success' && bookingResult) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-teal-700 mb-4">{t('bookingSuccessTitle')}</h2>
        <p className="mb-4">{t('bookingSuccessMessage')}</p>
        <div className="bg-gray-100 p-4 rounded-lg text-left mb-6">
          <p><strong>{t('summary')}:</strong> {bookingResult.summary}</p>
          <p className="mt-2"><strong>{t('managementCode')}:</strong></p>
          <p className="font-mono bg-gray-200 p-2 rounded mt-1 break-all">{bookingResult.id}</p>
        </div>
        <button onClick={() => { setBookingState('idle'); setForm({name: '', email: '', phone: '', reason: '', dateTime: null, duration: 30})}} className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700">{t('bookAnother')}</button>
      </div>
    )
  }
  
  if (bookingState === 'error') {
     return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-700 mb-4">{t('bookingErrorTitle')}</h2>
        <p className="mb-4">{t('bookingErrorMessage')}</p>
        <button onClick={() => setBookingState('idle')} className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700">{t('tryAgain')}</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-4">{t('selectDuration')}</h3>
          <div className="flex space-x-4 mb-6">
            <button type="button" onClick={() => handleDurationChange(30)} className={`px-4 py-2 rounded-md w-full ${duration === 30 ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>{t('minutes', { count: 30 })}</button>
            <button type="button" onClick={() => handleDurationChange(60)} className={`px-4 py-2 rounded-md w-full ${duration === 60 ? 'bg-teal-600 text-white' : 'bg-gray-200'}`}>{t('minutes', { count: 60 })}</button>
          </div>

          <h3 className="text-lg font-semibold mb-4">{t('selectDate')}</h3>
          {renderCalendar()}
          
          <h3 className="text-lg font-semibold my-4">{t('selectTime')}</h3>
          {loadingSlots && <div className="text-center">{t('loadingSlots')}</div>}
          {error && <div className="text-center text-red-500">{error}</div>}
          {!loadingSlots && availableSlots.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {availableSlots.map(time => (
                <button
                  type="button"
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  className={`p-2 rounded-md text-sm ${
                    form.dateTime?.getHours() === parseInt(time.split(':')[0], 10) && form.dateTime?.getMinutes() === parseInt(time.split(':')[1], 10) ? 'bg-teal-600 text-white' : 'bg-gray-100 hover:bg-teal-100'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          )}
           {!loadingSlots && availableSlots.length === 0 && !error && (
             <div className="text-center text-gray-500">{t('noSlotsAvailable')}</div>
           )}
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-4">{t('yourDetails')}</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t('fullName')}</label>
              <input type="text" id="name" name="name" value={form.name} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">{t('email')}</label>
              <input type="email" id="email" name="email" value={form.email} onChange={handleFormChange} required className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">{t('phoneOptional')}</label>
              <input type="tel" id="phone" name="phone" value={form.phone} onChange={handleFormChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500" />
            </div>
            <div>
              <label htmlFor="reason" className="block text-sm font-medium text-gray-700">{t('reasonForVisit')}</label>
              <textarea id="reason" name="reason" value={form.reason} onChange={handleFormChange} required rows={3} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-teal-500 focus:border-teal-500"></textarea>
            </div>
          </div>
           <button 
             type="submit" 
             disabled={!form.dateTime || bookingState === 'booking'}
             className="mt-6 w-full bg-teal-600 text-white py-3 rounded-md font-semibold hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
           >
             {bookingState === 'booking' ? t('bookingInProgress') : t('confirmBooking')}
           </button>
        </div>
      </div>
    </form>
  );
};

export default BookingView;
