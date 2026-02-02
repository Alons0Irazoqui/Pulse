
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { TuitionRecord, ManualChargeData, ChargeCategory } from '../types';
import { PulseService } from '../services/pulseService';
import { useAuth } from './AuthContext';
import { useAcademy } from './AcademyContext';
import { useToast } from './ToastContext';

// Helper to generate IDs
const generateId = (prefix: string = 'tx') => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}`;
};

interface FinanceStats {
    totalRevenue: number;
    pendingCollection: number;
    overdueAmount: number;
    activeStudents: number;
}

interface FinanceContextType {
    records: TuitionRecord[];
    stats: FinanceStats;
    monthlyRevenueData: { name: string; total: number }[];
    rollingRevenueData: { name: string; total: number }[];
    isFinanceLoading: boolean;
    refreshFinance: () => void;
    
    createRecord: (record: TuitionRecord) => void;
    createManualCharge: (data: ManualChargeData) => void;
    updateRecordAmount: (id: string, amount: number) => void;
    deleteRecord: (id: string) => void;
    
    approvePayment: (id: string, amount?: number) => void;
    rejectPayment: (id: string) => void;
    
    registerBatchPayment: (recordIds: string[], file: File, method: 'Transferencia' | 'Efectivo', totalAmount: number, details: any[]) => void;
    approveBatchPayment: (batchId: string, amount?: number) => void;
    rejectBatchPayment: (batchId: string) => void;
    
    uploadProof: (recordId: string, file: File) => void;
    
    generateMonthlyBilling: () => void;
    purgeStudentDebts: (studentId: string) => void;
    getStudentPendingDebts: (studentId: string) => TuitionRecord[];
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const { students, academySettings } = useAcademy();
    const { addToast } = useToast();
    
    const [records, setRecords] = useState<TuitionRecord[]>([]);
    const [isFinanceLoading, setIsFinanceLoading] = useState(true);
    
    const [stats, setStats] = useState<FinanceStats>({ totalRevenue: 0, pendingCollection: 0, overdueAmount: 0, activeStudents: 0 });
    const [monthlyRevenueData, setMonthlyRevenueData] = useState<{ name: string; total: number }[]>([]);
    const [rollingRevenueData, setRollingRevenueData] = useState<{ name: string; total: number }[]>([]);

    const refreshFinance = useCallback(() => {
        if (currentUser?.academyId) {
            setIsFinanceLoading(true);
            const data = PulseService.getPayments(currentUser.academyId);
            setRecords(data);
            setIsFinanceLoading(false);
        }
    }, [currentUser]);

    useEffect(() => {
        refreshFinance();
    }, [refreshFinance]);

    // --- CALCULATE STATS (Derived - REAL DATA) ---
    useEffect(() => {
        if (isFinanceLoading) return;

        // 1. Calculate General Stats
        // Updated: Included 'in_review' so pending collection reflects all unpaid amounts until approved/paid.
        const pending = records.filter(r => ['pending', 'partial', 'charged', 'in_review'].includes(r.status));
        const overdue = records.filter(r => r.status === 'overdue');
        
        const totalPending = pending.reduce((acc, r) => acc + r.amount, 0);
        const totalOverdue = overdue.reduce((acc, r) => acc + r.amount + r.penaltyAmount, 0);
        
        const totalRevenue = records.reduce((acc, r) => {
            if (r.status === 'paid') return acc + (r.originalAmount ?? r.amount); 
            if (r.status === 'partial') return acc + ((r.originalAmount ?? r.amount) - r.amount); 
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
            
            const annualTotals = new Array(12).fill(0);

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

            records.forEach(r => {
                if ((r.status === 'paid' || r.status === 'partial') && r.paymentDate) {
                    const pDate = new Date(r.paymentDate);
                    const pYear = pDate.getFullYear();
                    const pMonth = pDate.getMonth();

                    let paidAmount = 0;
                    if (r.status === 'paid') {
                        paidAmount = (r.originalAmount ?? r.amount);
                    } else {
                        paidAmount = (r.originalAmount ?? r.amount) - r.amount;
                    }

                    if (pYear === currentYear) {
                        annualTotals[pMonth] += paidAmount;
                    }

                    const rollingMatch = rollingStats.find(
                        item => item.monthIndex === pMonth && item.year === pYear
                    );
                    if (rollingMatch) {
                        rollingMatch.total += paidAmount;
                    }
                }
            });

            setMonthlyRevenueData(months.map((m, i) => ({ name: m, total: annualTotals[i] })));
            setRollingRevenueData(rollingStats.map(r => ({ name: r.name, total: r.total })));
        };

        generateRealChartData();

    }, [records, isFinanceLoading, students]);

    // --- ACTIONS ---

    const saveAndRefresh = (newRecords: TuitionRecord[]) => {
        PulseService.savePayments(newRecords);
        setRecords(newRecords);
    };

    const createRecord = (record: TuitionRecord) => {
        const newRecords = [...records, record];
        saveAndRefresh(newRecords);
    };

    const createManualCharge = (data: ManualChargeData) => {
        const student = students.find(s => s.id === data.studentId);
        if (!student) return;

        const newRecord: TuitionRecord = {
            id: generateId('chg'),
            academyId: currentUser?.academyId || '',
            studentId: data.studentId,
            studentName: student.name,
            concept: data.title,
            description: data.description,
            category: data.category,
            amount: data.amount,
            originalAmount: data.amount,
            penaltyAmount: 0,
            customPenaltyAmount: data.customPenaltyAmount,
            dueDate: data.dueDate,
            status: 'charged', // Manual charge is 'charged' (pending)
            type: 'charge',
            paymentDate: null,
            proofUrl: null,
            canBePaidInParts: data.canBePaidInParts,
            relatedEventId: data.relatedEventId
        };
        createRecord(newRecord);
        addToast('Cargo generado', 'success');
    };

    const updateRecordAmount = (id: string, amount: number) => {
        const newRecords = records.map(r => r.id === id ? { ...r, amount, originalAmount: amount } : r);
        saveAndRefresh(newRecords);
    };

    const deleteRecord = (id: string) => {
        PulseService.deletePayment(id);
        setRecords(prev => prev.filter(r => r.id !== id));
        addToast('Registro eliminado', 'success');
    };

    const approvePayment = (id: string, amount?: number) => {
        const newRecords = records.map(r => {
            if (r.id === id) {
                // If amount specified is less than total debt, it's partial
                const totalDebt = r.amount + r.penaltyAmount;
                const paidAmount = amount !== undefined ? amount : totalDebt;
                
                if (paidAmount < totalDebt - 0.01) {
                    // Partial Payment
                    const newAmount = totalDebt - paidAmount;
                    return {
                        ...r,
                        status: 'partial' as const,
                        amount: newAmount, // Update remaining amount
                        penaltyAmount: 0,
                        paymentDate: new Date().toISOString(),
                        paymentHistory: [...(r.paymentHistory || []), { date: new Date().toISOString(), amount: paidAmount, method: r.method }]
                    };
                } else {
                    // Full Payment
                    return { 
                        ...r, 
                        status: 'paid' as const, 
                        amount: 0,
                        penaltyAmount: 0,
                        paymentDate: new Date().toISOString(),
                        paymentHistory: [...(r.paymentHistory || []), { date: new Date().toISOString(), amount: paidAmount, method: r.method }]
                    };
                }
            }
            return r;
        });
        saveAndRefresh(newRecords);
        addToast('Pago aprobado', 'success');
    };

    const rejectPayment = (id: string) => {
        const newRecords = records.map(r => r.id === id ? { ...r, status: 'pending' as const, proofUrl: null } : r);
        saveAndRefresh(newRecords);
        addToast('Pago rechazado', 'info');
    };

    const registerBatchPayment = (recordIds: string[], file: File, method: 'Transferencia' | 'Efectivo', totalAmount: number, details: any[]) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const proofUrl = method === 'Transferencia' ? (reader.result as string) : null;
            const batchId = generateId('batch');
            const now = new Date().toISOString();

            const newRecords = records.map(r => {
                if (recordIds.includes(r.id)) {
                    return {
                        ...r,
                        status: 'in_review' as const,
                        proofUrl,
                        proofType: file?.type,
                        method,
                        batchPaymentId: batchId,
                        paymentDate: now,
                        declaredAmount: totalAmount
                    };
                }
                return r;
            });
            saveAndRefresh(newRecords);
            addToast('Pago registrado para revisión', 'success');
        };
        
        if (file) {
            reader.readAsDataURL(file);
        } else {
            reader.onloadend!({} as any);
        }
    };

    const approveBatchPayment = (batchId: string, amount?: number) => {
        const newRecords = records.map(r => {
            if (r.batchPaymentId === batchId) {
                return { 
                    ...r, 
                    status: 'paid' as const, 
                    paymentDate: new Date().toISOString(),
                    amount: 0,
                    penaltyAmount: 0,
                    paymentHistory: [...(r.paymentHistory || []), { date: new Date().toISOString(), amount: r.amount + r.penaltyAmount, method: r.method }] 
                };
            }
            return r;
        });
        saveAndRefresh(newRecords);
        addToast('Lote de pagos aprobado', 'success');
    };

    const rejectBatchPayment = (batchId: string) => {
        const newRecords = records.map(r => {
            if (r.batchPaymentId === batchId) {
                return { ...r, status: 'pending' as const, proofUrl: null, batchPaymentId: undefined };
            }
            return r;
        });
        saveAndRefresh(newRecords);
        addToast('Lote rechazado', 'info');
    };

    const uploadProof = (recordId: string, file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const newRecords = records.map(r => r.id === recordId ? { 
                ...r, 
                status: 'in_review' as const, 
                proofUrl: reader.result as string, 
                proofType: file.type,
                paymentDate: new Date().toISOString() 
            } : r);
            saveAndRefresh(newRecords);
            addToast('Comprobante subido', 'success');
        };
        reader.readAsDataURL(file);
    };

    const generateMonthlyBilling = () => {
        const activeStudents = students.filter(s => s.status === 'active' || s.status === 'debtor');
        const month = new Date().toLocaleString('es-ES', { month: 'long' });
        const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);
        const year = new Date().getFullYear();
        const monthKey = `${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
        
        const billingDay = academySettings.paymentSettings.billingDay || 1;
        const dueDate = `${year}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(billingDay).padStart(2, '0')}`;

        const newCharges: TuitionRecord[] = [];

        activeStudents.forEach(s => {
            const exists = records.some(r => r.studentId === s.id && r.category === 'Mensualidad' && r.month === monthKey);
            if (!exists) {
                newCharges.push({
                    id: generateId('auto'),
                    academyId: currentUser?.academyId || '',
                    studentId: s.id,
                    studentName: s.name,
                    concept: `Mensualidad ${capitalizedMonth}`,
                    description: `Cuota correspondiente a ${capitalizedMonth} ${year}`,
                    category: 'Mensualidad',
                    amount: academySettings.paymentSettings.monthlyTuition,
                    originalAmount: academySettings.paymentSettings.monthlyTuition,
                    penaltyAmount: 0,
                    dueDate: dueDate,
                    month: monthKey,
                    status: 'charged',
                    type: 'charge',
                    paymentDate: null,
                    proofUrl: null,
                    canBePaidInParts: false
                });
            }
        });

        if (newCharges.length > 0) {
            const updated = [...records, ...newCharges];
            saveAndRefresh(updated);
            addToast(`Se generaron ${newCharges.length} cargos de mensualidad.`, 'success');
        } else {
            addToast('Todos los alumnos activos ya tienen su cargo del mes.', 'info');
        }
    };

    const purgeStudentDebts = (studentId: string) => {
        const newRecords = records.filter(r => r.studentId !== studentId || r.status === 'paid');
        saveAndRefresh(newRecords);
    };

    const getStudentPendingDebts = (studentId: string) => {
        return records.filter(r => r.studentId === studentId && (r.status === 'pending' || r.status === 'overdue' || r.status === 'partial' || r.status === 'charged'));
    };

    return (
        <FinanceContext.Provider value={{
            records, stats, monthlyRevenueData, rollingRevenueData, isFinanceLoading, refreshFinance,
            createRecord, createManualCharge, updateRecordAmount, deleteRecord,
            approvePayment, rejectPayment, registerBatchPayment, approveBatchPayment, rejectBatchPayment,
            uploadProof, generateMonthlyBilling, purgeStudentDebts, getStudentPendingDebts
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) throw new Error('useFinance must be used within a FinanceProvider');
    return context;
};
