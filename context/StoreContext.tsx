import React, { createContext, useContext, useState, useEffect } from 'react';
import { Student, ClassCategory, Payment, UserProfile, LibraryResource, Event, AcademySettings, PromotionHistoryItem, Message, AttendanceRecord, SessionModification, ClassException } from '../types';
import { PulseService } from '../services/pulseService';
import { mockMessages } from '../mockData';
import { getLocalDate } from '../utils/dateUtils';

interface StoreContextType {
  students: Student[];
  classes: ClassCategory[];
  events: Event[];
  currentUser: UserProfile | null;
  payments: Payment[];
  messages: Message[];
  libraryResources: LibraryResource[];
  academySettings: AcademySettings;
  stats: {
      totalRevenue: number;
      activeStudents: number;
      retentionRate: number;
      churnRate: number;
      monthlyRevenue: { name: string; value: number }[];
  };
  // Actions
  refreshData: () => void;
  addStudent: (student: Student) => void;
  updateStudent: (student: Student) => void;
  deleteStudent: (id: string) => void;
  updateStudentStatus: (id: string, status: Student['status']) => void;
  markAttendance: (studentId: string, classId: string, date: string, status: 'present' | 'late' | 'excused' | 'absent' | undefined, reason?: string) => void;
  bulkMarkPresent: (classId: string, date: string) => void;
  promoteStudent: (studentId: string) => void;
  recordPayment: (payment: Payment) => void;
  approvePayment: (paymentId: string) => void; 
  generateMonthlyBilling: () => void; 
  applyLateFees: () => void;
  addClass: (newClass: ClassCategory) => void;
  updateClass: (updatedClass: ClassCategory) => void; 
  modifyClassSession: (classId: string, modification: ClassException) => void; 
  deleteClass: (id: string) => void;
  enrollStudent: (studentId: string, classId: string) => void;
  unenrollStudent: (studentId: string, classId: string) => void;
  addEvent: (event: Event) => void;
  deleteEvent: (id: string) => void;
  registerForEvent: (studentId: string, eventId: string) => void;
  addLibraryResource: (resource: LibraryResource) => void;
  deleteLibraryResource: (id: string) => void;
  toggleResourceCompletion: (resourceId: string, studentId: string) => void;
  updateAcademySettings: (settings: AcademySettings) => void;
  updatePaymentDates: (billingDay: number, lateFeeDay: number) => void; // New Validation Action
  sendMessage: (msg: Omit<Message, 'id' | 'read' | 'date'>) => void;
  markMessageRead: (id: string) => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  changePassword: (newPassword: string) => void; 
  // Auth
  login: (email: string, pass: string) => Promise<boolean>;
  registerStudent: (data: any) => Promise<boolean>;
  registerMaster: (data: any) => Promise<boolean>;
  logout: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const generateId = (prefix: string = 'id') => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}`;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(PulseService.getCurrentUser());
  const academyId = currentUser?.academyId;

  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassCategory[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [libraryResources, setLibraryResources] = useState<LibraryResource[]>([]);
  const [academySettings, setAcademySettings] = useState<AcademySettings>(PulseService.getAcademySettings(academyId));
  const [messages, setMessages] = useState<Message[]>([]);

  const loadData = () => {
      if (currentUser?.academyId) {
          setAcademySettings(PulseService.getAcademySettings(currentUser.academyId));
          setStudents(PulseService.getStudents(currentUser.academyId));
          setClasses(PulseService.getClasses(currentUser.academyId));
          setEvents(PulseService.getEvents(currentUser.academyId));
          setPayments(PulseService.getPayments(currentUser.academyId));
          setLibraryResources(PulseService.getLibrary(currentUser.academyId));
          const storedMsgs = localStorage.getItem('pulse_messages');
          setMessages(storedMsgs ? JSON.parse(storedMsgs) : mockMessages.map(m => ({...m, academyId: currentUser.academyId, recipientId: 'all', recipientName: 'Todos'}))); 
      }
  };

  useEffect(() => {
      loadData();
  }, [currentUser]);

  // --- REACTIVE BALANCE CALCULATION ---
  // Calculates real balance based on payments history instead of manual mutation
  useEffect(() => {
      setStudents(currentStudents => {
          let hasChanges = false;
          const nextStudents = currentStudents.map(student => {
              const studentTx = payments.filter(p => p.studentId === student.id);
              
              // Sum all Charges (Debts)
              // Status 'charge' or 'unpaid' for charges count as active debt
              const totalCharges = studentTx
                  .filter(p => p.type === 'charge' && (p.status === 'charge' || p.status === 'unpaid'))
                  .reduce((sum, p) => sum + p.amount, 0);
              
              // Sum all APPROVED Payments
              const totalPaid = studentTx
                  .filter(p => p.type === 'payment' && p.status === 'paid')
                  .reduce((sum, p) => sum + p.amount, 0);
              
              const calculatedBalance = Math.max(0, totalCharges - totalPaid);
              
              // Auto-update status based on balance logic
              let newStatus = student.status;
              if (calculatedBalance > 0 && student.status !== 'inactive' && student.status !== 'debtor') {
                  newStatus = 'debtor';
              } else if (calculatedBalance === 0 && student.status === 'debtor') {
                  newStatus = 'active';
              }

              if (student.balance !== calculatedBalance || student.status !== newStatus) {
                  hasChanges = true;
                  return { ...student, balance: calculatedBalance, status: newStatus };
              }
              return student;
          });

          return hasChanges ? nextStudents : currentStudents;
      });
  }, [payments]); // Runs whenever payments array changes

  // --- Stats Calculation ---
  const activeStudentsCount = students.filter(s => s.status === 'active' || s.status === 'exam_ready' || s.status === 'debtor').length;
  const inactiveStudentsCount = students.filter(s => s.status === 'inactive').length;
  const totalStudentsCount = students.length;
  const churnRate = totalStudentsCount > 0 ? (inactiveStudentsCount / totalStudentsCount) * 100 : 0;

  const calculateMonthlyRevenue = () => {
      const revenueByMonth: Record<string, number> = {};
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const today = new Date();
      for(let i=5; i>=0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const key = months[d.getMonth()];
          revenueByMonth[key] = 0;
      }
      payments.forEach(p => {
          if (p.status === 'paid' && p.type === 'payment') {
              const date = new Date(p.date);
              if (!isNaN(date.getTime())) {
                  const key = months[date.getMonth()];
                  if (revenueByMonth[key] !== undefined) revenueByMonth[key] += p.amount;
              }
          }
      });
      return Object.entries(revenueByMonth).map(([name, value]) => ({ name, value }));
  };

  const stats = {
      totalRevenue: payments.filter(p => p.status === 'paid' && p.type === 'payment').reduce((acc, curr) => acc + curr.amount, 0),
      activeStudents: activeStudentsCount,
      retentionRate: 100 - churnRate,
      churnRate: churnRate,
      monthlyRevenue: calculateMonthlyRevenue()
  };

  // Persistence Effects
  useEffect(() => { if(currentUser) PulseService.saveStudents(students); }, [students, currentUser]);
  useEffect(() => { if(currentUser) PulseService.saveClasses(classes); }, [classes, currentUser]);
  useEffect(() => { if(currentUser) PulseService.saveEvents(events); }, [events, currentUser]);
  useEffect(() => { if(currentUser) PulseService.savePayments(payments); }, [payments, currentUser]);
  useEffect(() => { if(currentUser) PulseService.saveLibrary(libraryResources); }, [libraryResources, currentUser]);
  useEffect(() => { if(currentUser) PulseService.saveAcademySettings(academySettings); }, [academySettings, currentUser]);
  useEffect(() => { if(currentUser) localStorage.setItem('pulse_messages', JSON.stringify(messages)); }, [messages, currentUser]);
  useEffect(() => { if(currentUser) PulseService.saveCurrentUser(currentUser); }, [currentUser]);

  // --- ACTIONS ---

  const addStudent = (student: Student) => {
      if (currentUser?.role !== 'master') return;
      const initialDebt = academySettings.paymentSettings.monthlyTuition || 0;
      const studentId = student.id || generateId('stu');
      
      const finalStudent = { 
          ...student, 
          id: studentId, 
          userId: studentId, 
          academyId: currentUser.academyId, 
          attendanceHistory: [],
          balance: initialDebt, 
          status: initialDebt > 0 ? ('debtor' as const) : student.status
      };
      
      setStudents(prev => [...prev, finalStudent]);

      // Create Initial CHARGE
      if (initialDebt > 0) {
          const initialCharge: Payment = {
              id: generateId('chg'),
              academyId: currentUser.academyId,
              studentId: studentId,
              studentName: finalStudent.name,
              amount: initialDebt,
              date: getLocalDate(), 
              status: 'charge', // Updated to 'charge' per requirements
              type: 'charge',    
              description: 'Inscripción + Mensualidad',
              category: 'Mensualidad',
              method: 'System'
          };
          setPayments(prev => [initialCharge, ...prev]);
      }

      try {
          PulseService.createStudentAccountFromMaster(finalStudent, (student as any).password);
      } catch (e) { console.error("Failed to auto-create user account", e); }
  };

  const updateStudent = (updatedStudent: Student) => {
      if (currentUser?.role !== 'master') return;
      setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
      const userDB = PulseService.getUsersDB();
      const updatedDB = userDB.map(u => u.id === updatedStudent.userId ? { ...u, name: updatedStudent.name, email: updatedStudent.email } : u);
      localStorage.setItem('pulse_users_db', JSON.stringify(updatedDB));
  };

  const deleteStudent = (id: string) => {
      if (currentUser?.role !== 'master') return;
      setStudents(prev => prev.filter(s => s.id !== id));
  };
  
  const updateStudentStatus = (id: string, status: Student['status']) => {
    if (currentUser?.role !== 'master') return;
    setStudents(prev => prev.map(s => s.id === id ? { ...s, status } : s));
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

        const currentRank = academySettings.ranks.find(r => r.id === s.rankId);
        let newStatus = s.status;
        
        if (currentRank && newAttendanceCount >= currentRank.requiredAttendance && (s.status === 'active' || s.status === 'exam_ready')) {
            newStatus = 'exam_ready';
        } else if (newStatus === 'exam_ready' && currentRank && newAttendanceCount < currentRank.requiredAttendance) {
            newStatus = 'active';
        }

        return { 
            ...s, 
            attendance: newAttendanceCount, 
            attendanceHistory: history,
            lastAttendance: lastAttendanceDate,
            status: newStatus
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
                    
                    const lastPresentRecord = history.find(r => r.status === 'present' || r.status === 'late');
                    const lastAttendanceDate = lastPresentRecord ? lastPresentRecord.date : s.lastAttendance;

                    const currentRank = academySettings.ranks.find(r => r.id === s.rankId);
                    let newStatus = s.status;
                    if (currentRank && newAttendanceCount >= currentRank.requiredAttendance && (s.status === 'active' || s.status === 'exam_ready')) {
                        newStatus = 'exam_ready';
                    }

                    return { 
                        ...s, 
                        attendance: newAttendanceCount, 
                        attendanceHistory: history, 
                        lastAttendance: lastAttendanceDate,
                        status: newStatus
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
              status: 'active', 
              promotionHistory: [historyItem, ...(s.promotionHistory || [])] 
          };
      }));
  };

  // --- FINANCIAL LOGIC ---

  const recordPayment = (payment: Payment) => {
      let newPayment = { ...payment };
      if (!newPayment.id) newPayment.id = generateId('tx');
      if (!newPayment.academyId) newPayment.academyId = currentUser!.academyId;
      if (!newPayment.date) newPayment.date = getLocalDate();

      // IMPORTANT: Just add to payments. Reactive useEffect handles balance.
      setPayments(prev => [newPayment, ...prev]);
  };

  const approvePayment = (paymentId: string) => {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment || payment.status === 'paid' || payment.type !== 'payment') return;

      // Update to PAID. Reactive useEffect handles balance subtraction.
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'paid' } : p));
  };

  const generateMonthlyBilling = () => {
      if (currentUser?.role !== 'master') return;
      const today = getLocalDate();
      const monthlyAmount = academySettings.paymentSettings.monthlyTuition || 800;
      const newCharges: Payment[] = [];
      const activeStudents = students.filter(s => s.status !== 'inactive');
      
      activeStudents.forEach(s => {
          const alreadyCharged = payments.some(p => p.studentId === s.id && p.type === 'charge' && p.category === 'Mensualidad' && p.date.substring(0, 7) === today.substring(0, 7));
          if (!alreadyCharged) {
              const charge: Payment = {
                  id: generateId('chg'), 
                  academyId: currentUser.academyId, 
                  studentId: s.id, 
                  studentName: s.name, 
                  amount: monthlyAmount, 
                  date: today, 
                  status: 'charge', // Updated status
                  type: 'charge',    
                  category: 'Mensualidad', 
                  description: 'Mensualidad Automática', 
                  method: 'System'
              };
              newCharges.push(charge);
          }
      });

      if (newCharges.length > 0) {
          setPayments(prev => [...newCharges, ...prev]);
          // Reactive useEffect handles balance
      }
  };

  const applyLateFees = () => {
      if (currentUser?.role !== 'master') return;
      const { lateFeeAmount } = academySettings.paymentSettings;
      const today = getLocalDate();
      
      const fees: Payment[] = [];

      // Logic: If balance > 0, apply fee
      students.forEach(s => {
          if (s.balance > 0 && s.status !== 'inactive') {
              const penalty: Payment = { 
                  id: generateId('fee'), 
                  academyId: currentUser!.academyId, 
                  studentId: s.id, 
                  studentName: s.name, 
                  amount: lateFeeAmount, 
                  date: today, 
                  status: 'charge', // Updated status
                  type: 'charge', 
                  category: 'Late Fee', 
                  description: 'Recargo tardío', 
                  method: 'System' 
              };
              fees.push(penalty);
          }
      });
      if (fees.length > 0) {
          setPayments(prev => [...fees, ...prev]);
      }
  };

  const updateAcademySettings = (settings: AcademySettings) => {
      if (currentUser?.role !== 'master') return;
      setAcademySettings(settings);
  };

  const updatePaymentDates = (billingDay: number, lateFeeDay: number) => {
      if (currentUser?.role !== 'master') return;
      if (lateFeeDay <= billingDay) {
          throw new Error("El día de recargo debe ser posterior al día de corte.");
      }
      setAcademySettings(prev => ({
          ...prev,
          paymentSettings: {
              ...prev.paymentSettings,
              billingDay,
              lateFeeDay
          }
      }));
  };

  // --- CLASSES MANAGEMENT ---
  const addClass = (newClass: ClassCategory) => {
    if (currentUser?.role !== 'master') return;
    // Generate ID if not present
    const cls = { ...newClass, id: newClass.id || generateId('cls'), academyId: currentUser.academyId };
    setClasses(prev => [...prev, cls]);
  };

  const updateClass = (updatedClass: ClassCategory) => {
    if (currentUser?.role !== 'master') return;
    setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
  };

  const modifyClassSession = (classId: string, modification: SessionModification) => {
    if (currentUser?.role !== 'master') return;
    setClasses(prev => prev.map(c => {
        if (c.id === classId) {
            // Remove existing modification for this date if exists, then add new one
            const newModifications = c.modifications.filter(m => m.date !== modification.date);
            newModifications.push(modification);
            return { ...c, modifications: newModifications };
        }
        return c;
    }));
  };

  const deleteClass = (id: string) => {
      if (currentUser?.role !== 'master') return;
      setClasses(prev => prev.filter(c => c.id !== id));
      // Also remove class from students
      setStudents(prev => prev.map(s => ({
          ...s,
          classesId: s.classesId.filter(cid => cid !== id)
      })));
  };

  const enrollStudent = (studentId: string, classId: string) => {
      if (currentUser?.role !== 'master') return;
      
      // Update Class
      setClasses(prev => prev.map(c => {
          if (c.id === classId && !c.studentIds.includes(studentId)) {
              return { ...c, studentIds: [...c.studentIds, studentId], studentCount: c.studentCount + 1 };
          }
          return c;
      }));

      // Update Student
      setStudents(prev => prev.map(s => {
          if (s.id === studentId && !s.classesId.includes(classId)) {
              return { ...s, classesId: [...s.classesId, classId] };
          }
          return s;
      }));
  };

  const unenrollStudent = (studentId: string, classId: string) => {
      if (currentUser?.role !== 'master') return;

       // Update Class
       setClasses(prev => prev.map(c => {
          if (c.id === classId) {
              return { ...c, studentIds: c.studentIds.filter(id => id !== studentId), studentCount: Math.max(0, c.studentCount - 1) };
          }
          return c;
      }));

      // Update Student
      setStudents(prev => prev.map(s => {
          if (s.id === studentId) {
              return { ...s, classesId: s.classesId.filter(id => id !== classId) };
          }
          return s;
      }));
  };

  // --- EVENTS MANAGEMENT ---
  const addEvent = (event: Event) => {
      if (currentUser?.role !== 'master') return;
      const newEvent = { ...event, id: event.id || generateId('evt'), academyId: currentUser.academyId };
      setEvents(prev => [...prev, newEvent]);
  };

  const deleteEvent = (id: string) => {
      if (currentUser?.role !== 'master') return;
      setEvents(prev => prev.filter(e => e.id !== id));
  };

  const registerForEvent = (studentId: string, eventId: string) => {
      setEvents(prev => prev.map(e => {
          if (e.id === eventId && !e.registrants?.includes(studentId)) {
              return { ...e, registrants: [...(e.registrants || []), studentId], registeredCount: (e.registeredCount || 0) + 1 };
          }
          return e;
      }));
  };

  // --- LIBRARY MANAGEMENT ---
  const addLibraryResource = (resource: LibraryResource) => {
      if (currentUser?.role !== 'master') return;
      const newResource = { ...resource, id: resource.id || generateId('lib'), academyId: currentUser.academyId };
      setLibraryResources(prev => [...prev, newResource]);
  };

  const deleteLibraryResource = (id: string) => {
      if (currentUser?.role !== 'master') return;
      setLibraryResources(prev => prev.filter(r => r.id !== id));
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

  const sendMessage = (msg: Omit<Message, 'id' | 'read' | 'date'>) => {
      const dateStr = formatDateDisplay(getLocalDate(), { month: 'short', day: 'numeric' });
      const newMessage: Message = { ...msg, id: generateId('msg'), read: false, date: dateStr };
      setMessages(prev => [newMessage, ...prev]);
  };

  const markMessageRead = (id: string) => {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m));
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
      if (!currentUser) return;
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      const users = PulseService.getUsersDB();
      const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, ...updates } : u);
      localStorage.setItem('pulse_users_db', JSON.stringify(updatedUsers));
      if (currentUser.role === 'student' && (updates.name || updates.email || updates.avatarUrl)) {
          const updatedStudents = students.map(s => s.id === currentUser.id ? { ...s, name: updates.name || s.name, email: updates.email || s.email, avatarUrl: updates.avatarUrl || s.avatarUrl } : s);
          setStudents(updatedStudents);
      }
  };

  const changePassword = (newPassword: string) => {
      if (!currentUser) return;
      const users = PulseService.getUsersDB();
      const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, password: newPassword } : u);
      localStorage.setItem('pulse_users_db', JSON.stringify(updatedUsers));
      setCurrentUser({ ...currentUser, password: newPassword });
  };

  const login = async (email: string, pass: string) => {
      try {
          const user = PulseService.login(email, pass);
          setCurrentUser(user);
          return true;
      } catch (error) { return false; }
  };

  const registerStudent = async (data: any) => {
      try {
          const user = PulseService.registerStudent(data);
          
          const academy = PulseService.getAcademiesDB().find(a => a.id === user.academyId);
          const initialDebt = academy?.paymentSettings?.monthlyTuition || 0;

          const newStudent: Student = {
              id: user.id, userId: user.id, academyId: user.academyId,
              name: user.name, email: user.email, phone: data.phone,
              rank: 'White Belt', rankId: 'rank-1', rankColor: 'white', stripes: 0,
              status: initialDebt > 0 ? 'debtor' : 'active', program: 'Adults',
              attendance: 0, totalAttendance: 0, joinDate: getLocalDate(),
              balance: initialDebt, classesId: [], attendanceHistory: [], avatarUrl: user.avatarUrl
          };
          
          setCurrentUser(user);
          setStudents(prev => [...prev, newStudent]);
          
          if (initialDebt > 0) {
               const initialCharge: Payment = {
                  id: generateId('chg'), academyId: user.academyId, studentId: user.id, studentName: user.name,
                  amount: initialDebt, date: getLocalDate(),
                  status: 'charge', // Updated status
                  type: 'charge',
                  description: 'Inscripción + Mensualidad', category: 'Mensualidad', method: 'System'
              };
              setPayments(prev => [initialCharge, ...prev]);
          }

          return true;
      } catch (error) {
          alert(error instanceof Error ? error.message : "Error al registrar");
          return false;
      }
  };

  const registerMaster = async (data: any) => {
      try {
          const { user } = PulseService.registerMaster(data);
          setCurrentUser(user);
          return true;
      } catch (error) {
          alert(error instanceof Error ? error.message : "Error al registrar");
          return false;
      }
  };

  const logout = () => {
      PulseService.logout();
      setCurrentUser(null);
  };

  function formatDateDisplay(dateStr: string, options: any) {
      if(!dateStr) return '';
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m-1, d).toLocaleDateString('es-ES', options);
  }

  // --- AUTOMATION ENGINE ---
  // Checks daily for billing and late fee triggers
  useEffect(() => {
      if (!currentUser || currentUser.role !== 'master') return;

      const runAutomation = () => {
          const todayStr = getLocalDate(); // YYYY-MM-DD
          const currentDay = parseInt(todayStr.split('-')[2], 10);
          const { billingDay, lateFeeDay } = academySettings.paymentSettings;

          // 1. BILLING AUTOMATION
          const lastBillingDate = localStorage.getItem('pulse_last_billing_run');
          
          if (currentDay === billingDay && lastBillingDate !== todayStr) {
              console.log("Auto-running Monthly Billing...");
              generateMonthlyBilling(); 
              localStorage.setItem('pulse_last_billing_run', todayStr);
          }

          // 2. LATE FEE AUTOMATION
          const lastFeeDate = localStorage.getItem('pulse_last_fee_run');
          
          if (currentDay === lateFeeDay && lastFeeDate !== todayStr) {
              console.log("Auto-running Late Fees...");
              applyLateFees();
              localStorage.setItem('pulse_last_fee_run', todayStr);
          }
      };

      runAutomation();
      
      // We rely on students/payments changing to trigger re-evaluations if data loads late,
      // but the localStorage check prevents double-execution.
  }, [currentUser, academySettings, students.length, payments.length]);

  return (
    <StoreContext.Provider value={{ 
        students, classes, events, currentUser, payments, libraryResources, academySettings, stats, messages,
        refreshData: loadData,
        addStudent, updateStudent, deleteStudent, updateStudentStatus, 
        markAttendance, bulkMarkPresent, promoteStudent, recordPayment, approvePayment, generateMonthlyBilling, applyLateFees, addClass, updateClass, modifyClassSession, deleteClass, enrollStudent, unenrollStudent, 
        addEvent, deleteEvent, registerForEvent,
        addLibraryResource, deleteLibraryResource, toggleResourceCompletion, updateAcademySettings, updatePaymentDates,
        sendMessage, markMessageRead, updateUserProfile, changePassword,
        login, registerStudent, registerMaster, logout 
    }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};