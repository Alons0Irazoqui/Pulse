
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TuitionRecord, ManualChargeData, ChargeCategory, Student, TuitionStatus } from '../types';
import { PulseService } from '../services/pulseService';
import { useAuth } from './AuthContext';
import { useAcademy } from './AcademyContext'; // Need academy settings for billing
import { useToast } from './ToastContext';
import { getLocalDate } from '../utils/dateUtils';

// Helper for ID generation
const generateId = (prefix: string = 'id') => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return `${prefix}-${crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}`;
};

interface RevenueData {
    name: string;
    total: number;
}

interface FinanceStats {
    totalRevenue: number;
    pendingCollection: number;
    overdueAmount: number;
    activeStudents: number;
}

interface FinanceContextType {
    records: TuitionRecord[];
    monthlyRevenueData: RevenueData[];
    rollingRevenueData: RevenueData[];
    stats: FinanceStats;
    isFinanceLoading: boolean;

    // Actions
    refreshFinance: () => void;
    createManualCharge: (data: ManualChargeData) => void;
    createRecord: (record: TuitionRecord) => void; // Legacy support if needed, or alias to internal logic
    approvePayment: (recordId: string, amountPaid?: number) => void;
    rejectPayment: (recordId: string) => void;
    approveBatchPayment: (batchId: string, totalAmountPaid: number) => void;
    rejectBatchPayment: (batchId: string) => void;
    registerBatchPayment: (
        recordIds: string[], 
        file: File | null, 
        method: 'Transferencia' | 'Efectivo',
        totalAmount: number,
        details: { description: string; amount: number }[]
    ) => void;
    updateRecordAmount: (recordId: string, newAmount: number) => void;
    deleteRecord: (recordId: string) => void;
    generateMonthlyBilling: () => void;
    purgeStudentDebts: (studentId: string) => void;
    getStudentPendingDebts: (studentId: string) => TuitionRecord[];
    uploadProof: (recordId: string, file: File) => void; // Legacy single upload if needed
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const { academySettings, students, batchUpdateStudents } = useAcademy(); // Extract batchUpdateStudents
    const { addToast } = useToast();

    const [records, setRecords] = useState<TuitionRecord[]>([]);
    const [isFinanceLoading, setIsFinanceLoading] = useState(true);
    
    // Stats State
    const [monthlyRevenueData, setMonthlyRevenueData] = useState<RevenueData[]>([]);
    const [rollingRevenueData, setRollingRevenueData] = useState<RevenueData[]>([]);
    const [stats, setStats] = useState<FinanceStats>({
        totalRevenue: 0,
        pendingCollection: 0,
        overdueAmount: 0,
        activeStudents: 0
    });

