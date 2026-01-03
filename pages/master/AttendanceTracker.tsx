import React from 'react';
import { useStore } from '../../context/StoreContext';

const AttendanceTracker: React.FC = () => {
  const { students, markAttendance } = useStore();
  // Filter only active students for attendance
  const activeStudents = students.filter(s => s.status === 'active' || s.status === 'exam_ready');

  return (
    <div className="max-w-[1000px] mx-auto w-full px-4 sm:px-6 py-6 pb-24">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-main mb-2">Control de Asistencia</h1>
          <div className="flex items-center gap-2 text-text-secondary">
            <span className="material-symbols-outlined text-[20px]">calendar_today</span>
            <span>Clase de Hoy</span>
          </div>
        </div>
      </div>

      <div className="bg-surface-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100 overflow-hidden">
        {activeStudents.map((student) => (
            <div key={student.id} className="group flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-4">
                    <img src={student.avatarUrl} alt={student.name} className="size-12 rounded-full object-cover border-2 border-gray-100" />
                    <div className="flex flex-col">
                        <span className="font-semibold text-text-main text-base">{student.name}</span>
                        <span className="text-sm text-text-secondary">{student.rank}</span>
                    </div>
                </div>
                <button 
                    onClick={() => {
                        markAttendance(student.id);
                        alert(`Asistencia marcada para ${student.name}`);
                    }}
                    className="px-4 py-2 bg-white border border-gray-200 hover:bg-green-50 hover:border-green-200 hover:text-green-700 rounded-lg text-sm font-medium transition-all shadow-sm flex items-center gap-2"
                >
                    <span className="material-symbols-outlined text-lg">check</span>
                    Marcar Presente
                </button>
            </div>
        ))}
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
