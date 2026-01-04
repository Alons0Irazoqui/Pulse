import React, { useState } from 'react';
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
  
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [editForm, setEditForm] = useState({ instructor: '', startTime: '', endTime: '' });

  // Helpers
  const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const days = new Date(year, month + 1, 0).getDate();
      return Array.from({ length: days }, (_, i) => new Date(year, month, i + 1));
  };

  const getDayName = (date: Date) => {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      return days[date.getDay()];
  };

  const generateCalendarEvents = () => {
      const events: any[] = [];
      const days = getDaysInMonth(currentMonth);

      days.forEach(day => {
          const dateStr = day.toISOString().split('T')[0];
          const dayName = getDayName(day);

          classes.forEach(cls => {
              // 1. Regular Schedule
              const isScheduled = cls.days.includes(dayName);
              // 2. Exceptions
              const exception = cls.modifications.find(m => m.date === dateStr);
              const movedHere = cls.modifications.find(m => m.newDate === dateStr && m.type === 'move');

              if (movedHere) {
                  events.push({
                      id: `${cls.id}-${dateStr}-moved`,
                      classId: cls.id,
                      name: cls.name,
                      date: dateStr,
                      startTime: movedHere.newStartTime || cls.startTime,
                      endTime: movedHere.newEndTime || cls.endTime,
                      instructor: movedHere.newInstructor || cls.instructor,
                      type: 'moved_here',
                      originalDate: movedHere.date
                  });
              } else if (isScheduled) {
                  if (exception?.type === 'cancel') {
                      events.push({
                          id: `${cls.id}-${dateStr}-cancelled`,
                          classId: cls.id,
                          name: cls.name,
                          date: dateStr,
                          startTime: cls.startTime,
                          type: 'cancelled',
                      });
                  } else if (exception?.type === 'move') {
                      // Ghost event
                      events.push({
                          id: `${cls.id}-${dateStr}-ghost`,
                          classId: cls.id,
                          name: cls.name,
                          date: dateStr,
                          startTime: cls.startTime,
                          type: 'ghost',
                          note: `Movida al ${exception.newDate}`
                      });
                  } else {
                      // Normal or modified details
                      events.push({
                          id: `${cls.id}-${dateStr}`,
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
      });
      return events;
  };

  const events = generateCalendarEvents();

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
      setModalMode('view');
  };

  const handleSaveChanges = () => {
      if (!selectedSession) return;
      const exception: ClassException = {
          date: selectedSession.date,
          type: 'time', // composite update
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
      if (confirm('¿Estás seguro de cancelar esta sesión específica?')) {
          modifyClassSession(selectedSession.classId, {
              date: selectedSession.date,
              type: 'cancel'
          });
          addToast('Sesión cancelada', 'info');
          setSelectedSession(null);
      }
  };

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-text-main">Calendario Maestro</h1>
                <p className="text-text-secondary mt-1">Vista global de todas las clases y eventos.</p>
            </div>
            
            <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <span className="w-48 text-center font-bold text-text-main capitalize">
                    {currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <span className="material-symbols-outlined">chevron_right</span>
                </button>
            </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-white rounded-3xl border border-gray-200 shadow-soft overflow-hidden flex flex-col">
            {/* Week Header */}
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
                {['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'].map(day => (
                    <div key={day} className="py-3 text-center text-xs font-bold text-text-secondary uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>
            
            {/* Days */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {/* Empty cells for start of month */}
                {Array.from({ length: new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay() }).map((_, i) => (
                    <div key={`empty-${i}`} className="border-b border-r border-gray-100 bg-gray-50/30"></div>
                ))}

                {getDaysInMonth(currentMonth).map(day => {
                    const dateStr = day.toISOString().split('T')[0];
                    const dayEvents = events.filter(e => e.date === dateStr);
                    const isToday = dateStr === new Date().toISOString().split('T')[0];

                    return (
                        <div key={dateStr} className={`border-b border-r border-gray-100 p-2 min-h-[140px] flex flex-col gap-1 transition-colors ${isToday ? 'bg-blue-50/30' : 'hover:bg-gray-50/50'}`}>
                            <span className={`text-xs font-bold mb-2 ml-1 ${isToday ? 'text-primary' : 'text-gray-400'}`}>
                                {day.getDate()}
                            </span>
                            
                            {dayEvents.map(evt => (
                                <div 
                                    key={evt.id}
                                    onClick={() => handleSessionClick(evt)}
                                    className={`px-2 py-1.5 rounded-lg text-xs font-medium cursor-pointer truncate transition-all border ${
                                        evt.type === 'cancelled' ? 'bg-red-50 text-red-400 border-red-100 line-through opacity-60' :
                                        evt.type === 'ghost' ? 'bg-gray-50 text-gray-400 border-dashed border-gray-200' :
                                        evt.type === 'moved_here' ? 'bg-purple-50 text-purple-700 border-purple-100 hover:bg-purple-100' :
                                        evt.type === 'modified' ? 'bg-amber-50 text-amber-700 border-amber-100 hover:bg-amber-100' :
                                        'bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100'
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold mr-1">{evt.startTime}</span>
                                        {evt.type === 'modified' && <span className="size-1.5 bg-amber-500 rounded-full"></span>}
                                    </div>
                                    <div className="truncate">{evt.name}</div>
                                </div>
                            ))}
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Edit Modal */}
        {selectedSession && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-text-main">Gestión de Sesión</h3>
                            <p className="text-sm text-text-secondary">{selectedSession.date} • {selectedSession.currentInfo.name}</p>
                        </div>
                        <button onClick={() => setSelectedSession(null)} className="p-2 hover:bg-gray-100 rounded-full"><span className="material-symbols-outlined">close</span></button>
                    </div>

                    {modalMode === 'view' ? (
                        <div className="flex flex-col gap-3">
                            <button onClick={() => setModalMode('edit')} className="p-4 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center gap-3 hover:bg-blue-100 transition-colors">
                                <span className="material-symbols-outlined">edit</span>
                                Editar Detalles (Hora/Instructor)
                            </button>
                            <button onClick={handleCancelSession} className="p-4 rounded-xl bg-red-50 text-red-600 font-bold flex items-center gap-3 hover:bg-red-100 transition-colors">
                                <span className="material-symbols-outlined">event_busy</span>
                                Cancelar Esta Clase
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            <div>
                                <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Instructor</label>
                                <input className="w-full rounded-xl border-gray-200 p-2.5 text-sm" value={editForm.instructor} onChange={e => setEditForm({...editForm, instructor: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Inicio</label>
                                    <input type="time" className="w-full rounded-xl border-gray-200 p-2.5 text-sm" value={editForm.startTime} onChange={e => setEditForm({...editForm, startTime: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-text-secondary uppercase mb-1">Fin</label>
                                    <input type="time" className="w-full rounded-xl border-gray-200 p-2.5 text-sm" value={editForm.endTime} onChange={e => setEditForm({...editForm, endTime: e.target.value})} />
                                </div>
                            </div>
                            <div className="flex gap-3 mt-2">
                                <button onClick={() => setModalMode('view')} className="flex-1 py-2.5 rounded-xl border border-gray-200 font-bold text-text-secondary">Atrás</button>
                                <button onClick={handleSaveChanges} className="flex-1 py-2.5 rounded-xl bg-black text-white font-bold hover:opacity-90">Guardar</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
    </div>
  );
};

export default CalendarManager;