
import React, { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { Event } from '../../types';
import { useAcademy } from '../../context/AcademyContext';
import { getLocalDate } from '../../utils/dateUtils';

const StudentDashboard: React.FC = () => {
  const { currentUser, students, classes, academySettings, events, registerForEvent } = useStore();
  const { scheduleEvents } = useAcademy(); 
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  const student = students.find(s => s.id === currentUser?.studentId);
  
  // -- STATE --
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // -- 1. RANK PROGRESS LOGIC --
  const currentRankConfig = academySettings.ranks.find(r => r.id === student?.rankId) || academySettings.ranks[0];
  const nextRankConfig = academySettings.ranks.find(r => r.order === currentRankConfig.order + 1);
  const required = currentRankConfig.requiredAttendance;
  const current = student?.attendance || 0;
  const progressPercent = required > 0 ? Math.min((current / required) * 100, 100) : 100;
  
  // -- 2. FINANCIAL LOGIC --
  const hasDebt = (student?.balance || 0) > 0;

  // -- 3. ENROLLED CLASSES LOGIC --
  const myEnrolledClasses = useMemo(() => {
      return classes.filter(c => student?.classesId?.includes(c.id));
  }, [classes, student]);

  // -- 4. NEXT CLASS LOGIC --
  const nextClass = useMemo(() => {
      if (!student) return null;
      const now = new Date();
      
      const upcomingClasses = scheduleEvents.filter(evt => {
          if (evt.type !== 'class' || !evt.classId) return false;
          if (!student.classesId?.includes(evt.classId)) return false;
          if (evt.status === 'cancelled') return false;
          return evt.end > now;
      });

      upcomingClasses.sort((a, b) => a.start.getTime() - b.start.getTime());
      return upcomingClasses[0] || null;
  }, [scheduleEvents, student]);

  // -- 5. EVENTS LOGIC --
  const todayStr = getLocalDate();
  
  const nextAssignedExam = useMemo(() => {
      if (!student) return null;
      return events
          .filter(e => e.type === 'exam' && e.registrants?.includes(student.id) && e.date >= todayStr)
          .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  }, [events, student, todayStr]);

  const marketplaceEvents = useMemo(() => {
      return events
          .filter(e => {
              if (e.date < todayStr) return false;
              if (nextAssignedExam && e.id === nextAssignedExam.id) return false;
              const isPublic = e.isVisibleToStudents !== false;
              const isRegistered = student && e.registrants?.includes(student.id);
              return isPublic || isRegistered;
          })
          .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 2); 
  }, [events, todayStr, student, nextAssignedExam]);


  // -- ACTIONS --
  const handleRegister = () => {
      if(student && selectedEvent) {
          registerForEvent(student.id, selectedEvent.id);
          addToast('¡Te has inscrito correctamente!', 'success');
          setSelectedEvent(null);
      }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 md:p-10 flex flex-col gap-10 pb-24 text-gray-200">
      
      {/* --- HEADER: WELCOME & SUMMARY --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-800 pb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white mb-2">
              Hola, <span className="text-zinc-400">{student?.name.split(' ')[0]}</span>
          </h2>
          <p className="text-zinc-500 font-medium text-sm">
              {nextRankConfig 
                ? `Progreso hacia ${nextRankConfig.name}: ${Math.round(progressPercent)}%` 
                : 'Máximo nivel alcanzado.'}
          </p>
        </div>
        <div className="flex items-center gap-4">
            <div className="text-right">
                <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-widest">Rango Actual</p>
                <p className="text-xl font-bold text-white">{student?.rank}</p>
            </div>
            {/* Minimalist Belt Representation */}
            <div className={`h-10 w-1 rounded bg-zinc-900 border border-zinc-800 overflow-hidden relative`}>
                 <div className={`absolute bottom-0 w-full ${
                     student?.rankColor === 'white' ? 'bg-zinc-200' :
                     student?.rankColor === 'blue' ? 'bg-blue-600' :
                     student?.rankColor === 'purple' ? 'bg-purple-600' :
                     student?.rankColor === 'brown' ? 'bg-amber-800' :
                     student?.rankColor === 'black' ? 'bg-black border border-zinc-700' : 'bg-zinc-500'
                 }`} style={{height: '100%'}}></div>
            </div>
        </div>
      </div>

      {/* --- CRITICAL ALERT: EXAM --- */}
      {nextAssignedExam && (
          <div 
            onClick={() => setSelectedEvent(nextAssignedExam)}
            className="cursor-pointer apple-glass rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-orange-500/50 transition-all group shadow-lg"
          >
              <div className="flex items-center gap-6">
                  <div className="size-12 rounded-full bg-orange-500/10 flex items-center justify-center text-orange-500 border border-orange-500/20 group-hover:text-orange-400">
                      <span className="material-symbols-outlined text-2xl">stars</span>
                  </div>
                  <div>
                      <div className="text-orange-500 text-[10px] font-bold uppercase tracking-widest mb-1">Convocatoria Oficial</div>
                      <h3 className="text-xl font-bold text-white">{nextAssignedExam.title}</h3>
                      <p className="text-zinc-400 text-sm">Prepárate para tu evaluación.</p>
                  </div>
              </div>
              <span className="material-symbols-outlined text-zinc-600 group-hover:text-white transition-colors">arrow_forward</span>
          </div>
      )}

      {/* --- MAIN GRID: STATS & ACTIONS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1. FINANCIAL STATUS WIDGET (Minimal) */}
          <div className="p-6 rounded-3xl bg-[#1c1c1e] border border-zinc-800 flex flex-col justify-between h-[180px] shadow-lg">
              <div>
                  <div className="flex justify-between items-start mb-4">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Finanzas</p>
                      <span className={`size-2 rounded-full ${hasDebt ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'}`}></span>
                  </div>
                  <h3 className={`text-2xl font-bold ${hasDebt ? 'text-white' : 'text-zinc-300'}`}>
                      {hasDebt ? `$${student?.balance.toFixed(2)}` : 'Al Día'}
                  </h3>
                  {hasDebt && <p className="text-xs text-red-400 mt-1 font-medium">Saldo pendiente</p>}
              </div>
              
              {hasDebt ? (
                  <button 
                    onClick={() => navigate('/student/payments')}
                    className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
                  >
                      Pagar
                  </button>
              ) : (
                  <p className="text-xs text-zinc-600 font-mono">Sin acciones requeridas</p>
              )}
          </div>

          {/* 2. ATTENDANCE PROGRESS WIDGET (Minimal) */}
          <div className="p-6 rounded-3xl bg-[#1c1c1e] border border-zinc-800 flex flex-col justify-between h-[180px] shadow-lg">
              <div>
                  <div className="flex justify-between items-start mb-4">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Asistencias</p>
                      <span className="material-symbols-outlined text-zinc-600 text-lg">directions_run</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white">{current} <span className="text-sm text-zinc-600 font-normal">/ {required}</span></h3>
              </div>
              
              <div className="flex flex-col gap-2">
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-zinc-800">
                      <div className="h-full bg-primary rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(10,132,255,0.5)]" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <p className="text-[10px] text-zinc-500 text-right font-mono">
                      {progressPercent >= 100 ? 'Requisito cumplido' : `${Math.round(progressPercent)}% completado`}
                  </p>
              </div>
          </div>

          {/* 3. NEXT CLASS WIDGET (Hero Minimal) */}
          <div className="lg:col-span-2 p-8 rounded-3xl bg-gradient-to-br from-[#1c1c1e] to-[#121212] border border-zinc-800 relative overflow-hidden group h-[180px] flex flex-col justify-center shadow-lg">
              <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                  <span className="material-symbols-outlined text-9xl">schedule</span>
              </div>
              
              <div className="relative z-10">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2 flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
                      Próxima Sesión
                  </p>
                  
                  {nextClass ? (
                      <div>
                          <h2 className="text-3xl font-bold text-white mb-2">{nextClass.title}</h2>
                          <div className="flex items-center gap-4 text-zinc-400 text-sm">
                              <span className="font-mono text-zinc-300 bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700/50">
                                  {nextClass.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                              </span>
                              <span className="w-px h-3 bg-zinc-700"></span>
                              <span className="uppercase tracking-wide text-xs font-bold text-zinc-500">{nextClass.instructor}</span>
                          </div>
                      </div>
                  ) : (
                      <div>
                          <h2 className="text-2xl font-bold text-zinc-300">Sin clases hoy</h2>
                          <button onClick={() => navigate('/student/schedule')} className="mt-4 text-xs font-bold uppercase tracking-wider text-zinc-500 hover:text-white transition-colors flex items-center gap-1 group/btn">
                              Ver Calendario <span className="material-symbols-outlined text-sm group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                          </button>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* --- SECONDARY SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: MY ENROLLED CLASSES (List) */}
          <div className="lg:col-span-2">
              <div className="flex justify-between items-center mb-4 px-1">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Mis Grupos</h3>
                  <button onClick={() => navigate('/student/classes')} className="text-xs font-bold text-primary hover:text-blue-400 transition-colors">
                      Ver Todo
                  </button>
              </div>

              {myEnrolledClasses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myEnrolledClasses.map(cls => (
                          <div key={cls.id} onClick={() => navigate(`/student/classes/${cls.id}`)} className="p-5 rounded-2xl bg-[#1c1c1e] border border-zinc-800 hover:border-zinc-600 transition-all cursor-pointer group shadow-sm hover:shadow-md">
                              <div className="flex justify-between items-start mb-3">
                                  <h4 className="font-bold text-white text-base truncate pr-4 group-hover:text-primary transition-colors">{cls.name}</h4>
                                  <span className="text-[10px] font-mono text-zinc-500 border border-zinc-800 px-1.5 py-0.5 rounded bg-zinc-900">
                                      {cls.studentCount}
                                  </span>
                              </div>
                              <p className="text-xs text-zinc-400 mb-4 flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[14px]">schedule</span> {cls.schedule}
                              </p>
                              <div className="flex items-center gap-2 pt-3 border-t border-zinc-800">
                                  <div className="size-5 rounded-full bg-zinc-900 flex items-center justify-center text-[10px] text-zinc-500 font-bold border border-zinc-800">
                                      {cls.instructor.charAt(0)}
                                  </div>
                                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wide">{cls.instructor}</span>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="text-center py-10 border border-dashed border-zinc-800 rounded-2xl">
                      <p className="text-zinc-600 text-sm">No estás inscrito en grupos regulares.</p>
                  </div>
              )}
          </div>

          {/* RIGHT: EVENTS LIST */}
          <div className="flex flex-col gap-6">
              
              <div>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-4 px-1">Próximos Eventos</h3>
                  <div className="flex flex-col gap-3">
                      {marketplaceEvents.length > 0 ? (
                          marketplaceEvents.map(evt => (
                              <div key={evt.id} onClick={() => setSelectedEvent(evt)} className="flex items-center gap-4 p-4 rounded-2xl bg-[#1c1c1e] border border-zinc-800 hover:bg-zinc-800 cursor-pointer transition-colors group shadow-sm">
                                  <div className="flex flex-col items-center justify-center w-12 shrink-0 bg-zinc-900/50 rounded-xl py-2 border border-zinc-800">
                                      <span className="text-[9px] font-bold uppercase text-zinc-500">{new Date(evt.date).toLocaleDateString('es-ES', {month: 'short'})}</span>
                                      <span className="text-lg font-bold text-white leading-none">{new Date(evt.date).getDate()}</span>
                                  </div>
                                  <div className="min-w-0">
                                      <p className="text-sm font-bold text-zinc-200 truncate group-hover:text-white transition-colors">{evt.title}</p>
                                      <p className="text-xs text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                                          {evt.type === 'exam' ? <span className="size-1.5 bg-purple-500 rounded-full"></span> : <span className="size-1.5 bg-orange-500 rounded-full"></span>}
                                          {evt.time}
                                      </p>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="p-6 rounded-2xl border border-dashed border-zinc-800 text-center">
                              <p className="text-xs text-zinc-600">No hay eventos próximos.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      </div>

      {/* --- EVENT MODAL (Dark Theme) --- */}
      {selectedEvent && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedEvent(null)}>
              <div className="bg-[#1c1c1e] rounded-3xl w-full max-w-lg shadow-2xl border border-zinc-800 overflow-hidden" onClick={e => e.stopPropagation()}>
                  
                  <div className="p-8 border-b border-zinc-800">
                      <div className="flex justify-between items-start mb-4">
                          <span className={`text-[10px] font-bold uppercase tracking-widest border px-2 py-1 rounded ${
                              selectedEvent.type === 'exam' ? 'text-purple-400 border-purple-500/20 bg-purple-500/10' : 'text-orange-400 border-orange-500/20 bg-orange-500/10'
                          }`}>
                              {selectedEvent.type === 'exam' ? 'Examen Oficial' : 'Evento Especial'}
                          </span>
                          <button onClick={() => setSelectedEvent(null)} className="text-zinc-500 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded-full">
                              <span className="material-symbols-outlined">close</span>
                          </button>
                      </div>
                      <h2 className="text-2xl font-bold text-white mb-2">{selectedEvent.title}</h2>
                      <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">{selectedEvent.description}</p>
                  </div>

                  <div className="p-8 bg-[#121212]">
                      <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                              <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">calendar_today</span> Fecha
                              </p>
                              <p className="font-mono text-sm text-white">{new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString()}</p>
                          </div>
                          <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                              <p className="text-[10px] font-bold text-zinc-500 uppercase mb-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-xs">schedule</span> Hora
                              </p>
                              <p className="font-mono text-sm text-white">{selectedEvent.time}</p>
                          </div>
                      </div>

                      {selectedEvent.type === 'exam' && !selectedEvent.registrants?.includes(student?.id || '') ? (
                          <div className="flex items-center gap-3 text-amber-500 bg-amber-900/10 p-4 rounded-xl border border-amber-900/30">
                              <span className="material-symbols-outlined text-lg">lock</span>
                              <p className="text-xs font-medium">Inscripción restringida. Contacta a tu maestro.</p>
                          </div>
                      ) : (
                          <>
                              {selectedEvent.registrants?.includes(student?.id || '') ? (
                                  <div className="w-full py-4 bg-green-500/10 border border-green-500/20 text-green-500 text-sm font-bold text-center rounded-xl flex items-center justify-center gap-2">
                                      <span className="material-symbols-outlined text-lg">check_circle</span>
                                      Ya estás inscrito
                                  </div>
                              ) : (
                                  <button 
                                      onClick={handleRegister}
                                      className="w-full py-4 bg-white hover:bg-zinc-200 text-black font-bold text-sm rounded-xl transition-colors shadow-lg active:scale-95"
                                  >
                                      Confirmar Asistencia
                                  </button>
                              )}
                          </>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default StudentDashboard;
