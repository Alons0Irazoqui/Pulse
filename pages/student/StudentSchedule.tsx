import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';

const StudentSchedule: React.FC = () => {
  const { classes, currentUser, enrollStudent } = useStore();
  const [selectedDay, setSelectedDay] = useState('Monday');
  
  const days = [
      { key: 'Monday', label: 'Monday' },
      { key: 'Tuesday', label: 'Tuesday' },
      { key: 'Wednesday', label: 'Wednesday' },
      { key: 'Thursday', label: 'Thursday' },
      { key: 'Friday', label: 'Friday' },
      { key: 'Saturday', label: 'Saturday' }
  ];

  // Logic: 
  // 1. Check if the class 'days' array includes the selected day.
  // 2. Check if the student is enrolled in that class.
  const filteredClasses = classes.filter(c => {
      const isDayMatch = c.days && c.days.includes(selectedDay);
      const isEnrolled = currentUser?.studentId && c.studentIds.includes(currentUser.studentId);
      
      // We only show enrolled classes in the Student Schedule to avoid clutter, 
      // OR we can show all available classes for that day. 
      // Prompt implication: "automatically appear... class that is enrolled".
      // Let's show ENROLLED classes prominently, and maybe available ones below if needed.
      // For now, let's show ALL classes for that day, but mark status clearly.
      return isDayMatch;
  });

  const handleBook = (classId: string) => {
      if(currentUser?.studentId) {
          enrollStudent(currentUser.studentId, classId);
          alert("¡Clase reservada con éxito!");
      }
  };

  const isEnrolled = (cls: any) => {
      return currentUser?.studentId && cls.studentIds.includes(currentUser.studentId);
  };

  return (
    <div className="max-w-[1200px] mx-auto p-6 md:p-10 flex flex-col gap-8">
       <header>
          <h2 className="text-3xl font-bold tracking-tight text-text-main">Horario Semanal</h2>
          <p className="text-text-secondary mt-1">Tus clases programadas para la semana.</p>
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
              const enrolled = isEnrolled(cls);
              // Only show if enrolled OR if you want students to browse available classes here too.
              // Given the request "appear... class that is enrolled", let's prioritize visual distinction.
              
              if (!enrolled) return null; // STRICT MODE: Only show enrolled classes per prompt request.

              return (
                <div key={cls.id} className="bg-surface-white rounded-3xl p-6 border border-gray-100 shadow-card hover:shadow-lg transition-all group relative overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary"></div>
                    
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-blue-50 text-blue-600">
                            {cls.name.includes('Gi') ? 'BJJ' : 'Clase'}
                        </span>
                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold"><span className="material-symbols-outlined text-[16px]">check_circle</span> Inscrito</span>
                    </div>

                    <h3 className="text-xl font-bold text-text-main mb-1">{cls.name}</h3>
                    <div className="flex items-center gap-2 text-text-secondary text-sm mb-6">
                        <span className="material-symbols-outlined text-[18px]">schedule</span>
                        <span className="font-mono font-medium">{cls.time}</span>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="size-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold border-2 border-white shadow-sm">
                            {cls.instructor.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-text-secondary font-medium">Instructor</span>
                            <span className="text-sm font-semibold text-text-main">{cls.instructor}</span>
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
          
          {filteredClasses.filter(c => isEnrolled(c)).length === 0 && (
              <div className="col-span-full py-16 flex flex-col items-center justify-center text-center text-text-secondary">
                  <span className="material-symbols-outlined text-4xl mb-2 opacity-30">event_busy</span>
                  <p>No tienes clases inscritas para este día.</p>
              </div>
          )}
       </div>
    </div>
  );
};

export default StudentSchedule;