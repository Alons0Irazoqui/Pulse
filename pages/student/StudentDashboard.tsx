import React, { useMemo, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { Event } from '../../types';

const StudentDashboard: React.FC = () => {
  const { currentUser, students, academySettings, events, classes, registerForEvent } = useStore();
  const { addToast } = useToast();
  
  const student = students.find(s => s.id === currentUser?.studentId);
  
  // -- STATE --
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // -- RANK PROGRESS LOGIC --
  const currentRankConfig = academySettings.ranks.find(r => r.id === student?.rankId) || academySettings.ranks[0];
  const nextRankConfig = academySettings.ranks.find(r => r.order === currentRankConfig.order + 1);
  const required = currentRankConfig.requiredAttendance;
  const current = student?.attendance || 0;
  const progressPercent = Math.min((current / required) * 100, 100);

  // -- EVENT CATEGORIZATION --
  const today = new Date().toISOString().split('T')[0];

  // 1. Critical Exams (Assigned by Master)
  const nextAssignedExam = useMemo(() => {
      if (!student) return null;
      return events
          .filter(e => e.type === 'exam' && e.registrants?.includes(student.id) && e.date >= today)
          .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
  }, [events, student, today]);

  // 2. Marketplace Events (Tournaments & Seminars)
  const marketplaceEvents = useMemo(() => {
      return events
          .filter(e => e.type !== 'exam' && e.date >= today)
          .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [events, today]);

  // -- NEXT CLASS LOGIC --
  const todayDate = new Date();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = daysOfWeek[todayDate.getDay()];
  const todayStr = todayDate.toISOString().split('T')[0];

  const nextClass = useMemo(() => {
      if (!student) return null;
      let todaysClasses = classes.filter(cls => student.classesId?.includes(cls.id)).filter(cls => {
          const isRegular = cls.days.includes(currentDayName);
          const modification = cls.modifications.find(m => m.date === todayStr);
          const isMovedHere = cls.modifications.find(m => m.newDate === todayStr && m.type === 'move');
          if (modification?.type === 'cancel') return false;
          if (modification?.type === 'move') return false;
          return isRegular || isMovedHere;
      }).map(cls => {
          const modification = cls.modifications.find(m => m.date === todayStr);
          return { ...cls, instructor: (modification?.type === 'instructor' ? modification.newInstructor : cls.instructor) || cls.instructor };
      });
      todaysClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));
      const currentMinutes = todayDate.getHours() * 60 + todayDate.getMinutes();
      return todaysClasses.find(c => {
          const [h, m] = c.startTime.split(':').map(Number);
          return (h * 60 + m) > currentMinutes;
      });
  }, [classes, student, currentDayName, todayStr]);

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
          case 'exam': return 'stars'; // Cinturón/Rango visual
          case 'tournament': return 'emoji_events'; // Medalla
          case 'seminar': return 'menu_book'; // Libro/Aprendizaje
          default: return 'event';
      }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-10 flex flex-col gap-8 relative overflow-hidden">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-text-main">
              Hola, {student?.name.split(' ')[0]}
          </h2>
          <p className="text-text-secondary text-base font-normal">
              {nextRankConfig ? `Rumbo al ${nextRankConfig.name}` : 'Maestría alcanzada'}
          </p>
        </div>
      </header>

      {/* --- SECTION 1: CRITICAL ALERTS (EXAMS) --- */}
      {nextAssignedExam && (
          <div 
            onClick={() => setSelectedEvent(nextAssignedExam)}
            className="cursor-pointer relative overflow-hidden rounded-[2rem] bg-gray-900 text-white shadow-xl shadow-gray-900/20 group hover:scale-[1.01] transition-transform duration-300"
          >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-900 to-indigo-900 opacity-90"></div>
              {/* Animated Background */}
              <div className="absolute -right-20 -top-20 size-96 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
              
              <div className="relative z-10 p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  <div className="flex items-start gap-6">
                      <div className="size-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                          <span className="material-symbols-outlined text-4xl text-yellow-400">stars</span>
                      </div>
                      <div>
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 text-xs font-bold uppercase tracking-wider mb-2 animate-pulse">
                              <span className="size-2 rounded-full bg-yellow-400"></span>
                              Convocatoria Oficial
                          </div>
                          <h3 className="text-2xl md:text-3xl font-black leading-tight mb-1">{nextAssignedExam.title}</h3>
                          <p className="text-white/70 font-medium flex items-center gap-2">
                              <span className="material-symbols-outlined text-lg">event</span>
                              {new Date(nextAssignedExam.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                              <span className="w-1 h-1 bg-white/50 rounded-full mx-1"></span>
                              {nextAssignedExam.time}
                          </p>
                      </div>
                  </div>
                  <div className="bg-white text-gray-900 px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg group-hover:bg-gray-100 transition-colors">
                      Ver Instrucciones
                      <span className="material-symbols-outlined text-lg">visibility</span>
                  </div>
              </div>
          </div>
      )}

      {/* --- SECTION 2: DASHBOARD GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
        
        {/* Next Class Widget */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-card flex flex-col justify-between h-[300px] relative overflow-hidden group">
             <div className="relative z-10">
                 <h3 className="text-lg font-bold text-text-main flex items-center gap-2 mb-6">
                    <span className="material-symbols-outlined text-blue-500">schedule</span>
                    Entrenamiento de Hoy
                 </h3>
                 
                 {nextClass ? (
                     <div className="space-y-4">
                         <div>
                             <p className="text-4xl font-black text-text-main tracking-tight">{nextClass.startTime}</p>
                             <p className="text-text-secondary font-medium mt-1">{nextClass.name}</p>
                         </div>
                         <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm text-text-main font-semibold border border-gray-100">
                             <div className="size-6 rounded-full bg-gray-200 flex items-center justify-center">
                                 <span className="material-symbols-outlined text-xs">person</span>
                             </div>
                             {nextClass.instructor}
                         </div>
                     </div>
                 ) : (
                     <div className="flex flex-col items-center justify-center h-40 text-text-secondary">
                         <span className="material-symbols-outlined text-4xl opacity-20 mb-2">bedtime</span>
                         <p className="text-sm font-medium">Clases terminadas por hoy</p>
                     </div>
                 )}
             </div>
             
             {/* Progress Mini-Bar */}
             <div className="relative z-10 mt-auto pt-6 border-t border-gray-50">
                 <div className="flex justify-between text-xs font-bold text-text-secondary mb-2">
                     <span>Progreso de Rango</span>
                     <span className={student?.status === 'exam_ready' ? 'text-green-600' : 'text-primary'}>{current} / {required}</span>
                 </div>
                 <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                     <div 
                        className={`h-full rounded-full transition-all duration-1000 ${student?.status === 'exam_ready' ? 'bg-green-500' : 'bg-primary'}`} 
                        style={{ width: `${progressPercent}%` }}
                     ></div>
                 </div>
                 {student?.status === 'exam_ready' && (
                     <p className="text-[10px] text-green-600 font-bold mt-2 text-center bg-green-50 py-1 rounded">
                         ¡LISTO PARA EXAMEN!
                     </p>
                 )}
             </div>
        </div>

        {/* --- MARKETPLACE: AVAILABLE EVENTS --- */}
        <div className="md:col-span-1 xl:col-span-2 flex flex-col gap-4">
            <h3 className="text-lg font-bold text-text-main flex items-center gap-2 px-2">
                <span className="material-symbols-outlined text-orange-500">local_activity</span>
                Eventos Disponibles
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {marketplaceEvents.length > 0 ? (
                    marketplaceEvents.map(evt => {
                        const isRegistered = evt.registrants?.includes(student?.id || '');
                        const icon = getEventIcon(evt.type);
                        
                        return (
                            <div key={evt.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all group flex flex-col">
                                <div className="flex justify-between items-start mb-4">
                                    <div className={`size-12 rounded-2xl flex items-center justify-center ${
                                        evt.type === 'tournament' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                                    }`}>
                                        <span className="material-symbols-outlined text-2xl">{icon}</span>
                                    </div>
                                    {isRegistered && (
                                        <span className="bg-green-100 text-green-700 text-[10px] font-bold uppercase px-2 py-1 rounded-lg flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">check_circle</span>
                                            Inscrito
                                        </span>
                                    )}
                                </div>
                                
                                <h4 className="text-lg font-bold text-text-main leading-tight mb-1">{evt.title}</h4>
                                <p className="text-sm text-text-secondary font-medium mb-4">
                                    {new Date(evt.date).toLocaleDateString()} • {evt.time}
                                </p>
                                
                                <div className="mt-auto">
                                    <button 
                                        onClick={() => setSelectedEvent(evt)}
                                        className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                                            isRegistered 
                                            ? 'bg-gray-50 text-text-main border border-gray-200 hover:bg-gray-100'
                                            : 'bg-white text-primary border-2 border-primary hover:bg-primary hover:text-white'
                                        }`}
                                    >
                                        {isRegistered ? 'Ver Detalles' : 'Más Información'}
                                        {!isRegistered && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="col-span-full bg-gray-50 rounded-3xl border-dashed border-2 border-gray-200 p-8 flex flex-col items-center justify-center text-center">
                        <span className="material-symbols-outlined text-gray-300 text-4xl mb-2">event_busy</span>
                        <p className="text-text-secondary font-medium">No hay eventos próximos.</p>
                        <p className="text-xs text-gray-400">Revisa más tarde para torneos o seminarios.</p>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* --- UNIVERSAL EVENT MODAL --- */}
      {selectedEvent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setSelectedEvent(null)}>
              <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl relative overflow-hidden" onClick={e => e.stopPropagation()}>
                  
                  {/* Modal Header with Dynamic Style */}
                  <div className={`p-8 pb-12 relative ${
                      selectedEvent.type === 'exam' ? 'bg-gray-900 text-white' : 
                      selectedEvent.type === 'tournament' ? 'bg-orange-500 text-white' : 
                      'bg-blue-600 text-white'
                  }`}>
                      <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full backdrop-blur-md transition-colors">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                      
                      <div className="flex items-center gap-3 mb-4 opacity-90">
                          <span className="material-symbols-outlined text-2xl">{getEventIcon(selectedEvent.type)}</span>
                          <span className="text-sm font-bold uppercase tracking-wider">
                              {selectedEvent.type === 'exam' ? 'Examen de Grado' : 
                               selectedEvent.type === 'tournament' ? 'Torneo Oficial' : 'Seminario Técnico'}
                          </span>
                      </div>
                      <h2 className="text-3xl font-black leading-tight">{selectedEvent.title}</h2>
                  </div>

                  {/* Modal Body */}
                  <div className="p-8 -mt-6 bg-white rounded-t-[2rem] relative z-10 flex flex-col gap-6">
                      
                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gray-50 p-4 rounded-2xl">
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Fecha</p>
                              <p className="font-bold text-text-main">{new Date(selectedEvent.date).toLocaleDateString()}</p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-2xl">
                              <p className="text-xs font-bold text-gray-400 uppercase mb-1">Horario</p>
                              <p className="font-bold text-text-main">{selectedEvent.time}</p>
                          </div>
                      </div>

                      {/* Description */}
                      <div>
                          <h4 className="text-sm font-bold text-text-main mb-2">Detalles del Evento</h4>
                          <p className="text-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                              {selectedEvent.description}
                          </p>
                      </div>

                      {/* Action Area */}
                      <div className="pt-4 border-t border-gray-100">
                          {selectedEvent.type === 'exam' ? (
                              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 flex items-start gap-3">
                                  <span className="material-symbols-outlined text-yellow-600">info</span>
                                  <div>
                                      <p className="text-sm font-bold text-yellow-800">Inscripción Controlada</p>
                                      <p className="text-xs text-yellow-700 mt-1">
                                          Tu maestro gestiona la lista de este examen. Si tienes dudas sobre tu participación, contáctalo directamente.
                                      </p>
                                  </div>
                              </div>
                          ) : (
                              // MARKETPLACE ACTIONS
                              <>
                                  {selectedEvent.registrants?.includes(student?.id || '') ? (
                                      <div className="flex flex-col gap-3 items-center">
                                          <div className="flex items-center gap-2 text-green-600 font-bold bg-green-50 px-4 py-2 rounded-full">
                                              <span className="material-symbols-outlined">check_circle</span>
                                              Ya estás inscrito
                                          </div>
                                          <p className="text-xs text-gray-400">Preséntate con tu uniforme limpio 15 minutos antes.</p>
                                      </div>
                                  ) : (
                                      <div className="flex flex-col gap-3">
                                          <div className="flex items-center justify-between text-sm text-text-secondary mb-2">
                                              <span>Cupos disponibles</span>
                                              <span className="font-bold text-text-main">
                                                  {(selectedEvent.capacity || 0) - (selectedEvent.registrants?.length || 0)}
                                              </span>
                                          </div>
                                          <button 
                                              onClick={handleRegister}
                                              className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                                          >
                                              <span>Confirmar Inscripción</span>
                                              <span className="material-symbols-outlined">how_to_reg</span>
                                          </button>
                                      </div>
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