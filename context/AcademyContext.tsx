
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Student, ClassCategory, Event, LibraryResource, AcademySettings, Message, AttendanceRecord, SessionModification, ClassException, PromotionHistoryItem, CalendarEvent, Rank } from '../types';
import { PulseService } from '../services/pulseService';
import { mockMessages, mockCalendarEvents } from '../mockData';
import { getLocalDate, formatDateDisplay } from '../utils/dateUtils';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { format } from 'date-fns';

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
  scheduleEvents: CalendarEvent[]; // REAL CALENDAR STATE (Derived)
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
  
  // Marketplace Events (Legacy)
  addEvent: (event: Event) => void;
  updateEvent: (event: Event) => void;
  deleteEvent: (id: string) => void;
  
  // --- REAL CALENDAR ACTIONS ---
  addCalendarEvent: (event: CalendarEvent) => void;
  updateCalendarEvent: (id: string, updates: Partial<CalendarEvent>) => void;
  deleteCalendarEvent: (id: string) => void;

  registerForEvent: (studentId: string, eventId: string) => void;
  updateEventRegistrants: (eventId: string, studentIds: string[]) => void;
  getStudentEnrolledEvents: (studentId: string) => Event[]; // New Helper
  
  addLibraryResource: (resource: LibraryResource) => void;
  deleteLibraryResource: (id: string) => void;
  toggleResourceCompletion: (resourceId: string, studentId: string) => void;
  
  updateAcademySettings: (settings: AcademySettings) => void;
  updatePaymentDates: (billingDay: number, lateFeeDay: number) => void;
  addRank: (rank: Rank) => void;
  deleteRank: (id: string) => void;
  
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
  const [scheduleEvents, setScheduleEvents] = useState<CalendarEvent[]>([]); // This is now derived + explicit events
  const [libraryResources, setLibraryResources] = useState<LibraryResource[]>([]);
  const [academySettings, setAcademySettings] = useState<AcademySettings>(PulseService.getAcademySettings(academyId));
  const [messages, setMessages] = useState<Message[]>([]);

  // --- CALENDAR ENGINE ---
  // Calculates events dynamically based on recurring classes and their modifications.
  const calculateCalendarEvents = useCallback((currentClasses: ClassCategory[], currentEvents: Event[]) => {
      const generatedEvents: CalendarEvent[] = [];
      
      // 1. Process One-time Events (Marketplace)
      currentEvents.forEach(evt => {
          generatedEvents.push({
              ...evt,
              start: new Date(`${evt.date}T${evt.time}`),
              end: new Date(new Date(`${evt.date}T${evt.time}`).getTime() + 60*60*1000), // Default 1h if not spec
              color: evt.type === 'exam' ? '#db2777' : evt.type === 'tournament' ? '#f97316' : '#3b82f6',
              isRecurring: false
          });
      });

      // 2. Generate Recurring Class Instances
      // Generate for a 12-month window (-2 month to +10 months) to cover reasonable viewing
      const today = new Date();
      const startWindow = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const endWindow = new Date(today.getFullYear(), today.getMonth() + 10, 0);
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      currentClasses.forEach(cls => {
          const loopDate = new Date(startWindow);
          
          while (loopDate <= endWindow) {
              const dayName = dayNames[loopDate.getDay()];
              // CRITICAL FIX: Use local format yyyy-MM-dd to match modification keys exactly
              const dateStr = format(loopDate, 'yyyy-MM-dd');
              
              // Check if class occurs on this day OR if it was moved TO this day
              const modification = cls.modifications.find(m => m.date === dateStr);
              const movedHere = cls.modifications.find(m => m.newDate === dateStr && m.type === 'move');
              
              let shouldRender = false;
              let currentMod: SessionModification | undefined = undefined;

              if (movedHere) {
                  shouldRender = true;
                  currentMod = movedHere;
              } else if (cls.days.includes(dayName)) {
                  // It's a regular day
                  if (modification?.type === 'move') {
                      // Moved AWAY from here -> Don't render
                      shouldRender = false; 
                  } else {
                      shouldRender = true;
                      currentMod = modification;
                  }
              }

              if (shouldRender) {
                  const startTime = currentMod?.newStartTime || cls.startTime;
                  const endTime = currentMod?.newEndTime || cls.endTime;
                  const instructor = currentMod?.newInstructor || cls.instructor;
                  const status = currentMod?.type === 'cancel' ? 'cancelled' : (currentMod?.type === 'rescheduled' ? 'rescheduled' : 'active');

                  const [sh, sm] = startTime.split(':').map(Number);
                  const [eh, em] = endTime.split(':').map(Number);

                  const start = new Date(loopDate);
                  start.setHours(sh, sm, 0);
                  
                  const end = new Date(loopDate);
                  end.setHours(eh, em, 0);

                  generatedEvents.push({
                      id: `${cls.id}-${dateStr}`,
                      academyId: cls.academyId,
                      classId: cls.id, // CRITICAL FOR FILTERING
                      title: cls.name,
                      start,
                      end,
                      instructor,
                      instructorName: instructor,
                      status: status,
                      type: 'class',
                      color: status === 'cancelled' ? '#ef4444' : '#3b82f6', 
                      isRecurring: true,
                      description: status === 'cancelled' ? 'Clase Cancelada' : `Instructor: ${instructor}`
                  });
              }

              loopDate.setDate(loopDate.getDate() + 1);
          }
      });

      return generatedEvents;
  }, []);

  // Refresh calendar when classes or events change
  useEffect(() => {
      if (!isLoading) {
          const newEvents = calculateCalendarEvents(classes, events);
          setScheduleEvents(newEvents);
      }
  }, [classes, events, isLoading, calculateCalendarEvents]);


  const loadData = () => {
      setIsLoading(true);
      if (currentUser?.academyId) {
          setTimeout(() => {
              setAcademySettings(PulseService.getAcademySettings(currentUser.academyId));
              setStudents(PulseService.getStudents(currentUser.academyId));
              const loadedClasses = PulseService.getClasses(currentUser.academyId);
              setClasses(loadedClasses);
              const loadedEvents = PulseService.getEvents(currentUser.academyId);
              setEvents(loadedEvents);
              
              // Initial Calc
              const calculated = calculateCalendarEvents(loadedClasses, loadedEvents);
              setScheduleEvents(calculated);

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

  // Persistence
  useEffect(() => { if(currentUser && !isLoading) PulseService.saveStudents(students); }, [students, currentUser, isLoading]);
  useEffect(() => { if(currentUser && !isLoading) PulseService.saveClasses(classes); }, [classes, currentUser, isLoading]);
  useEffect(() => { if(currentUser && !isLoading) PulseService.saveEvents(events); }, [events, currentUser, isLoading]);
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
      const userDB = PulseService.getUsersDB();
      const updatedDB = userDB.map(u => u.id === updatedStudent.userId ? { ...u, name: updatedStudent.name, email: updatedStudent.email } : u);
      localStorage.setItem('pulse_users_db', JSON.stringify(updatedDB));
      addToast('Datos del alumno actualizados', 'success');
  };

  const batchUpdateStudents = (updatedStudents: Student[]) => {
      setStudents(updatedStudents);
  };

  // --- DELETE STUDENT (CRUD FIXED) ---
  const deleteStudent = (id: string) => {
      if (currentUser?.role !== 'master') return;
      
      // 1. Perform Hard Delete in DB layer
      PulseService.deleteFullStudentData(id);

      // 2. Update Local State (Students List)
      setStudents(prev => prev.filter(s => s.id !== id));

      // 3. Update Local State (Classes Enrollment)
      setClasses(prev => prev.map(c => {
          if (c.studentIds.includes(id)) {
              return {
                  ...c,
                  studentIds: c.studentIds.filter(sid => sid !== id),
                  studentCount: Math.max(0, c.studentCount - 1)
              };
          }
          return c;
      }));

      // 4. Update Local State (Events Registration)
      setEvents(prev => prev.map(e => {
          if (e.registrants?.includes(id)) {
              return {
                  ...e,
                  registrants: e.registrants.filter(rid => rid !== id),
                  registeredCount: Math.max(0, (e.registeredCount || 0) - 1)
              };
          }
          return e;
      }));

      addToast('Alumno eliminado totalmente del sistema', 'success');
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

  // --- CRITICAL: Updates the class exceptions, triggering calendar regeneration ---
  const modifyClassSession = (classId: string, modification: SessionModification) => {
    if (currentUser?.role !== 'master') return;
    setClasses(prev => prev.map(c => {
        if (c.id === classId) {
            // Remove existing mod for this date if exists
            const newModifications = c.modifications.filter(m => m.date !== modification.date);
            // Add new mod
            newModifications.push(modification);
            return { ...c, modifications: newModifications };
        }
        return c;
    }));
    // Note: useEffect[classes] will trigger recalculation of scheduleEvents automatically
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

  // --- CALENDAR CRUD OPERATIONS (Wrapper) ---
  
  const addCalendarEvent = (event: CalendarEvent) => {
      if (event.type !== 'class') {
          addEvent(event as Event);
      }
  };

  const updateCalendarEvent = (id: string, updates: Partial<CalendarEvent>) => {
      if (currentUser?.role !== 'master') return;
      
      // CRITICAL FIX: If it's a recurring class instance, ensure DATE key matches formatting
      if (updates.classId && updates.start) {
          // Use format from date-fns to avoid timezone shifts (UTC vs Local)
          const dateStr = format(updates.start, 'yyyy-MM-dd');
          
          const modification: SessionModification = {
              date: dateStr,
              type: updates.status === 'cancelled' ? 'cancel' : 'instructor',
              newInstructor: updates.instructor,
              newStartTime: updates.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false}),
              newEndTime: updates.end?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})
          };
          if (updates.status === 'rescheduled') modification.type = 'rescheduled';
          
          modifyClassSession(updates.classId, modification);
      } 
      // Else, update legacy event
      else {
          setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
      }
  };

  const deleteCalendarEvent = (id: string) => {
      // Find if it's an Event or Class Instance
      const evt = events.find(e => e.id === id);
      if (evt) {
          deleteEvent(id);
      } else {
          // It's likely a generated class instance ID like "classId-date"
          const [classId, dateStr] = id.split(/-(?=\d{4}-\d{2}-\d{2})/); // split on last dash before date
          if (classId && dateStr) {
              modifyClassSession(classId, { date: dateStr, type: 'cancel' });
          }
      }
  };

  // --- MARKETPLACE EVENTS (LEGACY) ---

  const addEvent = (event: Event) => {
      if (currentUser?.role !== 'master') return;
      
      let initialRegistrants = event.registrants || [];
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
      addToast('Evento creado', 'success');
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
      
      // FIXED: Allow Masters to register students for exams. Block only Students.
      if (event && event.type === 'exam') {
          if (currentUser?.role !== 'master') {
              addToast('La inscripción a exámenes es gestionada exclusivamente por el maestro.', 'error');
              return;
          }
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

  const getStudentEnrolledEvents = (studentId: string) => {
      // Return events where student is registered AND date is future OR recent past (30 days)
      const now = new Date();
      const threshold = new Date();
      threshold.setDate(threshold.getDate() - 30); 

      return events.filter(e => 
          e.registrants?.includes(studentId) && 
          new Date(e.date) >= threshold
      ).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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

  const addRank = (rank: Rank) => {
      if (currentUser?.role !== 'master') return;
      setAcademySettings(prev => ({
          ...prev,
          ranks: [...prev.ranks, rank]
      }));
      // addToast handled by consumer usually, but we can add generic here
  };

  const deleteRank = (id: string) => {
      if (currentUser?.role !== 'master') return;
      setAcademySettings(prev => ({
          ...prev,
          ranks: prev.ranks.filter(r => r.id !== id)
      }));
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
        addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getStudentEnrolledEvents, // NEW EXPORT
        addLibraryResource, deleteLibraryResource, toggleResourceCompletion, 
        updateAcademySettings, updatePaymentDates, addRank, deleteRank,
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
