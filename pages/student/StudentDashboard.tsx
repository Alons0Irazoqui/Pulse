
import React, { useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';

const StudentDashboard: React.FC = () => {
  const { currentUser, students, academySettings, events, classes, payments, registerForEvent } = useStore();
  const { addToast } = useToast();
  const student = students.find(s => s.id === currentUser?.studentId);
  
  // Find current rank configuration
  const currentRankConfig = academySettings.ranks.find(r => r.id === student?.rankId) || academySettings.ranks[0];
  const nextRankConfig = academySettings.ranks.find(r => r.order === currentRankConfig.order + 1);

  // Dynamic Progress Calculation
  const required = currentRankConfig.requiredAttendance;
  const current = student?.attendance || 0;
  const progressPercent = Math.min((current / required) * 100, 100);

  // --- UPCOMING EVENTS LOGIC ---
  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events
    .filter(e => e.date >= today)
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // --- PENDING PAYMENTS LOGIC ---
  const pendingPayments = payments.filter(p => p.studentId === student?.id && p.status === 'pending');
  const totalDebt = pendingPayments.reduce((acc, p) => acc + p.amount, 0);

  // --- NEXT CLASS LOGIC (SMART) ---
  const todayDate = new Date();
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const currentDayName = daysOfWeek[todayDate.getDay()];
  const todayStr = todayDate.toISOString().split('T')[0];

  const nextClass = useMemo(() => {
      if (!student) return null;
      
      // Get all potential classes for today
      let todaysClasses = classes.filter(cls => 
          student.classesId?.includes(cls.id) // Must be enrolled
      ).filter(cls => {
          // 1. Is it a regular day for this class?
          const isRegular = cls.days.includes(currentDayName);
          
          // 2. Check exceptions for TODAY
          const modification = cls.modifications.find(m => m.date === todayStr);
          const isMovedHere = cls.modifications.find(m => m.newDate === todayStr && m.type === 'move');

          if (modification?.type === 'cancel') return false; // Explicitly cancelled today
          if (modification?.type === 'move') return false; // Moved AWAY from today

          return isRegular || isMovedHere;
      }).map(cls => {
          // Apply Modifiers (Instructor)
          const modification = cls.modifications.find(m => m.date === todayStr);
          return {
              ...cls,
              instructor: (modification?.type === 'instructor' ? modification.newInstructor : cls.instructor) || cls.instructor
          };
      });
      
      // Sort by start time
      todaysClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      // Find first class after current time
      const currentHours = todayDate.getHours();
      const currentMinutes = todayDate.getMinutes();
      const currentTimeVal = currentHours * 60 + currentMinutes;

      const upcoming = todaysClasses.find(c => {
          const [h, m] = c.startTime.split(':').map(Number);
          return (h * 60 + m) > currentTimeVal;
      });

      return upcoming || (todaysClasses.length > 0 ? todaysClasses[0] : null); // Show first if all passed, or specific logic
  }, [classes, student, currentDayName, todayStr]);

  const handleRegister = (eventId: string) => {
      if(student) {
          registerForEvent(student.id, eventId);
          addToast('Inscripción exitosa', 'success');
      }
  };

  const getEventTypeLabel = (type: string) => {
      switch(type) {
          case 'exam': return { icon: 'workspace_premium', color: 'text-purple-600', bg: 'bg-purple-50', label: 'Examen' };
          case 'tournament': return { icon: 'emoji_events', color: 'text-orange-600', bg: 'bg-orange-50', label: 'Torneo' };
          case 'seminar': return { icon: 'school', color: 'text-blue-600', bg: 'bg-blue-50', label: 'Seminario' };
          default: return { icon: 'event', color: 'text-gray-600', bg: 'bg-gray-50', label: 'Evento' };
      }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-10 flex flex-col gap-8 relative overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text-main">Hola, {student?.name || 'Alumno'}</h2>
          <p className="text-text-secondary text-base font-normal">Así va tu camino hacia el {nextRankConfig?.name || 'Siguiente Nivel'}.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
        
        {/* Next Class Alert Card */}
        {nextClass ? (
            <div className="md:col-span-2 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl p-8 shadow-lg shadow-blue-500/20 text-white relative overflow-hidden flex items-center justify-between">
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2 text-blue-100 font-bold text-sm uppercase tracking-wide">
                        <span className="material-symbols-outlined text-lg">schedule</span>
                        Tu Próxima Clase Hoy
                    </div>
                    <h3 className="text-3xl font-black mb-1">{nextClass.name}</h3>
                    <p className="text-lg opacity-90">A las {nextClass.startTime} con {nextClass.instructor}</p>
                </div>
                <div className="hidden sm:block relative z-10">
                    <span className="material-symbols-outlined text-8xl opacity-20">sports_martial_arts</span>
                </div>
            </div>
        ) : (
            <div className="md:col-span-2 bg-white rounded-3xl border border-gray-100 p-8 shadow-card flex items-center justify-between">
                 <div>
                    <h3 className="text-xl font-bold text-text-main">No tienes más clases hoy</h3>
                    <p className="text-text-secondary mt-1">Aprovecha para revisar la biblioteca técnica o descansar.</p>
                 </div>
                 <div className="size-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                     <span className="material-symbols-outlined text-2xl">weekend</span>
                 </div>
            </div>
        )}

        {/* Main Progress Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-card relative overflow-hidden group">
             <div className="flex flex-col h-full justify-between relative z-10 gap-6">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-1">Meta Actual</p>
                        <h3 className="text-2xl font-bold text-text-main">{nextRankConfig?.name || 'Maestría'}</h3>
                    </div>
                    <div className="h-10 w-10 rounded-full flex items-center justify-center bg-gray-50 border border-gray-100">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: nextRankConfig?.color || 'gray' }}></div>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-xs font-medium text-text-secondary">
                        <span>Progreso de Asistencia</span>
                        <span className="text-text-main">{current} / {required} Clases</span>
                    </div>
                    <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full shadow-[0_0_15px_rgba(0,122,255,0.4)] transition-all duration-1000 ${student?.status === 'exam_ready' ? 'bg-blue-600' : 'bg-gradient-to-r from-primary to-indigo-500'}`} style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-50">
                    <div className="h-12 w-20 rounded-lg shadow-sm ring-1 ring-black/5 flex items-center justify-center bg-gray-900">
                         <div className="h-2 w-12 rounded" style={{ backgroundColor: currentRankConfig.color }}></div>
                    </div>
                    <div>
                        <p className="text-xs text-text-secondary font-semibold uppercase">Cinturón Actual</p>
                        <p className="text-sm font-bold text-text-main">{currentRankConfig.name}</p>
                    </div>
                </div>
             </div>
        </div>

        {/* Payments Summary Card */}
        <div className="xl:col-span-1 bg-white rounded-3xl p-6 shadow-card border border-gray-100 flex flex-col">
            <h3 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400">payments</span>
                Estado de Cuenta
            </h3>
            
            {pendingPayments.length > 0 ? (
                <div className="flex-1 flex flex-col gap-4">
                    <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 flex flex-col gap-1">
                        <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">Total Pendiente</span>
                        <span className="text-2xl font-black text-orange-700">${totalDebt.toFixed(2)}</span>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[200px] space-y-2 pr-2">
                        {pendingPayments.map(p => (
                            <div key={p.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
                                <div>
                                    <p className="text-sm font-semibold text-text-main">{p.category}</p>
                                    <p className="text-xs text-text-secondary">{new Date(p.date).toLocaleDateString()}</p>
                                </div>
                                <span className="text-sm font-bold text-text-main">${p.amount}</span>
                            </div>
                        ))}
                    </div>
                    <Link to="/student/payments" className="w-full py-3 bg-text-main text-white rounded-xl font-bold text-sm text-center hover:bg-black transition-colors">
                        Gestionar Pagos
                    </Link>
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-green-50 rounded-2xl border border-green-100">
                    <div className="size-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2">
                        <span className="material-symbols-outlined">verified</span>
                    </div>
                    <p className="font-bold text-green-800">¡Todo al día!</p>
                    <p className="text-xs text-green-700 mt-1">No tienes pagos pendientes.</p>
                </div>
            )}
        </div>

        {/* Notifications / Events Card */}
        <div className="xl:col-span-2 bg-surface-white rounded-3xl p-6 shadow-card border border-gray-100 flex flex-col h-[350px]">
            <h3 className="text-lg font-bold text-text-main mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-yellow-500">campaign</span>
                Próximos Eventos y Torneos
            </h3>
            <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-2">
                {upcomingEvents.length > 0 ? (
                    upcomingEvents.map(event => {
                        const style = getEventTypeLabel(event.type);
                        const isRegistered = student && event.registrants?.includes(student.id);

                        return (
                            <div key={event.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all gap-4">
                                <div className="flex items-center gap-4">
                                    <div className="flex flex-col items-center justify-center min-w-[60px] h-[60px] bg-gray-50 rounded-2xl border border-gray-200">
                                        <span className="text-[10px] font-bold text-red-500 uppercase">{new Date(event.date).toLocaleString('es-ES', { month: 'short' })}</span>
                                        <span className="text-xl font-black text-text-main leading-none">{new Date(event.date).getDate()}</span>
                                    </div>
                                    <div>
                                        <div className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded w-fit mb-1 flex items-center gap-1 ${style.bg} ${style.color}`}>
                                            <span className="material-symbols-outlined text-[12px]">{style.icon}</span>
                                            {style.label}
                                        </div>
                                        <h4 className="font-bold text-text-main text-lg leading-tight">{event.title}</h4>
                                        <p className="text-xs text-text-secondary mt-1 flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">schedule</span> {event.time}
                                            <span className="mx-1">•</span>
                                            {event.description}
                                        </p>
                                    </div>
                                </div>
                                
                                <button 
                                    onClick={() => handleRegister(event.id)}
                                    disabled={!!isRegistered}
                                    className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 min-w-[140px] ${
                                        isRegistered 
                                        ? 'bg-green-100 text-green-700 cursor-default' 
                                        : 'bg-primary text-white hover:bg-primary-hover shadow-blue-500/20 active:scale-95'
                                    }`}
                                >
                                    {isRegistered ? (
                                        <>
                                            <span className="material-symbols-outlined text-[18px]">check_circle</span>
                                            Inscrito
                                        </>
                                    ) : (
                                        <>
                                            Inscribirse
                                            <span className="material-symbols-outlined text-[18px]">login</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        );
                    })
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-text-secondary bg-gray-50 rounded-2xl border-dashed border-2 border-gray-200">
                        <span className="material-symbols-outlined text-4xl opacity-30 mb-2">event_busy</span>
                        <p className="text-sm font-medium">No hay eventos próximos.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
