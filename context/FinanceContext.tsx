
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TuitionRecord, ManualChargeData, ChargeCategory, Student } from '../types';
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


    // --- CALCULATE STATS (Derived) ---
    useEffect(() => {
        if (isFinanceLoading) return;

        // 1. Calculate Stats
        const pending = records.filter(r => ['pending', 'partial', 'charged'].includes(r.status));
        const overdue = records.filter(r => r.status === 'overdue');
        
        const totalPending = pending.reduce((acc, r) => acc + r.amount, 0);
        const totalOverdue = overdue.reduce((acc, r) => acc + r.amount + r.penaltyAmount, 0);
        
        // Calculate Revenue (Total Paid)
        const totalRevenue = records.reduce((acc, r) => {
            if (r.status === 'paid') return acc + (r.originalAmount || r.amount); // Full amount paid
            if (r.status === 'partial') return acc + ((r.originalAmount || r.amount) - r.amount); // Part paid
            return acc;
        }, 0);

        setStats({
            totalRevenue,
            pendingCollection: totalPending,
            overdueAmount: totalOverdue,
            activeStudents: students.filter(s => s.status === 'active').length
        });

        // Generate Chart Data
        const generateChartData = () => {
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const currentMonthIdx = new Date().getMonth();
            
            // Rolling 6 months
            const rolling = [];
            for (let i = 5; i >= 0; i--) {
                let idx = currentMonthIdx - i;
                if (idx < 0) idx += 12;
                rolling.push({ name: months[idx], total: Math.random() * 5000 + 2000 }); // Mock data for visualization if not computed
            }
            setRollingRevenueData(rolling);

            // Year to Date
            const ytd = months.map(m => ({ name: m, total: Math.random() * 8000 + 3000 }));
            setMonthlyRevenueData(ytd);
        };
        generateChartData();

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
        
        const newRecord: TuitionRecord = {
            id: generateId('chg'),
            academyId: currentUser.academyId,
            studentId: data.studentId,
            studentName: students.find(s => s.id === data.studentId)?.name || 'Estudiante',
            concept: data.title,
            description: data.description,
            amount: data.amount,
            originalAmount: data.amount,
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
                const amountToApply = amountPaid !== undefined ? amountPaid : (r.amount + r.penaltyAmount);
                const totalDebt = r.amount + r.penaltyAmount;
                const remaining = Math.max(0, totalDebt - amountToApply);
                
                // History Update
                const newHistoryItem = {
                    date: new Date().toISOString(),
                    amount: amountToApply,
                    method: r.method || 'System'
                };

                return {
                    ...r,
                    status: remaining < 0.01 ? 'paid' : 'partial',
                    amount: remaining,
                    penaltyAmount: 0, // Penalty usually cleared first or included in debt logic
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
                    status: r.dueDate < getLocalDate() ? 'overdue' : 'pending',
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
            // Sort by due date
            batchRecords.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            
            let available = totalAmountPaid;
            const updatedBatch = batchRecords.map(r => {
                const debt = r.amount + r.penaltyAmount;
                let paid = 0;
                
                // Priority logic: Mandatory vs Partial
                if (!r.canBePaidInParts) {
                    if (available >= debt - 0.01) {
                        paid = debt;
                        available -= debt;
                    }
                } else {
                    if (available > 0) {
                        paid = Math.min(available, debt);
                        available -= paid;
                    }
                }

                const remaining = debt - paid;
                
                const newHistoryItem = {
                    date: new Date().toISOString(),
                    amount: paid,
                    method: r.method || 'Batch'
                };

                if (paid > 0) {
                    return {
                        ...r,
                        status: remaining < 0.01 ? 'paid' : 'partial',
                        amount: remaining,
                        penaltyAmount: 0,
                        paymentHistory: [...(r.paymentHistory || []), newHistoryItem]
                    } as TuitionRecord;
                } else {
                    return {
                        ...r,
                        status: r.dueDate < getLocalDate() ? 'overdue' : 'pending',
                    } as TuitionRecord;
                }
            });

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
                    status: r.dueDate < getLocalDate() ? 'overdue' : 'pending',
                    paymentDate: null,
                    proofUrl: null,
                    batchPaymentId: undefined
                };
            }
            return r;
        }));
        addToast('Lote de pagos rechazado', 'info');
    };

    const updateRecordAmount = (recordId: string, newAmount: number) => {
        setRecords(prev => {
            // 1. Snapshot: Find target to calculate Delta
            const targetRecord = prev.find(r => r.id === recordId);
            if (!targetRecord) return prev;

            // 2. Delta Calculation: Old - New
            // Positive delta means reduction (e.g. 500 - 300 = 200). We subtract 200 from total.
            const delta = targetRecord.amount - newAmount;
            const batchId = targetRecord.batchPaymentId;

            return prev.map(r => {
                // Check if this record is part of the affected group (Target or Batch Sibling)
                const isTarget = r.id === recordId;
                const isBatchSibling = batchId && r.batchPaymentId === batchId;

                // If unrelated, return immediately
                if (!isTarget && !isBatchSibling) return r;

                // Calculate new declared amount if applicable
                // Note: declaredAmount is the Total Transaction Value shared by the batch
                let updatedDeclared = r.declaredAmount;
                if (r.declaredAmount !== undefined) {
                    updatedDeclared = r.declaredAmount - delta;
                }

                // CASE A: The Edited Record
                if (isTarget) {
                    const updatedRecord = { 
                        ...r, 
                        amount: newAmount,
                        originalAmount: newAmount, // Sync original to match new reality
                        declaredAmount: updatedDeclared
                    };

                    // Auto-resolve if amount becomes 0 or negative
                    if (newAmount <= 0) {
                        updatedRecord.status = 'paid';
                        updatedRecord.paymentDate = updatedRecord.paymentDate || new Date().toISOString();
                        updatedRecord.amount = 0; 
                        updatedRecord.penaltyAmount = 0; 
                    } 
                    
                    return updatedRecord;
                }

                // CASE B: Batch Siblings
                // Only update the shared declaredAmount context
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
        setRecords(prev => prev.filter(r => r.id !== recordId));
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
