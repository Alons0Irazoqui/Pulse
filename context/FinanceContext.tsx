
import React, { createContext, useContext, useState, useEffect } from 'react';
import { TuitionRecord, ManualChargeData } from '../types';
import { PulseService } from '../services/pulseService';
import { mockTuitionRecords } from '../mockData';
import { getLocalDate } from '../utils/dateUtils';
import { useAuth } from './AuthContext';
import { useAcademy } from './AcademyContext';
import { useToast } from './ToastContext';

// Helper for ID generation
const generateId = (prefix: string = 'id') => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}`;
};

interface FinanceContextType {
  records: TuitionRecord[];
  stats: {
      totalRevenue: number;
      activeStudents: number;
      retentionRate: number;
      pendingCollection: number;
      overdueAmount: number;
      monthlyRevenue: { name: string; value: number }[];
  };
  createRecord: (record: Partial<TuitionRecord>) => void;
  createManualCharge: (data: ManualChargeData) => void;
  
  // New Batch Payment API
  registerBatchPayment: (recordIds: string[], file: File, method: 'Transferencia' | 'Efectivo', totalAmount?: number) => void;
  approveBatchPayment: (batchId: string, totalPaidAmount: number) => void;
  rejectBatchPayment: (batchId: string) => void;

  // Legacy/Single Item Actions (kept for compatibility or single actions)
  uploadProof: (recordId: string, file: File, method?: 'Transferencia' | 'Efectivo') => void;
  approvePayment: (recordId: string) => void; 
  rejectPayment: (recordId: string) => void;
  
  generateMonthlyBilling: () => void; 
  checkOverdueStatus: () => void;
  getStudentPendingDebts: (studentId: string) => TuitionRecord[];
  
  // --- DELETE HELPER ---
  purgeStudentDebts: (studentId: string) => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { students, academySettings, batchUpdateStudents } = useAcademy();
  const { addToast } = useToast();
  const academyId = currentUser?.academyId;

  // --- STATE ---
  const [records, setRecords] = useState<TuitionRecord[]>([]);

  // --- INIT & LOAD ---
  useEffect(() => {
      if (academyId) {
          const stored = localStorage.getItem('pulse_tuition_records');
          if (stored) {
              setRecords(JSON.parse(stored));
          } else {
              setRecords(mockTuitionRecords.filter(r => r.academyId === academyId || !r.academyId));
          }
      }
  }, [academyId]);

  // Persist Records
  useEffect(() => {
      if (records.length > 0) {
          localStorage.setItem('pulse_tuition_records', JSON.stringify(records));
      }
  }, [records]);

  // --- REACTIVE BALANCE ENGINE ---
  useEffect(() => {
      if (students.length === 0) return;

      let hasChanges = false;
      const nextStudents = students.map(student => {
          const studentRecords = records.filter(r => r.studentId === student.id);
          
          // Debt calculation: Sum of amount + penalty for all non-paid records
          const debt = studentRecords
              .filter(r => r.status !== 'paid')
              .reduce((sum, r) => sum + (r.amount + r.penaltyAmount), 0);
          
          let newStatus = student.status;
          
          const hasOverdue = studentRecords.some(r => r.status === 'overdue');
          
          if (debt > 0) {
              if (hasOverdue) newStatus = 'debtor';
              else if (newStatus !== 'debtor' && newStatus !== 'inactive') newStatus = 'active'; 
          } else {
              if (newStatus === 'debtor') newStatus = 'active';
          }

          if (Math.abs(student.balance - debt) > 0.01 || student.status !== newStatus) {
              hasChanges = true;
              return { ...student, balance: debt, status: newStatus };
          }
          return student;
      });

      if (hasChanges) {
          batchUpdateStudents(nextStudents);
      }
  }, [records, students.length]); 

  // --- BATCH PAYMENT LOGIC (CORE REFACTOR) ---

  const registerBatchPayment = (recordIds: string[], file: File, method: 'Transferencia' | 'Efectivo', totalAmount?: number) => {
      const batchId = generateId('batch');
      const frozenDate = new Date().toISOString();
      const fakeUrl = URL.createObjectURL(file); // Simulation

      setRecords(prev => prev.map(r => {
          if (recordIds.includes(r.id)) {
              return {
                  ...r,
                  batchPaymentId: batchId,
                  status: 'in_review',
                  paymentDate: frozenDate,
                  proofUrl: fakeUrl,
                  proofType: file.type,
                  method: method,
                  declaredAmount: totalAmount // Store what user said they paid
              };
          }
          return r;
      }));
      
      addToast(`Pago registrado (${recordIds.length} conceptos). En revisión.`, 'success');
  };

  /**
   * WATERFALL ALGORITHM for Payment Approval
   * Distributes totalPaidAmount based on priority:
   * 1. Non-splittable items (Tuition) -> Must be paid fully.
   * 2. Splittable items (Equipment/Tournaments) -> Paid with remaining funds.
   */
  const approveBatchPayment = (batchId: string, totalPaidAmount: number) => {
      setRecords(prev => {
          // 1. Isolate the batch
          const batchRecords = prev.filter(r => r.batchPaymentId === batchId);
          const otherRecords = prev.filter(r => r.batchPaymentId !== batchId);

          if (batchRecords.length === 0) return prev;

          // 2. Separate by Priority
          const mandatoryItems = batchRecords.filter(r => !r.canBePaidInParts);
          const splittableItems = batchRecords.filter(r => r.canBePaidInParts)
                                              .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()); // Newest first

          let remainingMoney = totalPaidAmount;
          const processedBatch: TuitionRecord[] = [];

          // 3. Process Mandatory Items (Waterfall Step 1)
          for (const item of mandatoryItems) {
              const totalCost = item.amount + item.penaltyAmount;
              
              if (remainingMoney >= totalCost) {
                  remainingMoney -= totalCost;
                  processedBatch.push({ ...item, status: 'paid', amount: 0, penaltyAmount: 0, originalAmount: item.amount }); 
              } else {
                  // Failed to cover mandatory item. Revert to overdue/pending.
                  const isOverdue = new Date() > new Date(item.dueDate);
                  processedBatch.push({ ...item, status: isOverdue ? 'overdue' : 'pending', batchPaymentId: undefined, paymentDate: null, declaredAmount: undefined });
              }
          }

          // 4. Process Splittable Items (Waterfall Step 2)
          for (const item of splittableItems) {
              const currentDebt = item.amount + item.penaltyAmount;

              if (remainingMoney <= 0) {
                  // Ran out of money. Revert this item to unpaid state.
                  const isOverdue = new Date() > new Date(item.dueDate);
                  processedBatch.push({ ...item, status: isOverdue ? 'overdue' : 'pending', batchPaymentId: undefined, paymentDate: null, declaredAmount: undefined });
                  continue;
              }

              if (remainingMoney >= currentDebt) {
                  // Full Payment
                  remainingMoney -= currentDebt;
                  processedBatch.push({ ...item, status: 'paid', amount: 0, penaltyAmount: 0, originalAmount: item.amount });
              } else {
                  // Partial Payment Logic
                  const paymentForThis = remainingMoney;
                  
                  // Calculate new remaining balance
                  let newAmount = item.amount;
                  let newPenalty = item.penaltyAmount;
                  let moneyToDeduct = paymentForThis;

                  // Pay penalty first
                  if (moneyToDeduct >= newPenalty) {
                      moneyToDeduct -= newPenalty;
                      newPenalty = 0;
                  } else {
                      newPenalty -= moneyToDeduct;
                      moneyToDeduct = 0;
                  }
                  
                  // Pay principal
                  newAmount -= moneyToDeduct;
                  
                  remainingMoney = 0; // All money used

                  // CRITICAL: We keep the record alive as 'pending' (or partial state that behaves like pending) with REDUCED amount.
                  // We remove batch info so it doesn't show as "in_review" and allows new payment attempts.
                  processedBatch.push({
                      ...item,
                      status: 'pending', // Reverts to pending but with less amount
                      amount: newAmount, // Updated remaining debt
                      penaltyAmount: newPenalty,
                      originalAmount: item.originalAmount || item.amount, // Track original total for history
                      
                      // RESET PAYMENT INFO so it can be paid again
                      batchPaymentId: undefined,
                      paymentDate: null,
                      proofUrl: null,
                      declaredAmount: undefined
                  });
              }
          }

          return [...otherRecords, ...processedBatch];
      });
      
      addToast('Pago distribuido. Saldos actualizados.', 'success');
  };

  const rejectBatchPayment = (batchId: string) => {
      setRecords(prev => prev.map(r => {
          if (r.batchPaymentId === batchId) {
              const isOverdue = new Date() > new Date(r.dueDate);
              return {
                  ...r,
                  status: isOverdue ? 'overdue' : 'pending',
                  proofUrl: null,
                  paymentDate: null,
                  batchPaymentId: undefined,
                  declaredAmount: undefined
              };
          }
          return r;
      }));
      addToast('Pago rechazado. Se ha notificado al alumno.', 'info');
  };

  // --- SINGLE ITEM ACTIONS (Wrappers or Standalone) ---

  const createRecord = (data: Partial<TuitionRecord>) => {
      // Legacy wrapper - assumes canBePaidInParts based on simple logic if not provided
      if (!data.studentId || !data.amount) return;
      const student = students.find(s => s.id === data.studentId);
      
      const newRecord: TuitionRecord = {
          id: generateId('tx'),
          academyId: currentUser!.academyId,
          studentId: data.studentId,
          studentName: student?.name || 'Unknown',
          concept: data.concept || 'Cargo General',
          month: data.month,
          amount: data.amount,
          penaltyAmount: 0,
          dueDate: data.dueDate || getLocalDate(),
          paymentDate: null,
          status: 'pending',
          proofUrl: null,
          canBePaidInParts: false, // Default strict
          ...data
      } as TuitionRecord;

      setRecords(prev => [newRecord, ...prev]);
      addToast('Cargo generado', 'success');
  };

  const createManualCharge = (data: ManualChargeData) => {
      if (data.amount <= 0) {
          addToast("El monto debe ser mayor a 0", 'error');
          return;
      }

      const student = students.find(s => s.id === data.studentId);
      if (!student) {
          addToast("Alumno no encontrado", 'error');
          return;
      }

      const newRecord: TuitionRecord = {
          id: generateId('charge'),
          academyId: currentUser!.academyId,
          studentId: data.studentId,
          studentName: student.name,
          
          type: 'charge',
          status: 'pending',
          
          concept: data.title,
          description: data.description,
          category: data.category,
          amount: data.amount,
          penaltyAmount: 0,
          
          dueDate: data.dueDate,
          paymentDate: null,
          proofUrl: null,
          
          canBePaidInParts: data.canBePaidInParts,
          relatedEventId: data.relatedEventId
      };

      setRecords(prev => [newRecord, ...prev]);
      addToast('Cargo manual registrado exitosamente', 'success');
  };

  const uploadProof = (recordId: string, file: File, method: 'Transferencia' | 'Efectivo' = 'Transferencia') => {
      // Wraps single upload into batch logic for consistency
      registerBatchPayment([recordId], file, method);
  };

  const approvePayment = (recordId: string) => {
      // Single approval implies full payment of that specific item
      const record = records.find(r => r.id === recordId);
      if (!record) return;
      // We create a fake batch ID if it doesn't have one, or use existing
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: 'paid', amount: 0, penaltyAmount: 0 } : r));
      addToast('Pago aprobado', 'success');
  };

  const rejectPayment = (recordId: string) => {
      const record = records.find(r => r.id === recordId);
      if (record?.batchPaymentId) {
          rejectBatchPayment(record.batchPaymentId);
      } else {
          setRecords(prev => prev.map(r => {
              if (r.id === recordId) {
                  const isOverdue = new Date() > new Date(r.dueDate);
                  return {
                      ...r,
                      status: isOverdue ? 'overdue' : 'pending',
                      proofUrl: null,
                      paymentDate: null,
                      declaredAmount: undefined
                  };
              }
              return r;
          }));
          addToast('Pago rechazado', 'info');
      }
  };

  const checkOverdueStatus = () => {
      const today = new Date();
      today.setHours(0,0,0,0);
      const { lateFeeAmount } = academySettings.paymentSettings;
      let updatesCount = 0;

      setRecords(prev => prev.map(r => {
          const [y, m, d] = r.dueDate.split('-').map(Number);
          const dueDateObj = new Date(y, m - 1, d);

          if ((r.status === 'pending' || r.status === 'partial') && today > dueDateObj) {
              updatesCount++;
              // Only apply penalty if not already applied or if logic dictates recurring penalty
              // Here we apply once if penalty is 0
              if (r.penaltyAmount === 0) {
                  return { ...r, status: 'overdue', penaltyAmount: lateFeeAmount };
              }
              return { ...r, status: 'overdue' };
          }
          return r;
      }));

      if (updatesCount > 0) {
          addToast(`Se actualizaron ${updatesCount} pagos a vencidos.`, 'info');
      }
  };

  const generateMonthlyBilling = () => {
      const todayStr = getLocalDate();
      const [year, month] = todayStr.split('-');
      const monthKey = `${year}-${month}`;
      const { monthlyTuition, billingDay, lateFeeDay } = academySettings.paymentSettings;
      const dueDate = `${year}-${month}-${String(lateFeeDay).padStart(2, '0')}`;

      const activeStudents = students.filter(s => s.status !== 'inactive');
      const newRecords: TuitionRecord[] = [];

      activeStudents.forEach(s => {
          const exists = records.some(r => r.studentId === s.id && r.month === monthKey && r.category === 'Mensualidad');
          
          if (!exists) {
              newRecords.push({
                  id: generateId('bill'),
                  academyId: currentUser!.academyId,
                  studentId: s.id,
                  studentName: s.name,
                  concept: `Mensualidad ${month}/${year}`,
                  month: monthKey,
                  amount: monthlyTuition,
                  penaltyAmount: 0,
                  dueDate: dueDate,
                  paymentDate: null,
                  status: 'pending',
                  proofUrl: null,
                  category: 'Mensualidad',
                  canBePaidInParts: false, // Tuition is strict
                  type: 'charge'
              });
          }
      });

      if (newRecords.length > 0) {
          setRecords(prev => [...newRecords, ...prev]);
          addToast(`Se generaron ${newRecords.length} cargos de mensualidad.`, 'success');
      } else {
          addToast('Facturación al día.', 'info');
      }
  };

  const getStudentPendingDebts = (studentId: string) => {
      // Returns items that can be paid (including partials)
      return records.filter(r => 
          r.studentId === studentId && 
          (r.status === 'pending' || r.status === 'overdue' || r.status === 'charged' || r.status === 'in_review' || r.status === 'partial')
      );
  };
  
  // --- DELETE HELPER (For Cleanup) ---
  const purgeStudentDebts = (studentId: string) => {
      setRecords(prev => prev.filter(r => {
          if (r.studentId === studentId) {
              // Only keep PAID records for history. Remove everything else.
              return r.status === 'paid';
          }
          return true;
      }));
  };

  const calculateMonthlyRevenue = () => {
      const revenueByMonth: Record<string, number> = {};
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      
      records.forEach(r => {
          if (r.status === 'paid' && r.paymentDate) {
              const dateObj = new Date(r.paymentDate);
              const key = months[dateObj.getMonth()];
              if (key) {
                  revenueByMonth[key] = (revenueByMonth[key] || 0) + (r.amount + r.penaltyAmount);
              }
          }
      });
      return Object.entries(revenueByMonth).map(([name, value]) => ({ name, value }));
  };

  const stats = {
      totalRevenue: records.filter(r => r.status === 'paid').reduce((sum, r) => sum + (r.originalAmount || r.amount) + r.penaltyAmount, 0),
      activeStudents: students.filter(s => s.status !== 'inactive').length,
      retentionRate: 98.5,
      pendingCollection: records.filter(r => r.status !== 'paid').reduce((sum, r) => sum + r.amount, 0),
      overdueAmount: records.filter(r => r.status === 'overdue').reduce((sum, r) => sum + r.amount + r.penaltyAmount, 0),
      monthlyRevenue: calculateMonthlyRevenue()
  };

  return (
    <FinanceContext.Provider value={{ 
        records, 
        stats,
        createRecord,
        createManualCharge,
        registerBatchPayment,
        approveBatchPayment,
        rejectBatchPayment,
        uploadProof,
        approvePayment, 
        rejectPayment, 
        generateMonthlyBilling, 
        checkOverdueStatus,
        getStudentPendingDebts,
        purgeStudentDebts 
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const context = useContext(FinanceContext);
  if (context === undefined) {
    throw new Error('useFinance must be used within a FinanceProvider');
  }
  return context;
};
