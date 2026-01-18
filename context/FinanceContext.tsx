
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { TuitionRecord, ManualChargeData, PaymentHistoryItem } from '../types';
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
  isFinanceLoading: boolean; 
  // Calculated Metrics
  totalRevenue: number;
  monthlyRevenueData: { name: string; total: number }[]; // Year to Date (Jan-Dec)
  rollingRevenueData: { name: string; total: number; fullDate: string }[]; // Last 6 Months
  
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
  
  registerBatchPayment: (
      recordIds: string[], 
      file: File, 
      method: 'Transferencia' | 'Efectivo', 
      totalAmount?: number,
      details?: { description: string; amount: number }[] 
  ) => void;
  approveBatchPayment: (batchId: string, totalPaidAmount: number) => void;
  rejectBatchPayment: (batchId: string) => void;

  uploadProof: (recordId: string, file: File, method?: 'Transferencia' | 'Efectivo') => void;
  approvePayment: (recordId: string, adjustedAmount?: number) => void; 
  rejectPayment: (recordId: string) => void;
  
  // New Architecture: Mutability for Scholarships/Adjustments
  updateRecordAmount: (recordId: string, newAmount: number) => void;

  generateMonthlyBilling: () => void; 
  checkOverdueStatus: () => void;
  getStudentPendingDebts: (studentId: string) => TuitionRecord[];
  
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
  const [isFinanceLoading, setIsFinanceLoading] = useState(true);

  // --- INIT & LOAD (ASYNC SIMULATION) ---
  useEffect(() => {
      let isMounted = true;

      const loadFinancialData = async () => {
          setIsFinanceLoading(true);
          
          await new Promise(resolve => setTimeout(resolve, 800));

          if (!isMounted) return;

          if (academyId) {
              const stored = localStorage.getItem('pulse_tuition_records');
              if (stored) {
                  setRecords(JSON.parse(stored));
              } else {
                  setRecords(mockTuitionRecords.filter(r => r.academyId === academyId || !r.academyId));
              }
          } else {
              setRecords([]);
          }
          
          setIsFinanceLoading(false);
      };

      loadFinancialData();

      return () => { isMounted = false; };
  }, [academyId]);

  // Persist Records
  useEffect(() => {
      if (!isFinanceLoading && records.length > 0) {
          localStorage.setItem('pulse_tuition_records', JSON.stringify(records));
      }
  }, [records, isFinanceLoading]);

  // --- CALCULATED METRICS (MEMOIZED) ---

  // 1. Total Revenue: Sum of all PAID records
  const totalRevenue = useMemo(() => {
      if (isFinanceLoading) return 0;
      return records.reduce((acc, r) => {
          // If fully paid, take the full original amount (or amount if original missing)
          if (r.status === 'paid') {
              const val = r.originalAmount !== undefined ? r.originalAmount : r.amount;
              return acc + val + (r.penaltyAmount || 0);
          }
          // If partial, revenue is Total - Current Debt
          if (r.status === 'partial') {
              const total = r.originalAmount || r.amount;
              const paid = total - r.amount;
              return acc + paid;
          }
          return acc;
      }, 0);
  }, [records, isFinanceLoading]);

  // 2. Monthly Revenue Data (Year-to-Date)
  const monthlyRevenueData = useMemo(() => {
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const revenueByMonth = new Array(12).fill(0);
      
      if (isFinanceLoading) return months.map((name) => ({ name, total: 0 }));

      const currentYear = new Date().getFullYear();

      records.forEach(r => {
          if (r.status === 'paid' || r.status === 'partial') {
              const dateStr = r.paymentDate || r.dueDate;
              if (dateStr) {
                  const dateObj = new Date(dateStr);
                  if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() === currentYear) {
                      const monthIndex = dateObj.getMonth(); 
                      let val = 0;
                      
                      if (r.status === 'paid') {
                          val = (r.originalAmount !== undefined ? r.originalAmount : r.amount) + (r.penaltyAmount || 0);
                      } else {
                          // Partial revenue logic
                          const total = r.originalAmount || r.amount;
                          val = total - r.amount;
                      }
                      
                      revenueByMonth[monthIndex] += val;
                  }
              }
          }
      });

      return months.map((name, index) => ({
          name,
          total: revenueByMonth[index]
      }));
  }, [records, isFinanceLoading]);

  // 3. Rolling Revenue Data (Last 6 Months)
  const rollingRevenueData = useMemo(() => {
      const result = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
          const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
          const monthIndex = d.getMonth();
          const year = d.getFullYear();
          const monthName = d.toLocaleDateString('es-MX', { month: 'short' });
          const properName = monthName.charAt(0).toUpperCase() + monthName.slice(1);

          let total = 0;
          
          if (!isFinanceLoading) {
              total = records.reduce((acc, r) => {
                  if (r.status === 'paid' || r.status === 'partial') {
                      const pDate = new Date(r.paymentDate || r.dueDate);
                      if (pDate.getMonth() === monthIndex && pDate.getFullYear() === year) {
                          let val = 0;
                          if (r.status === 'paid') {
                              val = (r.originalAmount !== undefined ? r.originalAmount : r.amount) + (r.penaltyAmount || 0);
                          } else {
                              const tot = r.originalAmount || r.amount;
                              val = tot - r.amount;
                          }
                          return acc + val;
                      }
                  }
                  return acc;
              }, 0);
          }

          result.push({
              name: properName,
              total: total,
              fullDate: d.toISOString()
          });
      }
      return result;
  }, [records, isFinanceLoading]);

  // --- REACTIVE BALANCE ENGINE ---
  useEffect(() => {
      if (isFinanceLoading || students.length === 0) return;

      let hasChanges = false;
      const nextStudents = students.map(student => {
          const studentRecords = records.filter(r => r.studentId === student.id);
          
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
  }, [records, students.length, isFinanceLoading]); 

  // --- BATCH PAYMENT LOGIC ---

  const registerBatchPayment = (
      recordIds: string[], 
      file: File, 
      method: 'Transferencia' | 'Efectivo', 
      totalAmount?: number,
      details?: { description: string; amount: number }[]
  ) => {
      const batchId = generateId('batch');
      const frozenDate = new Date().toISOString();
      const fakeUrl = URL.createObjectURL(file); 

      let transactionDetails = details;
      if ((!transactionDetails || transactionDetails.length === 0) && totalAmount && recordIds.length === 0) {
          transactionDetails = [{ description: 'Abono a cuenta / Depósito general', amount: totalAmount }];
      }

      setRecords(prev => prev.map(r => {
          if (recordIds.includes(r.id)) {
              // Ensure we initialize originalAmount if it doesn't exist yet, to enable partial tracking
              const currentOriginal = r.originalAmount !== undefined ? r.originalAmount : r.amount;
              
              const currentRecordDetails = transactionDetails || [{ description: r.concept, amount: r.amount + r.penaltyAmount }];

              return {
                  ...r,
                  batchPaymentId: batchId,
                  status: 'in_review',
                  paymentDate: frozenDate,
                  proofUrl: fakeUrl,
                  proofType: file.type,
                  method: method,
                  declaredAmount: totalAmount, 
                  details: currentRecordDetails,
                  originalAmount: currentOriginal // Lock in the original cost
              };
          }
          return r;
      }));
      
      addToast(`Pago registrado (${recordIds.length} conceptos). En revisión.`, 'success');
  };

  // --- CORE WATERFALL LOGIC ---
  const approveBatchPayment = (batchId: string, totalPaidAmount: number) => {
      const EPSILON = 0.01; // Tolerance for float comparison

      setRecords(prev => {
          const batchRecords = prev.filter(r => r.batchPaymentId === batchId);
          const otherRecords = prev.filter(r => r.batchPaymentId !== batchId);

          if (batchRecords.length === 0) return prev;

          // 1. Sort by Date (Oldest First) to ensure chronological payment
          const sortedBatch = [...batchRecords].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

          // 2. Prioritize Mandatory Items
          const mandatoryItems = sortedBatch.filter(r => !r.canBePaidInParts);
          const splittableItems = sortedBatch.filter(r => r.canBePaidInParts);

          let remainingMoney = totalPaidAmount;
          const processedBatch: TuitionRecord[] = [];

          const applyPayment = (item: TuitionRecord, amountToPay: number, isFull: boolean): TuitionRecord => {
              const paymentDate = new Date().toISOString();
              
              // Create history item
              const newHistoryItem: PaymentHistoryItem = {
                  date: paymentDate,
                  amount: amountToPay,
                  method: item.method || 'System'
              };

              const previousHistory = item.paymentHistory || [];
              const updatedHistory = [...previousHistory, newHistoryItem];

              if (isFull) {
                  return {
                      ...item,
                      status: 'paid',
                      amount: 0,
                      penaltyAmount: 0,
                      originalAmount: item.originalAmount !== undefined ? item.originalAmount : item.amount,
                      paymentDate: paymentDate,
                      paymentHistory: updatedHistory
                  };
              } else {
                  return {
                      ...item,
                      status: 'partial',
                      amount: item.amount - amountToPay, // Simplified penalty logic handled in block below
                      penaltyAmount: 0, // Simplified: assumption is penalty is paid first.
                      originalAmount: item.originalAmount !== undefined ? item.originalAmount : item.amount,
                      batchPaymentId: undefined, // Detach so it can be paid again
                      paymentDate: paymentDate, 
                      proofUrl: null,
                      paymentHistory: updatedHistory
                  };
              }
          };

          // 3. Pay Mandatory First
          for (const item of mandatoryItems) {
              const currentDebt = item.amount;
              const penalty = item.penaltyAmount;
              const totalItemDebt = currentDebt + penalty;

              if (remainingMoney >= totalItemDebt - EPSILON) {
                  // Full Payment
                  processedBatch.push(applyPayment(item, totalItemDebt, true));
                  remainingMoney -= totalItemDebt;
              } else {
                  // Insufficient funds for mandatory -> Remains Unpaid (or overdue)
                  const isOverdue = new Date() > new Date(item.dueDate);
                  processedBatch.push({
                      ...item,
                      status: isOverdue ? 'overdue' : 'pending',
                      batchPaymentId: undefined, // Detach
                      paymentDate: null,
                      proofUrl: null
                  });
                  remainingMoney = 0; 
              }
          }

          // 4. Pay Splittable with Remaining (Partial allowed)
          for (const item of splittableItems) {
              const currentDebt = item.amount;
              const penalty = item.penaltyAmount;
              const totalItemDebt = currentDebt + penalty;

              if (remainingMoney <= EPSILON) {
                  // No money left
                  const isOverdue = new Date() > new Date(item.dueDate);
                  processedBatch.push({
                      ...item,
                      status: isOverdue ? 'overdue' : 'pending',
                      batchPaymentId: undefined,
                      paymentDate: null,
                      proofUrl: null
                  });
                  continue;
              }

              if (remainingMoney >= totalItemDebt - EPSILON) {
                  // Full Payment
                  processedBatch.push(applyPayment(item, totalItemDebt, true));
                  remainingMoney -= totalItemDebt;
              } else {
                  // Partial Payment (Abono)
                  // Apply all remaining money to this item
                  const paymentToApply = remainingMoney;
                  
                  // Logic to update the item state specifically for partial
                  let newPenalty = penalty;
                  let newAmount = currentDebt;
                  let amountToDeduct = paymentToApply;

                  // Reduce Penalty First
                  if (amountToDeduct >= newPenalty) {
                      amountToDeduct -= newPenalty;
                      newPenalty = 0;
                  } else {
                      newPenalty -= amountToDeduct;
                      amountToDeduct = 0;
                  }
                  newAmount -= amountToDeduct;

                  // Manually construct because applyPayment helper was slightly simplified
                  const paymentDate = new Date().toISOString();
                  const newHistoryItem: PaymentHistoryItem = {
                      date: paymentDate,
                      amount: paymentToApply,
                      method: item.method || 'System'
                  };
                  
                  processedBatch.push({
                      ...item,
                      status: 'partial',
                      amount: newAmount,
                      penaltyAmount: newPenalty,
                      originalAmount: item.originalAmount !== undefined ? item.originalAmount : item.amount,
                      batchPaymentId: undefined, 
                      paymentDate: paymentDate, 
                      proofUrl: null,
                      paymentHistory: [...(item.paymentHistory || []), newHistoryItem]
                  });
                  
                  remainingMoney = 0; // Consumed
              }
          }

          return [...otherRecords, ...processedBatch];
      });
      
      addToast('Distribución de pago aplicada correctamente.', 'success');
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
                  declaredAmount: undefined,
                  details: undefined
              };
          }
          return r;
      }));
      addToast('Pago rechazado. Se ha notificado al alumno.', 'info');
  };

  // --- SINGLE ITEM ACTIONS ---

  const createRecord = (data: Partial<TuitionRecord>) => {
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
          originalAmount: data.amount, // Set original amount on creation
          penaltyAmount: 0,
          dueDate: data.dueDate || getLocalDate(),
          paymentDate: null,
          status: 'pending',
          proofUrl: null,
          canBePaidInParts: false,
          paymentHistory: [],
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
          originalAmount: data.amount, // Set original amount
          penaltyAmount: 0,
          dueDate: data.dueDate,
          paymentDate: null,
          proofUrl: null,
          canBePaidInParts: data.canBePaidInParts,
          relatedEventId: data.relatedEventId,
          paymentHistory: []
      };

      setRecords(prev => [newRecord, ...prev]);
      addToast('Cargo manual registrado exitosamente', 'success');
  };

  const uploadProof = (recordId: string, file: File, method: 'Transferencia' | 'Efectivo' = 'Transferencia') => {
      registerBatchPayment([recordId], file, method);
  };

  const updateRecordAmount = (recordId: string, newAmount: number) => {
      setRecords(prev => prev.map(r => {
          if (r.id === recordId) {
              const updatedRecord = { 
                  ...r, 
                  amount: newAmount,
                  // If we are EDITING the debt amount (scholarship/correction), update original too
                  originalAmount: newAmount 
              };
              
              if (r.status === 'in_review') {
                  updatedRecord.declaredAmount = newAmount;
              }

              if (newAmount <= 0) {
                  updatedRecord.status = 'paid';
                  updatedRecord.paymentDate = updatedRecord.paymentDate || new Date().toISOString();
                  updatedRecord.amount = 0; 
                  updatedRecord.penaltyAmount = 0; 
              } 
              
              return updatedRecord;
          }
          return r;
      }));
      addToast('Monto de deuda actualizado.', 'success');
  };

  const approvePayment = (recordId: string, adjustedAmount?: number) => {
      const record = records.find(r => r.id === recordId);
      if (!record) return;

      const effectiveDate = record.paymentDate || new Date().toISOString();

      setRecords(prev => prev.map(r => {
          if (r.id === recordId) {
              const original = r.originalAmount !== undefined ? r.originalAmount : r.amount;
              const currentHistory = r.paymentHistory || [];
              
              // Handle Partial Payment Approval Logic within Single Approve
              if (adjustedAmount !== undefined && adjustedAmount < r.amount) {
                   const remaining = r.amount - adjustedAmount;
                   
                   // Record History
                   const newHistory: PaymentHistoryItem = {
                       date: effectiveDate,
                       amount: adjustedAmount,
                       method: r.method || 'System'
                   };

                   return {
                       ...r,
                       status: 'partial',
                       amount: remaining,
                       originalAmount: original, // Keep history
                       paymentDate: null, // Reset for next payment
                       penaltyAmount: r.penaltyAmount, // Keep penalty if not paid
                       details: undefined,
                       batchPaymentId: undefined,
                       paymentHistory: [...currentHistory, newHistory]
                   };
              }

              // Full Payment
              // Record final payment history
              const finalHistory: PaymentHistoryItem = {
                  date: effectiveDate,
                  amount: r.amount + r.penaltyAmount, // Paying off remainder
                  method: r.method || 'System'
              };

              return { 
                  ...r, 
                  status: 'paid', 
                  amount: 0, // Debt Cleared
                  penaltyAmount: 0,
                  originalAmount: original, // History Preserved
                  paymentDate: effectiveDate,
                  paymentHistory: [...currentHistory, finalHistory]
              };
          }
          return r;
      }));
      addToast('Pago aprobado exitosamente', 'success');
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
                  originalAmount: monthlyTuition, // IMPORTANT
                  penaltyAmount: 0,
                  dueDate: dueDate,
                  paymentDate: null,
                  status: 'pending',
                  proofUrl: null,
                  category: 'Mensualidad',
                  canBePaidInParts: true, // Allow partials for tuition usually
                  type: 'charge',
                  paymentHistory: []
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
      return records.filter(r => 
          r.studentId === studentId && 
          (r.status === 'pending' || r.status === 'overdue' || r.status === 'charged' || r.status === 'in_review' || r.status === 'partial')
      );
  };
  
  const purgeStudentDebts = (studentId: string) => {
      setRecords(prev => prev.filter(r => {
          if (r.studentId === studentId) {
              return r.status === 'paid';
          }
          return true;
      }));
  };

  const stats = useMemo(() => {
      if (isFinanceLoading) {
          return {
              totalRevenue: 0,
              activeStudents: 0,
              retentionRate: 0,
              pendingCollection: 0,
              overdueAmount: 0,
              monthlyRevenue: []
          };
      }
      return {
          totalRevenue,
          activeStudents: students.filter(s => s.status !== 'inactive').length,
          retentionRate: 98.5,
          pendingCollection: records.filter(r => r.status !== 'paid').reduce((sum, r) => sum + r.amount, 0),
          overdueAmount: records.filter(r => r.status === 'overdue').reduce((sum, r) => sum + r.amount + r.penaltyAmount, 0),
          monthlyRevenue: monthlyRevenueData.map(m => ({ name: m.name, value: m.total }))
      };
  }, [records, students, totalRevenue, monthlyRevenueData, isFinanceLoading]);

  return (
    <FinanceContext.Provider value={{ 
        records, 
        isFinanceLoading, 
        totalRevenue,
        monthlyRevenueData,
        rollingRevenueData,
        stats,
        createRecord,
        createManualCharge,
        registerBatchPayment,
        approveBatchPayment,
        rejectBatchPayment,
        uploadProof,
        approvePayment, 
        rejectPayment, 
        updateRecordAmount,
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