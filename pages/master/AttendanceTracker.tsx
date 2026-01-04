
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Student } from '../../types';
import { useNavigate } from 'react-router-dom';

const AttendanceTracker: React.FC = () => {
  const { students, classes, markAttendance } = useStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  
  // -- STATES --
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday (or Sunday depending on locale preference, let's use Monday)
      return new Date(d.setDate(diff));
  });

  // -- HELPERS --
  const getWeekDays = (start: Date) => {
      const days = [];
      for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          days.push(d);
      }
      return days;
  };

  const weekDays = getWeekDays(currentWeekStart);
  
  // Formatting helper
  const weekRangeLabel = `${weekDays[0].getDate()} ${weekDays[0].toLocaleString('es-ES', { month: 'short' })} - ${weekDays[6].getDate()} ${weekDays[6].toLocaleString('es-ES', { month: 'short' })}`;

  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Filter Students
  const filteredStudents = useMemo(() => {
      let list = students.filter(s => s.status !== 'inactive');
      if (selectedClassId !== 'all') {
          list = list.filter(s => s.classesId?.includes(selectedClassId));
      }
      return list.sort((a,b) => a.name.localeCompare(b.name));
  }, [students, selectedClassId]);

  // Check Class Schedule for Dimming
  // Returns true if the selected class (or ANY class if 'all') is scheduled for this day
  const isClassScheduledOn = (date: Date) => {
      const dayNameEnglish = date.toLocaleString('en-US', { weekday: 'long' });
      
      if (selectedClassId === 'all') {
          // If viewing all, day is active if ANY class happens (simplified: assume academy open every day or check all classes)
          // For better UX, let's just return true for 'all' to allow marking any day.
          return true; 
      }
      
      return selectedClass?.days.includes(dayNameEnglish);
  };

  // Retention Alert Logic (Check last 3 entries in history)
  const getRetentionRisk = (student: Student) => {
      const history = student.attendanceHistory || [];
      // Take last 3 records sorted by date descending (already sorted in store, but safety check)
      const sorted = [...history].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const lastThree = sorted.slice(0, 3);
      
      if (lastThree.length < 3) return false;
      return lastThree.every(r => r.status === 'absent');
  };

  const handleStatusChange = (studentId: string, date: Date, currentStatus: string | undefined) => {
      const dateStr = date.toISOString().split('T')[0];
      const dayNameEnglish = date.toLocaleString('en-US', { weekday: 'long' });

      // Determine which class ID to use for the record
      let targetClassId = selectedClassId;
      
      if (targetClassId === 'all') {
          // If viewing 'all', try to find a class the student is enrolled in that occurs on this day
          const student = students.find(s => s.id === studentId);
          const relevantClass = classes.find(c => 
              student?.classesId?.includes(c.id) && c.days.includes(dayNameEnglish)
          );
          
          if (relevantClass) {
              targetClassId = relevantClass.id;
          } else {
              // Fallback: If no specific class scheduled for this day, grab their first enrolled class 
              // or alert user to select a class filter. For now, let's use a fallback or skip.
              if (student?.classesId && student.classesId.length > 0) {
                  targetClassId = student.classesId[0];
              } else {
                  addToast("Selecciona una clase específica para marcar asistencia fuera de horario.", "info");
                  return;
              }
          }
      }

      // Cycle: Unmarked -> Present -> Late -> Excused -> Absent -> Unmarked
      const nextStatusMap: Record<string, 'present' | 'late' | 'excused' | 'absent' | undefined> = {
          'undefined': 'present',
          'present': 'late',
          'late': 'excused',
          'excused': 'absent',
          'absent': undefined // Clears the record
      };
      
      // Handle the key being undefined string vs actual undefined type
      const key = currentStatus || 'undefined';
      const newStatus = nextStatusMap[key]; 
      
      markAttendance(studentId, targetClassId, dateStr, newStatus);
      
      // Toast feedback only on initial mark to avoid spam
      if (newStatus === 'present') {
          // Subtle feedback, maybe no toast for speed? Or just small one.
      }
  };

  const getStatusStyle = (status: string | undefined) => {
      switch (status) {
          case 'present': return 'bg-green-100 text-green-700 border-green-200 font-bold';
          case 'late': return 'bg-yellow-100 text-yellow-700 border-yellow-200 font-bold';
          case 'excused': return 'bg-blue-50 text-blue-600 border-blue-100 font-medium';
          case 'absent': return 'bg-red-50 text-red-500 border-red-100 font-medium';
          default: return 'bg-white border-gray-200 hover:bg-gray-50 text-gray-300';
      }
  };

  const getStatusIcon = (status: string | undefined) => {
      switch (status) {
          case 'present': return 'check';
          case 'late': return 'schedule';
          case 'excused': return 'medical_services';
          case 'absent': return 'close';
          default: return 'remove'; // or empty
      }
  };

  return (
    <div className="flex flex-col h-full p-6 md:p-8 max-w-[1600px] mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-text-main">Sábana de Asistencia</h1>
                <p className="text-text-secondary mt-1">Control histórico y semanal de clases. Haz clic en las celdas para cambiar el estado.</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                {/* Class Filter */}
                <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400 material-symbols-outlined text-[20px]">filter_list</span>
                    <select 
                        value={selectedClassId} 
                        onChange={(e) => setSelectedClassId(e.target.value)}
                        className="pl-10 pr-8 py-2.5 rounded-xl border border-gray-200 bg-white font-bold text-sm focus:border-primary focus:ring-primary shadow-sm min-w-[200px] appearance-none"
                    >
                        <option value="all">Todas las Clases</option>
                        {classes.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* Week Navigation */}
                <div className="flex items-center bg-white rounded-xl shadow-sm border border-gray-200 p-1">
                    <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() - 7)))} className="p-2 hover:bg-gray-100 rounded-lg text-text-secondary transition-colors">
                        <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <span className="px-4 text-sm font-bold text-text-main min-w-[140px] text-center capitalize">
                        {weekRangeLabel}
                    </span>
                    <button onClick={() => setCurrentWeekStart(new Date(currentWeekStart.setDate(currentWeekStart.getDate() + 7)))} className="p-2 hover:bg-gray-100 rounded-lg text-text-secondary transition-colors">
                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>

        {/* Attendance Grid */}
        <div className="bg-white border border-gray-200 rounded-3xl shadow-card overflow-hidden flex flex-col flex-1 min-h-[500px]">
            {/* Table Header */}
            <div className="grid grid-cols-[220px_repeat(7,1fr)] bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                <div className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center">Alumno</div>
                {weekDays.map((day, idx) => {
                    const isToday = day.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                    return (
                        <div key={idx} className={`p-3 text-center border-l border-gray-100 ${isToday ? 'bg-blue-50/50' : ''}`}>
                            <p className={`text-[10px] font-bold uppercase mb-1 ${isToday ? 'text-primary' : 'text-gray-400'}`}>
                                {day.toLocaleString('es-ES', { weekday: 'short' })}
                            </p>
                            <p className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-text-main'}`}>
                                {day.getDate()}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Table Body */}
            <div className="overflow-y-auto flex-1">
                {filteredStudents.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-text-secondary">
                        <span className="material-symbols-outlined text-4xl opacity-30 mb-2">person_off</span>
                        <p>No se encontraron alumnos para esta vista.</p>
                    </div>
                ) : (
                    filteredStudents.map(student => {
                        const isRisk = getRetentionRisk(student);
                        
                        return (
                            <div key={student.id} className="grid grid-cols-[220px_repeat(7,1fr)] border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                                {/* Student Info Column */}
                                <div className="p-3 pl-4 flex items-center gap-3 border-r border-transparent group-hover:border-gray-100 relative">
                                    {isRisk && (
                                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-r" title="Riesgo de abandono: 3+ faltas consecutivas"></div>
                                    )}
                                    <div className="relative cursor-pointer" onClick={() => navigate('/master/communication', { state: { recipientId: student.id } })}>
                                        <img src={student.avatarUrl} className="size-10 rounded-full object-cover bg-gray-200 border border-white shadow-sm" alt={student.name} />
                                        {isRisk && (
                                            <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 border-2 border-white shadow-sm animate-pulse">
                                                <span className="material-symbols-outlined text-[10px] block font-bold">warning</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="font-bold text-sm text-text-main truncate">{student.name}</p>
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-text-secondary truncate">{student.rank}</span>
                                            {isRisk && <span className="text-[9px] bg-red-100 text-red-600 px-1 rounded font-bold">RIESGO</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Days Columns */}
                                {weekDays.map((day, idx) => {
                                    const dateStr = day.toISOString().split('T')[0];
                                    // Find record in history. Since history now has classId, we need to be careful.
                                    // If a student has attended ANY class on this date, show it.
                                    // Or better, if selectedClassId is set, show for that class.
                                    
                                    const record = student.attendanceHistory?.find(r => {
                                        if (selectedClassId === 'all') return r.date === dateStr;
                                        return r.date === dateStr && r.classId === selectedClassId;
                                    });
                                    
                                    // Is class scheduled?
                                    const isActiveDay = isClassScheduledOn(day);
                                    
                                    return (
                                        <div key={`${student.id}-${idx}`} className={`border-l border-gray-50 p-2 flex items-center justify-center ${!isActiveDay ? 'bg-gray-50/40 pattern-diagonal-lines' : ''}`}>
                                            <button 
                                                onClick={() => handleStatusChange(student.id, day, record?.status)}
                                                // Optional: disable click if not active day? Usually academies allow exceptions, so lets keep enabled but styled different
                                                className={`size-9 rounded-xl flex items-center justify-center border transition-all duration-200 ${getStatusStyle(record?.status)} ${!isActiveDay && !record?.status ? 'opacity-40 hover:opacity-100' : 'shadow-sm hover:scale-105 active:scale-95'}`}
                                                title={isActiveDay ? (record?.status || 'Sin marcar') : 'No hay clase programada (Click para excepción)'}
                                            >
                                                <span className="material-symbols-outlined text-lg">
                                                    {getStatusIcon(record?.status)}
                                                </span>
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })
                )}
            </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-6 justify-center md:justify-start bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gray-400 text-sm">touch_app</span>
                <span className="text-xs text-text-secondary font-medium">Click en casilla para cambiar estado</span>
            </div>
            <div className="w-px h-4 bg-gray-200"></div>
            <div className="flex items-center gap-2">
                <div className="size-3 rounded bg-green-100 border border-green-200"></div>
                <span className="text-xs text-text-secondary font-bold">Presente</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="size-3 rounded bg-yellow-100 border border-yellow-200"></div>
                <span className="text-xs text-text-secondary font-bold">Retardo</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="size-3 rounded bg-blue-50 border border-blue-100"></div>
                <span className="text-xs text-text-secondary font-bold">Justificado</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="size-3 rounded bg-red-50 border border-red-100"></div>
                <span className="text-xs text-text-secondary font-bold">Falta</span>
            </div>
            <div className="w-px h-4 bg-gray-200"></div>
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-red-500 text-sm">warning</span>
                <span className="text-xs text-red-600 font-bold">Alerta de Deserción (+3 faltas)</span>
            </div>
        </div>
    </div>
  );
};

export default AttendanceTracker;