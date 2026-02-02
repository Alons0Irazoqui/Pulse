
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
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
    createRecord: (record: TuitionRecord) => void; 
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
    uploadProof: (recordId: string, file: File) => void; 
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const { academySettings, students, batchUpdateStudents } = useAcademy(); 
    const { addToast } = useToast();

    // --- SAFETY REFS ---
    // Prevent infinite loops in useEffects
    const batchUpdateRef = useRef(batchUpdateStudents);
    const billingCycleRef = useRef(false);

    useEffect(() => {
        batchUpdateRef.current = batchUpdateStudents;
    }, [batchUpdateStudents]);

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

    // --- AUTOMATION: MONTHLY BILLING CRON JOB ---
    useEffect(() => {
        // Guard Clauses
        if (isFinanceLoading || !currentUser || currentUser.role !== 'master' || billingCycleRef.current) return;
        if (students.length === 0) return; // Wait for student list to populate

        const runAutomatedBilling = () => {
            const today = new Date();
            const currentDay = today.getDate();
            const billingDay = academySettings.paymentSettings.billingDay;

            // Trigger Condition: Is it billing day or later?
            if (currentDay >= billingDay) {
                // Execute Billing Logic via shared function (silent mode)
                const createdCount = runBillingCycle(true);
                if (createdCount > 0) {
                    addToast(`Facturación automática: ${createdCount} cargos generados.`, 'info');
                }
            }
            // Mark as run to prevent re-execution in this session
            billingCycleRef.current = true;
        };

        runAutomatedBilling();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFinanceLoading, students, records, academySettings, currentUser]); // Dependencies trigger check when data is ready


    // --- SYNC ENGINE: OVERDUE CHECK, DEBT CALCULATION & EXAM READINESS ---
    useEffect(() => {
        if (isFinanceLoading || students.length === 0) return;

        // 1. Check Overdue Status (Run once on records update)
        const today = getLocalDate(); // YYYY-MM-DD
        let recordsUpdated = false;
        
        const processedRecords = records.map(r => {
            // Check 'pending' (auto) and 'charged' (manual) records for expiration
            if ((r.status === 'pending' || r.status === 'charged') && r.dueDate < today) {
                recordsUpdated = true;
                
                // --- CUSTOM PENALTY LOGIC ---
                // If the record has a specific custom penalty, use it.
                // Otherwise, fall back to the global academy setting.
                const penalty = (r.customPenaltyAmount !== undefined && r.customPenaltyAmount > 0)
                    ? r.customPenaltyAmount
                    : (academySettings.paymentSettings?.lateFeeAmount || 0);

                return { ...r, status: 'overdue', penaltyAmount: penalty } as TuitionRecord;
            }
            return r;
        });

        if (recordsUpdated) {
            setRecords(processedRecords);
            // We return here to let the state update trigger the next pass for student balances
            return; 
        }

        // 2. Calculate Student Balances & Update Status Logic
        const studentsToUpdate: Student[] = [];
        
        students.forEach(student => {
            // A. Calculate Debt
            const studentRecords = records.filter(r => r.studentId === student.id);
            const debt = studentRecords.reduce((acc, r) => {
                if (['pending', 'overdue', 'partial', 'charged'].includes(r.status)) {
                    return acc + r.amount + r.penaltyAmount;
                }
                return acc;
            }, 0);

            // B. Calculate Exam Readiness
            const currentRank = academySettings.ranks.find(r => r.id === student.rankId);
            const requiredAttendance = currentRank ? currentRank.requiredAttendance : 9999;
            const isAcademicReady = student.attendance >= requiredAttendance;
            const hasDebt = debt > 0.01;

            let newStatus = student.status;

            // C. Determine Status (Priority Logic)
            if (student.status !== 'inactive') {
                if (isAcademicReady) {
                    newStatus = 'exam_ready';
                } else {
                    if (hasDebt) {
                        newStatus = 'debtor';
                    } else {
                        newStatus = 'active';
                    }
                }
            }

            // Detect if update is needed
            const currentBalance = student.balance || 0;
            if (Math.abs(currentBalance - debt) > 0.01 || student.status !== newStatus) {
                studentsToUpdate.push({ ...student, balance: debt, status: newStatus });
            }
        });

        if (studentsToUpdate.length > 0) {
            // SAFE CALL using Ref to prevent loop
            batchUpdateRef.current(studentsToUpdate);
        }

    }, [records, students, isFinanceLoading, academySettings]); 


    // --- CALCULATE STATS (Derived - REAL DATA) ---
    useEffect(() => {
        if (isFinanceLoading) return;

        // 1. Calculate General Stats
        const pending = records.filter(r => ['pending', 'partial', 'charged'].includes(r.status));
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

    // --- PERSISTENCE ---
    useEffect(() => {
        if (currentUser && !isFinanceLoading) {
            PulseService.savePayments(records);
        }
    }, [records, currentUser, isFinanceLoading]);


    // --- CORE LOGIC: BILLING GENERATOR ---
    const runBillingCycle = (silent: boolean = false): number => {
        if (!currentUser?.academyId) return 0;

        const todayStr = getLocalDate(); // YYYY-MM-DD based on local time
        const [year, month] = todayStr.split('-');
        const monthContext = `${year}-${month}`; // YYYY-MM
        const monthName = new Date().toLocaleString('es-ES', { month: 'long' });
        
        const activeStudents = students.filter(s => s.status === 'active');
        const newCharges: TuitionRecord[] = [];

        // Calculation of Due Date based on Late Fee Day Setting
        // Format: YYYY-MM-{lateFeeDay}
        const lateFeeDayConfig = academySettings.paymentSettings.lateFeeDay || 10;
        const dueDayFixed = lateFeeDayConfig.toString().padStart(2, '0');
        const computedDueDate = `${year}-${month}-${dueDayFixed}`;

        activeStudents.forEach(student => {
            // Duplicate Check: Check for existing monthly charge for this student in this month context
            const exists = records.some(r => 
                r.studentId === student.id && 
                r.category === 'Mensualidad' && 
                r.month === monthContext
            );
            
            if (exists) return;

            const charge: TuitionRecord = {
                id: generateId('bill'),
                academyId: currentUser.academyId,
                studentId: student.id,
                studentName: student.name,
                concept: `Mensualidad ${monthName.charAt(0).toUpperCase() + monthName.slice(1)}`,
                month: monthContext,
                category: 'Mensualidad',
                amount: academySettings.paymentSettings.monthlyTuition,
                originalAmount: academySettings.paymentSettings.monthlyTuition,
                penaltyAmount: 0, // Starts at 0. Sync engine applies penalty if dueDate passes.
                dueDate: computedDueDate,
                status: 'pending',
                type: 'charge',
                paymentDate: null,
                proofUrl: null,
                canBePaidInParts: false,
                description: 'Cuota mensual generada automáticamente'
            };
            newCharges.push(charge);
        });

        if (newCharges.length > 0) {
            setRecords(prev => [...prev, ...newCharges]);
        }

        return newCharges.length;
    };


    // --- ACTIONS ---

    const createManualCharge = (data: ManualChargeData) => {
        if (currentUser?.role !== 'master') return;
        const finalAmount = Number(data.amount);
        const newRecord: TuitionRecord = {
            id: generateId('chg'),
            academyId: currentUser.academyId,
            studentId: data.studentId,
            studentName: students.find(s => s.id === data.studentId)?.name || 'Estudiante',
            concept: data.title,
            description: data.description,
            amount: finalAmount, 
            originalAmount: finalAmount, 
            penaltyAmount: 0, 
            dueDate: data.dueDate,
            paymentDate: null,
            status: 'charged',
            type: 'charge',
            category: data.category,
            method: 'System',
            proofUrl: null,
            canBePaidInParts: data.canBePaidInParts,
            relatedEventId: data.relatedEventId,
            customPenaltyAmount: data.customPenaltyAmount || 0 // Save custom penalty
        };
        setRecords(prev => [...prev, newRecord]);
        addToast('Cargo generado exitosamente', 'success');
    };

    const createRecord = (record: TuitionRecord) => {
        setRecords(prev => [...prev, record]);
    };

    const registerBatchPayment = (
        recordIds: string[], 
        file: File | null, 
        method: 'Transferencia' | 'Efectivo',
        totalAmount: number,
        details: { description: string; amount: number }[]
    ) => {
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
                    declaredAmount: totalAmount,
                    details: details 
                };
            }
            return r;
        }));
        addToast('Pago registrado y enviado a revisión', 'success');
    };

    const approvePayment = (recordId: string, amountPaid?: number) => {
        setRecords(prev => prev.map(r => {
            if (r.id === recordId) {
                const currentPenalty = r.penaltyAmount || 0;
                const totalDebt = r.amount + currentPenalty;
                const amountToApply = amountPaid !== undefined ? amountPaid : totalDebt;
                const remaining = Math.max(0, totalDebt - amountToApply);
                const isPaidFull = remaining < 0.01;

                const newHistoryItem = {
                    date: new Date().toISOString(),
                    amount: amountToApply,
                    method: r.method || 'System'
                };

                return {
                    ...r,
                    status: isPaidFull ? 'paid' : 'partial',
                    amount: isPaidFull ? 0 : remaining,
                    originalAmount: isPaidFull ? (r.originalAmount ?? r.amount) + currentPenalty : (r.originalAmount ?? r.amount),
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
            batchRecords.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            
            let available = totalAmountPaid;
            
            const updatedBatch = batchRecords.map(r => {
                const currentPenalty = r.penaltyAmount || 0;
                const totalDebt = r.amount + currentPenalty;
                let paid = 0;
                
                if (!r.canBePaidInParts) {
                    if (available >= totalDebt - 0.01) {
                        paid = totalDebt;
                        available -= totalDebt;
                    }
                } else {
                    if (available > 0) {
                        paid = Math.min(available, totalDebt);
                        available -= paid;
                    }
                }

                const remaining = Math.max(0, totalDebt - paid);
                const isPaidFull = remaining < 0.01;
                
                if (paid > 0) {
                    const newHistoryItem = {
                        date: new Date().toISOString(),
                        amount: paid,
                        method: r.method || 'Batch'
                    };

                    return {
                        ...r,
                        status: isPaidFull ? 'paid' : 'partial',
                        amount: isPaidFull ? 0 : remaining,
                        originalAmount: isPaidFull ? (r.originalAmount ?? r.amount) + currentPenalty : (r.originalAmount ?? r.amount),
                        penaltyAmount: 0, 
                        paymentHistory: [...(r.paymentHistory || []), newHistoryItem]
                    } as TuitionRecord;
                } 
                
                if (paid === 0) {
                     return {
                        ...r,
                        status: (r.dueDate < getLocalDate() ? 'overdue' : 'pending') as TuitionStatus,
                    };
                }

                return r;
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

            const currentTotal = targetRecord.amount + (targetRecord.penaltyAmount || 0);
            const delta = currentTotal - newTotal;
            const batchId = targetRecord.batchPaymentId;

            return prev.map(r => {
                const isTarget = r.id === recordId;
                const isBatchSibling = batchId && r.batchPaymentId === batchId;

                if (!isTarget && !isBatchSibling) return r;

                let updatedDeclared = r.declaredAmount;
                if (r.declaredAmount !== undefined) {
                    updatedDeclared = r.declaredAmount - delta;
                }

                if (isTarget) {
                    const updatedRecord = { 
                        ...r, 
                        amount: newTotal,
                        penaltyAmount: 0, 
                        originalAmount: newTotal, 
                        declaredAmount: updatedDeclared
                    };

                    if (newTotal <= 0) {
                        updatedRecord.status = 'paid';
                        updatedRecord.paymentDate = updatedRecord.paymentDate || new Date().toISOString();
                        updatedRecord.amount = 0; 
                        updatedRecord.penaltyAmount = 0; 
                    } 
                    return updatedRecord;
                }

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
        PulseService.deletePayment(recordId);
        addToast('Registro eliminado', 'info');
    };

    // MANUAL TRIGGER (Uses the same logic as automation)
    const generateMonthlyBilling = () => {
        if (currentUser?.role !== 'master') return;
        const createdCount = runBillingCycle(false);
        
        if (createdCount > 0) {
            addToast(`Se generaron ${createdCount} cargos de mensualidad.`, 'success');
        } else {
            addToast('No hay cargos pendientes por generar para este mes.', 'info');
        }
    };

    const purgeStudentDebts = (studentId: string) => {
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
