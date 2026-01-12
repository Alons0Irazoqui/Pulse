
import React, { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { Event, CalendarEvent } from '../../types';
import { useAcademy } from '../../context/AcademyContext';
import { getLocalDate } from '../../utils/dateUtils';
import Avatar from '../../components/ui/Avatar';

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
  // Calculate percentage but cap at 100
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
          .slice(0, 2); // Show only top 2 to save space
  }, [events, todayStr, student, nextAssignedExam]);


  // -- ACTIONS --
  const handleRegister = () => {
      if(student && selectedEvent) {
          registerForEvent(student.id, selectedEvent.id);
          addToast('¡Te has inscrito correctamente!', 'success');
          setSelectedEvent(null);
      }
  };

  const getEventIcon = (type: string) => {
      switch(type) {
          case 'exam': return 'stars';
          case 'tournament': return 'emoji_events';
          case 'seminar': return 'menu_book';
          default: return 'event';
      }
  };

  return (
    <div className="max-w-[1600px] mx-auto p-6 md:p-10 flex flex-col gap-8 pb-24 text-white">
      
      {/* --- HEADER: WELCOME & SUMMARY --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-white mb-1">
              Hola, {student?.name.split(' ')[0]}
          </h2>
          <p className="text-text-secondary font-medium">
              {nextRankConfig 
                ? `Estás al ${Math.round(progressPercent)}% de tu camino hacia ${nextRankConfig.name}.` 
                : '¡Has alcanzado el máximo nivel registrado!'}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-background-paper px-4 py-2 rounded-xl shadow-sm border border-border">
            <span className="text-xs font-bold uppercase text-text-secondary tracking-wider">Tu Rango Actual:</span>
            <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase bg-background-subtle text-white border border-border`}>
                {student?.rank}
            </span>
        </div>
      </div>

      {/* --- CRITICAL ALERT: EXAM --- */}
      {nextAssignedExam && (
          <div 
            onClick={() => setSelectedEvent(nextAssignedExam)}
            className="cursor-pointer relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 shadow-xl shadow-purple-900/20 group hover:scale-[1.01] transition-transform duration-300 border border-white/10"
          >
              <div className="relative z-10 p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-6">
                      <div className="size-16 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                          <span className="material-symbols-outlined text-4xl text-yellow-400 animate-pulse">stars</span>
                      </div>
                      <div>
                          <div className="text-yellow-300 text-xs font-bold uppercase tracking-wider mb-1">Convocatoria Oficial</div>
                          <h3 className="text-2xl font-black leading-tight text-white">{nextAssignedExam.title}</h3>
                          <p className="text-white/70 text-sm">Prepárate para tu evaluación.</p>
                      </div>
                  </div>
                  <button className="bg-white text-black px-6 py-3 rounded-lg font-bold text-sm shadow-lg group-hover:bg-gray-200 transition-colors">
                      Ver Detalles
                  </button>
              </div>
          </div>
      )}

      {/* --- MAIN GRID: STATS & ACTIONS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* 1. FINANCIAL STATUS WIDGET */}
          <div className={`p-6 rounded-2xl border relative overflow-hidden flex flex-col justify-between h-[200px] group transition-colors ${hasDebt ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
              <div className="relative z-10">
                  <div className={`size-12 rounded-xl flex items-center justify-center mb-4 ${hasDebt ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                      <span className="material-symbols-outlined text-2xl">{hasDebt ? 'gpp_bad' : 'gpp_good'}</span>
                  </div>
                  <p className={`text-xs font-bold uppercase tracking-wider ${hasDebt ? 'text-red-400' : 'text-green-400'}`}>Estado de Cuenta</p>
                  <h3 className={`text-2xl font-black ${hasDebt ? 'text-white' : 'text-white'}`}>
                      {hasDebt ? `$${student?.balance.toFixed(2)}` : 'Al Corriente'}
                  </h3>
              </div>
              
              {hasDebt && (
                  <button 
                    onClick={() => navigate('/student/payments')}
                    className="relative z-10 mt-auto w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow-lg shadow-red-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                      Pagar Ahora <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
              )}
              {!hasDebt && (
                  <p className="text-sm text-green-400 mt-auto relative z-10">¡Gracias por tu pago!</p>
              )}
              
              {/* Decor */}
              <span className={`material-symbols-outlined absolute -bottom-4 -right-4 text-[120px] opacity-5 pointer-events-none ${hasDebt ? 'text-red-500' : 'text-green-500'}`}>
                  account_balance_wallet
              </span>
          </div>

          {/* 2. ATTENDANCE PROGRESS WIDGET */}
          <div className="bg-background-paper p-6 rounded-2xl shadow-card border border-border relative overflow-hidden h-[200px] flex flex-col">
              <div className="flex justify-between items-start mb-2">
                  <div>
                      <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">Asistencias</p>
                      <h3 className="text-2xl font-black text-white">{current} <span className="text-sm text-text-muted font-medium">/ {required}</span></h3>
                  </div>
                  <div className="size-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center">
                      <span className="material-symbols-outlined">directions_run</span>
                  </div>
              </div>
              
              <div className="flex-1 flex flex-col justify-end">
                  <div className="w-full bg-background-subtle h-3 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-blue-500 rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ width: `${progressPercent}%` }}></div>
                  </div>
                  <p className="text-xs text-text-secondary">
                      {progressPercent >= 100 
                        ? '¡Requisitos cumplidos!' 
                        : `Te faltan ${required - current} clases para examen.`}
                  </p>
              </div>
          </div>

          {/* 3. NEXT CLASS WIDGET (Hero) */}
          <div className="lg:col-span-2 bg-gradient-to-br from-primary to-orange-700 p-8 rounded-2xl text-white relative overflow-hidden shadow-2xl shadow-primary/10 group h-[200px] flex flex-col justify-center border border-white/5">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                  <span className="material-symbols-outlined text-[140px]">schedule</span>
              </div>
              
              <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                      <span className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-white/10">Próxima Clase</span>
                  </div>
                  
                  {nextClass ? (
                      <div>
                          <h2 className="text-3xl md:text-4xl font-black leading-none mb-2">{nextClass.title}</h2>
                          <div className="flex items-center gap-4 text-white/80">
                              <span className="font-medium text-lg">
                                  {nextClass.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}
                              </span>
                              <span className="w-1 h-1 bg-white/50 rounded-full"></span>
                              <span className="text-sm uppercase tracking-wide font-bold">{nextClass.instructor}</span>
                          </div>
                      </div>
                  ) : (
                      <div>
                          <h2 className="text-2xl font-bold text-white/90">Sin clases hoy</h2>
                          <p className="text-white/60 text-sm mt-1">Consulta el calendario completo.</p>
                          <button onClick={() => navigate('/student/schedule')} className="mt-4 text-xs font-bold uppercase tracking-wider text-white border-b border-white/30 hover:border-white pb-0.5 transition-colors">
                              Ver Calendario
                          </button>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* --- SECONDARY SECTION: CLASSES & EXTRA --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT: MY ENROLLED CLASSES (List) */}
          <div className="lg:col-span-2 bg-background-paper rounded-2xl border border-border shadow-card p-8">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary">class</span>
                      Mis Clases
                  </h3>
                  <button onClick={() => navigate('/student/classes')} className="text-sm font-bold text-primary hover:text-white transition-colors">
                      Ver Todo
                  </button>
              </div>

              {myEnrolledClasses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {myEnrolledClasses.map(cls => (
                          <div key={cls.id} onClick={() => navigate(`/student/classes/${cls.id}`)} className="p-4 rounded-xl bg-background-subtle border border-border hover:bg-background-elevated hover:border-border transition-all cursor-pointer group">
                              <div className="flex items-start justify-between mb-3">
                                  <div className="size-10 rounded-lg bg-background flex items-center justify-center shadow-sm text-text-secondary group-hover:text-primary transition-colors">
                                      <span className="material-symbols-outlined">sports_martial_arts</span>
                                  </div>
                                  <span className="text-[10px] font-bold uppercase bg-background border border-border px-2 py-1 rounded text-text-secondary">
                                      {cls.studentCount} Alumnos
                                  </span>
                              </div>
                              <h4 className="font-bold text-white text-lg mb-1">{cls.name}</h4>
                              <p className="text-xs text-text-secondary mb-3 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[12px]">schedule</span> {cls.schedule}
                              </p>
                              <div className="flex items-center gap-2 pt-3 border-t border-border">
                                  <Avatar name={cls.instructor} className="size-6 rounded-full text-[10px]" />
                                  <span className="text-xs font-medium text-text-secondary">{cls.instructor}</span>
                              </div>
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="text-center py-10 bg-background-subtle rounded-xl border border-dashed border-border">
                      <p className="text-text-secondary text-sm">No estás inscrito en grupos regulares.</p>
                  </div>
              )}
          </div>

          {/* RIGHT: EVENTS & BELT STATUS */}
          <div className="flex flex-col gap-6">
              
              {/* Event List */}
              <div className="bg-background-paper rounded-2xl p-6 border border-border shadow-sm">
                  <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider mb-4">Eventos Próximos</h3>
                  <div className="flex flex-col gap-3">
                      {marketplaceEvents.length > 0 ? (
                          marketplaceEvents.map(evt => (
                              <div key={evt.id} onClick={() => setSelectedEvent(evt)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-background-subtle cursor-pointer transition-colors border border-transparent hover:border-border">
                                  <div className={`size-10 rounded-lg flex flex-col items-center justify-center shrink-0 text-white shadow-sm ${evt.type === 'tournament' ? 'bg-orange-600' : 'bg-blue-600'}`}>
                                      <span className="text-[10px] font-bold uppercase">{new Date(evt.date).toLocaleDateString('es-ES', {month: 'short'})}</span>
                                      <span className="text-sm font-black leading-none">{new Date(evt.date).getDate()}</span>
                                  </div>
                                  <div className="min-w-0">
                                      <p className="text-sm font-bold text-white truncate">{evt.title}</p>
                                      <p className="text-xs text-text-secondary truncate">{evt.time} • {evt.type === 'exam' ? 'Examen' : 'Evento'}</p>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <p className="text-xs text-text-muted italic">No hay eventos próximos.</p>
                      )}
                  </div>
              </div>

              {/* Current Belt Card */}
              {student && (
                  <div className="bg-background-paper rounded-2xl p-6 border border-border shadow-sm relative overflow-hidden flex flex-col justify-between min-h-[180px]">
                      <div>
                          <div className="flex justify-between items-start mb-2">
                              <div>
                                  <span className="text-[10px] font-bold uppercase tracking-wider bg-background-subtle text-text-secondary px-2 py-1 rounded-md">
                                      Tu Cinturón
                                  </span>
                                  <h3 className="text-xl font-black text-white mt-3 leading-none">
                                      {student.rank}
                                  </h3>
                              </div>
                              <div className="size-10 flex items-center justify-center rounded-full bg-background-subtle border border-border">
                                  <span className="material-symbols-outlined text-text-muted">workspace_premium</span>
                              </div>
                          </div>
                          
                          {/* Belt Visual */}
                          <div className={`mt-4 h-12 w-full rounded-lg shadow-sm border flex items-center justify-end pr-3 relative overflow-hidden ${
                              student.rankColor === 'white' ? 'bg-gray-100 border-gray-300' :
                              student.rankColor === 'yellow' ? 'bg-yellow-400 border-yellow-500' :
                              student.rankColor === 'orange' ? 'bg-orange-500 border-orange-600' :
                              student.rankColor === 'green' ? 'bg-green-600 border-green-700' :
                              student.rankColor === 'blue' ? 'bg-blue-600 border-blue-700' :
                              student.rankColor === 'purple' ? 'bg-purple-600 border-purple-700' :
                              student.rankColor === 'brown' ? 'bg-[#5D4037] border-[#3E2723]' :
                              'bg-black border-gray-800'
                          }`}>
                              {/* Texture overlay */}
                              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/fabric-of-squares.png')]"></div>
                              
                              <div className={`relative h-full w-16 ${student.rankColor === 'black' ? 'bg-red-600' : 'bg-black'} flex items-center justify-center gap-1 shadow-lg`}>
                                  {Array.from({ length: student.stripes || 0 }).map((_, i) => (
                                      <div key={i} className="w-1.5 h-7 bg-white/90 rounded-sm shadow-sm"></div>
                                  ))}
                              </div>
                          </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border flex justify-between items-center text-xs">
                          <span className="text-text-secondary font-medium">
                              {student.stripes > 0 ? `${student.stripes} ${student.stripes === 1 ? 'Grado' : 'Grados'}` : 'Sin grados'}
                          </span>
                          {nextRankConfig && (
                              <span className="text-primary font-bold">
                                  Próximo: {nextRankConfig.name}
                              </span>
                          )}
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* --- EVENT MODAL (Reused) --- */}
      {selectedEvent && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedEvent(null)}>
              <div className="bg-background-paper rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden border border-border" onClick={e => e.stopPropagation()}>
                  
                  <div className={`p-8 pb-12 relative ${
                      selectedEvent.type === 'exam' ? 'bg-gradient-to-r from-gray-900 to-black text-white' : 
                      selectedEvent.type === 'tournament' ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white' : 
                      'bg-gradient-to-r from-blue-600 to-indigo-700 text-white'
                  }`}>
                      <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                      
                      <div className="flex items-center gap-3 mb-4 opacity-90">
                          <span className="material-symbols-outlined text-2xl">{getEventIcon(selectedEvent.type)}</span>
                          <span className="text-sm font-bold uppercase tracking-wider">
                              {selectedEvent.type === 'exam' ? 'Examen de Grado' : 'Evento Oficial'}
                          </span>
                      </div>
                      <h2 className="text-3xl font-black leading-tight">{selectedEvent.title}</h2>
                  </div>

                  <div className="p-8 -mt-6 bg-background-paper rounded-t-2xl relative z-10 flex flex-col gap-6 border-t border-border">
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-background-subtle p-4 rounded-xl border border-border">
                              <p className="text-xs font-bold text-text-secondary uppercase mb-1">Fecha</p>
                              <p className="font-bold text-white">{new Date(selectedEvent.date + 'T12:00:00').toLocaleDateString()}</p>
                          </div>
                          <div className="bg-background-subtle p-4 rounded-xl border border-border">
                              <p className="text-xs font-bold text-text-secondary uppercase mb-1">Horario</p>
                              <p className="font-bold text-white">{selectedEvent.time}</p>
                          </div>
                      </div>

                      <div>
                          <h4 className="text-sm font-bold text-white mb-2">Detalles</h4>
                          <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                              {selectedEvent.description}
                          </p>
                      </div>

                      <div className="pt-4 border-t border-border">
                          {selectedEvent.type === 'exam' && !selectedEvent.registrants?.includes(student?.id || '') ? (
                              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
                                  <span className="material-symbols-outlined text-yellow-500">info</span>
                                  <div>
                                      <p className="text-sm font-bold text-yellow-500">Inscripción Controlada</p>
                                      <p className="text-xs text-yellow-600/80 mt-1">
                                          Contacta a tu maestro para confirmar tu elegibilidad.
                                      </p>
                                  </div>
                              </div>
                          ) : (
                              <>
                                  {selectedEvent.registrants?.includes(student?.id || '') ? (
                                      <div className="flex items-center justify-center gap-2 text-green-400 font-bold bg-green-500/10 px-4 py-3 rounded-xl border border-green-500/20">
                                          <span className="material-symbols-outlined">check_circle</span>
                                          Ya estás inscrito
                                      </div>
                                  ) : (
                                      <button 
                                          onClick={handleRegister}
                                          className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                                      >
                                          <span>Confirmar Inscripción</span>
                                          <span className="material-symbols-outlined">how_to_reg</span>
                                      </button>
                                  )}
                              </>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default StudentDashboard;