    // --- LOAD DATA ---
    const loadFinanceData = useCallback(() => {
        if (currentUser?.academyId) {
            setIsFinanceLoading(true);
            const dbRecords = PulseService.getPayments(currentUser.academyId);
            setRecords(dbRecords);
            setIsFinanceLoading(false);
        } else {
            setRecords([]);
            setIsFinanceLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        loadFinanceData();
    }, [loadFinanceData]);

    // --- SYNC ENGINE: OVERDUE CHECK & STUDENT STATUS UPDATE ---
    useEffect(() => {
        if (isFinanceLoading || students.length === 0) return;

        // 1. Check Overdue Status (Run once on records update)
        // Detects 'pending' records that are past due date and flips them to 'overdue'
        const today = getLocalDate();
        let recordsUpdated = false;
        
        const processedRecords = records.map(r => {
            if (r.status === 'pending' && r.dueDate < today) {
                recordsUpdated = true;
                // Apply Late Fee if configured
                const penalty = academySettings.paymentSettings?.lateFeeAmount || 0;
                return { ...r, status: 'overdue', penaltyAmount: penalty } as TuitionRecord;
            }
            return r;
        });

        if (recordsUpdated) {
            // Update records first, this will re-trigger the effect to handle student status in next pass
            setRecords(processedRecords);
            return; 
        }

        // 2. Calculate Student Balances & Update Status
        const studentsToUpdate: Student[] = [];
        
        students.forEach(student => {
            const studentRecords = records.filter(r => r.studentId === student.id);
            
            // Calculate REAL Debt (Pending + Overdue + Partial + Charged)
            const debt = studentRecords.reduce((acc, r) => {
                if (['pending', 'overdue', 'partial', 'charged'].includes(r.status)) {
                    return acc + r.amount + r.penaltyAmount;
                }
                return acc;
            }, 0);

            let newStatus = student.status;

            // LOGIC CHANGE: If ANY debt exists (> 0), mark as 'debtor'.
            // Previously might have checked only for 'overdue' records.
            if (debt > 0.01) {
                // Force 'debtor' if active or exam_ready. 
                // We assume inactive students stay inactive unless manually reactivated.
                if (newStatus === 'active' || newStatus === 'exam_ready') {
                    newStatus = 'debtor';
                }
            } else {
                // If paid off, revert 'debtor' to 'active'
                if (newStatus === 'debtor') {
                    newStatus = 'active';
                }
            }

            // Detect if update is needed (Floating point comparison for balance)
            const currentBalance = student.balance || 0;
            if (Math.abs(currentBalance - debt) > 0.01 || student.status !== newStatus) {
                studentsToUpdate.push({ ...student, balance: debt, status: newStatus });
            }
        });

        if (studentsToUpdate.length > 0) {
            batchUpdateStudents(studentsToUpdate);
        }

    }, [records, students, isFinanceLoading, academySettings, batchUpdateStudents]);


    // --- CALCULATE STATS (Derived - REAL DATA) ---
    useEffect(() => {
        if (isFinanceLoading) return;

        // 1. Calculate General Stats
        const pending = records.filter(r => ['pending', 'partial', 'charged'].includes(r.status));
        const overdue = records.filter(r => r.status === 'overdue');
        
        const totalPending = pending.reduce((acc, r) => acc + r.amount, 0);
        const totalOverdue = overdue.reduce((acc, r) => acc + r.amount + r.penaltyAmount, 0);
        
        // Calculate Total Revenue (Total Paid Historically)
        const totalRevenue = records.reduce((acc, r) => {
            if (r.status === 'paid') return acc + (r.originalAmount ?? r.amount); // Full amount paid
            if (r.status === 'partial') return acc + ((r.originalAmount ?? r.amount) - r.amount); // Part paid
            return acc;
        }, 0);

        setStats({
            totalRevenue,
            pendingCollection: totalPending,
            overdueAmount: totalOverdue,
            activeStudents: students.filter(s => s.status === 'active').length
        });

        // 2. Generate Real Chart Data
        const generateRealChartData = () => {
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const now = new Date();
            const currentYear = now.getFullYear();
            const currentMonthIdx = now.getMonth();

            // Initialize Annual Data (Current Year) - Filled with 0s
            const annualTotals = new Array(12).fill(0);

            // Initialize Rolling Data (Last 6 Months)
            const rollingStats: { monthIndex: number; year: number; name: string; total: number }[] = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                rollingStats.push({
                    monthIndex: d.getMonth(),
                    year: d.getFullYear(),
                    name: months[d.getMonth()],
                    total: 0
                });
            }

            // Iterate Records
            records.forEach(r => {
                // Only count actual payments
                if ((r.status === 'paid' || r.status === 'partial') && r.paymentDate) {
                    const pDate = new Date(r.paymentDate);
                    const pYear = pDate.getFullYear();
                    const pMonth = pDate.getMonth();

                    // Calculate Real Paid Amount
                    let paidAmount = 0;
                    if (r.status === 'paid') {
                        // If paid, the revenue is the original total (or amount if legacy)
                        paidAmount = (r.originalAmount ?? r.amount);
                    } else {
                        // If partial, the revenue collected so far is Total - Remaining Debt
                        paidAmount = (r.originalAmount ?? r.amount) - r.amount;
                    }

                    // A. Annual Chart (Current Year Only)
                    if (pYear === currentYear) {
                        annualTotals[pMonth] += paidAmount;
                    }

                    // B. Rolling Chart (Specific Month/Year match)
                    const rollingMatch = rollingStats.find(
                        item => item.monthIndex === pMonth && item.year === pYear
                    );
                    if (rollingMatch) {
                        rollingMatch.total += paidAmount;
                    }
                }
            });

            // Set State
            setMonthlyRevenueData(months.map((m, i) => ({ name: m, total: annualTotals[i] })));
            setRollingRevenueData(rollingStats.map(r => ({ name: r.name, total: r.total })));
        };

        generateRealChartData();

    }, [records, isFinanceLoading, students]);

