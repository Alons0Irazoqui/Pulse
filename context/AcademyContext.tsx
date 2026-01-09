
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Student, ClassCategory, Event, LibraryResource, AcademySettings, Message, AttendanceRecord, SessionModification, ClassException, PromotionHistoryItem, CalendarEvent } from '../types';
import { PulseService } from '../services/pulseService';
import { mockMessages, mockCalendarEvents } from '../mockData';
import { getLocalDate, formatDateDisplay } from '../utils/dateUtils';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

// Helper for ID generation
const generateId = (prefix: string = 'id') => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}`;
};

interface AcademyContextType {
  students: Student[];
  classes: ClassCategory[];
  events: Event[];
  scheduleEvents: CalendarEvent[]; // NEW: Real Calendar State
  libraryResources: LibraryResource[];
  academySettings: AcademySettings;
  messages: Message[];
  isLoading: boolean;
  
  // Actions
  refreshData: () => void;
  addStudent: (student: Student) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  updateStudentStatus: (id: string, status: Student['status']) => void;
  
  // Specialized setter for Finance Context to avoid circular dependency logic
  batchUpdateStudents: (updatedStudents: Student[]) => void;

  markAttendance: (studentId: string, classId: string, date: string, status: 'present' | 'late' | 'excused' | 'absent' | undefined, reason?: string) => void;
  bulkMarkPresent: (classId: string, date: string) => void;
  promoteStudent: (studentId: string) => void;
  
  addClass: (newClass: ClassCategory) => void;
  updateClass: (updatedClass: ClassCategory) => void; 
  modifyClassSession: (classId: string, modification: ClassException) => void; 
  deleteClass: (id: string) => void;
  enrollStudent: (studentId: string, classId: string) => void;
  unenrollStudent: (studentId: string, classId: string) => void;
  
  addEvent: (event: Event) => void;
  updateEvent: (event: Event) => void;
  deleteEvent: (id: string) => void;
  
  // NEW: Calendar Actions
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  addCalendarEvent: (event: CalendarEvent) => void;

  registerForEvent: (studentId: string, eventId: string) => void;
  updateEventRegistrants: (eventId: string, studentIds: string[]) => void;
  
  addLibraryResource: (resource: LibraryResource) => void;
  deleteLibraryResource: (id: string) => void;
  toggleResourceCompletion: (resourceId: string, studentId: string) => void;
  
  updateAcademySettings: (settings: AcademySettings) => void;
  updatePaymentDates: (billingDay: number, lateFeeDay: number) => void;
  
  sendMessage: (msg: Omit<Message, 'id' | 'read' | 'date'>) => void;
  markMessageRead: (id: string) => void;
}

const AcademyContext = createContext<AcademyContextType | undefined>(undefined);

export const AcademyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { addToast } = useToast();
  const academyId = currentUser?.academyId;

  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassCategory[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<CalendarEvent[]>([]); // NEW
  const [libraryResources, setLibraryResources] = useState<LibraryResource[]>([]);
  const [academySettings, setAcademySettings] = useState<AcademySettings>(PulseService.getAcademySettings(academyId));
  const [messages, setMessages] = useState<Message[]>([]);

  const loadData = () => {
      setIsLoading(true);
      if (currentUser?.academyId) {
          // Simulate network delay for better UX and Skeleton testing
          setTimeout(() => {
              setAcademySettings(PulseService.getAcademySettings(currentUser.academyId));
              setStudents(PulseService.getStudents(currentUser.academyId));
              setClasses(PulseService.getClasses(currentUser.academyId));
              setEvents(PulseService.getEvents(currentUser.academyId));
              
              // HYDRATION LOGIC FOR CALENDAR EVENTS
              // Check local storage first, else seed with mockData
              const storedEvents = localStorage.getItem('pulse_calendar_events');
              if (storedEvents) {
                  const parsed = JSON.parse(storedEvents).map((e: any) => ({
                      ...e,
                      start: new Date(e.start), // Convert ISO string back to Date
                      end: new Date(e.end)
                  }));
                  setScheduleEvents(parsed);
              } else {
                  setScheduleEvents(mockCalendarEvents);
              }

              setLibraryResources(PulseService.getLibrary(currentUser.academyId));
              const storedMsgs = localStorage.getItem('pulse_messages');
              setMessages(storedMsgs ? JSON.parse(storedMsgs) : mockMessages.map(m => ({...m, academyId: currentUser.academyId, recipientId: 'all', recipientName: 'Todos'}))); 
              setIsLoading(false);
          }, 800);
      } else {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      loadData();
  }, [currentUser]);

  // Persistence Effects
  useEffect(() => { if(currentUser && !isLoading) PulseService.saveStudents(students); }, [students, currentUser, isLoading]);
  useEffect(() => { if(currentUser && !isLoading) PulseService.saveClasses(classes); }, [classes, currentUser, isLoading]);
  useEffect(() => { if(currentUser && !isLoading) PulseService.saveEvents(events); }, [events, currentUser, isLoading]);
  
  // NEW: Persist Calendar Events
  useEffect(() => { 
      if(currentUser && !isLoading && scheduleEvents.length > 0) {
          localStorage.setItem('pulse_calendar_events', JSON.stringify(scheduleEvents));
      }
  }, [scheduleEvents, currentUser, isLoading]);

  useEffect(() => { if(currentUser && !isLoading) PulseService.saveLibrary(libraryResources); }, [libraryResources, currentUser, isLoading]);
  useEffect(() => { if(currentUser && !isLoading) PulseService.saveAcademySettings(academySettings); }, [academySettings, currentUser, isLoading]);
  useEffect(() => { if(currentUser && !isLoading) localStorage.setItem('pulse_messages', JSON.stringify(messages)); }, [messages, currentUser, isLoading]);

  // --- ACTIONS ---

  const addStudent = (student: Student) => {
      if (currentUser?.role !== 'master') return;
      const studentId = student.id || generateId('stu');
      
      const finalStudent = { 
          ...student, 
          id: studentId, 
          userId: studentId, 
          academyId: currentUser.academyId, 
          attendanceHistory: [],
          balance: 0, 
          status: 'active' as const
      };
      
      setStudents(prev => [...prev, finalStudent]);
      
      try {
          PulseService.createStudentAccountFromMaster(finalStudent, (student as any).password);
          addToast('Alumno creado y cuenta generada', 'success');
      } catch (e) { 
          console.error("Failed to auto-create user account", e); 
          addToast('Alumno creado, pero hubo un error generando su cuenta de usuario', 'info');
      }
  };

  const updateStudent = (updatedStudent: Student) => {
      if (currentUser?.role !== 'master') return;
      setStudents(prev => prev.map(s => s.id === updatedStudent.id ? { ...updatedStudent, balance: s.balance } : s));
      // Update User DB mirror
      const userDB = PulseService.getUsersDB();
      const updatedDB = userDB.map(u => u.id === updatedStudent.userId ? { ...u, name: updatedStudent.name, email: updatedStudent.email } : u);
      localStorage.setItem('pulse_users_db', JSON.stringify(updatedDB));
      addToast('Datos del alumno actualizados', 'success');
  };

  const batchUpdateStudents = (updatedStudents: Student[]) => {
      setStudents(updatedStudents);
  };

  const deleteStudent = (id: string) => {
      if (currentUser?.role !== 'master') return;
      setStudents(prev => prev.filter(s => s.id !== id));
      addToast('Alumno eliminado correctamente', 'success');
  };
  
  const updateStudentStatus = (id: string, status: Student['status']) => {
    if (currentUser?.role !== 'master') return;
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    addToast('Estado del alumno actualizado', 'success');
  };

  const markAttendance = (studentId: string, classId: string, date: string, status: 'present' | 'late' | 'excused' | 'absent' | undefined, reason?: string) => {
    const recordDate = date || getLocalDate();

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        let history = [...(s.attendanceHistory || [])];
        const existingIndex = history.findIndex(r => r.date === recordDate && r.classId === classId);

        if (status === undefined) {
            if (existingIndex >= 0) history.splice(existingIndex, 1);
        } else {
            const newRecord: AttendanceRecord = { 
                date: recordDate, 
                classId,
                status, 
                timestamp: new Date().toISOString(), 
                reason 
            };

            if (existingIndex >= 0) {
                history[existingIndex] = { ...history[existingIndex], ...newRecord };
            } else {
                history.push(newRecord);
            }
        }

        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const newAttendanceCount = history.filter(r => r.status === 'present' || r.status === 'late').length;
        const lastPresentRecord = history.find(r => r.status === 'present' || r.status === 'late');
        const lastAttendanceDate = lastPresentRecord ? lastPresentRecord.date : s.lastAttendance;

        return { 
            ...s, 
            attendance: newAttendanceCount, 
            attendanceHistory: history,
            lastAttendance: lastAttendanceDate
        };
      }
      return s;
    }));
  };

  const bulkMarkPresent = (classId: string, date: string) => {
      const cls = classes.find(c => c.id === classId);
      if (!cls) return;
      const recordDate = date || getLocalDate();

      setStudents(prev => prev.map(s => {
          if (cls.studentIds.includes(s.id)) {
               const history = [...(s.attendanceHistory || [])];
               const exists = history.some(r => r.date === recordDate && r.classId === classId);

               if (!exists) {
                    const newRecord: AttendanceRecord = { 
                        date: recordDate, 
                        classId, 
                        status: 'present', 
                        timestamp: new Date().toISOString() 
                    };
                    history.push(newRecord);
                    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    
                    const newAttendanceCount = history.filter(r => r.status === 'present' || r.status === 'late').length;
                    
                    return { 
                        ...s, 
                        attendance: newAttendanceCount, 
                        attendanceHistory: history, 
                        lastAttendance: recordDate
                    };
               }
          }
          return s;
      }));
  };

  const promoteStudent = (studentId: string) => {
      if (currentUser?.role !== 'master') return;
      setStudents(prev => prev.map(s => {
          if (s.id !== studentId) return s;
          const currentRankIndex = academySettings.ranks.findIndex(r => r.id === s.rankId);
          const nextRank = academySettings.ranks[currentRankIndex + 1];
          if (!nextRank) return s;
          const historyItem: PromotionHistoryItem = { rank: s.rank, date: getLocalDate(), notes: `Promovido a ${nextRank.name}` };
          
          return { 
              ...s, 
              rank: nextRank.name, 
              rankId: nextRank.id, 
              rankColor: nextRank.color, 
              attendance: 0, 
              attendanceHistory: [], 
              promotionHistory: [historyItem, ...(s.promotionHistory || [])] 
          };
      }));
      addToast('Alumno promovido exitosamente', 'success');
  };

  const addClass = (newClass: ClassCategory) => {
    if (currentUser?.role !== 'master') return;
    const cls = { ...newClass, id: newClass.id || generateId('cls'), academyId: currentUser.academyId };
    setClasses(prev => [...prev, cls]);
    addToast('Clase creada correctamente', 'success');
  };

  const updateClass = (updatedClass: ClassCategory) => {
    if (currentUser?.role !== 'master') return;
    setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
    addToast('Clase actualizada', 'success');
  };

  const modifyClassSession = (classId: string, modification: SessionModification) => {
    if (currentUser?.role !== 'master') return;
    setClasses(prev => prev.map(c => {
        if (c.id === classId) {
            const newModifications = c.modifications.filter(m => m.date !== modification.date);
            newModifications.push(modification);
            return { ...c, modifications: newModifications };
        }
        return c;
    }));
    addToast('Sesión modificada', 'success');
  };

  const deleteClass = (id: string) => {
      if (currentUser?.role !== 'master') return;
      setClasses(prev => prev.filter(c => c.id !== id));
      setStudents(prev => prev.map(s => ({
          ...s,
          classesId: s.classesId.filter(cid => cid !== id)
      })));
      addToast('Clase eliminada', 'success');
  };

  const enrollStudent = (studentId: string, classId: string) => {
      if (currentUser?.role !== 'master') return;
      setClasses(prev => prev.map(c => {
          if (c.id === classId && !c.studentIds.includes(studentId)) {
              return { ...c, studentIds: [...c.studentIds, studentId], studentCount: c.studentCount + 1 };
          }
          return c;
      }));
      setStudents(prev => prev.map(s => {
          if (s.id === studentId && !s.classesId.includes(classId)) {
              return { ...s, classesId: [...s.classesId, classId] };
          }
          return s;
      }));
      addToast('Alumno inscrito en la clase', 'success');
  };

  const unenrollStudent = (studentId: string, classId: string) => {
      if (currentUser?.role !== 'master') return;
       setClasses(prev => prev.map(c => {
          if (c.id === classId) {
              return { ...c, studentIds: c.studentIds.filter(id => id !== studentId), studentCount: Math.max(0, c.studentCount - 1) };
          }
          return c;
      }));
      setStudents(prev => prev.map(s => {
          if (s.id === studentId) {
              return { ...s, classesId: s.classesId.filter(id => id !== classId) };
          }
          return s;
      }));
      addToast('Alumno dado de baja de la clase', 'info');
  };

  // --- NEW CALENDAR ACTIONS ---
  
  const addCalendarEvent = (event: CalendarEvent) => {
      if (currentUser?.role !== 'master') return;
      const newEvent = { ...event, id: event.id || generateId('cal_evt') };
      setScheduleEvents(prev => [...prev, newEvent]);
      addToast('Evento agregado al calendario', 'success');
  };

  const updateCalendarEvent = (id: string, updates: Partial<CalendarEvent>) => {
      if (currentUser?.role !== 'master') return;
      setScheduleEvents(prev => prev.map(evt => 
          evt.id === id ? { ...evt, ...updates } : evt
      ));
      addToast('Horario actualizado en tiempo real', 'success');
  };

  const addEvent = (event: Event) => {
      if (currentUser?.role !== 'master') return;
      
      let initialRegistrants = event.registrants || [];
      
      // AUTOMATION: If event is exam, automatically add 'exam_ready' students
      if (event.type === 'exam') {
          const readyStudents = students.filter(s => s.status === 'exam_ready').map(s => s.id);
          initialRegistrants = Array.from(new Set([...initialRegistrants, ...readyStudents]));
      }

      const newEvent = { 
          ...event, 
          id: event.id || generateId('evt'), 
          academyId: currentUser.academyId,
          registrants: initialRegistrants,
          registeredCount: initialRegistrants.length
      };
      
      setEvents(prev => [...prev, newEvent]);
      
      if (event.type === 'exam' && initialRegistrants.length > 0) {
          addToast(`Evento creado con ${initialRegistrants.length} alumnos asignados automáticamente.`, 'success');
      } else {
          addToast('Evento creado', 'success');
      }
  };

  const updateEvent = (updatedEvent: Event) => {
      if (currentUser?.role !== 'master') return;
      setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      addToast('Evento actualizado', 'success');
  };

  const deleteEvent = (id: string) => {
      if (currentUser?.role !== 'master') return;
      setEvents(prev => prev.filter(e => e.id !== id));
      addToast('Evento eliminado', 'success');
  };

  const registerForEvent = (studentId: string, eventId: string) => {
      const event = events.find(e => e.id === eventId);
      
      if (event && event.type === 'exam') {
          addToast('La inscripción a exámenes es gestionada exclusivamente por el maestro.', 'error');
          return;
      }

      setEvents(prev => prev.map(e => {
          if (e.id === eventId && !e.registrants?.includes(studentId)) {
              return { ...e, registrants: [...(e.registrants || []), studentId], registeredCount: (e.registeredCount || 0) + 1 };
          }
          return e;
      }));
  };

  const updateEventRegistrants = (eventId: string, studentIds: string[]) => {
      if (currentUser?.role !== 'master') return;
      setEvents(prev => PulseService.updateEventRegistrants(prev, eventId, studentIds));
      addToast('Lista de asistentes actualizada', 'success');
  };

  const addLibraryResource = (resource: LibraryResource) => {
      if (currentUser?.role !== 'master') return;
      const newResource = { ...resource, id: resource.id || generateId('lib'), academyId: currentUser.academyId };
      setLibraryResources(prev => [...prev, newResource]);
      addToast('Recurso añadido a la biblioteca', 'success');
  };

  const deleteLibraryResource = (id: string) => {
      if (currentUser?.role !== 'master') return;
      setLibraryResources(prev => prev.filter(r => r.id !== id));
      addToast('Recurso eliminado', 'success');
  };

  const toggleResourceCompletion = (resourceId: string, studentId: string) => {
      setLibraryResources(prev => prev.map(r => {
          if (r.id === resourceId) {
              const completedBy = r.completedBy || [];
              if (completedBy.includes(studentId)) {
                  return { ...r, completedBy: completedBy.filter(id => id !== studentId) };
              } else {
                  return { ...r, completedBy: [...completedBy, studentId] };
              }
          }
          return r;
      }));
  };

  const updateAcademySettings = (settings: AcademySettings) => {
      if (currentUser?.role !== 'master') return;
      setAcademySettings(settings);
      addToast('Configuración guardada', 'success');
  };

  const updatePaymentDates = (billingDay: number, lateFeeDay: number) => {
      if (currentUser?.role !== 'master') return;
      if (lateFeeDay <= billingDay) {
          addToast("El día de recargo debe ser posterior al día de corte.", 'error');
          throw new Error("El día de recargo debe ser posterior al día de corte.");
      }
      setAcademySettings(prev => ({
          ...prev,
          paymentSettings: { ...prev.paymentSettings, billingDay, lateFeeDay }
      }));
      addToast('Fechas de facturación actualizadas', 'success');
  };

  const sendMessage = (msg: Omit<Message, 'id' | 'read' | 'date'>) => {
      const dateStr = formatDateDisplay(getLocalDate(), { month: 'short', day: 'numeric' });
      const newMessage: Message = { ...msg, id: generateId('msg'), read: false, date: dateStr };
      setMessages(prev => [newMessage, ...prev]);
      addToast('Mensaje enviado', 'success');
  };

  const markMessageRead = (id: string) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  };

  return (
    <AcademyContext.Provider value={{ 
        students, classes, events, scheduleEvents, libraryResources, academySettings, messages, isLoading,
        refreshData: loadData,
        addStudent, updateStudent, deleteStudent, updateStudentStatus, batchUpdateStudents,
        markAttendance, bulkMarkPresent, promoteStudent, 
        addClass, updateClass, modifyClassSession, deleteClass, enrollStudent, unenrollStudent, 
        addEvent, updateEvent, deleteEvent, registerForEvent, updateEventRegistrants,
        addCalendarEvent, updateCalendarEvent, // Exposed Calendar Actions
        addLibraryResource, deleteLibraryResource, toggleResourceCompletion, 
        updateAcademySettings, updatePaymentDates,
        sendMessage, markMessageRead
    }}>
      {children}
    </AcademyContext.Provider>
  );
};

export const useAcademy = () => {
  const context = useContext(AcademyContext);
  if (context === undefined) {
    throw new Error('useAcademy must be used within an AcademyProvider');
  }
  return context;
};
