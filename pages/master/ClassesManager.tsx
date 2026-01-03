import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { ClassCategory } from '../../types';

const ClassesManager: React.FC = () => {
  const { classes, students, addClass, deleteClass, enrollStudent, unenrollStudent } = useStore();
  const [showModal, setShowModal] = useState(false);
  
  // New Class State
  const [className, setClassName] = useState('');
  const [instructor, setInstructor] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [classTime, setClassTime] = useState('17:00');
  
  // Deep View State (Drill Down)
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const selectedClass = classes.find(c => c.id === selectedClassId);

  // Search State for Enrollment
  const [enrollSearch, setEnrollSearch] = useState('');

  const daysOptions = [
      { key: 'Monday', label: 'Lun' },
      { key: 'Tuesday', label: 'Mar' },
      { key: 'Wednesday', label: 'Mie' },
      { key: 'Thursday', label: 'Jue' },
      { key: 'Friday', label: 'Vie' },
      { key: 'Saturday', label: 'Sab' },
      { key: 'Sunday', label: 'Dom' },
  ];

  const toggleDay = (dayKey: string) => {
      if (selectedDays.includes(dayKey)) {
          setSelectedDays(selectedDays.filter(d => d !== dayKey));
      } else {
          setSelectedDays([...selectedDays, dayKey]);
      }
  };

  const handleCreateClass = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedDays.length === 0) {
          alert("Por favor selecciona al menos un día.");
          return;
      }

      // Generate display string (e.g. "Lun/Mie 17:00")
      const dayLabels = selectedDays.map(d => daysOptions.find(opt => opt.key === d)?.label).join('/');
      const scheduleString = `${dayLabels} ${classTime}`;

      addClass({
          id: Date.now().toString(),
          academyId: '', // Will be injected by StoreContext
          name: className,
          schedule: scheduleString,
          days: selectedDays,
          time: classTime,
          instructor: instructor,
          studentCount: 0,
          studentIds: []
      });
      
      // Reset and Close
      setShowModal(false);
      setClassName('');
      setInstructor('');
      setSelectedDays([]);
      setClassTime('17:00');
  };

  // --- RELATIONAL LOGIC ---
  const enrolledStudents = selectedClass 
    ? students.filter(s => selectedClass.studentIds.includes(s.id))
    : [];

  const availableStudents = selectedClass 
    ? students.filter(s => !selectedClass.studentIds.includes(s.id) && s.status === 'active' && s.name.toLowerCase().includes(enrollSearch.toLowerCase()))
    : [];

  // --- DEEP DETAIL VIEW ---
  if (selectedClass) {
      return (
        <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-300 flex flex-col h-[calc(100vh-80px)]">
            <div className="flex items-center gap-4 mb-6">
                <button 
                    onClick={() => setSelectedClassId(null)} 
                    className="size-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-text-secondary hover:text-primary hover:border-primary transition-colors shadow-sm"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-text-main">{selectedClass.name}</h1>
                    <p className="text-sm text-text-secondary">{selectedClass.schedule} • {selectedClass.instructor}</p>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0">
                {/* Left Column: Enrolled Students List */}
                <div className="lg:col-span-7 flex flex-col bg-white rounded-3xl border border-gray-200 shadow-card overflow-hidden h-full">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary">groups</span>
                            <h3 className="font-bold text-lg text-text-main">Alumnos Inscritos</h3>
                            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">{enrolledStudents.length}</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2">
                        {enrolledStudents.map(student => (
                            <div key={student.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 hover:border-primary/30 hover:shadow-sm rounded-2xl transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold overflow-hidden">
                                        {student.avatarUrl ? <img src={student.avatarUrl} className="w-full h-full object-cover"/> : student.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-text-main">{student.name}</p>
                                        <div className="flex items-center gap-2 text-xs text-text-secondary">
                                            <span>{student.rank}</span>
                                            <span className="size-1 rounded-full bg-gray-300"></span>
                                            <span>Asistencia: {student.attendance}%</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => unenrollStudent(student.id, selectedClass.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                    title="Dar de baja de esta clase"
                                >
                                    <span className="material-symbols-outlined">person_remove</span>
                                </button>
                            </div>
                        ))}
                        {enrolledStudents.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
                                <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                                <p className="text-sm">No hay alumnos inscritos en esta clase.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Add Student Interface */}
                <div className="lg:col-span-5 flex flex-col bg-surface-white rounded-3xl border border-gray-200 shadow-card overflow-hidden h-full">
                    <div className="p-6 border-b border-gray-100 bg-indigo-50/30">
                         <h3 className="font-bold text-lg text-text-main mb-4">Inscribir Nuevo Alumno</h3>
                         <div className="relative group">
                             <span className="material-symbols-outlined absolute left-3 top-3 text-gray-400 group-focus-within:text-primary transition-colors">search</span>
                             <input 
                                type="text" 
                                value={enrollSearch}
                                onChange={(e) => setEnrollSearch(e.target.value)}
                                placeholder="Buscar alumno..." 
                                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all" 
                             />
                         </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/50">
                        <p className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 ml-1">Resultados Disponibles</p>
                        {availableStudents.map(student => (
                            <div key={student.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 hover:border-primary/50 rounded-2xl transition-all shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold overflow-hidden">
                                        {student.avatarUrl ? <img src={student.avatarUrl} className="w-full h-full object-cover"/> : student.name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-text-main">{student.name}</p>
                                        <p className="text-[10px] text-text-secondary">{student.program}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => enrollStudent(student.id, selectedClass.id)}
                                    className="size-8 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary-hover hover:scale-105 transition-all"
                                    title="Inscribir"
                                >
                                    <span className="material-symbols-outlined text-lg">add</span>
                                </button>
                            </div>
                        ))}
                        {availableStudents.length === 0 && (
                            <div className="p-4 text-center text-text-secondary text-xs">
                                {enrollSearch ? 'No se encontraron alumnos.' : 'Todos los alumnos activos están inscritos.'}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      );
  }

  // --- MAIN GRID VIEW ---
  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-text-main">Gestión de Clases</h1>
            <p className="text-text-secondary mt-1">Organiza tus horarios y grupos de entrenamiento.</p>
        </div>
        <button 
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl font-medium shadow-sm flex items-center gap-2 transition-all active:scale-95"
        >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Nueva Clase
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classes.map(cls => (
              <div key={cls.id} className="bg-white p-6 rounded-3xl shadow-soft border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all group relative flex flex-col">
                   <button onClick={() => deleteClass(cls.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors z-10 p-2">
                        <span className="material-symbols-outlined">delete</span>
                   </button>
                  
                  <div className="mb-4">
                      <div className="size-14 rounded-2xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 text-primary flex items-center justify-center shadow-sm mb-4">
                          <span className="material-symbols-outlined text-3xl">sports_martial_arts</span>
                      </div>
                      <h3 className="text-xl font-bold text-text-main mb-1 truncate">{cls.name}</h3>
                      <p className="text-sm text-text-secondary font-medium">{cls.instructor}</p>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <span className="material-symbols-outlined text-[18px]">schedule</span>
                          <span>{cls.schedule}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <span className="material-symbols-outlined text-[18px] text-primary">groups</span>
                          <span className="font-semibold text-text-main">{cls.studentIds?.length || 0} Alumnos</span>
                      </div>
                  </div>
                  
                  <button 
                    onClick={() => setSelectedClassId(cls.id)}
                    className="mt-auto w-full py-3 rounded-xl border border-gray-200 text-text-main font-semibold hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm flex items-center justify-center gap-2"
                  >
                      <span>Gestionar Lista</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
              </div>
          ))}
      </div>

      {/* Creation Modal */}
      {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <h2 className="text-2xl font-bold mb-6 text-text-main">Crear Nueva Clase</h2>
                  <form onSubmit={handleCreateClass} className="flex flex-col gap-5">
                      <div>
                          <label className="block text-sm font-semibold text-text-main mb-1.5">Nombre de la Clase</label>
                          <input required value={className} onChange={e => setClassName(e.target.value)} className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/20 p-3 text-sm" placeholder="Ej. Niños Principiantes" />
                      </div>
                      
                      <div>
                          <label className="block text-sm font-semibold text-text-main mb-2">Días de Clase</label>
                          <div className="flex flex-wrap gap-2">
                              {daysOptions.map(day => (
                                  <button
                                    key={day.key}
                                    type="button"
                                    onClick={() => toggleDay(day.key)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                                        selectedDays.includes(day.key)
                                        ? 'bg-primary text-white border-primary shadow-md'
                                        : 'bg-white text-text-secondary border-gray-200 hover:bg-gray-50'
                                    }`}
                                  >
                                      {day.label}
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-semibold text-text-main mb-1.5">Horario</label>
                          <input 
                            required 
                            type="time" 
                            value={classTime} 
                            onChange={e => setClassTime(e.target.value)} 
                            className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/20 p-3 text-sm" 
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-semibold text-text-main mb-1.5">Instructor</label>
                          <input required value={instructor} onChange={e => setInstructor(e.target.value)} className="block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary/20 p-3 text-sm" placeholder="Ej. Sensei Miguel" />
                      </div>

                      <div className="flex gap-3 mt-4 pt-2">
                          <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-gray-300 font-bold hover:bg-gray-50 text-text-secondary">Cancelar</button>
                          <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover shadow-lg shadow-primary/20">Guardar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default ClassesManager;