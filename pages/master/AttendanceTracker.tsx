
import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';

const AttendanceTracker: React.FC = () => {
  const { students, markAttendance } = useStore();
  const { addToast } = useToast();
  
  // Filter only active students for attendance
  const activeStudents = students.filter(s => s.status === 'active' || s.status === 'exam_ready');
  const today = new Date().toISOString().split('T')[0];

  const hasAttendedToday = (studentId: string) => {
      const student = students.find(s => s.id === studentId);
      return student?.attendanceHistory?.some(r => r.date === today);
  };

  return (
    <div className="max-w-[1000px] mx-auto w-full px-4 sm:px-6 py-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main mb-2">Control de Asistencia</h1>
          <div className="flex items-center gap-2 text-text-secondary">
            <span className="material-symbols-outlined text-[20px]">calendar_today</span>
            <span>Clase de Hoy ({today})</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
        {activeStudents.map((student) => {
            const attended = hasAttendedToday(student.id);
            return (
                <div key={student.id} className={`group flex items-center justify-between p-4 transition-colors ${attended ? 'bg-green-50/30' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <img src={student.avatarUrl} alt={student.name} className="size-12 rounded-full object-cover border-2 border-gray-100" />
                            {attended && (
                                <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full border-2 border-white size-5 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-white text-[10px]">check</span>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-semibold text-text-main text-base">{student.name}</span>
                            <span className="text-sm text-text-secondary">{student.rank}</span>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            if (!attended) {
                                markAttendance(student.id);
                                addToast(`Asistencia marcada para ${student.name}`, 'success');
                            }
                        }}
                        disabled={attended}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2 ${
                            attended 
                            ? 'bg-green-100 text-green-700 cursor-default'
                            : 'bg-white border border-gray-200 hover:bg-green-50 hover:border-green-200 hover:text-green-700'
                        }`}
                    >
                        <span className="material-symbols-outlined text-lg">
                            {attended ? 'check_circle' : 'check'}
                        </span>
                        {attended ? 'Asistió' : 'Marcar Presente'}
                    </button>
                </div>
            );
        })}
        {activeStudents.length === 0 && (
            <div className="p-8 text-center text-text-secondary">
                No hay alumnos activos para mostrar.
            </div>
        )}
      </div>
    </div>
  );
};

export default AttendanceTracker;
