import React from 'react';
import type { BookingDetails } from '../types';
import { useLocalization } from '../hooks/useLocalization';

interface CalendarViewProps {
  appointments: BookingDetails[];
  currentDate: Date;
  onDateChange: (newDate: Date) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ appointments, currentDate, onDateChange }) => {
  const { language } = useLocalization();

  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const startDay = (startOfMonth.getDay() + 6) % 7; // Monday as 0
  const daysInMonth = endOfMonth.getDate();

  const totalSlots = Math.ceil((startDay + daysInMonth) / 7) * 7;
  const days = Array.from({ length: totalSlots }, (_, i) => {
    if (i < startDay || i >= startDay + daysInMonth) {
      return null;
    }
    const day = i - startDay + 1;
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
  });

  const appointmentsByDay: { [key: number]: BookingDetails[] } = {};
  appointments.forEach(app => {
    if(!app.dateTime) return;
    const day = app.dateTime.getDate();
    if (!appointmentsByDay[day]) {
      appointmentsByDay[day] = [];
    }
    appointmentsByDay[day].push(app);
  });

  const handlePrevMonth = () => {
    onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    onDateChange(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const weekDays = language === 'es' 
    ? ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
    : ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Previous month">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h2 className="text-xl font-semibold capitalize">
          {currentDate.toLocaleString(language, { month: 'long', year: 'numeric' })}
        </h2>
        <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-200 transition-colors" aria-label="Next month">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-px text-center font-semibold text-gray-600 bg-gray-200">
        {weekDays.map(day => <div key={day} className="py-2 bg-white">{day.substring(0,3)}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-px bg-gray-200">
        {days.map((date, index) => (
          <div key={index} className="h-36 p-1 overflow-y-auto bg-white">
            {date && (
              <>
                <span className={`flex items-center justify-center h-7 w-7 text-sm ${date.toDateString() === new Date().toDateString() ? 'bg-teal-600 text-white rounded-full' : ''}`}>
                  {date.getDate()}
                </span>
                <div className="mt-1 space-y-1">
                  {(appointmentsByDay[date.getDate()] || []).sort((a,b) => a.dateTime!.getTime() - b.dateTime!.getTime()).map(app => (
                    <div key={app.id} className="bg-teal-100 text-teal-800 p-1 rounded-md text-xs cursor-pointer hover:bg-teal-200 transition-colors" title={`${app.dateTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${app.name}`}>
                      <p className="font-semibold truncate">{app.dateTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      <p className="truncate">{app.name}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalendarView;
