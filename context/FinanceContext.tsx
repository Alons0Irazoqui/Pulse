import React, { createContext, useContext, useState, useEffect } from 'react';
import { FinancialRecord } from '../types';
import { PulseService } from '../services/pulseService';
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
  payments: FinancialRecord[];
  stats: {
      totalRevenue: number;
      activeStudents: number;
      retentionRate: number;
      churnRate: number;
      monthlyRevenue: { name: string; value: number }[];
  };
  recordPayment: (record: FinancialRecord) => void;
  approvePayment: (recordId: string) => void; 
  rejectPayment: (recordId: string) => void;
  generateMonthlyBilling: () => void; 
  applyLateFees: () => void;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const { students, academySettings, batchUpdateStudents } = useAcademy();
  const { addToast } = useToast();
  const academyId = currentUser?.academyId;

  const [payments, setPayments] = useState<FinancialRecord[]>([]);

  // Load Payments
  useEffect(() => {
      if (academyId) {
          setPayments(PulseService.getPayments(academyId));
      }
  }, [academyId]);

  // Persist Payments
  useEffect(() => {
      if (currentUser) PulseService.savePayments(payments);
  }, [payments, currentUser]);

  // --- REACTIVE BALANCE ENGINE (Moved from StoreContext) ---
  // Calculates real balance: Sum(Charges) - Sum(Paid Payments)
  useEffect(() => {
      if (students.length === 0) return;

      let hasChanges = false;
      const nextStudents = students.map(student => {
          const studentRecords = payments.filter(p => p.studentId === student.id);
          
          const totalDebt = studentRecords
              .filter(r => r.type === 'charge')
              .reduce((sum, r) => sum + r.amount, 0);
          
          const totalPaid = studentRecords
              .filter(r => r.type === 'payment' && r.status === 'paid')
              .reduce((sum, r) => sum + r.amount, 0);
          
          const calculatedBalance = Math.max(0, totalDebt - totalPaid);
          
          let newStatus = student.status;
          if (calculatedBalance > 0) {
              if (newStatus === 'active' || newStatus === 'exam_ready') {
                  newStatus = 'debtor';
              }
          } else {
              if (newStatus === 'debtor') {
                  newStatus = 'active';
              }
          }

          if (Math.abs(student.balance - calculatedBalance) > 0.01 || student.status !== newStatus) {
              hasChanges = true;
              return { ...student, balance: calculatedBalance, status: newStatus };
          }
          return student;
      });

      if (hasChanges) {
          batchUpdateStudents(nextStudents);
      }
  }, [payments]); // Dependency: Re-run whenever financial records change

  // --- AUTOMATION ENGINE (CATCH-UP LOGIC) ---
  useEffect(() => {
      if (!currentUser || currentUser.role !== 'master') return;

      const runAutomation = () => {
          const todayStr = getLocalDate();
          const [currYear, currMonth, currDay] = todayStr.split('-').map(Number);
          
          const { billingDay, lateFeeDay } = academySettings.paymentSettings;

          // 1. Monthly Billing
          const lastBillingDate = localStorage.getItem('pulse_last_billing_run');
          let billingNeeded = false;

          if (!lastBillingDate) {
              if (currDay >= billingDay) billingNeeded = true;
          } else {
              const [lastYear, lastMonth] = lastBillingDate.split('-').map(Number);
              const isLaterMonth = (currYear > lastYear) || (currYear === lastYear && currMonth > lastMonth);
              if (isLaterMonth && currDay >= billingDay) billingNeeded = true;
          }

          if (billingNeeded) {
              generateMonthlyBilling(); 
              localStorage.setItem('pulse_last_billing_run', todayStr);
          }

          // 2. Late Fees
          const lastFeeDate = localStorage.getItem('pulse_last_fee_run');
          let feesNeeded = false;

          if (!lastFeeDate) {
              if (currDay >= lateFeeDay) feesNeeded = true;
          } else {
              const [lastYear, lastMonth] = lastFeeDate.split('-').map(Number);
              const isLaterMonth = (currYear > lastYear) || (currYear === lastYear && currMonth > lastMonth);
              if (isLaterMonth && currDay >= lateFeeDay) feesNeeded = true;
          }
          
          if (feesNeeded) {
              applyLateFees();
              localStorage.setItem('pulse_last_fee_run', todayStr);
          }
      };

      runAutomation();
  }, [currentUser, academySettings]); // Remove payments/students dependency to avoid loop

  // --- ACTIONS ---

  const recordPayment = (record: FinancialRecord) => {
      let newRecord = { ...record };
      if (!newRecord.id) newRecord.id = generateId('tx');
      if (!newRecord.academyId) newRecord.academyId = currentUser!.academyId;
      if (!newRecord.date) newRecord.date = getLocalDate();

      if (newRecord.type === 'charge') {
          newRecord.status = 'charged';
      } else if (newRecord.type === 'payment' && !newRecord.status) {
          newRecord.status = 'pending_approval';
      }

      setPayments(prev => [newRecord, ...prev]);
      addToast(newRecord.type === 'charge' ? 'Cargo registrado exitosamente' : 'Pago registrado exitosamente', 'success');
  };

  const approvePayment = (recordId: string) => {
      setPayments(prev => prev.map(p => {
          if (p.id === recordId && p.type === 'payment') {
              return { ...p, status: 'paid', processedBy: currentUser?.id, processedAt: new Date().toISOString() };
          }
          return p;
      }));
      addToast('Pago aprobado y saldo actualizado', 'success');
  };

  const rejectPayment = (recordId: string) => {
      setPayments(prev => prev.map(p => {
          if (p.id === recordId && p.type === 'payment') {
              return { ...p, status: 'rejected', processedBy: currentUser?.id, processedAt: new Date().toISOString() };
          }
          return p;
      }));
      addToast('Pago rechazado', 'info');
  };

  const generateMonthlyBilling = () => {
      if (currentUser?.role !== 'master') return;
      const today = getLocalDate();
      const monthlyAmount = academySettings.paymentSettings.monthlyTuition || 800;
      const newCharges: FinancialRecord[] = [];
      const activeStudents = students.filter(s => s.status !== 'inactive');
      
      activeStudents.forEach(s => {
          const alreadyCharged = payments.some(p => p.studentId === s.id && p.type === 'charge' && p.category === 'Mensualidad' && p.date.substring(0, 7) === today.substring(0, 7));
          if (!alreadyCharged) {
              const charge: FinancialRecord = {
                  id: generateId('chg'), 
                  academyId: currentUser.academyId, 
                  studentId: s.id, 
                  studentName: s.name, 
                  amount: monthlyAmount, 
                  date: today, 
                  status: 'charged', 
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
          addToast(`Mensualidad generada para ${newCharges.length} alumnos`, 'success');
      }
  };

  const applyLateFees = () => {
      if (currentUser?.role !== 'master') return;
      const { lateFeeAmount } = academySettings.paymentSettings;
      const today = getLocalDate();
      const fees: FinancialRecord[] = [];

      students.forEach(s => {
          if (s.balance > 0 && s.status !== 'inactive') {
              const penalty: FinancialRecord = { 
                  id: generateId('fee'), 
                  academyId: currentUser!.academyId, 
                  studentId: s.id, 
                  studentName: s.name, 
                  amount: lateFeeAmount, 
                  date: today, 
                  status: 'charged', 
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
          addToast(`${fees.length} recargos aplicados`, 'info');
      }
  };

  // --- STATS CALCULATION ---
  const activeStudentsCount = students.filter(s => s.status !== 'inactive').length;
  const inactiveStudentsCount = students.filter(s => s.status === 'inactive').length;
  const totalStudentsCount = students.length;
  const churnRate = totalStudentsCount > 0 ? (inactiveStudentsCount / totalStudentsCount) * 100 : 0;

  const calculateMonthlyRevenue = () => {
      const revenueByMonth: Record<string, number> = {};
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      payments.forEach(p => {
          if (p.type === 'payment' && p.status === 'paid') {
              const date = new Date(p.date);
              if (!isNaN(date.getTime())) {
                  const key = months[date.getMonth()];
                  if (revenueByMonth[key] === undefined) revenueByMonth[key] = 0;
                  revenueByMonth[key] += p.amount;
              }
          }
      });
      return Object.entries(revenueByMonth).map(([name, value]) => ({ name, value }));
  };

  const stats = {
      totalRevenue: payments.filter(p => p.type === 'payment' && p.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0),
      activeStudents: activeStudentsCount,
      retentionRate: 100 - churnRate,
      churnRate: churnRate,
      monthlyRevenue: calculateMonthlyRevenue()
  };

  return (
    <FinanceContext.Provider value={{ 
        payments, 
        stats,
        recordPayment, 
        approvePayment, 
        rejectPayment, 
        generateMonthlyBilling, 
        applyLateFees 
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