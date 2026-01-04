
import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const ScheduleManager: React.FC = () => {
  const { classes, events, students, addClass, deleteClass, addEvent, deleteEvent, enrollStudent, unenrollStudent, academySettings, markAttendance } = useStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'classes' | 'events'>('classes');
  
  // Modals
  const [showClassModal, setShowClassModal] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);

  // Deep View State: Level 1 (Class Detail)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Deep View State: Level 2 (Student Dossier within Class)
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const viewingStudent = students.find(s => s.id === viewingStudentId);

  // Search State for Enrollment
  const [enrollSearch, setEnrollSearch] = useState('');
  const [isEnrollMode, setIsEnrollMode] = useState(false); // Toggle between Roster and Enroll view
  
  // Attendance State
  const [localAttendance, setLocalAttendance] = useState<Record<string, 'present' | 'late' | 'absent' | 'unmarked'>>({});

  // Event Detail State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const selectedEvent = events.find(e => e.id === selectedEventId);

  // Form States - CLASS CREATION
  const [newClass, setNewClass] = useState({ 
      name: '', 
      instructor: '', 
      time: '17:00' 
  });
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Form States - EVENT
  const [newEvent, setNewEvent] = useState({ title: '', date: '', time: '', type: 'exam' as const, description: '', capacity: 20 });

  const daysOptions = [
      { key: 'Monday', label: 'L', full: 'Lunes' },
      { key: 'Tuesday', label: 'M', full: 'Martes' },
      { key: 'Wednesday', label: 'M', full: 'Miércoles' },
      { key: 'Thursday', label: 'J', full: 'Jueves' },
      { key: 'Friday', label: 'V', full: 'Viernes' },
      { key: 'Saturday', label: 'S', full: 'Sábado' },
      { key: 'Sunday', label: 'D', full: 'Domingo' },
  ];

  const toggleDay = (dayKey: string) => {
      if (selectedDays.includes(dayKey)) {
          setSelectedDays(selectedDays.filter(d => d !== dayKey));
      } else {
          setSelectedDays([...selectedDays, dayKey]);
      }
  };

  // Sync Attendance State on Load
  useEffect(() => {
    if (selectedClass) {
        const today = new Date().toISOString().split('T')[0];
        const statusMap: Record<string, 'present' | 'late' | 'absent' | 'unmarked'> = {};
        
        selectedClass.studentIds.forEach(id => {
            const student = students.find(s => s.id === id);
            if (student?.lastAttendance === today) {
                statusMap[id] = 'present';
            } else {
                statusMap[id] = 'unmarked';
            }
        });
        setLocalAttendance(prev => ({...prev, ...statusMap}));
    }
  }, [selectedClassId, students]);

  const handleCreateClass = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (selectedDays.length === 0) {
          addToast('Por favor selecciona al menos un día de la semana', 'error');
          return;
      }

      // Generate readable string (e.g., "Lun/Mie 17:00")
      // Sort days based on original order
      const sortedDays = selectedDays.sort((a, b) => {
          const idxA = daysOptions.findIndex(d => d.key === a);
          const idxB = daysOptions.findIndex(d => d.key === b);
          return idxA - idxB;
      });
      
      const dayLabels = sortedDays.map(d => {
          const opt = daysOptions.find(opt => opt.key === d);
          return opt ? (opt.label === 'M' || opt.label === 'S' ? opt.full.substring(0,3) : opt.full.substring(0,3)) : '';
      }).join('/');
      
      const scheduleString = `${dayLabels} ${newClass.time}`;

      // Calculate endTime (defaulting to +1 hour)
      const [h, m] = newClass.time.split(':').map(Number);
      const endH = (h + 1) % 24;
      const endTime = `${endH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

      addClass({
          id: Date.now().toString(),
          academyId: '', // Will be injected by StoreContext
          name: newClass.name,
          schedule: scheduleString, // For display
          days: selectedDays,       // Structured for logic
          startTime: newClass.time, // Structured for logic
          endTime: endTime,
          instructor: newClass.instructor,
          studentCount: 0,
          studentIds: [],
          modifications: []
      });
      setShowClassModal(false);
      setNewClass({ name: '', instructor: '', time: '17:00' });
      setSelectedDays([]);
      addToast('Clase creada exitosamente', 'success');
  };

  const handleCreateEvent = (e: React.FormEvent) => {
      e.preventDefault();
      addEvent({
          id: `evt-${Date.now()}`,
          academyId: '', // Will be injected by StoreContext
          ...newEvent,
          registeredCount: 0,
          registrants: []
      });
      setShowEventModal(false);
      setNewEvent({ title: '', date: '', time: '', type: 'exam', description: '', capacity: 20 });
      addToast('Evento creado correctamente', 'success');
  };

  const handleAttendanceAction = (studentId: string, status: 'present' | 'late' | 'absent') => {
      setLocalAttendance(prev => ({ ...prev, [studentId]: status }));
      if (status === 'present' || status === 'late') {
          markAttendance(studentId);
          addToast('Asistencia registrada', 'success');
      }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'active': return 'bg-green-50 text-green-700 border-green-200'; 
        case 'debtor': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
        case 'exam_ready': return 'bg-blue-50 text-blue-700 border-blue-200';
        default: return 'bg-gray-50 text-gray-500 border-gray-200';
    }
  };

  // --- LEVEL 3: STUDENT DOSSIER VIEW ---
  if (viewingStudent && selectedClass) {
      // Use existing dossier view
      const currentRankConfig = academySettings.ranks.find(r => r.id === viewingStudent.rankId);
      
      return (
        <div className="bg-[#f5f6f8] min-h-screen p-6 md:p-10 max-w-[1200px] mx-auto w-full animate-in fade-in slide-in-from-right-8 duration-300">
             {/* Breadcrumb Navigation */}
             <div className="flex items-center gap-2 mb-8 text-sm text-[#606e8a]">
                <button onClick={() => { setSelectedClassId(null); setViewingStudentId(null); }} className="hover:text-[#0d59f2] transition-colors">Dashboard</button>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <button onClick={() => setViewingStudentId(null)} className="hover:text-[#0d59f2] transition-colors">{selectedClass.name}</button>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="font-medium text-[#111318]">Perfil de Alumno</span>
             </div>

             <div className="flex items-center gap-4 mb-8">
                <button onClick={() => setViewingStudentId(null)} className="size-10 rounded-full bg-white border border-[#e5e7eb] flex items-center justify-center text-[#606e8a] hover:text-[#0d59f2] hover:border-[#0d59f2] transition-colors shadow-sm">
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="text-2xl font-bold text-[#111318]">Detalle del Alumno</h1>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                  {/* Left Column: Profile Card */}
                  <div className="flex flex-col gap-6">
                      <div className="bg-white rounded-3xl p-8 border border-[#e5e7eb] shadow-soft flex flex-col items-center text-center">
                          <img src={viewingStudent.avatarUrl} alt={viewingStudent.name} className="size-32 rounded-full object-cover border-4 border-[#f5f6f8] mb-4 shadow-sm" />
                          <h2 className="text-2xl font-bold text-[#111318]">{viewingStudent.name}</h2>
                          <p className="text-[#606e8a] mb-4">{viewingStudent.email}</p>
                          <span className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold border ${getStatusColor(viewingStudent.status)}`}>
                              {viewingStudent.status.toUpperCase()}
                          </span>
                          
                          <div className="grid grid-cols-2 w-full gap-4 mt-8 pt-8 border-t border-[#e5e7eb]">
                              <div className="flex flex-col">
                                  <span className="text-xs text-[#606e8a] font-bold uppercase tracking-wider">Programa</span>
                                  <span className="font-semibold text-[#111318]">{viewingStudent.program}</span>
                              </div>
                              <div className="flex flex-col">
                                  <span className="text-xs text-[#606e8a] font-bold uppercase tracking-wider">Se unió</span>
                                  <span className="font-semibold text-[#111318]">{viewingStudent.joinDate}</span>
                              </div>
                          </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="bg-white rounded-3xl p-6 border border-[#e5e7eb] shadow-soft">
                          <h3 className="font-bold text-lg text-[#111318] mb-4">Acciones de Clase</h3>
                          <div className="flex flex-col gap-3">
                              <button 
                                onClick={() => { markAttendance(viewingStudent.id); addToast('Asistencia marcada hoy', 'success'); }}
                                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-[#f5f6f8] transition-colors text-left"
                              >
                                  <div className="size-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><span className="material-symbols-outlined">check_circle</span></div>
                                  <span className="font-medium text-[#111318]">Marcar Asistencia Hoy</span>
                              </button>
                              <button 
                                onClick={() => { unenrollStudent(viewingStudent.id, selectedClass.id); setViewingStudentId(null); addToast('Alumno eliminado de la clase', 'info'); }}
                                className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-red-50 transition-colors text-left group"
                              >
                                  <div className="size-10 rounded-full bg-red-50 text-red-500 group-hover:bg-red-100 flex items-center justify-center"><span className="material-symbols-outlined">person_remove</span></div>
                                  <div className="flex flex-col">
                                      <span className="font-medium text-red-600">Eliminar de Clase</span>
                                      <span className="text-xs text-red-400">Desvincular de {selectedClass.name}</span>
                                  </div>
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* Right Column: Detailed Tabs */}
                  <div className="xl:col-span-2 flex flex-col gap-6">
                      {/* Attendance Stats */}
                      <div className="bg-white rounded-3xl p-8 border border-[#e5e7eb] shadow-soft">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="font-bold text-lg text-[#111318]">Progreso de Cinturón</h3>
                              <div className="flex items-center gap-2">
                                  <div className="h-3 w-20 rounded shadow-sm" style={{ backgroundColor: viewingStudent.rankColor }}></div>
                                  <span className="font-bold text-sm">{viewingStudent.rank}</span>
                              </div>
                          </div>
                          
                          <div className="mb-2 flex justify-between text-sm font-medium">
                              <span className="text-[#606e8a]">Asistencia Actual</span>
                              <span className="text-[#111318]">{viewingStudent.attendance} / {currentRankConfig?.requiredAttendance || 100}</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-3 mb-6">
                              <div className="bg-[#0d59f2] h-3 rounded-full transition-all duration-1000" style={{ width: `${Math.min((viewingStudent.attendance / (currentRankConfig?.requiredAttendance || 100)) * 100, 100)}%` }}></div>
                          </div>
                      </div>

                       {/* Timeline / History */}
                      <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-soft flex-1">
                          <h3 className="font-bold text-lg text-[#111318] mb-6">Línea de Tiempo</h3>
                          <div className="space-y-6">
                              {/* Current Status */}
                              <div className="flex gap-4">
                                  <div className="flex flex-col items-center gap-2">
                                      <div className="size-3 rounded-full bg-[#0d59f2]"></div>
                                      <div className="w-0.5 flex-1 bg-gray-200"></div>
                                  </div>
                                  <div className="pb-2">
                                      <p className="text-sm font-bold text-[#111318]">Estado Actual</p>
                                      <p className="text-sm text-[#606e8a]">Entrenando activamente en {viewingStudent.rank}</p>
                                  </div>
                              </div>
                              
                              {/* Promotion History */}
                              {viewingStudent.promotionHistory?.map((item, idx) => (
                                  <div key={idx} className="flex gap-4">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="size-3 rounded-full bg-gray-400"></div>
                                        {idx < (viewingStudent.promotionHistory?.length || 0) - 1 && <div className="w-0.5 flex-1 bg-gray-200"></div>}
                                    </div>
                                    <div className="pb-4">
                                        <p className="text-sm font-bold text-[#111318]">{item.rank}</p>
                                        <p className="text-xs text-[#606e8a] mb-1">{item.date}</p>
                                        {item.notes && <p className="text-sm text-[#606e8a] italic">"{item.notes}"</p>}
                                    </div>
                                  </div>
                              ))}

                              {(!viewingStudent.promotionHistory || viewingStudent.promotionHistory.length === 0) && (
                                   <div className="flex gap-4">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="size-3 rounded-full bg-gray-300"></div>
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-[#111318]">Unión a la Academia</p>
                                            <p className="text-xs text-[#606e8a] mb-1">{viewingStudent.joinDate}</p>
                                        </div>
                                    </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
        </div>
      );
  }

  // --- LEVEL 2: CLASS ATTENDANCE DASHBOARD ---
  if (selectedClass) {
      // 1. Get Enrolled Students
      const enrolledStudents = students.filter(s => selectedClass.studentIds.includes(s.id));
      
      // 2. Get Available for Enrollment (if in enrollment mode)
      const availableStudents = students.filter(s => 
          !selectedClass.studentIds.includes(s.id) && 
          s.status === 'active' && 
          s.name.toLowerCase().includes(enrollSearch.toLowerCase())
      );

      // Stats
      const totalStudents = enrolledStudents.length;
      const presentCount = Object.values(localAttendance).filter(s => s === 'present' || s === 'late').length;
      const absentCount = totalStudents - presentCount;
      const progressPercent = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;

      const displayedStudents = isEnrollMode ? availableStudents : enrolledStudents.filter(s => s.name.toLowerCase().includes(enrollSearch.toLowerCase()));

      return (
        <div className="flex flex-col min-h-screen bg-[#f5f6f8] pb-24 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Breadcrumbs & Header */}
            <div className="max-w-[960px] mx-auto w-full px-4 sm:px-6 py-6">
                <nav className="flex items-center gap-2 text-sm text-[#606e8a] mb-6">
                    <button onClick={() => setSelectedClassId(null)} className="hover:text-[#0d59f2] transition-colors">Dashboard</button>
                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                    <button onClick={() => setSelectedClassId(null)} className="hover:text-[#0d59f2] transition-colors">Clases</button>
                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                    <span className="font-medium text-[#111318]">{selectedClass.name}</span>
                </nav>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-[#111318] mb-2">{isEnrollMode ? 'Inscribir Alumnos' : 'Control de Asistencia'}</h1>
                        <div className="flex items-center gap-2 text-[#606e8a]">
                            <span className="material-symbols-outlined text-[20px]">calendar_today</span>
                            <span>{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })} • {selectedClass.schedule}</span>
                            <span className="mx-1">•</span>
                            <span className="text-[#0d59f2] font-medium">{selectedClass.instructor}</span>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsEnrollMode(!isEnrollMode)}
                            className={`flex items-center justify-center gap-2 px-4 py-2 border font-medium rounded-lg shadow-sm transition-all text-sm ${isEnrollMode ? 'bg-[#0d59f2] text-white border-[#0d59f2]' : 'bg-white border-[#e5e7eb] text-[#111318] hover:bg-gray-50'}`}
                        >
                            <span className="material-symbols-outlined text-[18px]">{isEnrollMode ? 'check' : 'person_add'}</span>
                            {isEnrollMode ? 'Finalizar Inscripción' : 'Inscribir Alumno'}
                        </button>
                    </div>
                </div>

                {/* Stats Overview */}
                {!isEnrollMode && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                        <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-soft flex flex-col gap-1">
                            <p className="text-sm font-medium text-[#606e8a]">Total Alumnos</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-2xl font-bold text-[#111318]">{totalStudents}</h3>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Cupo: 30</span>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-soft flex flex-col gap-1">
                            <p className="text-sm font-medium text-[#606e8a]">Presentes</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-2xl font-bold text-[#0d59f2]">{presentCount}</h3>
                                <span className="text-xs text-[#606e8a]">{progressPercent.toFixed(0)}% Confirmado</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                                <div className="bg-[#0d59f2] h-1.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
                            </div>
                        </div>
                        <div className="bg-white rounded-xl p-5 border border-[#e5e7eb] shadow-soft flex flex-col gap-1">
                            <p className="text-sm font-medium text-[#606e8a]">Ausentes / Sin Marcar</p>
                            <div className="flex items-baseline gap-2">
                                <h3 className="text-2xl font-bold text-[#111318]">{absentCount}</h3>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                                <div className="bg-gray-300 h-1.5 rounded-full transition-all duration-500" style={{ width: `${(absentCount/totalStudents)*100}%` }}></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search and Filter */}
                <div className="bg-white rounded-t-xl border border-[#e5e7eb] border-b-0 p-4 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full sm:max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="material-symbols-outlined text-[#606e8a]">search</span>
                        </div>
                        <input 
                            value={enrollSearch}
                            onChange={(e) => setEnrollSearch(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border-none bg-[#f5f6f8] rounded-lg text-sm text-[#111318] placeholder-[#606e8a] focus:ring-2 focus:ring-[#0d59f2]/20 focus:bg-white transition-all" 
                            placeholder={isEnrollMode ? "Buscar alumno para inscribir..." : "Buscar alumno por nombre..."}
                            type="text"
                        />
                    </div>
                    {!isEnrollMode && (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#606e8a] hover:text-[#111318] hover:bg-gray-100 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-[18px]">filter_list</span>
                                Filtrar
                            </button>
                            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#606e8a] hover:text-[#111318] hover:bg-gray-100 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-[18px]">sort</span>
                                Ordenar
                            </button>
                        </div>
                    )}
                </div>

                {/* Student List */}
                <div className="bg-white rounded-b-xl border border-[#e5e7eb] shadow-sm divide-y divide-gray-100 overflow-hidden min-h-[300px]">
                    {displayedStudents.map((student, idx) => {
                         const status = isEnrollMode ? 'unmarked' : (localAttendance[student.id] || 'unmarked');
                         let rowBg = 'hover:bg-gray-50';
                         if (status === 'late') rowBg = 'bg-yellow-50/30 hover:bg-yellow-50/50';
                         if (status === 'absent') rowBg = 'bg-red-50/20 hover:bg-red-50/40';

                         return (
                            <div key={student.id} className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 transition-colors gap-4 ${rowBg}`}>
                                <div className="flex items-center gap-4 cursor-pointer" onClick={() => !isEnrollMode && setViewingStudentId(student.id)}>
                                    <div className="relative">
                                        <div className="size-12 rounded-full overflow-hidden bg-gray-200 border border-gray-100">
                                            {student.avatarUrl ? <img className="w-full h-full object-cover" src={student.avatarUrl} /> : <span className="flex items-center justify-center h-full font-bold text-gray-400">{student.name.charAt(0)}</span>}
                                        </div>
                                        {status === 'present' && (
                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                                <span className="material-symbols-outlined filled text-green-500 text-lg">check_circle</span>
                                            </div>
                                        )}
                                        {status === 'late' && (
                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                                <span className="material-symbols-outlined filled text-amber-500 text-lg">schedule</span>
                                            </div>
                                        )}
                                        {status === 'absent' && (
                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                                <span className="material-symbols-outlined filled text-red-500 text-lg">cancel</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-[#111318] text-base">{student.name}</span>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border bg-gray-100 text-gray-600 border-gray-200`}>
                                                {student.rank}
                                            </span>
                                        </div>
                                        {isEnrollMode ? (
                                            <span className="text-sm text-[#606e8a]">{student.program}</span>
                                        ) : (
                                            <span className={`text-sm font-medium ${status === 'absent' ? 'text-red-600' : 'text-[#606e8a]'}`}>
                                                {status === 'present' ? `${student.attendance}% Asistencia` : status === 'late' ? 'Retraso registrado' : status === 'absent' ? 'Ausente' : 'Sin marcar'}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
                                    {isEnrollMode ? (
                                        <button 
                                            onClick={() => { enrollStudent(student.id, selectedClass.id); addToast('Alumno inscrito', 'success'); }}
                                            className="px-4 py-2 bg-[#0d59f2] hover:bg-[#0b4bcc] text-white rounded-lg shadow-sm font-medium text-sm transition-all flex items-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">add</span>
                                            Inscribir
                                        </button>
                                    ) : (
                                        <>
                                            <div className="flex bg-[#f5f6f8] p-1 rounded-lg">
                                                <button 
                                                    onClick={() => handleAttendanceAction(student.id, 'present')}
                                                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${status === 'present' ? 'bg-white text-[#0d59f2] shadow-sm border border-gray-200' : 'text-[#606e8a] hover:text-[#111318]'}`}
                                                >
                                                    {status === 'present' && <span className="material-symbols-outlined text-[18px]">check</span>}
                                                    Presente
                                                </button>
                                                <button 
                                                    onClick={() => handleAttendanceAction(student.id, 'late')}
                                                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${status === 'late' ? 'bg-amber-100 text-amber-800 shadow-sm border border-amber-200' : 'text-[#606e8a] hover:text-[#111318]'}`}
                                                >
                                                    {status === 'late' && <span className="material-symbols-outlined text-[18px]">schedule</span>}
                                                    Retraso
                                                </button>
                                                <button 
                                                    onClick={() => handleAttendanceAction(student.id, 'absent')}
                                                    className={`flex-1 sm:flex-none px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1 ${status === 'absent' ? 'bg-red-100 text-red-700 shadow-sm border border-red-200' : 'text-[#606e8a] hover:text-red-600'}`}
                                                >
                                                    {status === 'absent' && <span className="material-symbols-outlined text-[18px]">close</span>}
                                                    Ausente
                                                </button>
                                            </div>
                                            <button className="p-2 text-[#606e8a] hover:text-[#0d59f2] rounded-lg hover:bg-blue-50 transition-colors" title="Agregar nota">
                                                <span className="material-symbols-outlined">edit_note</span>
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                         );
                    })}
                    {displayedStudents.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-[#606e8a]">
                            <span className="material-symbols-outlined text-4xl mb-2 opacity-50">person_search</span>
                            <p>No se encontraron alumnos.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Floating Footer */}
            {!isEnrollMode && (
                <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-40 pointer-events-none">
                    <div className="pointer-events-auto bg-white/90 backdrop-blur-md border border-[#e5e7eb] shadow-lg rounded-2xl p-2 px-3 flex items-center gap-4 max-w-[90%] md:max-w-auto animate-in slide-in-from-bottom-4 duration-500">
                        <div className="hidden sm:flex flex-col px-2">
                            <span className="text-xs font-semibold text-[#606e8a] uppercase tracking-wider">Progreso</span>
                            <span className="text-sm font-bold text-[#111318]">{presentCount} / {totalStudents} Marcados</span>
                        </div>
                        <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>
                        <button onClick={() => { setSelectedClassId(null); addToast('Asistencia finalizada con éxito', 'success'); }} className="bg-[#0d59f2] hover:bg-[#0b4bcc] text-white font-medium py-2.5 px-6 rounded-xl shadow-lg shadow-blue-500/30 transition-all transform active:scale-95 flex items-center gap-2">
                            <span className="material-symbols-outlined">save</span>
                            Finalizar Asistencia
                        </button>
                    </div>
                </div>
            )}
        </div>
      );
  }

  // --- MAIN DASHBOARD VIEW (Level 1) ---
  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-[#111318]">Gestión de Horarios</h1>
            <p className="text-text-secondary mt-1">Organiza tus horarios y grupos de entrenamiento.</p>
        </div>
        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-[#e5e7eb]">
            <button 
                onClick={() => setActiveTab('classes')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'classes' ? 'bg-[#0d59f2] text-white shadow-sm' : 'text-[#606e8a] hover:text-[#111318]'}`}
            >
                Clases Semanales
            </button>
            <button 
                onClick={() => setActiveTab('events')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'events' ? 'bg-[#0d59f2] text-white shadow-sm' : 'text-[#606e8a] hover:text-[#111318]'}`}
            >
                Eventos y Exámenes
            </button>
        </div>
      </div>

      {activeTab === 'classes' ? (
          <div>
              <div className="flex justify-end mb-6">
                <button 
                    onClick={() => setShowClassModal(true)}
                    className="bg-[#0d59f2] hover:bg-[#0b4bcc] text-white px-5 py-2.5 rounded-xl font-medium shadow-sm flex items-center gap-2 transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]">add</span>
                    Nueva Clase
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {classes.map(cls => (
                    <div key={cls.id} className="bg-white p-6 rounded-3xl shadow-soft border border-[#e5e7eb] hover:shadow-xl hover:-translate-y-1 transition-all group relative flex flex-col">
                        <button onClick={(e) => { e.stopPropagation(); deleteClass(cls.id); addToast('Clase eliminada', 'info'); }} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors z-10 p-2">
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                        
                        <div className="mb-4">
                            <div className="size-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 text-[#0d59f2] flex items-center justify-center shadow-sm mb-4">
                                <span className="material-symbols-outlined text-3xl">sports_martial_arts</span>
                            </div>
                            <h3 className="text-xl font-bold text-[#111318] mb-1 truncate">{cls.name}</h3>
                            <p className="text-sm text-[#606e8a] font-medium">{cls.instructor}</p>
                        </div>
                        
                        <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-sm text-[#606e8a]">
                                <span className="material-symbols-outlined text-[18px]">schedule</span>
                                <span>{cls.schedule}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[#606e8a]">
                                <span className="material-symbols-outlined text-[18px] text-[#0d59f2]">groups</span>
                                <span className="font-semibold text-[#111318]">{cls.studentIds?.length || 0} Alumnos</span>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setSelectedClassId(cls.id)}
                            className="mt-auto w-full py-3 rounded-xl border border-[#e5e7eb] text-[#111318] font-semibold hover:bg-[#0d59f2] hover:text-white hover:border-[#0d59f2] transition-all shadow-sm flex items-center justify-center gap-2 bg-gray-50"
                        >
                            <span>Gestionar Asistencia</span>
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    </div>
                ))}
              </div>
          </div>
      ) : (
          <div>
              {/* Event view unchanged for brevity, reusing existing structure */}
               <div className="flex justify-end mb-6">
                <button 
                    onClick={() => setShowEventModal(true)}
                    className="bg-[#0d59f2] hover:bg-[#0b4bcc] text-white px-5 py-2.5 rounded-xl font-medium shadow-sm flex items-center gap-2 transition-all"
                >
                    <span className="material-symbols-outlined text-[20px]">event</span>
                    Crear Evento
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(event => (
                    <div 
                        key={event.id} 
                        onClick={() => setSelectedEventId(event.id)}
                        className="bg-white p-6 rounded-2xl shadow-soft border border-[#e5e7eb] hover:shadow-lg transition-all relative cursor-pointer group"
                    >
                        <button onClick={(e) => { e.stopPropagation(); deleteEvent(event.id); addToast('Evento eliminado', 'info'); }} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 transition-colors z-10">
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                        <div className={`size-12 rounded-xl flex items-center justify-center mb-4 ${
                            event.type === 'exam' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'
                        }`}>
                            <span className="material-symbols-outlined text-2xl">{event.type === 'exam' ? 'workspace_premium' : 'emoji_events'}</span>
                        </div>
                        <h3 className="text-xl font-bold text-[#111318] mb-1 group-hover:text-[#0d59f2] transition-colors">{event.title}</h3>
                        <p className="text-sm text-[#606e8a] mb-2">{event.date} • {event.time}</p>
                        <p className="text-sm text-[#606e8a] line-clamp-2 mb-4">{event.description}</p>
                        <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                            <span className="text-xs font-bold uppercase tracking-wider text-[#606e8a]">{event.type}</span>
                            <span className="text-sm font-medium text-[#0d59f2]">{event.registeredCount} / {event.capacity} Inscritos</span>
                        </div>
                    </div>
                ))}
              </div>
          </div>
      )}

      {/* Class Modal */}
      {showClassModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-bold text-[#111318]">Crear Nueva Clase</h2>
                      <button onClick={() => setShowClassModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                  </div>
                  <form onSubmit={handleCreateClass} className="flex flex-col gap-6">
                      <div>
                          <label className="block text-sm font-semibold text-[#111318] mb-1.5">Nombre de la Clase</label>
                          <input 
                            required 
                            value={newClass.name} 
                            onChange={e => setNewClass({...newClass, name: e.target.value})} 
                            className="block w-full rounded-xl border-[#d1d5db] shadow-sm focus:border-[#0d59f2] focus:ring focus:ring-[#0d59f2]/20 p-3 text-sm transition-all" 
                            placeholder="Ej. Niños Principiantes" 
                          />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-semibold text-[#111318] mb-2">Días de Clase</label>
                          <div className="flex flex-wrap gap-2">
                              {daysOptions.map(day => (
                                  <button
                                    key={day.key}
                                    type="button"
                                    onClick={() => toggleDay(day.key)}
                                    className={`size-10 rounded-full flex items-center justify-center text-sm font-bold transition-all border ${
                                        selectedDays.includes(day.key)
                                        ? 'bg-[#0d59f2] text-white border-[#0d59f2] shadow-md transform scale-105'
                                        : 'bg-white text-[#606e8a] border-[#e5e7eb] hover:bg-gray-50'
                                    }`}
                                    title={day.full}
                                  >
                                      {day.label}
                                  </button>
                              ))}
                          </div>
                          <p className="text-xs text-[#606e8a] mt-2">Selecciona los días que se imparte la clase.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-semibold text-[#111318] mb-1.5">Inicio</label>
                              <input 
                                required 
                                type="time" 
                                value={newClass.time} 
                                onChange={e => setNewClass({...newClass, time: e.target.value})} 
                                className="block w-full rounded-xl border-[#d1d5db] shadow-sm focus:border-[#0d59f2] focus:ring focus:ring-[#0d59f2]/20 p-3 text-sm transition-all" 
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-semibold text-[#111318] mb-1.5">Fin (auto)</label>
                              <input 
                                disabled
                                type="time" 
                                value={newClass.time ? `${((parseInt(newClass.time.split(':')[0]) + 1) % 24).toString().padStart(2, '0')}:${newClass.time.split(':')[1]}` : ''} 
                                className="block w-full rounded-xl border-[#d1d5db] bg-gray-50 shadow-sm p-3 text-sm transition-all text-gray-500" 
                              />
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-semibold text-[#111318] mb-1.5">Instructor</label>
                          <input required value={newClass.instructor} onChange={e => setNewClass({...newClass, instructor: e.target.value})} className="block w-full rounded-xl border-[#d1d5db] shadow-sm focus:border-[#0d59f2] focus:ring focus:ring-[#0d59f2]/20 p-3 text-sm transition-all" placeholder="Ej. Sensei Miguel" />
                      </div>

                      <div className="flex gap-3 mt-4 pt-2 border-t border-gray-100">
                          <button type="button" onClick={() => setShowClassModal(false)} className="flex-1 py-3 rounded-xl border border-[#d1d5db] font-bold hover:bg-gray-50 text-[#606e8a] transition-colors">Cancelar</button>
                          <button type="submit" className="flex-1 py-3 rounded-xl bg-[#0d59f2] text-white font-bold hover:bg-[#0b4bcc] shadow-lg shadow-blue-500/20 transition-all transform active:scale-95">Guardar Clase</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default ScheduleManager;
