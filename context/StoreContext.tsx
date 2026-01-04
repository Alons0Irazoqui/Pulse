
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Student, ClassCategory, Payment, UserProfile, LibraryResource, Event, AcademySettings, PromotionHistoryItem, Message, AttendanceRecord, SessionModification, ClassException } from '../types';
import { PulseService } from '../services/pulseService';
import { mockMessages } from '../mockData';

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
  markAttendance: (studentId: string, date: string, status: 'present' | 'late' | 'excused' | 'absent' | undefined) => void;
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
          balance: initialDebt, // Initial Debt
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
              date: new Date().toISOString().split('T')[0],
              status: 'pending', // Pending payment
              type: 'charge',    // It's a debt
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

  const markAttendance = (studentId: string, date: string, status: 'present' | 'late' | 'excused' | 'absent' | undefined) => {
    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        let history = [...(s.attendanceHistory || [])];
        const existingIndex = history.findIndex(r => r.date === date);

        if (status === undefined) {
            // Remove record if toggled to undefined
            if (existingIndex >= 0) history.splice(existingIndex, 1);
        } else {
            // Upsert record
            if (existingIndex >= 0) {
                history[existingIndex] = { ...history[existingIndex], status, timestamp: new Date().toISOString() };
            } else {
                history.push({ date, status, timestamp: new Date().toISOString() });
            }
        }

        // Sort history descending by date
        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Recalculate Totals (Only Present and Late count towards stripes/rank)
        const newAttendanceCount = history.filter(r => r.status === 'present' || r.status === 'late').length;
        
        // Find most recent attendance for lastAttendance field
        const lastPresentRecord = history.find(r => r.status === 'present' || r.status === 'late');
        const lastAttendanceDate = lastPresentRecord ? lastPresentRecord.date : s.lastAttendance;

        // Check Rank status
        const currentRank = academySettings.ranks.find(r => r.id === s.rankId);
        let newStatus = s.status;
        
        // Auto-upgrade status if requirements met
        if (currentRank && newAttendanceCount >= currentRank.requiredAttendance && (s.status === 'active' || s.status === 'exam_ready')) {
            newStatus = 'exam_ready';
        } else if (newStatus === 'exam_ready' && currentRank && newAttendanceCount < currentRank.requiredAttendance) {
            // Revert if count drops (e.g. marking something as absent later)
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

  const promoteStudent = (studentId: string) => {
      if (currentUser?.role !== 'master') return;
      setStudents(prev => prev.map(s => {
          if (s.id !== studentId) return s;
          const currentRankIndex = academySettings.ranks.findIndex(r => r.id === s.rankId);
          const nextRank = academySettings.ranks[currentRankIndex + 1];
          if (!nextRank) return s;
          const historyItem: PromotionHistoryItem = { rank: s.rank, date: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' }), notes: `Promovido a ${nextRank.name}` };
          
          return { 
              ...s, 
              rank: nextRank.name, 
              rankId: nextRank.id, 
              rankColor: nextRank.color, 
              attendance: 0, // Reset counter for next rank
              attendanceHistory: [], // Clear history for new rank cycle
              status: 'active', 
              promotionHistory: [historyItem, ...(s.promotionHistory || [])] 
          };
      }));
  };

  // --- FINANCIAL LOGIC ---

  const recordPayment = (payment: Payment) => {
      // 1. Add Transaction Record
      let newPayment = { ...payment };
      if (!newPayment.id) newPayment.id = generateId('tx');
      if (!newPayment.academyId) newPayment.academyId = currentUser!.academyId;

      setPayments(prev => [newPayment, ...prev]);

      // 2. Logic: If it is a CHARGE (manual debt creation), increase balance immediately
      if (newPayment.type === 'charge') {
           setStudents(prev => prev.map(s => {
              if (s.id === newPayment.studentId) {
                  return { ...s, balance: s.balance + newPayment.amount, status: 'debtor' };
              }
              return s;
           }));
      }
      // 3. Logic: If it is a PAYMENT (student reported), DO NOT change balance yet. Wait for approval.
  };

  const approvePayment = (paymentId: string) => {
      const payment = payments.find(p => p.id === paymentId);
      if (!payment || payment.status === 'paid' || payment.type !== 'payment') return;

      // 1. Mark Payment as Paid
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'paid' } : p));

      // 2. Reduce Student Debt
      setStudents(prev => prev.map(s => {
          if (s.id === payment.studentId) {
              const newBalance = Math.max(0, s.balance - payment.amount);
              const newStatus = newBalance <= 0 && s.status === 'debtor' ? 'active' : s.status;
              return { ...s, balance: newBalance, status: newStatus };
          }
          return s;
      }));
  };

  const generateMonthlyBilling = () => {
      if (currentUser?.role !== 'master') return;
      const today = new Date().toISOString().split('T')[0];
      const monthlyAmount = academySettings.paymentSettings.monthlyTuition || 800;
      const newCharges: Payment[] = [];
      const activeStudents = students.filter(s => s.status !== 'inactive');
      
      activeStudents.forEach(s => {
          // Check if already charged for current month
          const alreadyCharged = payments.some(p => p.studentId === s.id && p.type === 'charge' && p.category === 'Mensualidad' && p.date.substring(0, 7) === today.substring(0, 7));
          if (!alreadyCharged) {
              const charge: Payment = {
                  id: generateId('chg'), 
                  academyId: currentUser.academyId, 
                  studentId: s.id, 
                  studentName: s.name, 
                  amount: monthlyAmount, 
                  date: today, 
                  status: 'pending', // It's a pending debt
                  type: 'charge',    // It's a charge
                  category: 'Mensualidad', 
                  description: 'Mensualidad Automática', 
                  method: 'System'
              };
              newCharges.push(charge);
          }
      });

      if (newCharges.length > 0) {
          setPayments(prev => [...newCharges, ...prev]);
          // Update Student Balances (Increase Debt)
          setStudents(prev => prev.map(s => {
              if (s.status !== 'inactive' && newCharges.some(p => p.studentId === s.id)) {
                   return { ...s, balance: s.balance + monthlyAmount, status: 'debtor' };
              }
              return s;
          }));
      }
  };

  const applyLateFees = () => {
      if (currentUser?.role !== 'master') return;
      const { lateFeeAmount } = academySettings.paymentSettings;
      const today = new Date().toISOString().split('T')[0];
      
      const fees: Payment[] = [];

      setStudents(prev => prev.map(s => {
          if (s.balance > 0 && s.status !== 'inactive') {
              const penalty: Payment = { 
                  id: generateId('fee'), 
                  academyId: currentUser!.academyId, 
                  studentId: s.id, 
                  studentName: s.name, 
                  amount: lateFeeAmount, 
                  date: today, 
                  status: 'pending', 
                  type: 'charge', // Debt
                  category: 'Late Fee', 
                  description: 'Recargo tardío', 
                  method: 'System' 
              };
              fees.push(penalty);
              return { ...s, balance: s.balance + lateFeeAmount, status: 'debtor' };
          }
          return s;
      }));
      setPayments(prev => [...fees, ...prev]);
  };

  // --- CLASS ACTIONS ---

  const addClass = (newClass: ClassCategory) => {
      if (currentUser?.role !== 'master') return;
      setClasses(prev => [...prev, { ...newClass, id: generateId('cls'), academyId: currentUser!.academyId, modifications: [] }]);
  };

  const updateClass = (updatedClass: ClassCategory) => {
      if (currentUser?.role !== 'master') return;
      setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
  };

  const modifyClassSession = (classId: string, modification: ClassException) => {
      setClasses(prev => prev.map(c => {
          if (c.id === classId) {
              const existingIndex = c.modifications.findIndex(m => m.date === modification.date);
              let newModifications = [...c.modifications];
              if (existingIndex >= 0) newModifications[existingIndex] = modification;
              else newModifications.push(modification);
              return { ...c, modifications: newModifications };
          }
          return c;
      }));
  };

  const deleteClass = (id: string) => {
      if (currentUser?.role !== 'master') return;
      setClasses(prev => prev.filter(c => c.id !== id));
  };

  const enrollStudent = (studentId: string, classId: string) => {
      const result = PulseService.enrollStudentInClass(studentId, classId, students, classes);
      setClasses(result.updatedClasses);
      setStudents(result.updatedStudents);
      PulseService.saveClasses(result.updatedClasses);
      PulseService.saveStudents(result.updatedStudents);
  };

  const unenrollStudent = (studentId: string, classId: string) => {
      const result = PulseService.unenrollStudentFromClass(studentId, classId, students, classes);
      setClasses(result.updatedClasses);
      setStudents(result.updatedStudents);
      PulseService.saveClasses(result.updatedClasses);
      PulseService.saveStudents(result.updatedStudents);
  };
  
  const addEvent = (event: Event) => {
      if (currentUser?.role !== 'master') return;
      setEvents(prev => [...prev, { ...event, id: generateId('evt'), academyId: currentUser!.academyId }]);
  };

  const deleteEvent = (id: string) => {
      if (currentUser?.role !== 'master') return;
      setEvents(prev => prev.filter(e => e.id !== id));
  };
  
  const registerForEvent = (studentId: string, eventId: string) => {
      setEvents(PulseService.registerStudentForEvent(studentId, eventId, events));
  };

  const addLibraryResource = (resource: LibraryResource) => {
      if (currentUser?.role !== 'master') return;
      setLibraryResources(prev => [...prev, { ...resource, id: generateId('lib'), academyId: currentUser!.academyId }]);
  };

  const deleteLibraryResource = (id: string) => {
      if (currentUser?.role !== 'master') return;
      setLibraryResources(prev => prev.filter(r => r.id !== id));
  };

  const toggleResourceCompletion = (resourceId: string, studentId: string) => {
      setLibraryResources(prev => prev.map(res => {
          if (res.id === resourceId) {
              const isCompleted = res.completedBy.includes(studentId);
              let newCompletedBy = isCompleted ? res.completedBy.filter(id => id !== studentId) : [...res.completedBy, studentId];
              return { ...res, completedBy: newCompletedBy };
          }
          return res;
      }));
  };

  const updateAcademySettings = (settings: AcademySettings) => {
      if (currentUser?.role !== 'master') return;
      setAcademySettings(settings);
  };

  const sendMessage = (msg: Omit<Message, 'id' | 'read' | 'date'>) => {
      const newMessage: Message = { ...msg, id: generateId('msg'), read: false, date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
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
              attendance: 0, totalAttendance: 0, joinDate: new Date().toLocaleDateString(),
              balance: initialDebt, classesId: [], attendanceHistory: [], avatarUrl: user.avatarUrl
          };
          
          setCurrentUser(user);
          setStudents(prev => [...prev, newStudent]);
          
          if (initialDebt > 0) {
               const initialCharge: Payment = {
                  id: generateId('chg'), academyId: user.academyId, studentId: user.id, studentName: user.name,
                  amount: initialDebt, date: new Date().toISOString().split('T')[0],
                  status: 'pending', type: 'charge',
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

  return (
    <StoreContext.Provider value={{ 
        students, classes, events, currentUser, payments, libraryResources, academySettings, stats, messages,
        refreshData: loadData,
        addStudent, updateStudent, deleteStudent, updateStudentStatus, 
        markAttendance, promoteStudent, recordPayment, approvePayment, generateMonthlyBilling, applyLateFees, addClass, updateClass, modifyClassSession, deleteClass, enrollStudent, unenrollStudent, 
        addEvent, deleteEvent, registerForEvent,
        addLibraryResource, deleteLibraryResource, toggleResourceCompletion, updateAcademySettings,
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
