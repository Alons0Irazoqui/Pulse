import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';

type ViewType = 'week' | 'month' | 'year';

const StudentSchedule: React.FC = () => {
  const { classes, events, currentUser, students, registerForEvent } = useStore();
  const { addToast } = useToast();
  const [view, setView] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const student = students.find(s => s.id === currentUser?.studentId);

  // --- ACTIONS ---
  const handleRegisterFromCalendar = () => {
      if(selectedItem && selectedItem.type === 'event' && selectedItem.subType !== 'exam' && student) {
          // Check if already registered
          if (selectedItem.raw.registrants?.includes(student.id)) return;
          
          registerForEvent(student.id, selectedItem.raw.id);
          addToast('Inscripción realizada', 'success');
          setSelectedItem(null);
      }
  };

  // --- ENGINE: DATA MERGING ---
  
  // 1. Get Enrolled Classes
  const enrolledClasses = useMemo(() => {
      if (!student) return [];
      return classes.filter(c => c.studentIds.includes(student.id));
  }, [classes, student]);

  // 2. Get All Relevant Events (Registered OR Available Marketplace Events)
  // We show marketplace events in the calendar so students can discover them.
  const relevantEvents = useMemo(() => {
      if (!student) return [];
      const today = new Date().toISOString().split('T')[0];
      return events.filter(e => 
          e.date >= today || // Future events (potential to register)
          e.registrants?.includes(student.id) // Past events I attended
      );
  }, [events, student]);

  const getItemsForDate = (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = daysOfWeek[date.getDay()];
      const items: any[] = [];

      // A. Classes
      enrolledClasses.forEach(cls => {
          const modification = cls.modifications.find(m => m.date === dateStr);
          const movedHere = cls.modifications.find(m => m.newDate === dateStr && m.type === 'move');
          const isRegularDay = cls.days.includes(dayName);
          const isCancelled = modification?.type === 'cancel';
          const isMovedAway = modification?.type === 'move';

          if (movedHere) {
              items.push({
                  id: `moved-${cls.id}-${dateStr}`,
                  type: 'class',
                  subType: 'rescheduled',
                  title: cls.name,
                  time: movedHere.newStartTime || cls.startTime,
                  endTime: movedHere.newEndTime || cls.endTime,
                  instructor: movedHere.newInstructor || cls.instructor,
                  color: 'purple',
                  raw: cls
              });
          } else if (isRegularDay) {
              if (isCancelled) {
                  items.push({
                      id: `cancel-${cls.id}-${dateStr}`,
                      type: 'class',
                      subType: 'cancelled',
                      title: cls.name,
                      time: cls.startTime,
                      endTime: cls.endTime,
                      color: 'gray',
                      raw: cls
                  });
              } else if (!isMovedAway) {
                  items.push({
                      id: `reg-${cls.id}-${dateStr}`,
                      type: 'class',
                      subType: modification ? 'modified' : 'normal',
                      title: cls.name,
                      time: modification?.newStartTime || cls.startTime,
                      endTime: modification?.newEndTime || cls.endTime,
                      instructor: modification?.newInstructor || cls.instructor,
                      color: 'blue',
                      raw: cls
                  });
              }
          }
      });

      // B. Events (Visual Logic Updated)
      relevantEvents.forEach(evt => {
          if (evt.date === dateStr) {
              let color = 'gray';
              let icon = 'event';
              if (evt.type === 'tournament') { color = 'orange'; icon = 'emoji_events'; }
              if (evt.type === 'exam') { color = 'indigo'; icon = 'stars'; }
              if (evt.type === 'seminar') { color = 'pink'; icon = 'menu_book'; }

              const isRegistered = evt.registrants?.includes(student?.id || '');

              // Filter out exams I'm NOT registered for (they shouldn't clutter calendar usually, unless open call, 
              // but requirements say exams are guided/assigned).
              if (evt.type === 'exam' && !isRegistered) return;

              items.push({
                  id: `evt-${evt.id}`,
                  type: 'event',
                  subType: evt.type,
                  title: evt.title,
                  time: evt.time,
                  endTime: 'Evento', 
                  instructor: 'Evento Especial',
                  description: evt.description,
                  color: color,
                  icon: icon,
                  isRegistered,
                  raw: evt
              });
          }
      });

      return items.sort((a, b) => a.time.localeCompare(b.time));
  };

  // --- NAVIGATION HELPERS ---
  const handlePrev = () => {
      const newDate = new Date(currentDate);
      if (view === 'week') newDate.setDate(newDate.getDate() - 7);
      if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
      if (view === 'year') newDate.setFullYear(newDate.getFullYear() - 1);
      setCurrentDate(newDate);
  };

  const handleNext = () => {
      const newDate = new Date(currentDate);
      if (view === 'week') newDate.setDate(newDate.getDate() + 7);
      if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
      if (view === 'year') newDate.setFullYear(newDate.getFullYear() + 1);
      setCurrentDate(newDate);
  };

  const handleToday = () => setCurrentDate(new Date());

  const getWeekDays = (baseDate: Date) => {
      const startOfWeek = new Date(baseDate);
      const day = startOfWeek.getDay();
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
      startOfWeek.setDate(diff);
      const days = [];
      for (let i = 0; i < 7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          days.push(d);
      }
      return days;
  };

  // --- RENDERERS ---
  const renderWeekView = () => {
      const days = getWeekDays(currentDate);
      const todayStr = new Date().toISOString().split('T')[0];

      return (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 h-full">
              {days.map((day) => {
                  const dateStr = day.toISOString().split('T')[0];
                  const items = getItemsForDate(day);
                  const isToday = dateStr === todayStr;

                  return (
                      <div key={dateStr} className={`flex flex-col gap-3 p-4 rounded-[1.5rem] min-h-[200px] border transition-all ${isToday ? 'bg-white shadow-glow border-primary/30' : 'bg-white border-gray-100 shadow-sm'}`}>
                          <div className="text-center pb-3 border-b border-gray-50 mb-1">
                              <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isToday ? 'text-primary' : 'text-text-secondary'}`}>
                                  {day.toLocaleString('es-ES', { weekday: 'short' })}
                              </p>
                              <div className={`size-9 mx-auto flex items-center justify-center rounded-full font-bold text-lg ${isToday ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'text-text-main'}`}>
                                  {day.getDate()}
                              </div>
                          </div>
                          
                          <div className="flex flex-col gap-2.5">
                              {items.map(item => (
                                  <div 
                                    key={item.id} 
                                    onClick={() => setSelectedItem(item)}
                                    className={`p-3 rounded-xl border text-left cursor-pointer hover:scale-[1.02] transition-all shadow-sm relative overflow-hidden group ${
                                        item.subType === 'cancelled' ? 'bg-gray-50 border-gray-200 opacity-60' :
                                        item.type === 'event' ? (
                                            item.subType === 'exam' ? 'bg-gray-900 border-gray-800 text-white' : 
                                            item.subType === 'tournament' ? 'bg-orange-50 border-orange-100 text-orange-900' :
                                            'bg-blue-50 border-blue-100 text-blue-900'
                                        ) :
                                        'bg-white border-gray-100 hover:border-blue-200'
                                    }`}
                                  >
                                      {/* Event Specific Badge */}
                                      {item.type === 'event' && !item.isRegistered && (
                                          <div className="absolute top-0 right-0 p-1">
                                              <div className="size-2 bg-red-500 rounded-full border border-white"></div>
                                          </div>
                                      )}

                                      <div className="flex items-center gap-1.5 mb-1.5">
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                              item.subType === 'exam' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                                          }`}>
                                              {item.time}
                                          </span>
                                          {item.type === 'event' && <span className={`material-symbols-outlined text-[14px] ${item.subType === 'exam' ? 'text-yellow-400' : ''}`}>{item.icon}</span>}
                                      </div>
                                      
                                      <div className="font-bold text-xs leading-tight mb-0.5 line-clamp-2">
                                          {item.title}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  );
              })}
          </div>
      );
  };

  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-8 min-h-full flex flex-col">
        {/* Header (Same as previous) */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold tracking-tight text-text-main capitalize">
                  {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
              </h1>
              <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-0.5">
                  <button onClick={handlePrev} className="p-1.5 hover:bg-gray-100 rounded-md text-text-secondary"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                  <button onClick={handleToday} className="px-3 text-xs font-bold text-text-main hover:bg-gray-100 rounded-md">Hoy</button>
                  <button onClick={handleNext} className="p-1.5 hover:bg-gray-100 rounded-md text-text-secondary"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
              </div>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
              <button onClick={() => setView('week')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${view === 'week' ? 'bg-white shadow-sm' : 'text-text-secondary'}`}>Semana</button>
              <button onClick={() => setView('month')} className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${view === 'month' ? 'bg-white shadow-sm' : 'text-text-secondary'}`}>Mes</button>
          </div>
        </div>
        
        <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {view === 'week' && renderWeekView()}
            {view !== 'week' && <div className="text-center py-20 text-gray-400">Vista mensual simplificada no implementada en esta demo visual. Usa la vista semanal.</div>}
        </div>

        {/* --- DETAILS MODAL --- */}
        {selectedItem && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200" onClick={() => setSelectedItem(null)}>
                <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border border-white/50 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                    
                    {/* Decorative Background for Events */}
                    {selectedItem.type === 'event' && (
                        <div className={`absolute top-0 left-0 right-0 h-32 opacity-10 ${
                            selectedItem.subType === 'exam' ? 'bg-gray-900' : 
                            selectedItem.subType === 'tournament' ? 'bg-orange-500' : 'bg-blue-500'
                        }`}></div>
                    )}
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`size-16 rounded-2xl flex items-center justify-center shadow-sm ${
                                selectedItem.type === 'event' ? 'bg-white border border-gray-100' : 'bg-blue-100 text-blue-600'
                            }`}>
                                <span className={`material-symbols-outlined text-3xl ${selectedItem.subType === 'exam' ? 'text-gray-900' : ''}`}>
                                    {selectedItem.type === 'event' ? selectedItem.icon : 'sports_martial_arts'}
                                </span>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="size-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center">
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        <h2 className="text-2xl font-black text-text-main leading-tight mb-2">{selectedItem.title}</h2>
                        
                        {selectedItem.subType === 'cancelled' ? (
                            <div className="inline-block px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full mb-6">CLASE CANCELADA</div>
                        ) : selectedItem.type === 'event' ? (
                            <div className="flex flex-wrap gap-2 mb-6">
                                <div className="inline-block px-3 py-1 bg-gray-100 text-text-secondary text-xs font-bold rounded-full uppercase tracking-wider">
                                    {selectedItem.subType === 'exam' ? 'Examen' : selectedItem.subType}
                                </div>
                                {selectedItem.isRegistered ? (
                                    <div className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">INSCRITO</div>
                                ) : (
                                    selectedItem.subType !== 'exam' && <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">DISPONIBLE</div>
                                )}
                            </div>
                        ) : (
                            <div className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-6">CLASE REGULAR</div>
                        )}

                        <div className="space-y-5">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-text-secondary"><span className="material-symbols-outlined">schedule</span></div>
                                <div>
                                    <p className="text-xs font-bold text-text-secondary uppercase">Horario</p>
                                    <p className="font-semibold text-text-main text-lg">{selectedItem.time} - {selectedItem.endTime}</p>
                                </div>
                            </div>
                            
                            {selectedItem.raw.description && (
                                <div className="pt-4 border-t border-gray-100">
                                    <p className="text-text-secondary text-sm leading-relaxed">{selectedItem.raw.description}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8">
                            {selectedItem.type === 'event' && selectedItem.subType !== 'exam' && !selectedItem.isRegistered ? (
                                <button onClick={handleRegisterFromCalendar} className="w-full py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                                    <span>Inscribirme Ahora</span>
                                    <span className="material-symbols-outlined text-sm">edit_square</span>
                                </button>
                            ) : (
                                <button onClick={() => setSelectedItem(null)} className="w-full py-3.5 rounded-xl bg-gray-100 text-text-main font-bold hover:bg-gray-200 transition-all">
                                    Cerrar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default StudentSchedule;