    // --- PERSISTENCE ---
    useEffect(() => {
        if (currentUser && !isFinanceLoading) {
            PulseService.savePayments(records);
        }
    }, [records, currentUser, isFinanceLoading]);


    // --- ACTIONS ---

    const createManualCharge = (data: ManualChargeData) => {
        if (currentUser?.role !== 'master') return;
        
        // Strict number casting to avoid '500' string issues
        const cleanAmount = Number(data.amount);

        const newRecord: TuitionRecord = {
            id: generateId('chg'),
            academyId: currentUser.academyId,
            studentId: data.studentId,
            studentName: students.find(s => s.id === data.studentId)?.name || 'Estudiante',
            concept: data.title,
            description: data.description,
            amount: cleanAmount,
            originalAmount: cleanAmount,
            penaltyAmount: 0,
            dueDate: data.dueDate,
            paymentDate: null,
            status: 'charged', // Or 'pending'
            type: 'charge',
            category: data.category,
            method: 'System',
            proofUrl: null,
            canBePaidInParts: data.canBePaidInParts,
            relatedEventId: data.relatedEventId
        };

        setRecords(prev => [...prev, newRecord]);
        addToast('Cargo generado exitosamente', 'success');
    };

    const createRecord = (record: TuitionRecord) => {
        // Legacy support
        setRecords(prev => [...prev, record]);
    };

    const registerBatchPayment = (
        recordIds: string[], 
        file: File | null, 
        method: 'Transferencia' | 'Efectivo',
        totalAmount: number,
        details: { description: string; amount: number }[]
    ) => {
        // Simulate File Upload (In real app, upload to storage and get URL)
        const fakeUrl = file ? URL.createObjectURL(file) : null;
        const proofType = file?.type;
        const batchId = generateId('batch');
        const paymentDate = new Date().toISOString();

        setRecords(prev => prev.map(r => {
            if (recordIds.includes(r.id)) {
                return {
                    ...r,
                    status: 'in_review',
                    paymentDate: paymentDate,
                    proofUrl: fakeUrl,
                    proofType: proofType,
                    method: method,
                    batchPaymentId: batchId,
                    declaredAmount: totalAmount, // Store total paid for this batch in each record for context
                    details: details // Store breakdown if needed
                };
            }
            return r;
        }));
        addToast('Pago registrado y enviado a revisión', 'success');
    };

    const approvePayment = (recordId: string, amountPaid?: number) => {
        setRecords(prev => prev.map(r => {
            if (r.id === recordId) {
                // Critical Fix: Ensure Total Debt includes Penalty
                const currentPenalty = r.penaltyAmount || 0;
                const totalDebt = r.amount + currentPenalty;
                
                // If amountPaid is undefined, we assume full payment of the TOTAL debt
                const amountToApply = amountPaid !== undefined ? amountPaid : totalDebt;
                
                const remaining = Math.max(0, totalDebt - amountToApply);
                
                // Logic: If remaining is negligible (floating point tolerance), we consider it fully paid.
                const isPaidFull = remaining < 0.01;

                // History Update
                const newHistoryItem = {
                    date: new Date().toISOString(),
                    amount: amountToApply,
                    method: r.method || 'System'
                };

                return {
                    ...r,
                    status: isPaidFull ? 'paid' : 'partial',
                    // STRICT LIQUIDATION LOGIC:
                    // If paid full, amount becomes 0.
                    // If partial, amount is the remaining balance.
                    amount: isPaidFull ? 0 : remaining,
                    
                    // CRITICAL FIX: If paid full, merge penalty into originalAmount so Revenue Stats see 950 (not 800)
                    // If partial, we keep originalAmount as is until liquidation? 
                    // Actually, if we clear penaltyAmount, we must account for it somewhere.
                    // For Simplicity: If paid full, we bump originalAmount.
                    originalAmount: isPaidFull ? (r.originalAmount ?? r.amount) + currentPenalty : (r.originalAmount ?? r.amount),
                    
                    // Penalty is cleared (merged into payment or remaining balance) to avoid phantom debts.
                    penaltyAmount: 0, 
                    paymentHistory: [...(r.paymentHistory || []), newHistoryItem]
                };
            }
            return r;
        }));
        addToast('Pago aprobado', 'success');
    };

