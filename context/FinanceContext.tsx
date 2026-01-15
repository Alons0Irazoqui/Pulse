
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
          if (r.status === 'paid') {
              const val = r.originalAmount !== undefined ? r.originalAmount : r.amount;
              return acc + val + (r.penaltyAmount || 0);
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
          if (r.status === 'paid') {
              const dateStr = r.paymentDate || r.dueDate;
              if (dateStr) {
                  const dateObj = new Date(dateStr);
                  if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() === currentYear) {
                      const monthIndex = dateObj.getMonth(); 
                      const val = r.originalAmount !== undefined ? r.originalAmount : r.amount;
                      revenueByMonth[monthIndex] += val + (r.penaltyAmount || 0);
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
                  if (r.status === 'paid') {
                      const pDate = new Date(r.paymentDate || r.dueDate);
                      if (pDate.getMonth() === monthIndex && pDate.getFullYear() === year) {
                          const val = r.originalAmount !== undefined ? r.originalAmount : r.amount;
                          return acc + val + (r.penaltyAmount || 0);
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
                  details: currentRecordDetails 
              };
          }
          return r;
      }));
      
      addToast(`Pago registrado (${recordIds.length} conceptos). En revisión.`, 'success');
  };

  const approveBatchPayment = (batchId: string, totalPaidAmount: number) => {
      const EPSILON = 0.01; // Tolerance for float comparison

      setRecords(prev => {
          const batchRecords = prev.filter(r => r.batchPaymentId === batchId);
          const otherRecords = prev.filter(r => r.batchPaymentId !== batchId);

          if (batchRecords.length === 0) return prev;

          const mandatoryItems = batchRecords.filter(r => !r.canBePaidInParts);
          const splittableItems = batchRecords.filter(r => r.canBePaidInParts)
                                              .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

          let remainingMoney = totalPaidAmount;
          const processedBatch: TuitionRecord[] = [];

          // Distribution Logic 2.0 (Strict "Principal Covered = Paid")
          for (const item of mandatoryItems) {
              const principal = item.amount;
              const totalDebt = item.amount + item.penaltyAmount;
              
              // CRITICAL: We check if payment covers PRINCIPAL (item.amount). 
              // If it does, we assume the intention is to fully pay, waiving remainder penalty if funds are short.
              if (remainingMoney >= principal - EPSILON) {
                  // Determine actual deduction: Prefer taking full debt, fallback to whatever is left (principal + part of penalty)
                  let deduction = totalDebt;
                  if (remainingMoney < totalDebt) {
                      deduction = remainingMoney; // Consumes all rest, implicitly waiving the unpaid penalty portion
                  }
                  
                  remainingMoney -= deduction;
                  processedBatch.push({ ...item, status: 'paid', amount: 0, penaltyAmount: 0, originalAmount: item.amount }); 
              } else {
                  const isOverdue = new Date() > new Date(item.dueDate);
                  processedBatch.push({ ...item, status: isOverdue ? 'overdue' : 'pending', batchPaymentId: undefined, paymentDate: null, declaredAmount: undefined, details: undefined });
              }
          }

          for (const item of splittableItems) {
              const totalDebt = item.amount + item.penaltyAmount;
              const principal = item.amount;

              if (remainingMoney <= 0) {
                  const isOverdue = new Date() > new Date(item.dueDate);
                  processedBatch.push({ ...item, status: isOverdue ? 'overdue' : 'pending', batchPaymentId: undefined, paymentDate: null, declaredAmount: undefined, details: undefined });
                  continue;
              }

              // Try to pay full debt first
              if (remainingMoney >= totalDebt - EPSILON) {
                  remainingMoney -= totalDebt;
                  processedBatch.push({ ...item, status: 'paid', amount: 0, penaltyAmount: 0, originalAmount: item.amount });
              } 
              // If not, try to pay at least Principal to mark as Paid (Waive Penalty)
              else if (remainingMoney >= principal - EPSILON) {
                  // Consumes all remaining money (Principal + partial penalty)
                  remainingMoney = 0; 
                  processedBatch.push({ ...item, status: 'paid', amount: 0, penaltyAmount: 0, originalAmount: item.amount });
              }
              // Partial Payment
              else {
                  const paymentForThis = remainingMoney;
                  let newAmount = item.amount;
                  let newPenalty = item.penaltyAmount;
                  let moneyToDeduct = paymentForThis;

                  // Pay penalty first? Or principal? Standard is Penalty first usually, but let's stick to debt reduction.
                  if (moneyToDeduct >= newPenalty) {
                      moneyToDeduct -= newPenalty;
                      newPenalty = 0;
                  } else {
                      newPenalty -= moneyToDeduct;
                      moneyToDeduct = 0;
                  }
                  
                  newAmount -= moneyToDeduct;
                  remainingMoney = 0; 

                  processedBatch.push({
                      ...item,
                      status: 'partial',
                      amount: newAmount,
                      penaltyAmount: newPenalty,
                      originalAmount: item.originalAmount || item.amount,
                      batchPaymentId: undefined,
                      paymentDate: null,
                      proofUrl: null,
                      declaredAmount: undefined,
                      details: undefined
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
          penaltyAmount: 0,
          dueDate: data.dueDate || getLocalDate(),
          paymentDate: null,
          status: 'pending',
          proofUrl: null,
          canBePaidInParts: false,
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
      registerBatchPayment([recordId], file, method);
  };

  const updateRecordAmount = (recordId: string, newAmount: number) => {
      setRecords(prev => prev.map(r => {
          if (r.id === recordId) {
              const updatedRecord = { ...r, amount: newAmount };
              
              // Automatic Status Logic:
              // If amount is zeroed out (e.g. 100% scholarship or manual fix), mark as paid.
              if (newAmount <= 0) {
                  updatedRecord.status = 'paid';
                  updatedRecord.paymentDate = updatedRecord.paymentDate || new Date().toISOString();
                  updatedRecord.amount = 0; // Sanitize negative values
                  updatedRecord.penaltyAmount = 0; // Clear penalty too if fully discounted
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
              // Lógica Específica: Ajuste de Mensualidad
              if (r.category === 'Mensualidad' && adjustedAmount !== undefined) {
                  return {
                      ...r,
                      status: 'paid',
                      amount: adjustedAmount, // Muestra lo que se pagó realmente
                      originalAmount: adjustedAmount, // Asegura que el reporte de ingresos sume solo lo cobrado
                      penaltyAmount: 0, // Condonación de recargos implícita
                      paymentDate: effectiveDate
                  };
              }

              // Flujo estándar
              return { 
                  ...r, 
                  status: 'paid', 
                  amount: 0, // Deuda saldada
                  penaltyAmount: 0,
                  originalAmount: r.originalAmount !== undefined ? r.originalAmount : r.amount,
                  paymentDate: effectiveDate
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
                  penaltyAmount: 0,
                  dueDate: dueDate,
                  paymentDate: null,
                  status: 'pending',
                  proofUrl: null,
                  category: 'Mensualidad',
                  canBePaidInParts: false,
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
