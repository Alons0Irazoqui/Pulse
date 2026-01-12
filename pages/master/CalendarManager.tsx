
import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { ClassException } from '../../types';

const CalendarManager: React.FC = () => {
  const { classes, modifyClassSession } = useStore();
  const { addToast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Modal State
  const [selectedSession, setSelectedSession] = useState<{
      classId: string, 
      date: string, 
      currentInfo: any,
      exception?: ClassException 
  } | null>(null);
  
  const [editForm, setEditForm] = useState({ instructor: '', startTime: '', endTime: '' });

  // --- CALENDAR LOGIC REWRITE ---

  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const days = [];
      
      // Pad with empty days for start of week (Sunday start)
      for (let i = 0; i < firstDay.getDay(); i++) {
          days.push(null);
      }
      
      // Fill actual days
      for (let i = 1; i <= lastDay.getDate(); i++) {
          days.push(new Date(year, month, i));
      }
      
      return days;
  };

  const getDayNameEnglish = (date: Date) => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()];
  };

  const generateEventsForDay = (day: Date) => {
      if (!day) return [];
      const dateStr = day.toISOString().split('T')[0];
      const dayName = getDayNameEnglish(day);
      const events: any[] = [];

      classes.forEach(cls => {
          // 1. Is it a regular schedule day?
          const isScheduled = cls.days.includes(dayName);
          
          // 2. Check exceptions
          const exception = cls.modifications.find(m => m.date === dateStr);
          const movedHere = cls.modifications.find(m => m.newDate === dateStr && m.type === 'move');

          if (movedHere) {
               events.push({
                  id: `move-${cls.id}-${dateStr}`,
                  classId: cls.id,
                  name: cls.name,
                  date: dateStr,
                  startTime: movedHere.newStartTime || cls.startTime,
                  endTime: movedHere.newEndTime || cls.endTime,
                  instructor: movedHere.newInstructor || cls.instructor,
                  type: 'moved_here'
               });
          } else if (isScheduled) {
              if (exception?.type === 'cancel') {
                   events.push({
                      id: `cancel-${cls.id}-${dateStr}`,
                      classId: cls.id,
                      name: cls.name,
                      startTime: cls.startTime,
                      type: 'cancelled'
                   });
              } else if (exception?.type === 'move') {
                   // Ghost event (moved away)
                   events.push({
                      id: `ghost-${cls.id}-${dateStr}`,
                      name: cls.name,
                      type: 'ghost'
                   });
              } else {
                   // Regular or Modified time/instructor
                   events.push({
                      id: `reg-${cls.id}-${dateStr}`,
                      classId: cls.id,
                      name: cls.name,
                      date: dateStr,
                      startTime: exception?.newStartTime || cls.startTime,
                      endTime: exception?.newEndTime || cls.endTime,
                      instructor: exception?.newInstructor || cls.instructor,
                      type: exception ? 'modified' : 'regular',
                      exception
                   });
              }
          }
      });
      
      return events.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  };

  // --- ACTIONS ---

  const handleSessionClick = (event: any) => {
      if (event.type === 'ghost' || event.type === 'cancelled') return;
      setSelectedSession({
          classId: event.classId,
          date: event.date,
          currentInfo: event,
          exception: event.exception
      });
      setEditForm({
          instructor: event.instructor,
          startTime: event.startTime,
          endTime: event.endTime
      });
  };

  const handleSaveChanges = () => {
      if (!selectedSession) return;
      const exception: ClassException = {
          date: selectedSession.date,
          type: 'time', 
          newInstructor: editForm.instructor,
          newStartTime: editForm.startTime,
          newEndTime: editForm.endTime
      };
      modifyClassSession(selectedSession.classId, exception);
      addToast('Sesión actualizada', 'success');
      setSelectedSession(null);
  };

  const handleCancelSession = () => {
      if (!selectedSession) return;
      if (confirm('¿Cancelar esta clase para esta fecha?')) {
          modifyClassSession(selectedSession.classId, {
              date: selectedSession.date,
              type: 'cancel'
          });
          addToast('Clase cancelada', 'info');
          setSelectedSession(null);
      }
  };

  const calendarDays = getDaysInMonth(currentMonth);

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto h-full flex flex-col text-zinc-200">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-white">Calendario Maestro</h1>
                <p className="text-zinc-500 mt-1 text-sm">Vista global de todas las clases.</p>
            </div>
            
            <div className="flex items-center bg-[#121212] rounded-xl shadow-sm border border-zinc-800 p-1">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors">
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <span className="w-48 text-center font-bold text-white capitalize">
                    {currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-lg transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-[#121212] rounded-3xl border border-zinc-800 shadow-inner overflow-hidden flex flex-col">
            {/* Week Header */}
            <div className="grid grid-cols-7 border-b border-zinc-800 bg-[#18181b]">
                {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
                    <div key={day} className="py-4 text-center text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>
            
            {/* Days Grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-[#09090b]">
                {calendarDays.map((day, idx) => {
                    if (!day) {
                        return <div key={`empty-${idx}`} className="border-b border-r border-zinc-800/50 bg-zinc-900/20"></div>;
                    }

                    const dateStr = day.toISOString().split('T')[0];
                    const isToday = dateStr === new Date().toISOString().split('T')[0];
                    const events = generateEventsForDay(day);

                    return (
                        <div key={dateStr} className={`border-b border-r border-zinc-800 p-2 min-h-[120px] flex flex-col gap-1 transition-colors ${isToday ? 'bg-primary/5' : 'hover:bg-zinc-900/50'}`}>
                            <span className={`text-xs font-bold mb-1 ml-1 ${isToday ? 'text-primary' : 'text-zinc-600'}`}>
                                {day.getDate()}
                            </span>
                            
                            <div className="flex flex-col gap-1 overflow-y-auto max-h-[140px] no-scrollbar">
                                {events.map(evt => (
                                    <div 
                                        key={evt.id}
                                        onClick={() => handleSessionClick(evt)}
                                        className={`px-2 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer truncate transition-all border ${
                                            evt.type === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/20 line-through opacity-70' :
                                            evt.type === 'ghost' ? 'bg-zinc-800 text-zinc-600 border-dashed border-zinc-700 opacity-50' :
                                            evt.type === 'moved_here' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                                            evt.type === 'modified' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                            'bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20'
                                        }`}
                                    >
                                        <div className="flex justify-between">
                                            <span className="font-mono opacity-80">{evt.startTime}</span>
                                            {evt.type === 'modified' && <span className="size-1.5 bg-orange-500 rounded-full"></span>}
                                        </div>
                                        <div className="truncate mt-0.5">{evt.name}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Edit Modal (Apple Glass Dark) */}
        {selectedSession && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={() => setSelectedSession(null)}></div>
                
                <div className="relative bg-[#18181b] rounded-2xl shadow-2xl p-8 w-full max-w-md border border-white/10 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-white">Editar Sesión</h3>
                            <p className="text-sm text-zinc-500">{selectedSession.date}</p>
                        </div>
                        <button onClick={() => setSelectedSession(null)} className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    <div className="flex flex-col gap-5">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Instructor</label>
                            <input 
                                className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm font-medium text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                                value={editForm.instructor} 
                                onChange={e => setEditForm({...editForm, instructor: e.target.value})} 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Inicio</label>
                                <input 
                                    type="time" 
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm font-medium text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                                    value={editForm.startTime} 
                                    onChange={e => setEditForm({...editForm, startTime: e.target.value})} 
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Fin</label>
                                <input 
                                    type="time" 
                                    className="w-full bg-zinc-900 border border-white/10 rounded-xl p-3 text-sm font-medium text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" 
                                    value={editForm.endTime} 
                                    onChange={e => setEditForm({...editForm, endTime: e.target.value})} 
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 mt-4 pt-4 border-t border-white/10">
                            <button 
                                onClick={handleCancelSession} 
                                className="flex-1 py-3 rounded-xl border border-red-500/30 text-red-400 font-bold hover:bg-red-500/10 transition-colors text-xs uppercase tracking-wider"
                            >
                                Cancelar Clase
                            </button>
                            <button 
                                onClick={handleSaveChanges} 
                                className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all text-xs uppercase tracking-wider active:scale-95"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default CalendarManager;