    const rejectPayment = (recordId: string) => {
        setRecords(prev => prev.map(r => {
            if (r.id === recordId) {
                return {
                    ...r,
                    status: (r.dueDate < getLocalDate() ? 'overdue' : 'pending') as TuitionStatus,
                    paymentDate: null,
                    proofUrl: null,
                    batchPaymentId: undefined
                };
            }
            return r;
        }));
        addToast('Pago rechazado', 'info');
    };

    const approveBatchPayment = (batchId: string, totalAmountPaid: number) => {
        setRecords(prev => {
            const batchRecords = prev.filter(r => r.batchPaymentId === batchId);
            // Sort by due date (Oldest first) for waterfall application
            batchRecords.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            
            let available = totalAmountPaid;
            
            const updatedBatch = batchRecords.map(r => {
                // Critical Fix: Calculate full debt including penalty for correct waterfall
                const currentPenalty = r.penaltyAmount || 0;
                const totalDebt = r.amount + currentPenalty;
                let paid = 0;
                
                // Allocation Logic
                if (!r.canBePaidInParts) {
                    // Mandatory items: All or nothing
                    if (available >= totalDebt - 0.01) {
                        paid = totalDebt;
                        available -= totalDebt;
                    }
                } else {
                    // Flexible items: Fill as much as possible
                    if (available > 0) {
                        paid = Math.min(available, totalDebt);
                        available -= paid;
                    }
                }

                const remaining = Math.max(0, totalDebt - paid);
                const isPaidFull = remaining < 0.01;
                
                // Only update if paid something or if we need to reset status
                if (paid > 0) {
                    const newHistoryItem = {
                        date: new Date().toISOString(),
                        amount: paid,
                        method: r.method || 'Batch'
                    };

                    return {
                        ...r,
                        status: isPaidFull ? 'paid' : 'partial',
                        // STRICT LIQUIDATION LOGIC:
                        amount: isPaidFull ? 0 : remaining,
                        // CRITICAL FIX: Merge penalty into originalAmount on full payment
                        originalAmount: isPaidFull ? (r.originalAmount ?? r.amount) + currentPenalty : (r.originalAmount ?? r.amount),
                        
                        penaltyAmount: 0, // Penalty is addressed (either paid or merged into remaining 'amount')
                        paymentHistory: [...(r.paymentHistory || []), newHistoryItem]
                    } as TuitionRecord;
                } 
                
                // If not paid, revert (simplified)
                if (paid === 0) {
                     return {
                        ...r,
                        status: (r.dueDate < getLocalDate() ? 'overdue' : 'pending') as TuitionStatus,
                        // Keep amounts as is
                    };
                }

                return r;
            });

            // Merge updates back into state
            return prev.map(r => {
                const updated = updatedBatch.find(u => u.id === r.id);
                return updated || r;
            });
        });
        
        addToast('Lote de pagos aprobado', 'success');
    };

    const rejectBatchPayment = (batchId: string) => {
        setRecords(prev => prev.map(r => {
            if (r.batchPaymentId === batchId) {
                return {
                    ...r,
                    status: (r.dueDate < getLocalDate() ? 'overdue' : 'pending') as TuitionStatus,
                    paymentDate: null,
                    proofUrl: null,
                    batchPaymentId: undefined
                };
            }
            return r;
        }));
        addToast('Lote de pagos rechazado', 'info');
    };

    const updateRecordAmount = (recordId: string, newTotal: number) => {
        setRecords(prev => {
            const targetRecord = prev.find(r => r.id === recordId);
            if (!targetRecord) return prev;

            // Current Total including penalty
            const currentTotal = targetRecord.amount + (targetRecord.penaltyAmount || 0);
            
            // Delta based on TOTAL difference
            const delta = currentTotal - newTotal;
            const batchId = targetRecord.batchPaymentId;

            return prev.map(r => {
                const isTarget = r.id === recordId;
                const isBatchSibling = batchId && r.batchPaymentId === batchId;

                // If unrelated, return immediately
                if (!isTarget && !isBatchSibling) return r;

                // Calculate new declared amount if applicable
                let updatedDeclared = r.declaredAmount;
                if (r.declaredAmount !== undefined) {
                    updatedDeclared = r.declaredAmount - delta;
                }

                // CASE A: The Edited Record
                if (isTarget) {
                    const updatedRecord = { 
                        ...r, 
                        amount: newTotal, // Set new total as the base amount
                        penaltyAmount: 0, // Reset penalty as it's merged into the new total
                        originalAmount: newTotal, 
                        declaredAmount: updatedDeclared
                    };

                    // Auto-resolve if amount becomes 0 or negative
                    if (newTotal <= 0) {
                        updatedRecord.status = 'paid';
                        updatedRecord.paymentDate = updatedRecord.paymentDate || new Date().toISOString();
                        updatedRecord.amount = 0; 
                        updatedRecord.penaltyAmount = 0; 
                    } 
                    
                    return updatedRecord;
                }

                // CASE B: Batch Siblings
                if (isBatchSibling) {
                    return {
                        ...r,
                        declaredAmount: updatedDeclared
                    };
                }

                return r;
            });
        });
        addToast('Monto de deuda actualizado.', 'success');
    };

