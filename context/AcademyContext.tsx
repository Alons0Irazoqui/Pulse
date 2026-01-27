
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { Student, ClassCategory, Event, LibraryResource, AcademySettings, Message, AttendanceRecord, SessionModification, ClassException, PromotionHistoryItem, CalendarEvent, Rank } from '../types';
import { PulseService } from '../services/pulseService';
import { mockMessages } from '../mockData';
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

  // --- ARCHITECTURE FIX: Race Condition Prevention ---
  const isPollingRef = useRef(false);

  const [isLoading, setIsLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassCategory[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [scheduleEvents, setScheduleEvents] = useState<CalendarEvent[]>([]); 
  const [libraryResources, setLibraryResources] = useState<LibraryResource[]>([]);
  const [academySettings, setAcademySettings] = useState<AcademySettings>(PulseService.getAcademySettings(academyId));
  const [messages, setMessages] = useState<Message[]>([]);

  // --- CALENDAR ENGINE ---
  const calculateCalendarEvents = useCallback((currentClasses: ClassCategory[], currentEvents: Event[]) => {
      const generatedEvents: CalendarEvent[] = [];
      
      // 1. Process One-time Events
      currentEvents.forEach(evt => {
          generatedEvents.push({
              ...evt,
              start: new Date(`${evt.date}T${evt.time}`),
              end: new Date(new Date(`${evt.date}T${evt.time}`).getTime() + 60*60*1000), 
              color: evt.type === 'exam' ? '#db2777' : evt.type === 'tournament' ? '#f97316' : '#3b82f6',
              isRecurring: false
          });
      });

      // 2. Generate Recurring Class Instances (12-month window)
      const today = new Date();
      const startWindow = new Date(today.getFullYear(), today.getMonth() - 2, 1);
      const endWindow = new Date(today.getFullYear(), today.getMonth() + 10, 0);
      
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      currentClasses.forEach(cls => {
          const loopDate = new Date(startWindow);
          
          while (loopDate <= endWindow) {
              const dayName = dayNames[loopDate.getDay()];
              const dateStr = format(loopDate, 'yyyy-MM-dd');
              
              const modification = cls.modifications.find(m => m.date === dateStr);
              const movedHere = cls.modifications.find(m => m.newDate === dateStr && m.type === 'move');
              
              let shouldRender = false;
              let currentMod: SessionModification | undefined = undefined;

              if (movedHere) {
                  shouldRender = true;
                  currentMod = movedHere;
              } else if (cls.days.includes(dayName)) {
                  if (modification?.type === 'move') {
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
                      classId: cls.id,
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

  // Update calendar when dependencies change (Derived State)
  useEffect(() => {
      const newEvents = calculateCalendarEvents(classes, events);
      setScheduleEvents(newEvents);
  }, [classes, events, calculateCalendarEvents]);


  // --- DATA LOADING & POLLING ---
  
  const loadData = useCallback(async (silent = false) => {
      if (currentUser?.academyId) {
          if (!silent) setIsLoading(true);
          
          isPollingRef.current = true;

          try {
              const dbStudents = PulseService.getStudents(currentUser.academyId);
              setStudents(prev => {
                  if (JSON.stringify(prev) !== JSON.stringify(dbStudents)) return dbStudents;
                  return prev;
              });

              const dbClasses = PulseService.getClasses(currentUser.academyId);
              setClasses(prev => {
                  if (JSON.stringify(prev) !== JSON.stringify(dbClasses)) return dbClasses;
                  return prev;
              });

              const dbEvents = PulseService.getEvents(currentUser.academyId);
              setEvents(prev => {
                  if (JSON.stringify(prev) !== JSON.stringify(dbEvents)) return dbEvents;
                  return prev;
              });

              const dbSettings = PulseService.getAcademySettings(currentUser.academyId);
              setAcademySettings(prev => {
                  if (JSON.stringify(prev) !== JSON.stringify(dbSettings)) return dbSettings;
                  return prev;
              });

              setLibraryResources(PulseService.getLibrary(currentUser.academyId));
              const storedMsgs = localStorage.getItem('pulse_messages');
              if (storedMsgs) {
                  setMessages(JSON.parse(storedMsgs));
              } else {
                  if (messages.length === 0) {
                      setMessages(mockMessages.map(m => ({...m, academyId: currentUser.academyId, recipientId: 'all', recipientName: 'Todos'}))); 
                  }
              }

          } finally {
              if (!silent) setIsLoading(false);
              setTimeout(() => {
                  isPollingRef.current = false;
              }, 500);
          }
      } else {
          setIsLoading(false);
      }
  }, [currentUser]);

  useEffect(() => {
      loadData(false);
  }, [loadData]);

  useEffect(() => {
      if (!currentUser) return;
      const intervalId = setInterval(() => {
          loadData(true);
      }, 5000);
      return () => clearInterval(intervalId);
  }, [loadData, currentUser]);


  // --- MANUAL PERSISTENCE (EFFECTS REMOVED) ---
  // The automatic useEffects for saving students, classes, etc. have been removed 
  // to prevent overwriting new data from other sources (like public registration)
  // with stale state from this client.
  
  // Keep Message persistence as it's local only for now
  useEffect(() => { 
      if(currentUser && !isLoading && !isPollingRef.current) localStorage.setItem('pulse_messages', JSON.stringify(messages)); 
  }, [messages, currentUser, isLoading]);


  // --- ACTIONS (Explicit Saves) ---

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
      
      const newStudentList = [...students, finalStudent];
      setStudents(newStudentList);
      PulseService.saveStudents(newStudentList); // Explicit Save
      
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
      const newStudents = students.map(s => s.id === updatedStudent.id ? { ...updatedStudent, balance: s.balance } : s);
      setStudents(newStudents);
      PulseService.saveStudents(newStudents); // Explicit Save
      
      const userDB = PulseService.getUsersDB();
      const updatedDB = userDB.map(u => u.id === updatedStudent.userId ? { ...u, name: updatedStudent.name, email: updatedStudent.email } : u);
      localStorage.setItem('pulse_users_db', JSON.stringify(updatedDB));
      
      addToast('Datos del alumno actualizados', 'success');
  };

  const batchUpdateStudents = (updatedStudents: Student[]) => {
      setStudents(prev => {
          // Merge updates into existing list instead of replacing
          // Explicitly typing map to ensure Student[] is inferred correctly
          const updatedMap = new Map<string, Student>(prev.map(s => [s.id, s]));
          updatedStudents.forEach(s => updatedMap.set(s.id, s));
          const newStudents = Array.from(updatedMap.values());
          
          PulseService.saveStudents(newStudents); // Explicit Save
          return newStudents;
      });
  };

  const deleteStudent = (id: string) => {
      if (currentUser?.role !== 'master') return;
      
      PulseService.deleteFullStudentData(id);

      const newStudents = students.filter(s => s.id !== id);
      setStudents(newStudents);
      // PulseService.saveStudents(newStudents) - Not needed as deleteFullStudentData handles DB directly

      const newClasses = classes.map(c => {
          if (c.studentIds.includes(id)) {
              return {
                  ...c,
                  studentIds: c.studentIds.filter(sid => sid !== id),
                  studentCount: Math.max(0, c.studentCount - 1)
              };
          }
          return c;
      });
      setClasses(newClasses);
      PulseService.saveClasses(newClasses); // Explicit Save for Classes integrity

      const newEvents = events.map(e => {
          if (e.registrants?.includes(id)) {
              return {
                  ...e,
                  registrants: e.registrants.filter(rid => rid !== id),
                  registeredCount: Math.max(0, (e.registeredCount || 0) - 1)
              };
          }
          return e;
      });
      setEvents(newEvents);
      PulseService.saveEvents(newEvents); // Explicit Save for Events integrity

      addToast('Alumno eliminado totalmente del sistema', 'success');
  };
  
  const updateStudentStatus = (id: string, status: Student['status']) => {
    if (currentUser?.role !== 'master') return;
    const newStudents = students.map(s => s.id === id ? { ...s, status } : s);
    setStudents(newStudents);
    PulseService.saveStudents(newStudents); // Explicit Save
    addToast('Estado del alumno actualizado', 'success');
  };

  const markAttendance = (studentId: string, classId: string, date: string, status: 'present' | 'late' | 'excused' | 'absent' | undefined, reason?: string) => {
    const recordDate = date || getLocalDate();

    const newStudents = students.map(s => {
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
    });

    setStudents(newStudents);
    PulseService.saveStudents(newStudents); // Explicit Save
  };

  const bulkMarkPresent = (classId: string, date: string) => {
      const cls = classes.find(c => c.id === classId);
      if (!cls) return;
      const recordDate = date || getLocalDate();

      const newStudents = students.map(s => {
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
      });

      setStudents(newStudents);
      PulseService.saveStudents(newStudents); // Explicit Save
  };

  const promoteStudent = (studentId: string) => {
      if (currentUser?.role !== 'master') return;
      const newStudents = students.map(s => {
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
      });
      setStudents(newStudents);
      PulseService.saveStudents(newStudents); // Explicit Save
      addToast('Alumno promovido exitosamente', 'success');
  };

  const addClass = (newClass: ClassCategory) => {
    if (currentUser?.role !== 'master') return;
    const cls = { ...newClass, id: newClass.id || generateId('cls'), academyId: currentUser.academyId };
    const newClasses = [...classes, cls];
    setClasses(newClasses);
    PulseService.saveClasses(newClasses); // Explicit Save
    addToast('Clase creada correctamente', 'success');
  };

  const updateClass = (updatedClass: ClassCategory) => {
    if (currentUser?.role !== 'master') return;
    const newClasses = classes.map(c => c.id === updatedClass.id ? updatedClass : c);
    setClasses(newClasses);
    PulseService.saveClasses(newClasses); // Explicit Save
    addToast('Clase actualizada', 'success');
  };

  const modifyClassSession = (classId: string, modification: SessionModification) => {
    if (currentUser?.role !== 'master') return;
    const newClasses = classes.map(c => {
        if (c.id === classId) {
            const newModifications = c.modifications.filter(m => m.date !== modification.date);
            newModifications.push(modification);
            return { ...c, modifications: newModifications };
        }
        return c;
    });
    setClasses(newClasses);
    PulseService.saveClasses(newClasses); // Explicit Save
    addToast('Sesión modificada', 'success');
  };

  const deleteClass = (id: string) => {
      if (currentUser?.role !== 'master') return;
      const newClasses = classes.filter(c => c.id !== id);
      setClasses(newClasses);
      PulseService.saveClasses(newClasses); // Explicit Save

      const newStudents = students.map(s => ({
          ...s,
          classesId: s.classesId.filter(cid => cid !== id)
      }));
      setStudents(newStudents);
      PulseService.saveStudents(newStudents); // Explicit Save (Student enrollment updated)

      addToast('Clase eliminada', 'success');
  };

  const enrollStudent = (studentId: string, classId: string) => {
      if (currentUser?.role !== 'master') return;
      
      const newClasses = classes.map(c => {
          if (c.id === classId && !c.studentIds.includes(studentId)) {
              return { ...c, studentIds: [...c.studentIds, studentId], studentCount: c.studentCount + 1 };
          }
          return c;
      });
      setClasses(newClasses);
      PulseService.saveClasses(newClasses); // Explicit Save

      const newStudents = students.map(s => {
          if (s.id === studentId && !s.classesId.includes(classId)) {
              return { ...s, classesId: [...s.classesId, classId] };
          }
          return s;
      });
      setStudents(newStudents);
      PulseService.saveStudents(newStudents); // Explicit Save

      addToast('Alumno inscrito en la clase', 'success');
  };

  const unenrollStudent = (studentId: string, classId: string) => {
      if (currentUser?.role !== 'master') return;
      
      const newClasses = classes.map(c => {
          if (c.id === classId) {
              return { ...c, studentIds: c.studentIds.filter(id => id !== studentId), studentCount: Math.max(0, c.studentCount - 1) };
          }
          return c;
      });
      setClasses(newClasses);
      PulseService.saveClasses(newClasses); // Explicit Save

      const newStudents = students.map(s => {
          if (s.id === studentId) {
              return { ...s, classesId: s.classesId.filter(id => id !== classId) };
          }
          return s;
      });
      setStudents(newStudents);
      PulseService.saveStudents(newStudents); // Explicit Save

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
      
      if (updates.classId && updates.start) {
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
      else {
          const newEvents = events.map(e => e.id === id ? { ...e, ...updates } : e);
          setEvents(newEvents);
          PulseService.saveEvents(newEvents); // Explicit Save
      }
  };

  const deleteCalendarEvent = (id: string) => {
      const evt = events.find(e => e.id === id);
      if (evt) {
          deleteEvent(id);
      } else {
          const [classId, dateStr] = id.split(/-(?=\d{4}-\d{2}-\d{2})/); 
          if (classId && dateStr) {
              modifyClassSession(classId, { date: dateStr, type: 'cancel' });
          }
      }
  };

  // --- MARKETPLACE EVENTS ---

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
      
      const newEvents = [...events, newEvent];
      setEvents(newEvents);
      PulseService.saveEvents(newEvents); // Explicit Save
      addToast('Evento creado', 'success');
  };

  const updateEvent = (updatedEvent: Event) => {
      if (currentUser?.role !== 'master') return;
      const newEvents = events.map(e => e.id === updatedEvent.id ? updatedEvent : e);
      setEvents(newEvents);
      PulseService.saveEvents(newEvents); // Explicit Save
      addToast('Evento actualizado', 'success');
  };

  const deleteEvent = (id: string) => {
      if (currentUser?.role !== 'master') return;
      const newEvents = events.filter(e => e.id !== id);
      setEvents(newEvents);
      PulseService.saveEvents(newEvents); // Explicit Save
      addToast('Evento eliminado', 'success');
  };

  const registerForEvent = (studentId: string, eventId: string) => {
      const event = events.find(e => e.id === eventId);
      
      if (event && event.type === 'exam') {
          if (currentUser?.role !== 'master') {
              addToast('La inscripción a exámenes es gestionada exclusivamente por el maestro.', 'error');
              return;
          }
      }

      const newEvents = events.map(e => {
          if (e.id === eventId && !e.registrants?.includes(studentId)) {
              return { ...e, registrants: [...(e.registrants || []), studentId], registeredCount: (e.registeredCount || 0) + 1 };
          }
          return e;
      });
      setEvents(newEvents);
      PulseService.saveEvents(newEvents); // Explicit Save
  };

  const updateEventRegistrants = (eventId: string, studentIds: string[]) => {
      if (currentUser?.role !== 'master') return;
      const newEvents = PulseService.updateEventRegistrants(events, eventId, studentIds);
      setEvents(newEvents);
      PulseService.saveEvents(newEvents); // Explicit Save
      addToast('Lista de asistentes actualizada', 'success');
  };

  const getStudentEnrolledEvents = (studentId: string) => {
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
      const newResources = [...libraryResources, newResource];
      setLibraryResources(newResources);
      PulseService.saveLibrary(newResources); // Explicit Save
      addToast('Recurso añadido a la biblioteca', 'success');
  };

  const deleteLibraryResource = (id: string) => {
      if (currentUser?.role !== 'master') return;
      const newResources = libraryResources.filter(r => r.id !== id);
      setLibraryResources(newResources);
      PulseService.saveLibrary(newResources); // Explicit Save
      addToast('Recurso eliminado', 'success');
  };

  const toggleResourceCompletion = (resourceId: string, studentId: string) => {
      const newResources = libraryResources.map(r => {
          if (r.id === resourceId) {
              const completedBy = r.completedBy || [];
              if (completedBy.includes(studentId)) {
                  return { ...r, completedBy: completedBy.filter(id => id !== studentId) };
              } else {
                  return { ...r, completedBy: [...completedBy, studentId] };
              }
          }
          return r;
      });
      setLibraryResources(newResources);
      PulseService.saveLibrary(newResources); // Explicit Save
  };

  const updateAcademySettings = (settings: AcademySettings) => {
      if (currentUser?.role !== 'master') return;
      setAcademySettings(settings);
      PulseService.saveAcademySettings(settings); // Explicit Save
      addToast('Configuración guardada', 'success');
  };

  const updatePaymentDates = (billingDay: number, lateFeeDay: number) => {
      if (currentUser?.role !== 'master') return;
      if (lateFeeDay <= billingDay) {
          addToast("El día de recargo debe ser posterior al día de corte.", 'error');
          throw new Error("El día de recargo debe ser posterior al día de corte.");
      }
      const newSettings = {
          ...academySettings,
          paymentSettings: { ...academySettings.paymentSettings, billingDay, lateFeeDay }
      };
      setAcademySettings(newSettings);
      PulseService.saveAcademySettings(newSettings); // Explicit Save
      addToast('Fechas de facturación actualizadas', 'success');
  };

  const addRank = (rank: Rank) => {
      if (currentUser?.role !== 'master') return;
      const newSettings = {
          ...academySettings,
          ranks: [...academySettings.ranks, rank]
      };
      setAcademySettings(newSettings);
      PulseService.saveAcademySettings(newSettings); // Explicit Save
  };

  const deleteRank = (id: string) => {
      if (currentUser?.role !== 'master') return;
      const newSettings = {
          ...academySettings,
          ranks: academySettings.ranks.filter(r => r.id !== id)
      };
      setAcademySettings(newSettings);
      PulseService.saveAcademySettings(newSettings); // Explicit Save
  };

  const sendMessage = (msg: Omit<Message, 'id' | 'read' | 'date'>) => {
      const dateStr = formatDateDisplay(getLocalDate(), { month: 'short', day: 'numeric' });
      const newMessage: Message = { ...msg, id: generateId('msg'), read: false, date: dateStr };
      setMessages(prev => [newMessage, ...prev]);
      // Messages are saved in useEffect as per legacy, but we can make it explicit too if desired. 
      // For now, keeping legacy behavior for messages as requested to only change specific entities.
      addToast('Mensaje enviado', 'success');
  };

  const markMessageRead = (id: string) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  };

  return (
    <AcademyContext.Provider value={{ 
        students, classes, events, scheduleEvents, libraryResources, academySettings, messages, isLoading,
        refreshData: () => loadData(true),
        addStudent, updateStudent, deleteStudent, updateStudentStatus, batchUpdateStudents,
        markAttendance, bulkMarkPresent, promoteStudent, 
        addClass, updateClass, modifyClassSession, deleteClass, enrollStudent, unenrollStudent, 
        addEvent, updateEvent, deleteEvent, registerForEvent, updateEventRegistrants,
        addCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getStudentEnrolledEvents, 
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
