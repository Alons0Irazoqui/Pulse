
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';

const StudentSchedule: React.FC = () => {
  const { classes, currentUser } = useStore();
  const [selectedDay, setSelectedDay] = useState('Monday');
  
  const days = [
      { key: 'Monday', label: 'Monday' },
      { key: 'Tuesday', label: 'Tuesday' },
      { key: 'Wednesday', label: 'Wednesday' },
      { key: 'Thursday', label: 'Thursday' },
      { key: 'Friday', label: 'Friday' },
      { key: 'Saturday', label: 'Saturday' }
  ];

  // Helper to get the next date occurrence for a day name
  const getNextDateForDay = (dayName: string) => {
      const dayIndex = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].indexOf(dayName);
      const today = new Date();
      const resultDate = new Date();
      
      // Calculate diff to next occurrence
      let diff = dayIndex - today.getDay();
      if (diff < 0) diff += 7; // If today is Wednesday (3) and we want Monday (1), diff is -2 -> 5 (next monday)
      if (diff === 0) diff = 0; // Today

      resultDate.setDate(today.getDate() + diff);
      return resultDate.toISOString().split('T')[0];
  };

  const selectedDateStr = getNextDateForDay(selectedDay);

  // Filter Classes with Exception Logic
  const filteredClasses = classes.filter(c => {
      const isEnrolled = currentUser?.studentId && c.studentIds.includes(currentUser.studentId);
      if (!isEnrolled) return false;

      // 1. Check Modifications for this specific date
      const modification = c.modifications.find(m => m.date === selectedDateStr);
      
      // If cancelled, hide it
      if (modification?.type === 'cancel') return false;

      // If moved *away* from today, hide it
      if (modification?.type === 'move') return false;

      // 2. Check if this is a regular class day
      const isRegularDay = c.days.includes(selectedDay);

      // 3. Check if a class was moved *TO* today
      const isMovedHere = c.modifications.find(m => m.newDate === selectedDateStr && m.type === 'move');

      // Show if it's a regular day (not moved away/cancelled) OR if it was moved here
      return isRegularDay || isMovedHere;
  }).map(c => {
      // Apply Overrides (Instructor, Time)
      const modification = c.modifications.find(m => m.date === selectedDateStr);
      const isMovedHere = c.modifications.find(m => m.newDate === selectedDateStr && m.type === 'move');
      
      // If it was moved here, the modification data comes from the `isMovedHere` object
      const activeMod = isMovedHere || modification;

      let displayInstructor = activeMod?.newInstructor || c.instructor;
      let displayStartTime = activeMod?.newStartTime || c.startTime;
      let displayEndTime = activeMod?.newEndTime || c.endTime;
      let status = 'active';

      if (activeMod?.type === 'instructor') status = 'instructor_changed';
      if (activeMod?.type === 'time') status = 'time_changed';
      if (isMovedHere) status = 'rescheduled';

      return { 
          ...c, 
          displayInstructor, 
          startTime: displayStartTime, 
          endTime: displayEndTime,
          status 
      };
  });

  return (
    <div className="max-w-[1200px] mx-auto p-6 md:p-10 flex flex-col gap-8">
       <header>
          <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-text-main">Horario Semanal</h2>
                <p className="text-text-secondary mt-1">Tus clases programadas para esta semana.</p>
              </div>
              <div className="text-right hidden sm:block">
                  <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                      {selectedDateStr}
                  </span>
              </div>
          </div>
       </header>

       {/* Day Selector */}
       <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {days.map(day => (
              <button
                key={day.key}
                onClick={() => setSelectedDay(day.key)}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all whitespace-nowrap ${
                    selectedDay === day.key
                    ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                    : 'bg-white text-text-secondary hover:bg-gray-50 border border-gray-100'
                }`}
              >
                  {day.label}
              </button>
          ))}
       </div>

       {/* Class List */}
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => {
              return (
                <div key={cls.id} className="bg-surface-white rounded-3xl p-6 border border-gray-100 shadow-card hover:shadow-lg transition-all group relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${
                        cls.status === 'rescheduled' ? 'bg-purple-500' : 
                        cls.status === 'instructor_changed' ? 'bg-orange-500' : 
                        cls.status === 'time_changed' ? 'bg-blue-400' : 'bg-primary'
                    }`}></div>
                    
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-blue-50 text-blue-600">
                                {cls.name.includes('Gi') ? 'BJJ' : 'Clase'}
                            </span>
                            {cls.status === 'rescheduled' && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-purple-50 text-purple-600">Reprogramada</span>}
                            {cls.status === 'instructor_changed' && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-orange-50 text-orange-600">Instructor Suplente</span>}
                            {cls.status === 'time_changed' && <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-blue-50 text-blue-600">Horario Modificado</span>}
                        </div>
                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold"><span className="material-symbols-outlined text-[16px]">check_circle</span> Inscrito</span>
                    </div>

                    <h3 className="text-xl font-bold text-text-main mb-1">{cls.name}</h3>
                    <div className="flex items-center gap-2 text-text-secondary text-sm mb-6">
                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                        <span className="font-mono font-medium">{cls.startTime} - {cls.endTime}</span>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="size-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold border-2 border-white shadow-sm">
                            {cls.displayInstructor.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-text-secondary font-medium">Instructor</span>
                            <span className="text-sm font-semibold text-text-main">{cls.displayInstructor}</span>
                        </div>
                    </div>

                    <button 
                        disabled
                        className="w-full py-3 rounded-xl font-semibold text-sm transition-all bg-gray-50 text-gray-400 cursor-default"
                    >
                        Ya estás en la lista
                    </button>
                </div>
              );
          })}
          
          {filteredClasses.length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center text-text-secondary">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-30">event_busy</span>
                  <p>No tienes clases activas para este día.</p>
              </div>
          )}
       </div>
    </div>
  );
};

export default StudentSchedule;
