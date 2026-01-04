
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
  const [isEnrollMode, setIsEnrollMode] = useState(false); 
  
  // Attendance State
  const [localAttendance, setLocalAttendance] = useState<Record<string, 'present' | 'late' | 'absent' | 'unmarked'>>({});

  // Event Detail State
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // --- IMPROVED CLASS FORM STATE (MANUAL TIME) ---
  const [newClass, setNewClass] = useState({ 
      name: '', 
      instructor: '', 
      startTime: '17:00',
      endTime: '18:00' // Default +1 hour but editable
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
            if (student?.lastAttendance === today) statusMap[id] = 'present';
            else statusMap[id] = 'unmarked';
        });
        setLocalAttendance(prev => ({...prev, ...statusMap}));
    }
  }, [selectedClassId, students]);

  const handleCreateClass = (e: React.FormEvent) => {
      e.preventDefault();
      
      if (selectedDays.length === 0) {
          addToast('Selecciona al menos un día de la semana', 'error');
          return;
      }

      if (newClass.startTime >= newClass.endTime) {
          addToast('La hora de inicio debe ser anterior a la hora de fin.', 'error');
          return;
      }

      // Generate readable string
      const sortedDays = selectedDays.sort((a, b) => {
          const idxA = daysOptions.findIndex(d => d.key === a);
          const idxB = daysOptions.findIndex(d => d.key === b);
          return idxA - idxB;
      });
      
      const dayLabels = sortedDays.map(d => {
          const opt = daysOptions.find(opt => opt.key === d);
          return opt ? opt.full.substring(0,3) : '';
      }).join('/');
      
      const scheduleString = `${dayLabels} ${newClass.startTime}`;

      addClass({
          id: Date.now().toString(),
          academyId: '', 
          name: newClass.name,
          schedule: scheduleString, 
          days: selectedDays,       
          startTime: newClass.startTime, 
          endTime: newClass.endTime, // MANUAL END TIME SAVED HERE
          instructor: newClass.instructor,
          studentCount: 0,
          studentIds: [],
          modifications: []
      });
      setShowClassModal(false);
      setNewClass({ name: '', instructor: '', startTime: '17:00', endTime: '18:00' });
      setSelectedDays([]);
      addToast('Clase creada exitosamente', 'success');
  };

  const handleCreateEvent = (e: React.FormEvent) => {
      e.preventDefault();
      addEvent({
          id: `evt-${Date.now()}`,
          academyId: '', 
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

  if (viewingStudent && selectedClass) {
      return (
        <div className="bg-[#f5f6f8] min-h-screen p-6 md:p-10 max-w-[1200px] mx-auto w-full animate-in fade-in slide-in-from-right-8 duration-300">
             <div className="flex items-center gap-2 mb-8 text-sm text-[#606e8a]">
                <button onClick={() => { setSelectedClassId(null); setViewingStudentId(null); }} className="hover:text-[#0d59f2] transition-colors">Dashboard</button>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <button onClick={() => setViewingStudentId(null)} className="hover:text-[#0d59f2] transition-colors">{selectedClass.name}</button>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="font-medium text-[#111318]">Perfil de Alumno</span>
             </div>
             <div className="bg-white rounded-3xl p-8 shadow-soft">
                 <h2 className="text-2xl font-bold">{viewingStudent.name}</h2>
                 <p className="text-gray-500">Gestión individual no disponible en esta vista rápida. Usa el módulo de Alumnos.</p>
                 <button onClick={() => setViewingStudentId(null)} className="mt-4 px-4 py-2 bg-gray-100 rounded-lg">Volver</button>
             </div>
        </div>
      );
  }

  if (selectedClass) {
      const enrolledStudents = students.filter(s => selectedClass.studentIds.includes(s.id));
      const availableStudents = students.filter(s => !selectedClass.studentIds.includes(s.id) && s.status === 'active' && s.name.toLowerCase().includes(enrollSearch.toLowerCase()));
      const displayedStudents = isEnrollMode ? availableStudents : enrolledStudents;

      return (
        <div className="flex flex-col min-h-screen bg-[#f5f6f8] pb-24 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="max-w-[960px] mx-auto w-full px-4 sm:px-6 py-6">
                <nav className="flex items-center gap-2 text-sm text-[#606e8a] mb-6">
                    <button onClick={() => setSelectedClassId(null)} className="hover:text-[#0d59f2] transition-colors">Clases</button>
                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                    <span className="font-medium text-[#111318]">{selectedClass.name}</span>
                </nav>
                
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-[#111318]">{selectedClass.name}</h1>
                        <p className="text-[#606e8a]">{selectedClass.schedule}</p>
                    </div>
                    <button 
                        onClick={() => setIsEnrollMode(!isEnrollMode)}
                        className={`px-4 py-2 rounded-lg font-bold transition-all ${isEnrollMode ? 'bg-red-500 text-white' : 'bg-primary text-white'}`}
                    >
                        {isEnrollMode ? 'Cancelar Inscripción' : 'Inscribir Alumnos'}
                    </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    {displayedStudents.map(student => (
                        <div key={student.id} className="p-4 border-b border-gray-100 flex justify-between items-center hover:bg-gray-50">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-gray-200 overflow-hidden">
                                    <img src={student.avatarUrl} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-bold text-[#111318]">{student.name}</p>
                                    <p className="text-xs text-gray-500">{student.rank}</p>
                                </div>
                            </div>
                            {isEnrollMode ? (
                                <button onClick={() => { enrollStudent(student.id, selectedClass.id); addToast('Inscrito', 'success'); }} className="text-primary font-bold text-sm">
                                    + Inscribir
                                </button>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => handleAttendanceAction(student.id, 'present')} className={`px-3 py-1 rounded text-xs font-bold ${localAttendance[student.id] === 'present' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>Presente</button>
                                    <button onClick={() => { unenrollStudent(student.id, selectedClass.id); addToast('Eliminado', 'info'); }} className="text-red-500 text-xs font-bold ml-2">Eliminar</button>
                                </div>
                            )}
                        </div>
                    ))}
                    {displayedStudents.length === 0 && <div className="p-8 text-center text-gray-400">No hay alumnos.</div>}
                </div>
            </div>
        </div>
      );
  }

  // --- MAIN DASHBOARD VIEW ---
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
                Eventos
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
                                <span>{cls.schedule.split(' ')[0]}</span>
                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono">{cls.startTime} - {cls.endTime}</span>
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
          <div className="text-center py-20 text-gray-400">Funcionalidad de eventos aquí...</div>
      )}

      {/* FIXED CLASS CREATION MODAL - MANUAL TIME */}
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
                              <label className="block text-sm font-semibold text-[#111318] mb-1.5">Hora Inicio</label>
                              <input 
                                required 
                                type="time" 
                                value={newClass.startTime} 
                                onChange={e => setNewClass({...newClass, startTime: e.target.value})} 
                                className="block w-full rounded-xl border-[#d1d5db] shadow-sm focus:border-[#0d59f2] focus:ring focus:ring-[#0d59f2]/20 p-3 text-sm transition-all" 
                              />
                          </div>
                          <div>
                              <label className="block text-sm font-semibold text-[#111318] mb-1.5">Hora Fin (Manual)</label>
                              <input 
                                required
                                type="time" 
                                value={newClass.endTime} 
                                onChange={e => setNewClass({...newClass, endTime: e.target.value})}
                                className="block w-full rounded-xl border-[#d1d5db] shadow-sm focus:border-[#0d59f2] focus:ring focus:ring-[#0d59f2]/20 p-3 text-sm transition-all" 
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
