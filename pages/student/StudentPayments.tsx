
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { TuitionRecord } from '../../types';
import { generateReceipt } from '../../utils/pdfGenerator';
import { formatDateDisplay } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';

// Fix for type errors with motion components
const MotionDiv = motion.div as any;

// --- SUB-COMPONENTS ---

const StatusBadge: React.FC<{ status: TuitionRecord['status'] }> = ({ status }) => {
    switch (status) {
        case 'paid':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 tracking-wider uppercase">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    PAGADO
                </span>
            );
        case 'in_review':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wider uppercase">
                    <span className="material-symbols-outlined text-[12px]">hourglass_top</span>
                    REVISIÓN
                </span>
            );
        case 'overdue':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 tracking-wider uppercase animate-pulse">
                    <span className="material-symbols-outlined text-[12px]">warning</span>
                    VENCIDO
                </span>
            );
        case 'partial':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 tracking-wider uppercase">
                    <span className="material-symbols-outlined text-[12px]">pie_chart</span>
                    RESTANTE
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/5 text-gray-400 border border-white/10 tracking-wider uppercase">
                    <span className="material-symbols-outlined text-[12px]">pending</span>
                    POR PAGAR
                </span>
            );
    }
};

interface PaymentModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: (recordIds: string[], file: File | null, method: 'Transferencia' | 'Efectivo', totalAmount: number) => void;
    preSelectedRecord: TuitionRecord | null;
    pendingDebts: TuitionRecord[];
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, onConfirm, preSelectedRecord, pendingDebts }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { addToast } = useToast();
    
    // -- STATE --
    const [method, setMethod] = useState<'Transferencia' | 'Efectivo'>('Transferencia');
    const [file, setFile] = useState<File | null>(null);
    
    // Batch Logic
    const [selectedDebts, setSelectedDebts] = useState<TuitionRecord[]>([]);
    
    // Amount Logic
    const [isPartialEnabled, setIsPartialEnabled] = useState(false);
    const [customAmount, setCustomAmount] = useState<string>('');

    // Determine Mode
    const isSinglePaymentMode = !!preSelectedRecord;

    // -- INITIALIZATION --
    useEffect(() => {
        if (isOpen) {
            setFile(null);
            setMethod('Transferencia');
            setIsPartialEnabled(false);
            setCustomAmount('');
            
            if (preSelectedRecord) {
                setSelectedDebts([preSelectedRecord]);
            } else {
                setSelectedDebts([]);
            }
        }
    }, [isOpen, preSelectedRecord]);

    // -- DERIVED VALUES (THE BRAINS) --
    
    // 1. Calculate Totals
    const totalDebtSum = useMemo(() => {
        return selectedDebts.reduce((sum, d) => sum + d.amount + d.penaltyAmount, 0);
    }, [selectedDebts]);

    const mandatorySum = useMemo(() => {
        return selectedDebts
            .filter(d => !d.canBePaidInParts)
            .reduce((sum, d) => sum + d.amount + d.penaltyAmount, 0);
    }, [selectedDebts]);

    // 2. Logic Flags
    const canCustomizeAmount = useMemo(() => {
        // Can only customize if at least one item allows partial payments
        return selectedDebts.some(d => d.canBePaidInParts);
    }, [selectedDebts]);

    const finalAmount = isPartialEnabled && customAmount ? parseFloat(customAmount) : totalDebtSum;
    
    // VALIDATION LOGIC UPDATE:
    // 1. Must cover mandatory items
    // 2. Must NOT exceed total debt (Overpayment check)
    const isAmountValid = useMemo(() => {
        if (!isPartialEnabled) return true;
        // Allow slight float margin errors
        return finalAmount >= mandatorySum - 0.01 && finalAmount <= totalDebtSum + 0.01;
    }, [finalAmount, mandatorySum, totalDebtSum, isPartialEnabled]);

    // 3. Available Options for Selector (Exclude already selected)
    const availableOptions = useMemo(() => {
        return pendingDebts.filter(d => !selectedDebts.find(s => s.id === d.id));
    }, [pendingDebts, selectedDebts]);

    // -- HANDLERS --

    const handlePartialToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsPartialEnabled(checked);
        if (checked) {
            setCustomAmount(totalDebtSum.toFixed(2));
        } else {
            setCustomAmount('');
        }
    };

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        if (!id) return;
        
        const debt = pendingDebts.find(d => d.id === id);
        if (debt) {
            setSelectedDebts(prev => [...prev, debt]);
            setIsPartialEnabled(false); 
            setCustomAmount('');
        }
        e.target.value = "";
    };

    const handleRemoveDebt = (id: string) => {
        if (isSinglePaymentMode) return; 
        setSelectedDebts(prev => prev.filter(d => d.id !== id));
        setIsPartialEnabled(false);
        setCustomAmount('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = () => {
        if (selectedDebts.length === 0) return;
        if (method === 'Transferencia' && !file) return;
        if (!isAmountValid) {
            if (finalAmount > totalDebtSum) {
                addToast('El monto no puede ser mayor a la deuda total.', 'error');
            } else {
                addToast(`El monto mínimo a cubrir es $${mandatorySum.toFixed(2)}`, 'error');
            }
            return;
        }

        const ids = selectedDebts.map(d => d.id);
        onConfirm(ids, file, method, finalAmount);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background-paper rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/10" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 pb-4 border-b border-white/10 flex justify-between items-start shrink-0 bg-[#18181b]">
                    <div>
                        <h3 className="text-2xl font-black text-white">Reportar Pago</h3>
                        <p className="text-sm text-text-secondary mt-1">
                            {isSinglePaymentMode ? 'Confirma el pago de este concepto.' : 'Construye tu lista de pagos.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex flex-col gap-6 bg-background-paper">
                    
                    {/* 1. DEBT SELECTOR (SHOPPING CART STYLE) */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Conceptos a Pagar</label>
                        
                        {!isSinglePaymentMode && (
                            <div className="flex flex-col gap-2 mb-3">
                                <div className="relative">
                                    <select 
                                        defaultValue=""
                                        onChange={handleSelectChange}
                                        className="w-full rounded-xl border border-white/10 bg-[#09090b] py-3 px-4 text-sm font-bold text-white focus:border-primary focus:ring-1 focus:ring-primary transition-all appearance-none"
                                    >
                                        <option value="" disabled>+ Selecciona para agregar...</option>
                                        {availableOptions.map(debt => (
                                            <option key={debt.id} value={debt.id}>
                                                {debt.concept} - ${debt.amount + debt.penaltyAmount}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-3.5 pointer-events-none text-gray-400">
                                        <span className="material-symbols-outlined text-lg">add_circle</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Selected Items List (Basket) */}
                        <div className="flex flex-col gap-2">
                            <AnimatePresence>
                                {selectedDebts.map(debt => (
                                    <MotionDiv 
                                        key={debt.id}
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex items-center justify-between p-3 bg-background-subtle border border-white/5 rounded-xl group"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`size-8 rounded-full flex items-center justify-center shrink-0 ${debt.canBePaidInParts ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>
                                                <span className="material-symbols-outlined text-sm">
                                                    {debt.canBePaidInParts ? 'payments' : 'lock'}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-white truncate">{debt.concept}</p>
                                                <p className="text-[10px] text-text-secondary">
                                                    {debt.canBePaidInParts ? 'Permite Abonos' : 'Pago Exacto Requerido'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-sm text-white">${(debt.amount + debt.penaltyAmount).toFixed(2)}</span>
                                            {!isSinglePaymentMode && (
                                                <button 
                                                    onClick={() => handleRemoveDebt(debt.id)}
                                                    className="text-gray-500 hover:text-red-400 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    </MotionDiv>
                                ))}
                            </AnimatePresence>
                            
                            {selectedDebts.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed border-white/10 rounded-xl text-gray-500 text-sm">
                                    No has seleccionado conceptos
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. TOTALS & CUSTOM AMOUNT */}
                    <div className="space-y-4 pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={isPartialEnabled}
                                    onChange={handlePartialToggle}
                                    disabled={!canCustomizeAmount || selectedDebts.length === 0}
                                    className="size-5 rounded border-gray-600 bg-background-subtle text-primary focus:ring-primary disabled:opacity-50 cursor-pointer"
                                />
                                <span className={`text-sm font-bold ${!canCustomizeAmount ? 'text-gray-500' : 'text-white'}`}>
                                    ¿Deseas abonar una cantidad diferente?
                                </span>
                            </label>
                        </div>

                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-gray-500 font-bold text-lg">$</span>
                            <input 
                                type="number" 
                                value={isPartialEnabled ? customAmount : totalDebtSum.toFixed(2)}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                disabled={!isPartialEnabled}
                                className={`w-full rounded-xl border py-3 pl-8 pr-4 text-xl font-black text-white focus:ring-1 transition-all ${
                                    !isPartialEnabled 
                                    ? 'bg-[#09090b] border-white/5 text-gray-500 cursor-not-allowed' 
                                    : isAmountValid 
                                        ? 'bg-[#09090b] border-primary focus:border-primary' 
                                        : 'bg-red-900/10 border-red-500/50 focus:border-red-500 text-red-400'
                                }`}
                                placeholder="0.00"
                            />
                            {!isPartialEnabled && (
                                <span className="absolute right-4 top-4 text-xs font-bold text-orange-400 flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">lock</span> Total Exacto
                                </span>
                            )}
                        </div>

                        {!isAmountValid && isPartialEnabled && (
                            <div className="flex items-center gap-2 text-xs text-red-400 font-bold bg-red-500/10 p-3 rounded-lg border border-red-500/20 animate-in slide-in-from-top-1">
                                <span className="material-symbols-outlined text-sm">error</span>
                                {finalAmount > totalDebtSum 
                                    ? `El monto no puede ser mayor al total de $${totalDebtSum.toFixed(2)}`
                                    : `Debes cubrir al menos $${mandatorySum.toFixed(2)} de los conceptos obligatorios.`
                                }
                            </div>
                        )}
                    </div>

                    {/* 3. PROOF UPLOAD OR METHOD */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider">Método de Pago</label>
                        <div className="flex p-1 bg-background-subtle rounded-xl mb-3 border border-white/5">
                            <button 
                                onClick={() => setMethod('Transferencia')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${method === 'Transferencia' ? 'bg-background-paper text-primary shadow-sm border border-white/10' : 'text-gray-500 hover:text-white'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">account_balance</span>
                                Transferencia
                            </button>
                            <button 
                                onClick={() => setMethod('Efectivo')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${method === 'Efectivo' ? 'bg-background-paper text-green-400 shadow-sm border border-white/10' : 'text-gray-500 hover:text-white'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">payments</span>
                                Efectivo
                            </button>
                        </div>

                        {method === 'Transferencia' ? (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${file ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 hover:border-primary hover:bg-primary/5'}`}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden" 
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                />
                                {file ? (
                                    <div className="flex flex-col items-center animate-in zoom-in">
                                        <span className="material-symbols-outlined text-3xl text-green-400 mb-1">check_circle</span>
                                        <p className="text-xs font-bold text-green-200 break-all">{file.name}</p>
                                        <p className="text-[10px] text-green-400 mt-0.5">Clic para cambiar</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400">
                                        <span className="material-symbols-outlined text-3xl mb-1">cloud_upload</span>
                                        <p className="text-xs font-bold uppercase tracking-wide">Subir Comprobante</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-4 flex gap-3 items-center">
                                <span className="material-symbols-outlined text-green-400 text-2xl">storefront</span>
                                <p className="text-xs text-green-200 font-medium">
                                    Notifica tu pago ahora y acude a recepción para liquidar.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-white/10 bg-[#18181b] flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-3.5 rounded-xl border border-white/10 font-bold text-gray-400 hover:bg-white/5 hover:text-white transition-colors">Cancelar</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={selectedDebts.length === 0 || (method === 'Transferencia' && !file) || !isAmountValid}
                        className="flex-[2] py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                        {method === 'Efectivo' ? 'Notificar Pago' : 'Enviar Comprobante'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const StudentPayments: React.FC = () => {
  const { currentUser, records, academySettings, getStudentPendingDebts, registerBatchPayment } = useStore();
  const { addToast } = useToast();
  
  const [selectedRecord, setSelectedRecord] = useState<TuitionRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter only my records for display
  const myRecords = useMemo(() => {
      return records
        .filter(r => r.studentId === currentUser?.studentId)
        .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
  }, [records, currentUser]);

  // Data for Select (Pending Debts Only)
  const pendingDebts = useMemo(() => {
      return currentUser?.studentId ? getStudentPendingDebts(currentUser.studentId) : [];
  }, [records, currentUser]);

  // Grouping for UI Lists
  const activeRecords = myRecords.filter(r => ['pending', 'overdue', 'charged', 'partial'].includes(r.status));
  const inReviewRecords = myRecords.filter(r => r.status === 'in_review');
  const historyRecords = myRecords.filter(r => r.status === 'paid');

  // Calculate Total Debt
  const totalDebt = activeRecords.reduce((acc, r) => {
      const currentAmount = r.status === 'overdue' ? r.amount + r.penaltyAmount : r.amount;
      return acc + currentAmount;
  }, 0);

  // Bank Info
  const bankInfo = academySettings.bankDetails;

  const handleOpenPaymentModal = (record?: TuitionRecord) => {
      setSelectedRecord(record || null);
      setIsModalOpen(true);
  };

  const handleConfirmPayment = (recordIds: string[], file: File | null, method: 'Transferencia' | 'Efectivo', totalAmount: number) => {
      if (!file && method === 'Transferencia') return;

      const fileToSend = file || new File([""], "pago_efectivo.txt", { type: "text/plain" });
      registerBatchPayment(recordIds, fileToSend, method, totalAmount);
      
      setIsModalOpen(false);
      setSelectedRecord(null);
  };

  const handleDownloadReceipt = (record: TuitionRecord) => {
      generateReceipt(record, academySettings, currentUser);
  };

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-10 w-full min-h-full flex flex-col gap-8 pb-24 text-white">
      
      {/* Header & Balance */}
      <header className="flex flex-wrap md:flex-nowrap justify-between items-start md:items-end gap-6 bg-background-paper p-6 md:p-8 rounded-[2rem] shadow-sm border border-white/5 relative overflow-hidden">
          <div className="relative z-10 w-full md:w-auto md:max-w-xl">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">Mis Pagos</h1>
            <p className="text-text-secondary mt-1 text-sm md:text-base leading-relaxed">
                Mantén tus cuotas al día para evitar recargos y asegurar tu acceso a clases y exámenes.
            </p>
          </div>
          
          <div className="flex flex-col items-end relative z-10 min-w-[140px] ml-auto">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Deuda Exigible</span>
            <div className={`text-3xl md:text-4xl font-black ${totalDebt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                ${totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            {totalDebt > 0 ? (
                <span className="text-xs font-medium text-red-400 mt-1 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">Pendiente de pago</span>
            ) : (
                <span className="text-xs font-medium text-green-400 mt-1 bg-green-500/10 px-2 py-0.5 rounded flex items-center gap-1 border border-green-500/20">
                    <span className="material-symbols-outlined text-[14px]">check</span> Al corriente
                </span>
            )}
          </div>

          {/* Decor */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-background-subtle rounded-full blur-3xl -z-0 translate-x-1/3 -translate-y-1/3 pointer-events-none opacity-50"></div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT COL: PAYMENTS LIST */}
          <div className="lg:col-span-2 flex flex-col gap-8">
              
              {/* --- ACTIVE DEBTS SECTION --- */}
              <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center px-1">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <span className="material-symbols-outlined text-orange-500">payments</span>
                          Por Pagar
                      </h3>
                  </div>
                  
                  {activeRecords.length === 0 && inReviewRecords.length === 0 ? (
                      <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-8 text-center">
                          <div className="size-16 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                              <span className="material-symbols-outlined text-3xl">celebration</span>
                          </div>
                          <h4 className="font-bold text-green-400 text-lg">¡Estás al día!</h4>
                          <p className="text-green-600/80 text-sm">No tienes pagos pendientes en este momento.</p>
                      </div>
                  ) : (
                      <div className="flex flex-col gap-4">
                          {/* Render Active (Pending/Overdue/Partial) */}
                          <AnimatePresence>
                              {activeRecords.map((record) => {
                                  const isOverdue = record.status === 'overdue';
                                  const amountDisplay = isOverdue ? record.amount + record.penaltyAmount : record.amount;

                                  return (
                                      <MotionDiv 
                                          key={record.id}
                                          layout
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.95 }}
                                          className={`bg-background-paper rounded-2xl p-6 shadow-card border-l-4 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center transition-all border-y border-r border-y-white/5 border-r-white/5 ${
                                              isOverdue ? 'border-l-red-500' : 
                                              record.status === 'partial' ? 'border-l-orange-500' :
                                              'border-l-gray-600'
                                          }`}
                                      >
                                          <div className="flex-1 w-full">
                                              <div className="flex justify-between items-start mb-2">
                                                  <StatusBadge status={record.status} />
                                                  <span className="text-xs text-text-secondary font-mono">Vence: {formatDateDisplay(record.dueDate)}</span>
                                              </div>
                                              <h4 className="text-lg font-bold text-white">{record.concept}</h4>
                                              {isOverdue && (
                                                  <p className="text-xs text-red-400 font-bold mt-1 flex items-center gap-1">
                                                      <span className="material-symbols-outlined text-[14px]">error</span>
                                                      Incluye recargo de ${record.penaltyAmount}
                                                  </p>
                                              )}
                                              {record.status === 'partial' && (
                                                  <p className="text-xs text-orange-400 font-bold mt-1 flex items-center gap-1">
                                                      <span className="material-symbols-outlined text-[14px]">pie_chart</span>
                                                      Deuda restante (Abono aplicado)
                                                  </p>
                                              )}
                                          </div>

                                          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                                              <div className="text-right">
                                                  <span className="block text-[10px] text-text-secondary uppercase tracking-wider font-bold">Total</span>
                                                  <span className={`text-2xl font-black ${isOverdue ? 'text-red-500' : 'text-white'}`}>
                                                      ${amountDisplay.toFixed(2)}
                                                  </span>
                                              </div>
                                              <button 
                                                  onClick={() => handleOpenPaymentModal(record)}
                                                  className="bg-white text-black hover:bg-gray-200 px-5 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap"
                                              >
                                                  <span className="material-symbols-outlined text-[20px]">upload_file</span>
                                                  <span className="hidden sm:inline">Pagar</span>
                                              </button>
                                          </div>
                                      </MotionDiv>
                                  );
                              })}
                          </AnimatePresence>

                          {/* Render In Review */}
                          {inReviewRecords.map((record) => (
                              <MotionDiv 
                                  key={record.id}
                                  layout
                                  className="bg-background-subtle rounded-2xl p-6 border border-amber-500/20 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center opacity-80"
                              >
                                  <div className="flex-1 w-full">
                                      <div className="flex justify-between items-start mb-2">
                                          <StatusBadge status="in_review" />
                                          <span className="text-xs text-text-secondary">Enviado: {formatDateDisplay(record.paymentDate || '')}</span>
                                      </div>
                                      <h4 className="text-lg font-bold text-gray-300">{record.concept}</h4>
                                      <span className="text-xs font-bold text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded inline-block mt-1 border border-amber-500/10">
                                          Método: {record.method || 'Transferencia'}
                                      </span>
                                  </div>
                                  <div className="text-right w-full sm:w-auto flex justify-between sm:block items-center">
                                      <span className="text-xl font-bold text-gray-400">${record.amount.toFixed(2)}</span>
                                      <p className="text-xs text-amber-500/80 font-medium mt-1">Esperando aprobación...</p>
                                  </div>
                              </MotionDiv>
                          ))}
                      </div>
                  )}
              </div>

              {/* --- HISTORY SECTION --- */}
              {historyRecords.length > 0 && (
                  <div className="flex flex-col gap-4 mt-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2 opacity-60 px-1">
                          <span className="material-symbols-outlined">history</span>
                          Historial de Pagos
                      </h3>
                      <div className="flex flex-col gap-3">
                          {historyRecords.map((record) => (
                              <div key={record.id} className="bg-background-paper rounded-xl p-5 border border-white/5 flex justify-between items-center group hover:bg-white/5 transition-all">
                                  <div>
                                      <div className="flex items-center gap-2 mb-1">
                                          <span className="text-sm font-bold text-white">{record.concept}</span>
                                          <StatusBadge status="paid" />
                                      </div>
                                      <p className="text-xs text-text-secondary">
                                          Pagado el {formatDateDisplay(record.paymentDate || '')} • {record.method}
                                      </p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <span className="font-bold text-green-400">${(record.originalAmount || record.amount).toFixed(2)}</span>
                                      <button 
                                          onClick={() => handleDownloadReceipt(record)}
                                          className="size-8 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
                                          title="Descargar Recibo"
                                      >
                                          <span className="material-symbols-outlined text-lg">receipt_long</span>
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>

          {/* RIGHT COL: ACTIONS & BANK */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-10">
              
              {/* QUICK ACTION: PAY BATCH */}
              <button 
                  onClick={() => handleOpenPaymentModal()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-transform active:scale-95 flex items-center justify-center gap-3 group"
              >
                  <div className="size-8 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-lg group-hover:rotate-90 transition-transform">add_shopping_cart</span>
                  </div>
                  Pagar Varios Conceptos
              </button>

              {/* BANK INFO CARD */}
              <div className="bg-[#18181b] rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden border border-white/5">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                      <span className="material-symbols-outlined text-[150px]">account_balance</span>
                  </div>
                  <div className="relative z-10">
                      <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                          <span className="material-symbols-outlined">account_balance_wallet</span>
                          Datos para Transferencia
                      </h3>
                      
                      {bankInfo ? (
                          <div className="space-y-6">
                              <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Banco</p>
                                  <p className="text-xl font-medium tracking-tight text-white">{bankInfo.bankName}</p>
                              </div>
                              <div>
                                  <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Beneficiario</p>
                                  <p className="text-lg font-medium tracking-tight text-white">{bankInfo.accountHolder}</p>
                              </div>
                              <div className="bg-black/40 rounded-xl p-4 border border-white/5 backdrop-blur-sm">
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-2">CLABE Interbancaria</p>
                                  <div className="flex items-center justify-between">
                                      <p className="font-mono text-xl tracking-wider select-all text-white">{bankInfo.clabe}</p>
                                      <button 
                                          onClick={() => {navigator.clipboard.writeText(bankInfo.clabe); addToast('CLABE copiada', 'success')}}
                                          className="text-white/60 hover:text-white"
                                      >
                                          <span className="material-symbols-outlined text-lg">content_copy</span>
                                      </button>
                                  </div>
                              </div>
                              {bankInfo.instructions && (
                                  <div className="text-xs text-gray-400 leading-relaxed bg-white/5 p-3 rounded-lg border border-white/5">
                                      <span className="font-bold text-gray-300 block mb-1">Instrucciones:</span>
                                      {bankInfo.instructions}
                                  </div>
                              )}
                          </div>
                      ) : (
                          <p className="text-gray-500">Sin información bancaria configurada.</p>
                      )}
                  </div>
              </div>
          </div>

      </div>

      <PaymentModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleConfirmPayment}
          preSelectedRecord={selectedRecord}
          pendingDebts={pendingDebts}
      />
    </div>
  );
};

export default StudentPayments;
