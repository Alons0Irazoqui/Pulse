
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';

type ViewType = 'week' | 'month' | 'year';

const StudentSchedule: React.FC = () => {
  const { classes, events, currentUser, students } = useStore();
  const [view, setView] = useState<ViewType>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const student = students.find(s => s.id === currentUser?.studentId);

  // --- ENGINE: DATA MERGING ---
  
  // 1. Get Enrolled Classes (Strict Filter)
  const enrolledClasses = useMemo(() => {
      if (!student) return [];
      return classes.filter(c => c.studentIds.includes(student.id));
  }, [classes, student]);

  // 2. Get Registered Events (Strict Filter)
  const myEvents = useMemo(() => {
      if (!student) return [];
      return events.filter(e => e.registrants?.includes(student.id));
  }, [events, student]);

  // 3. Core Function: Get items for a specific date
  const getItemsForDate = (date: Date) => {
      const dateStr = date.toISOString().split('T')[0];
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayName = daysOfWeek[date.getDay()];
      const items: any[] = [];

      // A. Check Classes (Recurrent)
      enrolledClasses.forEach(cls => {
          // Check modifications for this specific date
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
                  // Regular Class (or modified time/instructor)
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

      // B. Check Events (One-time)
      myEvents.forEach(evt => {
          if (evt.date === dateStr) {
              let color = 'gray';
              if (evt.type === 'tournament') color = 'orange';
              if (evt.type === 'exam') color = 'indigo';
              if (evt.type === 'seminar') color = 'pink';

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
                  raw: evt
              });
          }
      });

      // Sort by time
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
      const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
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

  const renderHeader = () => (
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold tracking-tight text-text-main capitalize">
                  {view === 'year' 
                      ? currentDate.getFullYear() 
                      : currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
                  }
              </h1>
              <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 p-0.5">
                  <button onClick={handlePrev} className="p-1.5 hover:bg-gray-100 rounded-md text-text-secondary transition-colors"><span className="material-symbols-outlined text-sm">chevron_left</span></button>
                  <button onClick={handleToday} className="px-3 text-xs font-bold text-text-main hover:bg-gray-100 rounded-md transition-colors">Hoy</button>
                  <button onClick={handleNext} className="p-1.5 hover:bg-gray-100 rounded-md text-text-secondary transition-colors"><span className="material-symbols-outlined text-sm">chevron_right</span></button>
              </div>
          </div>

          <div className="flex bg-gray-100 p-1 rounded-xl shadow-inner">
              {(['week', 'month', 'year'] as const).map((v) => (
                  <button
                      key={v}
                      onClick={() => setView(v)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all capitalize ${
                          view === v 
                          ? 'bg-white text-text-main shadow-sm ring-1 ring-black/5' 
                          : 'text-text-secondary hover:text-text-main'
                      }`}
                  >
                      {v === 'week' ? 'Semana' : v === 'month' ? 'Mes' : 'Año'}
                  </button>
              ))}
          </div>
      </div>
  );

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
                              {items.length === 0 && (
                                  <div className="flex-1 flex flex-col items-center justify-center text-gray-300 py-4 opacity-50">
                                      <div className="size-1 w-1 bg-gray-300 rounded-full mb-2"></div>
                                      <span className="text-xs font-medium">Libre</span>
                                  </div>
                              )}
                              {items.map(item => (
                                  <div 
                                    key={item.id} 
                                    onClick={() => setSelectedItem(item)}
                                    className={`p-3 rounded-xl border text-left cursor-pointer hover:scale-[1.02] transition-all shadow-sm relative overflow-hidden group ${
                                        item.subType === 'cancelled' ? 'bg-gray-50 border-gray-200 opacity-60' :
                                        item.type === 'event' ? 'bg-purple-50 border-purple-100' :
                                        item.subType === 'rescheduled' ? 'bg-indigo-50 border-indigo-100' :
                                        'bg-blue-50/50 border-blue-100 hover:border-blue-200'
                                    }`}
                                  >
                                      {item.subType === 'cancelled' && (
                                          <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 backdrop-blur-[1px] z-10">
                                              <span className="text-[9px] font-black text-red-500 border border-red-200 bg-white px-2 py-0.5 rounded-full uppercase tracking-wider">Cancelada</span>
                                          </div>
                                      )}
                                      
                                      <div className="flex items-center gap-1.5 mb-1.5">
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                              item.type === 'event' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                          }`}>
                                              {item.time}
                                          </span>
                                          {item.type === 'event' && <span className="material-symbols-outlined text-[12px] text-purple-500">emoji_events</span>}
                                      </div>
                                      
                                      <div className={`font-bold text-xs leading-tight mb-0.5 ${item.subType === 'cancelled' ? 'line-through text-gray-400' : 'text-text-main'}`}>
                                          {item.title}
                                      </div>
                                      
                                      {item.instructor && (
                                          <div className="text-[10px] text-text-secondary truncate flex items-center gap-1">
                                              <span className="size-1 bg-gray-300 rounded-full"></span>
                                              {item.instructor}
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      </div>
                  );
              })}
          </div>
      );
  };

  const renderMonthView = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Adjust for Monday start
      
      const grid = [];
      // Empty slots
      for (let i = 0; i < startingDay; i++) grid.push(null);
      // Days
      for (let i = 1; i <= daysInMonth; i++) grid.push(new Date(year, month, i));

      return (
          <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
                  {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                      <div key={d} className="py-4 text-center text-xs font-bold text-text-secondary uppercase tracking-widest">{d}</div>
                  ))}
              </div>
              <div className="grid grid-cols-7 auto-rows-[minmax(120px,_1fr)]">
                  {grid.map((day, idx) => {
                      if (!day) return <div key={`empty-${idx}`} className="border-b border-r border-gray-100 bg-gray-50/20"></div>;
                      
                      const items = getItemsForDate(day);
                      const isToday = day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];

                      return (
                          <div key={day.toISOString()} className={`p-2 border-b border-r border-gray-100 flex flex-col gap-1 transition-colors ${isToday ? 'bg-blue-50/20' : 'hover:bg-gray-50'}`}>
                              <div className="flex justify-between items-start p-1">
                                  <span className={`text-xs font-bold size-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-white shadow-md' : 'text-text-secondary'}`}>
                                      {day.getDate()}
                                  </span>
                              </div>
                              
                              <div className="flex flex-col gap-1 overflow-hidden px-1">
                                  {items.slice(0, 3).map(item => (
                                      <div 
                                        key={item.id} 
                                        onClick={() => setSelectedItem(item)}
                                        className={`px-2 py-1 rounded-md text-[10px] font-semibold truncate cursor-pointer flex items-center gap-1.5 transition-all ${
                                            item.subType === 'cancelled' ? 'bg-gray-100 text-gray-400 line-through' :
                                            item.type === 'event' ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' :
                                            'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                        }`}
                                      >
                                          <div className={`size-1.5 rounded-full shrink-0 ${item.subType === 'cancelled' ? 'bg-gray-400' : item.type === 'event' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                                          <span className="font-bold opacity-80">{item.time}</span>
                                          <span>{item.title}</span>
                                      </div>
                                  ))}
                                  {items.length > 3 && (
                                      <div className="text-[9px] text-gray-400 pl-2 font-medium">+{items.length - 3} más</div>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  const renderYearView = () => {
      const months = Array.from({ length: 12 }, (_, i) => new Date(currentDate.getFullYear(), i, 1));
      
      return (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {months.map(monthDate => {
                  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
                  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay(); // 0 is Sun
                  
                  // Activity Calc
                  let totalItems = 0;
                  for(let i=1; i<=daysInMonth; i++) {
                      const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), i);
                      totalItems += getItemsForDate(d).length;
                  }

                  return (
                      <div 
                        key={monthDate.toISOString()} 
                        onClick={() => { setCurrentDate(monthDate); setView('month'); }}
                        className="bg-white p-5 rounded-3xl border border-gray-100 hover:shadow-card hover:border-primary/20 transition-all cursor-pointer group"
                      >
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-text-main capitalize">{monthDate.toLocaleString('es-ES', { month: 'long' })}</h3>
                              {totalItems > 0 && <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">{totalItems}</span>}
                          </div>
                          
                          {/* Mini Calendar Grid */}
                          <div className="grid grid-cols-7 gap-y-2 gap-x-1">
                              {/* Day Headers (S M T W T F S) */}
                              {['D','L','M','M','J','V','S'].map(d => (
                                  <span key={d} className="text-[8px] text-center text-gray-400 font-bold">{d}</span>
                              ))}
                              
                              {/* Empty padding */}
                              {Array.from({ length: firstDay }).map((_, i) => <div key={`p-${i}`}></div>)}

                              {/* Days */}
                              {Array.from({ length: daysInMonth }).map((_, i) => {
                                  const dayNum = i + 1;
                                  const d = new Date(monthDate.getFullYear(), monthDate.getMonth(), dayNum);
                                  const count = getItemsForDate(d).length;
                                  
                                  return (
                                      <div key={i} className="flex justify-center">
                                          <div className={`size-1.5 rounded-full ${
                                              count > 0 ? 'bg-primary' : 'bg-gray-200'
                                          }`}></div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  );
              })}
          </div>
      );
  };

  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-8 min-h-full flex flex-col">
        {renderHeader()}
        
        <div className="flex-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {view === 'week' && renderWeekView()}
            {view === 'month' && renderMonthView()}
            {view === 'year' && renderYearView()}
        </div>

        {/* DETAILS MODAL */}
        {selectedItem && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200" onClick={() => setSelectedItem(null)}>
                <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm shadow-2xl border border-white/50 relative overflow-hidden" onClick={e => e.stopPropagation()}>
                    {/* Decorative Background */}
                    <div className={`absolute top-0 left-0 right-0 h-32 opacity-10 ${selectedItem.type === 'event' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                    
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                            <div className={`size-16 rounded-2xl flex items-center justify-center shadow-sm ${
                                selectedItem.type === 'event' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                                <span className="material-symbols-outlined text-3xl">
                                    {selectedItem.type === 'event' ? 'emoji_events' : 'sports_martial_arts'}
                                </span>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="size-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors">
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>
                        </div>

                        <h2 className="text-2xl font-black text-text-main leading-tight mb-2">{selectedItem.title}</h2>
                        
                        {selectedItem.subType === 'cancelled' ? (
                            <div className="inline-block px-3 py-1 bg-red-100 text-red-600 text-xs font-bold rounded-full mb-6">
                                CLASE CANCELADA
                            </div>
                        ) : (
                            <div className={`inline-block px-3 py-1 text-xs font-bold rounded-full mb-6 uppercase tracking-wider ${
                                selectedItem.type === 'event' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                                {selectedItem.type === 'event' ? 'Evento Especial' : 'Clase Regular'}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-text-secondary">
                                    <span className="material-symbols-outlined">schedule</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-text-secondary uppercase">Horario</p>
                                    <p className="font-semibold text-text-main text-lg">{selectedItem.time} - {selectedItem.endTime}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-text-secondary">
                                    <span className="material-symbols-outlined">person</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-text-secondary uppercase">Instructor / Organizador</p>
                                    <p className="font-semibold text-text-main text-lg">{selectedItem.instructor}</p>
                                </div>
                            </div>

                            {selectedItem.description && (
                                <div className="pt-6 border-t border-gray-100">
                                    <p className="text-text-secondary text-sm leading-relaxed">{selectedItem.description}</p>
                                </div>
                            )}
                        </div>

                        <div className="mt-8">
                            <button onClick={() => setSelectedItem(null)} className="w-full py-3.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-black transition-all shadow-lg active:scale-95">
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default StudentSchedule;
