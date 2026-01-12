
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
                <span className="inline-flex items-center gap-2 px-2 py-1 bg-black border border-green-500 text-green-500 text-[10px] font-bold tracking-widest uppercase rounded-none">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    PAGADO
                </span>
            );
        case 'in_review':
            return (
                <span className="inline-flex items-center gap-2 px-2 py-1 bg-black border border-amber-500 text-amber-500 text-[10px] font-bold tracking-widest uppercase rounded-none">
                    <span className="material-symbols-outlined text-[12px]">hourglass_top</span>
                    REVISIÓN
                </span>
            );
        case 'overdue':
            return (
                <span className="inline-flex items-center gap-2 px-2 py-1 bg-black border border-red-500 text-red-500 text-[10px] font-bold tracking-widest uppercase rounded-none animate-pulse">
                    <span className="material-symbols-outlined text-[12px]">warning</span>
                    VENCIDO
                </span>
            );
        case 'partial':
            return (
                <span className="inline-flex items-center gap-2 px-2 py-1 bg-black border border-orange-500 text-orange-500 text-[10px] font-bold tracking-widest uppercase rounded-none">
                    <span className="material-symbols-outlined text-[12px]">pie_chart</span>
                    RESTANTE
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-2 px-2 py-1 bg-black border border-zinc-600 text-zinc-400 text-[10px] font-bold tracking-widest uppercase rounded-none">
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

    // -- DERIVED VALUES --
    
    const totalDebtSum = useMemo(() => {
        return selectedDebts.reduce((sum, d) => sum + d.amount + d.penaltyAmount, 0);
    }, [selectedDebts]);

    const mandatorySum = useMemo(() => {
        return selectedDebts
            .filter(d => !d.canBePaidInParts)
            .reduce((sum, d) => sum + d.amount + d.penaltyAmount, 0);
    }, [selectedDebts]);

    const canCustomizeAmount = useMemo(() => {
        return selectedDebts.some(d => d.canBePaidInParts);
    }, [selectedDebts]);

    const finalAmount = isPartialEnabled && customAmount ? parseFloat(customAmount) : totalDebtSum;
    
    const isAmountValid = useMemo(() => {
        if (!isPartialEnabled) return true;
        return finalAmount >= mandatorySum - 0.01 && finalAmount <= totalDebtSum + 0.01;
    }, [finalAmount, mandatorySum, totalDebtSum, isPartialEnabled]);

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-none animate-in fade-in duration-200">
            <div className="bg-[#0D0D0D] w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,1)] flex flex-col max-h-[90vh] overflow-hidden border border-[#333] rounded-none" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b border-[#1A1A1A] flex justify-between items-start shrink-0 bg-black">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Reportar Pago</h3>
                        <div className="h-1 w-8 bg-primary mt-1"></div>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex flex-col gap-8 bg-[#0D0D0D]">
                    
                    {/* 1. DEBT SELECTOR */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Conceptos a Pagar</label>
                        
                        {!isSinglePaymentMode && (
                            <div className="relative mb-4">
                                <select 
                                    defaultValue=""
                                    onChange={handleSelectChange}
                                    className="w-full border border-[#333] bg-black py-4 px-4 text-sm font-bold text-white focus:border-primary transition-all appearance-none outline-none rounded-none"
                                >
                                    <option value="" disabled>+ SELECCIONAR CONCEPTO...</option>
                                    {availableOptions.map(debt => (
                                        <option key={debt.id} value={debt.id}>
                                            {debt.concept} - ${debt.amount + debt.penaltyAmount}
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-4 top-4 pointer-events-none text-zinc-500">
                                    <span className="material-symbols-outlined text-lg">arrow_drop_down</span>
                                </div>
                            </div>
                        )}

                        {/* Selected Items List */}
                        <div className="flex flex-col gap-1">
                            <AnimatePresence>
                                {selectedDebts.map(debt => (
                                    <MotionDiv 
                                        key={debt.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        className="flex items-center justify-between p-3 bg-black border border-[#1A1A1A] group"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`size-6 flex items-center justify-center shrink-0 ${debt.canBePaidInParts ? 'text-blue-500' : 'text-orange-500'}`}>
                                                <span className="material-symbols-outlined text-base">
                                                    {debt.canBePaidInParts ? 'payments' : 'lock'}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-white truncate uppercase tracking-wide">{debt.concept}</p>
                                                <p className="text-[10px] text-zinc-500 font-mono uppercase">
                                                    {debt.canBePaidInParts ? 'ABONABLE' : 'PAGO EXACTO'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-mono font-bold text-sm text-white">${(debt.amount + debt.penaltyAmount).toFixed(2)}</span>
                                            {!isSinglePaymentMode && (
                                                <button 
                                                    onClick={() => handleRemoveDebt(debt.id)}
                                                    className="text-zinc-600 hover:text-red-500 transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-lg">close</span>
                                                </button>
                                            )}
                                        </div>
                                    </MotionDiv>
                                ))}
                            </AnimatePresence>
                            
                            {selectedDebts.length === 0 && (
                                <div className="text-center py-8 border border-dashed border-[#333] text-zinc-600 text-xs uppercase tracking-widest">
                                    Lista vacía
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. TOTALS & CUSTOM AMOUNT */}
                    <div className="space-y-4 pt-6 border-t border-[#1A1A1A]">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <input 
                                    type="checkbox" 
                                    checked={isPartialEnabled}
                                    onChange={handlePartialToggle}
                                    disabled={!canCustomizeAmount || selectedDebts.length === 0}
                                    className="size-4 rounded-none border-zinc-600 bg-black text-primary focus:ring-0 disabled:opacity-50 cursor-pointer"
                                />
                                <span className={`text-xs font-bold uppercase tracking-wide ${!canCustomizeAmount ? 'text-zinc-600' : 'text-zinc-300 group-hover:text-white'}`}>
                                    Editar Monto a Pagar
                                </span>
                            </label>
                        </div>

                        <div className="relative">
                            <span className="absolute left-4 top-4 text-zinc-500 font-bold text-xl">$</span>
                            <input 
                                type="number" 
                                value={isPartialEnabled ? customAmount : totalDebtSum.toFixed(2)}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                disabled={!isPartialEnabled}
                                className={`w-full border py-4 pl-10 pr-4 text-2xl font-black text-white focus:ring-0 transition-all rounded-none font-mono ${
                                    !isPartialEnabled 
                                    ? 'bg-black border-[#333] text-zinc-500 cursor-not-allowed' 
                                    : isAmountValid 
                                        ? 'bg-black border-primary' 
                                        : 'bg-red-950/20 border-red-500 text-red-500'
                                }`}
                                placeholder="0.00"
                            />
                        </div>

                        {!isAmountValid && isPartialEnabled && (
                            <div className="flex items-center gap-2 text-[10px] text-red-500 font-bold bg-red-950/30 p-3 border border-red-900 uppercase tracking-wide">
                                <span className="material-symbols-outlined text-sm">error</span>
                                {finalAmount > totalDebtSum 
                                    ? `EXCEDE EL TOTAL ($${totalDebtSum.toFixed(2)})`
                                    : `MÍNIMO REQUERIDO: $${mandatorySum.toFixed(2)}`
                                }
                            </div>
                        )}
                    </div>

                    {/* 3. METHOD */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Método de Pago</label>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setMethod('Transferencia')}
                                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all border ${
                                    method === 'Transferencia' 
                                    ? 'bg-white text-black border-white' 
                                    : 'bg-black text-zinc-500 border-[#333] hover:border-zinc-500 hover:text-white'
                                }`}
                            >
                                Transferencia
                            </button>
                            <button 
                                onClick={() => setMethod('Efectivo')}
                                className={`flex-1 py-3 text-xs font-black uppercase tracking-wider transition-all border ${
                                    method === 'Efectivo' 
                                    ? 'bg-white text-black border-white' 
                                    : 'bg-black text-zinc-500 border-[#333] hover:border-zinc-500 hover:text-white'
                                }`}
                            >
                                Efectivo
                            </button>
                        </div>

                        {method === 'Transferencia' ? (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`border border-dashed p-8 text-center cursor-pointer transition-all mt-4 group ${
                                    file 
                                    ? 'border-green-500 bg-green-950/10' 
                                    : 'border-[#333] hover:border-primary hover:bg-primary/5'
                                }`}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden" 
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                />
                                {file ? (
                                    <div className="flex flex-col items-center">
                                        <span className="material-symbols-outlined text-3xl text-green-500 mb-2">check_circle</span>
                                        <p className="text-xs font-bold text-green-400 break-all uppercase tracking-wide">{file.name}</p>
                                        <p className="text-[10px] text-green-600 mt-1 uppercase">Clic para cambiar</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-zinc-500 group-hover:text-primary transition-colors">
                                        <span className="material-symbols-outlined text-3xl mb-2">cloud_upload</span>
                                        <p className="text-xs font-bold uppercase tracking-widest">Subir Comprobante</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-[#111] border border-[#222] p-4 flex gap-4 items-center mt-4">
                                <span className="material-symbols-outlined text-zinc-400 text-2xl">storefront</span>
                                <p className="text-xs text-zinc-400 font-medium leading-relaxed">
                                    Notifica tu pago ahora y acude a recepción para liquidar.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-[#1A1A1A] bg-black flex gap-4 shrink-0">
                    <button onClick={onClose} className="flex-1 py-4 border border-[#333] font-bold text-zinc-500 hover:text-white hover:border-white transition-all uppercase tracking-wider text-xs rounded-none">Cancelar</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={selectedDebts.length === 0 || (method === 'Transferencia' && !file) || !isAmountValid}
                        className="flex-[2] py-4 bg-primary text-black font-black hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 rounded-none"
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
    <div className="max-w-[1200px] mx-auto p-4 md:p-10 w-full min-h-full flex flex-col gap-10 pb-24 text-white">
      
      {/* Header & Balance */}
      <header className="flex flex-wrap md:flex-nowrap justify-between items-start md:items-end gap-6 bg-[#0D0D0D] p-8 border border-[#1A1A1A] relative overflow-hidden">
          <div className="relative z-10 w-full md:w-auto md:max-w-xl">
            <h1 className="text-3xl font-black tracking-tight text-white uppercase">Mis Pagos</h1>
            <p className="text-zinc-500 mt-2 text-sm leading-relaxed font-medium">
                Mantén tus cuotas al día para asegurar tu acceso al dojo.
            </p>
          </div>
          
          <div className="flex flex-col items-end relative z-10 min-w-[140px] ml-auto">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Deuda Total</span>
            <div className={`text-4xl font-black font-mono tracking-tighter ${totalDebt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                ${totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            {totalDebt > 0 ? (
                <span className="text-[10px] font-bold text-red-500 mt-2 bg-red-950/20 px-2 py-1 border border-red-900 uppercase tracking-wider">Pendiente de pago</span>
            ) : (
                <span className="text-[10px] font-bold text-green-500 mt-2 bg-green-950/20 px-2 py-1 border border-green-900 uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">check</span> Al corriente
                </span>
            )}
          </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          
          {/* LEFT COL: PAYMENTS LIST */}
          <div className="lg:col-span-2 flex flex-col gap-10">
              
              {/* --- ACTIVE DEBTS SECTION --- */}
              <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center px-1 border-b border-[#1A1A1A] pb-4">
                      <h3 className="text-lg font-black text-white flex items-center gap-3 uppercase tracking-wide">
                          <span className="material-symbols-outlined text-primary">payments</span>
                          Por Pagar
                      </h3>
                  </div>
                  
                  {activeRecords.length === 0 && inReviewRecords.length === 0 ? (
                      <div className="bg-[#0D0D0D] border border-[#1A1A1A] p-12 text-center">
                          <div className="size-20 bg-[#111] text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-[#222]">
                              <span className="material-symbols-outlined text-4xl">celebration</span>
                          </div>
                          <h4 className="font-bold text-white text-lg uppercase tracking-wide">¡Estás al día!</h4>
                          <p className="text-zinc-500 text-sm mt-1">No tienes pagos pendientes.</p>
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
                                          className={`bg-[#0D0D0D] p-6 border-l-4 flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center transition-all border-y border-r border-y-[#1A1A1A] border-r-[#1A1A1A] hover:bg-[#111] group ${
                                              isOverdue ? 'border-l-red-500' : 
                                              record.status === 'partial' ? 'border-l-orange-500' :
                                              'border-l-zinc-600'
                                          }`}
                                      >
                                          <div className="flex-1 w-full">
                                              <div className="flex justify-between items-start mb-3">
                                                  <StatusBadge status={record.status} />
                                                  <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Vence: {formatDateDisplay(record.dueDate)}</span>
                                              </div>
                                              <h4 className="text-lg font-bold text-white uppercase tracking-wide">{record.concept}</h4>
                                              {isOverdue && (
                                                  <p className="text-xs text-red-500 font-bold mt-2 flex items-center gap-1 uppercase tracking-wider">
                                                      <span className="material-symbols-outlined text-[14px]">error</span>
                                                      + ${record.penaltyAmount} Recargo
                                                  </p>
                                              )}
                                              {record.status === 'partial' && (
                                                  <p className="text-xs text-orange-500 font-bold mt-2 flex items-center gap-1 uppercase tracking-wider">
                                                      <span className="material-symbols-outlined text-[14px]">pie_chart</span>
                                                      Saldo Restante
                                                  </p>
                                              )}
                                          </div>

                                          <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-[#222] pt-4 sm:pt-0">
                                              <div className="text-right">
                                                  <span className="block text-[9px] text-zinc-500 uppercase tracking-widest font-black mb-1">Total</span>
                                                  <span className={`text-2xl font-black font-mono ${isOverdue ? 'text-red-500' : 'text-white'}`}>
                                                      ${amountDisplay.toFixed(2)}
                                                  </span>
                                              </div>
                                              <button 
                                                  onClick={() => handleOpenPaymentModal(record)}
                                                  className="bg-white text-black hover:bg-zinc-200 px-6 py-3 font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap rounded-none"
                                              >
                                                  <span className="material-symbols-outlined text-[18px]">upload_file</span>
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
                                  className="bg-[#0D0D0D] p-6 border border-amber-900/30 flex flex-col sm:flex-row gap-4 justify-between items-center opacity-80"
                              >
                                  <div className="flex-1 w-full">
                                      <div className="flex justify-between items-start mb-2">
                                          <StatusBadge status="in_review" />
                                          <span className="text-[10px] text-zinc-500 font-mono uppercase">Enviado: {formatDateDisplay(record.paymentDate || '')}</span>
                                      </div>
                                      <h4 className="text-lg font-bold text-zinc-400 uppercase tracking-wide">{record.concept}</h4>
                                      <span className="text-[10px] font-bold text-amber-600 bg-amber-950/20 px-2 py-1 inline-block mt-2 border border-amber-900/50 uppercase tracking-wider">
                                          Método: {record.method || 'Transferencia'}
                                      </span>
                                  </div>
                                  <div className="text-right w-full sm:w-auto flex justify-between sm:block items-center">
                                      <span className="text-xl font-bold font-mono text-zinc-500">${record.amount.toFixed(2)}</span>
                                      <p className="text-[10px] text-amber-600 font-bold mt-1 uppercase tracking-widest animate-pulse">Verificando...</p>
                                  </div>
                              </MotionDiv>
                          ))}
                      </div>
                  )}
              </div>

              {/* --- HISTORY SECTION --- */}
              {historyRecords.length > 0 && (
                  <div className="flex flex-col gap-4 mt-8">
                      <h3 className="text-lg font-black text-zinc-600 flex items-center gap-2 px-1 uppercase tracking-wide">
                          <span className="material-symbols-outlined">history</span>
                          Historial
                      </h3>
                      <div className="flex flex-col gap-1">
                          {historyRecords.map((record) => (
                              <div key={record.id} className="bg-[#0D0D0D] p-5 border-b border-[#1A1A1A] flex justify-between items-center group hover:bg-[#111] transition-all">
                                  <div>
                                      <div className="flex items-center gap-3 mb-1">
                                          <span className="text-sm font-bold text-white uppercase tracking-wide">{record.concept}</span>
                                          <StatusBadge status="paid" />
                                      </div>
                                      <p className="text-[10px] text-zinc-500 font-mono uppercase">
                                          Pagado: {formatDateDisplay(record.paymentDate || '')} • {record.method}
                                      </p>
                                  </div>
                                  <div className="flex items-center gap-6">
                                      <span className="font-bold font-mono text-green-500">${(record.originalAmount || record.amount).toFixed(2)}</span>
                                      <button 
                                          onClick={() => handleDownloadReceipt(record)}
                                          className="size-8 bg-[#1A1A1A] text-zinc-400 hover:text-white hover:bg-[#222] flex items-center justify-center transition-colors"
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
                  className="w-full py-5 bg-primary text-black font-black uppercase tracking-wider shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:bg-white transition-all active:scale-95 flex items-center justify-center gap-3 group rounded-none text-sm"
              >
                  <span className="material-symbols-outlined text-xl">add_shopping_cart</span>
                  Pagar Varios Conceptos
              </button>

              {/* BANK INFO CARD */}
              <div className="bg-[#0D0D0D] p-8 text-white shadow-xl relative overflow-hidden border border-[#1A1A1A]">
                  <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
                      <span className="material-symbols-outlined text-[150px]">account_balance</span>
                  </div>
                  <div className="relative z-10">
                      <h3 className="text-lg font-black mb-6 flex items-center gap-2 uppercase tracking-wide">
                          <span className="material-symbols-outlined text-zinc-500">account_balance_wallet</span>
                          Datos Bancarios
                      </h3>
                      
                      {bankInfo ? (
                          <div className="space-y-6">
                              <div>
                                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Banco</p>
                                  <p className="text-xl font-bold tracking-tight text-white">{bankInfo.bankName}</p>
                              </div>
                              <div>
                                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-1">Beneficiario</p>
                                  <p className="text-lg font-medium tracking-tight text-white">{bankInfo.accountHolder}</p>
                              </div>
                              <div className="bg-black p-4 border border-[#333]">
                                  <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black mb-2">CLABE Interbancaria</p>
                                  <div className="flex items-center justify-between">
                                      <p className="font-mono text-lg tracking-wider select-all text-white">{bankInfo.clabe}</p>
                                      <button 
                                          onClick={() => {navigator.clipboard.writeText(bankInfo.clabe); addToast('CLABE copiada', 'success')}}
                                          className="text-zinc-500 hover:text-white transition-colors"
                                      >
                                          <span className="material-symbols-outlined text-lg">content_copy</span>
                                      </button>
                                  </div>
                              </div>
                              {bankInfo.instructions && (
                                  <div className="text-xs text-zinc-400 leading-relaxed bg-[#111] p-3 border border-[#222]">
                                      <span className="font-bold text-zinc-300 block mb-1 uppercase tracking-wide">Instrucciones:</span>
                                      {bankInfo.instructions}
                                  </div>
                              )}
                          </div>
                      ) : (
                          <p className="text-zinc-500">Sin información bancaria configurada.</p>
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
