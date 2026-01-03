import React from 'react';
import { useStore } from '../../context/StoreContext';

const StudentDashboard: React.FC = () => {
  const { currentUser, students, academySettings, events } = useStore();
  const student = students.find(s => s.id === currentUser?.studentId);
  
  // Find current rank configuration
  const currentRankConfig = academySettings.ranks.find(r => r.id === student?.rankId) || academySettings.ranks[0];
  const nextRankConfig = academySettings.ranks.find(r => r.order === currentRankConfig.order + 1);

  // Dynamic Progress Calculation
  const required = currentRankConfig.requiredAttendance;
  const current = student?.attendance || 0;
  const progressPercent = Math.min((current / required) * 100, 100);

  // Check for upcoming exams
  const upcomingExam = events.find(e => e.type === 'exam' && new Date(e.date) >= new Date());

  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-10 flex flex-col gap-8 relative overflow-hidden">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text-main">Hola, {student?.name || 'Alumno'}</h2>
          <p className="text-text-secondary text-base font-normal">Así va tu camino hacia el {nextRankConfig?.name || 'Siguiente Nivel'}.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 relative z-10">
        {/* Main Progress Card */}
        <div className="md:col-span-2 bg-white rounded-3xl border border-white/60 p-8 shadow-card relative overflow-hidden group">
             <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at top right, #007AFF 0%, transparent 60%)' }}></div>
             <div className="flex flex-col h-full justify-between relative z-10 gap-8">
                <div className="flex flex-col md:flex-row gap-8 items-start md:items-center">
                    <div className="w-full md:w-5/12 aspect-[16/9] rounded-2xl overflow-hidden relative shadow-lg ring-1 ring-black/5 bg-gray-900 flex items-center justify-center">
                         <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black"></div>
                         <div className="z-10 flex flex-col items-center gap-2">
                             <div className="h-4 w-32 rounded shadow-lg" style={{ backgroundColor: currentRankConfig.color }}></div>
                             <span className="text-white font-bold text-lg">{currentRankConfig.name}</span>
                         </div>
                    </div>
                    <div className="flex-1 flex flex-col gap-6 w-full">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-text-secondary text-xs font-bold uppercase tracking-widest mb-1">Próximo Objetivo</p>
                                <h3 className="text-3xl font-bold text-text-main tracking-tight">{nextRankConfig?.name || 'Maestría'}</h3>
                            </div>
                            <div className={`${student?.status === 'exam_ready' ? 'bg-blue-100 text-blue-700 animate-pulse' : 'bg-green-50 text-green-600'} px-3 py-1.5 rounded-full border border-green-100`}>
                                <span className="font-semibold text-sm">
                                    {student?.status === 'exam_ready' ? '¡Listo para Examen!' : `${progressPercent.toFixed(0)}% Completado`}
                                </span>
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
                    </div>
                </div>
             </div>
        </div>

        {/* Notifications / Events Card */}
        <div className="bg-surface-white rounded-3xl p-6 shadow-card border border-gray-100 flex flex-col">
            <h3 className="text-lg font-bold text-text-main mb-4">Próximos Eventos</h3>
            <div className="flex-1 flex flex-col gap-4 overflow-y-auto max-h-[300px]">
                {upcomingExam ? (
                    <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                            <span className="material-symbols-outlined text-lg">workspace_premium</span>
                            Examen de Grado
                        </div>
                        <p className="text-text-main font-semibold">{upcomingExam.title}</p>
                        <p className="text-text-secondary text-xs">{upcomingExam.date} • {upcomingExam.time}</p>
                        {student?.status === 'exam_ready' && (
                            <button className="mt-2 w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm">
                                Inscribirse al Examen
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-text-secondary text-sm">
                        No hay eventos próximos.
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;