    const deleteRecord = (recordId: string) => {
        // 1. Optimistic UI update
        setRecords(prev => prev.filter(r => r.id !== recordId));
        
        // 2. HARD DELETE from DB (LocalStorage) using Service
        // This ensures that when 'savePayments' (merge) runs next, the old record isn't revived,
        // and also cleans it up immediately for other contexts.
        PulseService.deletePayment(recordId);
        
        addToast('Registro eliminado', 'info');
    };

    const generateMonthlyBilling = () => {
        if (currentUser?.role !== 'master') return;
        const today = getLocalDate();
        const [year, month] = today.split('-');
        const monthContext = `${year}-${month}`;
        
        const activeStudents = students.filter(s => s.status === 'active');
        const newCharges: TuitionRecord[] = [];

        activeStudents.forEach(student => {
            // Check if already charged for this month
            const exists = records.some(r => r.studentId === student.id && r.month === monthContext && r.category === 'Mensualidad');
            if (exists) return;

            // Use academy settings for billing day, fallback to 10th
            const billingDay = academySettings.paymentSettings.lateFeeDay || 10;
            const dueDate = `${monthContext}-${billingDay.toString().padStart(2, '0')}`;

            const charge: TuitionRecord = {
                id: generateId('bill'),
                academyId: currentUser.academyId,
                studentId: student.id,
                studentName: student.name,
                concept: `Mensualidad ${new Date().toLocaleString('es-ES', { month: 'long' })}`,
                month: monthContext,
                category: 'Mensualidad',
                amount: academySettings.paymentSettings.monthlyTuition,
                originalAmount: academySettings.paymentSettings.monthlyTuition,
                penaltyAmount: 0,
                dueDate: dueDate,
                status: 'pending',
                type: 'charge',
                paymentDate: null,
                proofUrl: null,
                canBePaidInParts: false,
                description: 'Cuota mensual regular'
            };
            newCharges.push(charge);
        });

        if (newCharges.length > 0) {
            setRecords(prev => [...prev, ...newCharges]);
            addToast(`Se generaron ${newCharges.length} cargos de mensualidad.`, 'success');
        } else {
            addToast('No hay cargos pendientes por generar para este mes.', 'info');
        }
    };

    const purgeStudentDebts = (studentId: string) => {
        // Removes all pending debts. Keeps paid history.
        setRecords(prev => prev.filter(r => {
            if (r.studentId === studentId) {
                return r.status === 'paid';
            }
            return true;
        }));
    };

    const getStudentPendingDebts = (studentId: string) => {
        return records.filter(r => r.studentId === studentId && (r.status === 'pending' || r.status === 'overdue' || r.status === 'partial' || r.status === 'charged'));
    };

    const uploadProof = (recordId: string, file: File) => {
        // Wrapper for single upload, uses batch logic internally
        registerBatchPayment([recordId], file, 'Transferencia', 0, []); 
    };

    return (
        <FinanceContext.Provider value={{
            records,
            monthlyRevenueData,
            rollingRevenueData,
            stats,
            isFinanceLoading,
            refreshFinance: loadFinanceData,
            createManualCharge,
            createRecord,
            approvePayment,
            rejectPayment,
            approveBatchPayment,
            rejectBatchPayment,
            registerBatchPayment,
            updateRecordAmount,
            deleteRecord,
            generateMonthlyBilling,
            purgeStudentDebts,
            getStudentPendingDebts,
            uploadProof
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
