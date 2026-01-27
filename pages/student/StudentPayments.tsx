import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { TuitionRecord } from '../../types';
import { generateReceipt } from '../../utils/pdfGenerator';
import { formatDateDisplay } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import TransactionDetailModal from '../../components/ui/TransactionDetailModal';

// Fix for type errors with motion components
const MotionDiv = motion.div as any;

// --- SUB-COMPONENTS ---

const StatusBadge: React.FC<{ status: TuitionRecord['status'] }> = ({ status }) => {
    switch (status) {
        case 'paid':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-[14px] filled">check_circle</span>
                    Pagado
                </span>
            );
        case 'in_review':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-[14px]">hourglass_top</span>
                    En Revisión
                </span>
            );
        case 'overdue':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-[14px] filled">warning</span>
                    Vencido
                </span>
            );
        case 'partial':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-[14px]">pie_chart</span>
                    Restante
                </span>
            );
        default:
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-[14px]">pending</span>
                    Por Pagar
                </span>
            );
    }
};

interface PaymentModalProps { 
    isOpen: boolean; 
    onClose: () => void; 
    onConfirm: (
        recordIds: string[], 
        file: File | null, 
        method: 'Transferencia' | 'Efectivo', 
        totalAmount: number,
        details: { description: string; amount: number }[]
    ) => void;
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
    
    // 1. Calculate Total Debt (Upper Limit)
    const totalDebtSum = useMemo(() => {
        return selectedDebts.reduce((sum, d) => sum + d.amount + d.penaltyAmount, 0);
    }, [selectedDebts]);

    // 2. Calculate Mandatory Sum (Lower Limit)
    // Sum of items that CANNOT be paid in parts OR are 'Mensualidad'
    const mandatorySum = useMemo(() => {
        return selectedDebts.reduce((sum, d) => {
            const isMensualidad = d.category === 'Mensualidad' || d.concept.toLowerCase().includes('mensualidad');
            // If it's tuition OR explicitly marked as "no partials", it contributes to the minimum floor
            if (!d.canBePaidInParts || isMensualidad) {
                return sum + d.amount + d.penaltyAmount;
            }
            return sum;
        }, 0);
    }, [selectedDebts]);

    // 3. Logic Flags - MIXED BATCH RULE
    const canCustomizeAmount = useMemo(() => {
        if (selectedDebts.length === 0) return false;
        
        // If Total > Mandatory, it implies there's at least one item (or part of items) 
        // that allows flexibility. This satisfies "si hay dos conceptos uno que no... y otro que si".
        return totalDebtSum > mandatorySum;
    }, [totalDebtSum, mandatorySum, selectedDebts]);

    const finalAmount = isPartialEnabled && customAmount ? parseFloat(customAmount) : totalDebtSum;
    
    // VALIDATION LOGIC UPDATE:
    // 1. Must be >= mandatorySum (Cover the non-splittable items)
    // 2. Must be <= totalDebtSum (Cannot overpay)
    const isAmountValid = useMemo(() => {
        if (!isPartialEnabled) return true;
        // Allow slight float margin errors
        return finalAmount >= (mandatorySum - 0.01) && finalAmount <= (totalDebtSum + 0.01);
    }, [finalAmount, mandatorySum, totalDebtSum, isPartialEnabled]);

    // 4. Available Options for Selector (Exclude already selected)
    const availableOptions = useMemo(() => {
        return pendingDebts.filter(d => !selectedDebts.find(s => s.id === d.id));
    }, [pendingDebts, selectedDebts]);

    // -- HANDLERS --

    const handlePartialToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        const checked = e.target.checked;
        setIsPartialEnabled(checked);
        if (checked) {
            // UX IMPROVEMENT: Start with Total, user adjusts down
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
            // Reset partial toggle when selection changes to avoid confusing validation state
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
                addToast(`El monto mínimo obligatorio a cubrir es $${mandatorySum.toFixed(2)}`, 'error');
            }
            return;
        }

        const ids = selectedDebts.map(d => d.id);
        
        // Use full concepts for description
        const details = selectedDebts.map(d => ({
            description: d.concept,
            amount: d.amount + d.penaltyAmount
        }));

        onConfirm(ids, file, method, finalAmount, details);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/20 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ring-1 ring-black/5" onClick={(e) => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Reportar Pago</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {isSinglePaymentMode ? 'Confirma el pago de este concepto.' : 'Construye tu lista de pagos.'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex flex-col gap-6">
                    
                    {/* 1. DEBT SELECTOR (SHOPPING CART STYLE) */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Conceptos a Pagar</label>
                        
                        {/* Improved Selector Row - HIDDEN IF SINGLE MODE */}
                        {!isSinglePaymentMode && (
                            <div className="flex flex-col gap-2 mb-3">
                                <div className="relative">
                                    <select 
                                        defaultValue=""
                                        onChange={handleSelectChange}
                                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-4 pr-10 text-sm font-medium text-gray-900 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all appearance-none outline-none shadow-sm"
                                    >
                                        <option value="" disabled>+ Agregar otro concepto...</option>
                                        {availableOptions.map(debt => (
                                            <option key={debt.id} value={debt.id}>
                                                {debt.concept} - ${debt.amount + debt.penaltyAmount}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-3 pointer-events-none text-gray-400">
                                        <span className="material-symbols-outlined text-[20px]">add_circle</span>
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
                                        className="flex items-center justify-between p-3.5 bg-gray-50 border border-gray-100 rounded-xl group"
                                    >
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${debt.category === 'Mensualidad' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>
                                                <span className="material-symbols-outlined text-sm">
                                                    {debt.category === 'Mensualidad' ? 'payments' : 'lock'}
                                                </span>
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate">{debt.concept}</p>
                                                <p className="text-[10px] text-gray-500 font-medium">
                                                    {debt.category === 'Mensualidad' ? 'Monto Fijo' : (debt.canBePaidInParts ? 'Permite Abonos' : 'Pago Exacto')}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-sm text-gray-900">${(debt.amount + debt.penaltyAmount).toFixed(2)}</span>
                                            {!isSinglePaymentMode && (
                                                <button 
                                                    onClick={() => handleRemoveDebt(debt.id)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                                >
                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                </button>
                                            )}
                                        </div>
                                    </MotionDiv>
                                ))}
                            </AnimatePresence>
                            
                            {selectedDebts.length === 0 && (
                                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                                    <p className="text-gray-400 text-sm font-medium">No has seleccionado conceptos</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2. TOTALS & CUSTOM AMOUNT */}
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-2.5 cursor-pointer group">
                                <div className="relative flex items-center">
                                    <input 
                                        type="checkbox" 
                                        checked={isPartialEnabled}
                                        onChange={handlePartialToggle}
                                        disabled={!canCustomizeAmount || selectedDebts.length === 0}
                                        className="peer sr-only"
                                    />
                                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-orange-500"></div>
                                </div>
                                <span className={`text-sm font-semibold transition-colors ${!canCustomizeAmount ? 'text-gray-400' : 'text-gray-700 group-hover:text-gray-900'}`}>
                                    ¿Abonar otra cantidad?
                                </span>
                            </label>
                        </div>

                        <div className="relative">
                            <span className={`absolute left-4 top-4 font-bold text-lg z-10 ${!isPartialEnabled ? 'text-gray-400' : 'text-gray-900'}`}>$</span>
                            <input 
                                type="number" 
                                value={isPartialEnabled ? customAmount : totalDebtSum.toFixed(2)}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                readOnly={!isPartialEnabled}
                                className={`w-full rounded-2xl border py-4 pl-8 pr-4 text-2xl font-black transition-all outline-none ${
                                    !isPartialEnabled 
                                    ? 'bg-gray-200 border-gray-300 text-gray-500 cursor-not-allowed select-none' 
                                    : isAmountValid 
                                        ? 'bg-white border-orange-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 text-gray-900' 
                                        : 'bg-red-50 border-red-300 focus:border-red-500 focus:ring-4 focus:ring-red-100 text-red-600'
                                }`}
                                placeholder="0.00"
                            />
                            {!isPartialEnabled && (
                                <span className="absolute right-4 top-5 text-xs font-bold text-gray-500 flex items-center gap-1 bg-gray-300/50 px-2 py-1 rounded-md">
                                    <span className="material-symbols-outlined text-[14px]">lock</span> Fijo
                                </span>
                            )}
                        </div>

                        {!isAmountValid && isPartialEnabled && (
                            <div className="flex items-center gap-3 text-xs text-red-600 font-medium bg-red-50 p-3 rounded-xl border border-red-100 animate-in slide-in-from-top-1">
                                <span className="material-symbols-outlined text-sm filled">error</span>
                                {finalAmount > totalDebtSum 
                                    ? `El monto no puede superar el total de $${totalDebtSum.toFixed(2)}`
                                    : `Monto inválido. Debes cubrir al menos $${mandatorySum.toFixed(2)} de los conceptos obligatorios.`
                                }
                            </div>
                        )}
                        
                        {/* Info Helper */}
                        {isPartialEnabled && isAmountValid && mandatorySum > 0 && (
                            <div className="flex items-center gap-2 text-[10px] text-gray-500 font-medium px-1">
                                <span className="material-symbols-outlined text-sm">info</span>
                                Mínimo requerido: ${mandatorySum.toFixed(2)}
                            </div>
                        )}
                    </div>

                    {/* 3. PROOF UPLOAD OR METHOD */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider pl-1">Método de Pago</label>
                        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100/80 rounded-xl mb-3">
                            <button 
                                onClick={() => setMethod('Transferencia')}
                                className={`py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${method === 'Transferencia' ? 'bg-white text-orange-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">account_balance</span>
                                Transferencia
                            </button>
                            <button 
                                onClick={() => setMethod('Efectivo')}
                                className={`py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${method === 'Efectivo' ? 'bg-white text-green-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <span className="material-symbols-outlined text-[18px]">payments</span>
                                Efectivo
                            </button>
                        </div>

                        {method === 'Transferencia' ? (
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all group ${file ? 'border-green-500 bg-green-50/50' : 'border-gray-200 hover:border-orange-300 hover:bg-orange-50/30'}`}
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
                                        <div className="size-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                                            <span className="material-symbols-outlined text-2xl filled">check_circle</span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 break-all px-4">{file.name}</p>
                                        <p className="text-xs text-green-600 mt-1 font-medium">Clic para cambiar archivo</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center text-gray-400 group-hover:text-orange-500 transition-colors">
                                        <span className="material-symbols-outlined text-4xl mb-2">cloud_upload</span>
                                        <p className="text-sm font-bold text-gray-600">Subir Comprobante</p>
                                        <p className="text-xs mt-1">Imagen o PDF</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex gap-3 items-start">
                                <div className="bg-white p-1.5 rounded-lg text-green-600 shadow-sm mt-0.5">
                                    <span className="material-symbols-outlined text-xl">storefront</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-green-800">Pago en Recepción</p>
                                    <p className="text-xs text-green-700 mt-0.5 leading-relaxed">
                                        Notifica tu pago ahora para generar la orden y acude a recepción para liquidar.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-3.5 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all text-sm">Cancelar</button>
                    <button 
                        onClick={handleSubmit} 
                        disabled={selectedDebts.length === 0 || (method === 'Transferencia' && !file) || !isAmountValid}
                        className="flex-[2] py-3.5 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20 transition-all active:scale-95 text-sm flex items-center justify-center gap-2"
                    >
                        {method === 'Efectivo' ? 'Notificar Pago' : 'Enviar Comprobante'}
                        <span className="material-symbols-outlined text-lg">send</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---

const StudentPayments: React.FC = () => {
  const { currentUser, records, uploadProof, createRecord, academySettings, getStudentPendingDebts, registerBatchPayment } = useStore();
  const { addToast } = useToast();
  
  const [selectedRecord, setSelectedRecord] = useState<TuitionRecord | null>(null);
  const [selectedDetailRecord, setSelectedDetailRecord] = useState<TuitionRecord | null>(null);
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
  const historyRecords = myRecords.filter(r => r.status === 'paid' || r.status === 'partial');

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

  const handleConfirmPayment = (
      recordIds: string[], 
      file: File | null, 
      method: 'Transferencia' | 'Efectivo', 
      totalAmount: number,
      details: { description: string; amount: number }[]
  ) => {
      if (!file && method === 'Transferencia') return;

      const fileToSend = file || new File([""], "pago_efectivo.txt", { type: "text/plain" });
      
      // Pass totalAmount and explicit details to register function
      registerBatchPayment(recordIds, fileToSend, method, totalAmount, details);
      
      setIsModalOpen(false);
      setSelectedRecord(null);
  };

  const handleDownloadReceipt = (record: TuitionRecord) => {
      generateReceipt(record, academySettings, currentUser);
  };

  return (
    <div className="max-w-[1200px] mx-auto p-4 md:p-10 w-full min-h-full flex flex-col gap-8 pb-32">
      
      {/* Header & Balance */}
      <header className="flex flex-wrap md:flex-nowrap justify-between items-start md:items-end gap-6 bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="relative z-10 w-full md:w-auto md:max-w-xl">
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
                <span className="flex size-2 rounded-full bg-orange-500"></span>
                Finanzas
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900 mb-2">Mis Pagos</h1>
            <p className="text-gray-500 text-sm md:text-base leading-relaxed max-w-lg">
                Mantén tus cuotas al día para evitar recargos y asegurar tu acceso a clases y exámenes.
            </p>
          </div>
          
          {/* Debt Section */}
          <div className="flex flex-col items-end relative z-10 min-w-[160px] ml-auto bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Deuda Total</span>
            <div className={`text-3xl md:text-4xl font-black tracking-tight ${totalDebt > 0 ? 'text-gray-900' : 'text-green-600'}`}>
                ${totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
            {totalDebt > 0 ? (
                <span className="text-[10px] font-bold text-red-600 mt-1 bg-red-50 border border-red-100 px-2 py-0.5 rounded-md uppercase tracking-wide">
                    Pendiente de pago
                </span>
            ) : (
                <span className="text-[10px] font-bold text-green-600 mt-1 bg-green-50 border border-green-100 px-2 py-0.5 rounded-md flex items-center gap-1 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-[12px] filled">check_circle</span> Al corriente
                </span>
            )}
          </div>

          {/* Decor */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-gradient-to-b from-orange-50/50 to-transparent rounded-full blur-3xl -z-0 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT COL: PAYMENTS LIST */}
          <div className="lg:col-span-2 flex flex-col gap-10">
              
              {/* --- ACTIVE DEBTS SECTION --- */}
              <div className="flex flex-col gap-5">
                  <div className="flex justify-between items-center px-1">
                      <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                          <span className="material-symbols-outlined text-orange-500">receipt_long</span>
                          Por Pagar
                      </h3>
                  </div>
                  
                  {activeRecords.length === 0 && inReviewRecords.length === 0 ? (
                      <div className="bg-white border border-gray-200 rounded-[2rem] p-10 text-center shadow-sm">
                          <div className="size-20 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-8 ring-green-50/50">
                              <span className="material-symbols-outlined text-4xl filled">verified</span>
                          </div>
                          <h4 className="font-black text-gray-900 text-xl mb-1">¡Estás al día!</h4>
                          <p className="text-gray-500 text-sm">No tienes pagos pendientes en este momento.</p>
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
                                          onClick={() => setSelectedDetailRecord(record)}
                                          className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 hover:shadow-md hover:scale-[1.01] transition-all group relative overflow-hidden cursor-pointer"
                                      >
                                          {isOverdue && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>}
                                          
                                          <div className="flex flex-col sm:flex-row gap-6 justify-between items-start sm:items-center pl-2">
                                              <div className="flex-1 w-full">
                                                  <div className="flex justify-between items-start mb-2">
                                                      <StatusBadge status={record.status} />
                                                      <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-1 rounded-lg">Vence: {formatDateDisplay(record.dueDate)}</span>
                                                  </div>
                                                  <h4 className="text-base font-bold text-gray-900 mb-1">{record.concept}</h4>
                                                  {isOverdue && (
                                                      <p className="text-xs text-red-500 font-bold flex items-center gap-1 bg-red-50 w-fit px-2 py-0.5 rounded">
                                                          <span className="material-symbols-outlined text-[14px]">error</span>
                                                          +${record.penaltyAmount} Recargo aplicado
                                                      </p>
                                                  )}
                                                  {record.status === 'partial' && (
                                                      <p className="text-xs text-orange-600 font-bold flex items-center gap-1">
                                                          <span className="material-symbols-outlined text-[14px]">pie_chart</span>
                                                          Restante tras abono
                                                      </p>
                                                  )}
                                              </div>

                                              <div className="flex items-center gap-5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 border-gray-100 pt-4 sm:pt-0">
                                                  <div className="text-right">
                                                      <span className="block text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Total</span>
                                                      <span className={`text-2xl font-black ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                                                          ${amountDisplay.toFixed(2)}
                                                      </span>
                                                  </div>
                                                  
                                                  <div className="flex items-center gap-2">
                                                      {record.status === 'partial' && (
                                                          <button 
                                                              onClick={(e) => { e.stopPropagation(); handleDownloadReceipt(record); }}
                                                              className="size-11 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-orange-600 hover:border-orange-200 hover:bg-orange-50 transition-all flex items-center justify-center shadow-sm"
                                                              title="Descargar Recibo de Abonos"
                                                          >
                                                              <span className="material-symbols-outlined text-[20px]">receipt_long</span>
                                                          </button>
                                                      )}
                                                      <button 
                                                          onClick={(e) => { e.stopPropagation(); handleOpenPaymentModal(record); }}
                                                          className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl font-bold shadow-lg shadow-gray-900/10 flex items-center gap-2 transition-all active:scale-95 whitespace-nowrap text-sm"
                                                      >
                                                          <span className="material-symbols-outlined text-[18px]">credit_card</span>
                                                          <span className="hidden sm:inline">Pagar</span>
                                                      </button>
                                                  </div>
                                              </div>
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
                                  onClick={() => setSelectedDetailRecord(record)}
                                  className="bg-gray-50/50 rounded-2xl p-5 border border-gray-200 border-dashed flex flex-col sm:flex-row gap-4 justify-between items-center opacity-80 cursor-pointer hover:bg-gray-50 hover:opacity-100 transition-all"
                              >
                                  <div className="flex-1 w-full">
                                      <div className="flex justify-between items-start mb-2">
                                          <StatusBadge status="in_review" />
                                          <span className="text-xs text-gray-400">Enviado: {formatDateDisplay(record.paymentDate || '')}</span>
                                      </div>
                                      <h4 className="text-base font-bold text-gray-700">{record.concept}</h4>
                                      <span className="text-[10px] font-bold text-gray-500 bg-white border border-gray-200 px-2 py-0.5 rounded inline-block mt-2">
                                          {record.method || 'Transferencia'}
                                      </span>
                                  </div>
                                  <div className="text-right w-full sm:w-auto flex justify-between sm:block items-center">
                                      {/* Correctly display Amount + Penalty while in review */}
                                      <span className="text-lg font-bold text-gray-600 block">${(record.amount + (record.penaltyAmount || 0)).toFixed(2)}</span>
                                      <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wide mt-1">Validando...</p>
                                  </div>
                              </MotionDiv>
                          ))}
                      </div>
                  )}
              </div>

              {/* --- HISTORY SECTION --- */}
              {historyRecords.length > 0 && (
                  <div className="flex flex-col gap-5 pt-6 border-t border-gray-100">
                      <h3 className="text-lg font-bold text-gray-400 flex items-center gap-2 px-1 uppercase tracking-wider text-sm">
                          <span className="material-symbols-outlined text-lg">history</span>
                          Historial Reciente
                      </h3>
                      <div className="flex flex-col">
                          {historyRecords.map((record) => (
                              <div 
                                  key={record.id} 
                                  onClick={() => setSelectedDetailRecord(record)}
                                  className="bg-white p-4 border-b border-gray-100 last:border-0 flex justify-between items-center group hover:bg-gray-50 hover:scale-[1.005] cursor-pointer transition-all first:rounded-t-xl last:rounded-b-xl"
                              >
                                  <div>
                                      <div className="flex items-center gap-3 mb-1">
                                          <span className="text-sm font-bold text-gray-900">{record.concept}</span>
                                          <span className={`text-[10px] font-bold ${record.status === 'partial' ? 'text-orange-700 bg-orange-50' : 'text-green-700 bg-green-50'} px-2 py-0.5 rounded-full uppercase`}>
                                              {record.status === 'partial' ? 'Parcial' : 'Pagado'}
                                          </span>
                                      </div>
                                      <p className="text-xs text-gray-500">
                                          {formatDateDisplay(record.paymentDate || '')} • {record.method}
                                      </p>
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <span className="font-bold text-gray-900 text-sm">${(record.originalAmount || record.amount).toFixed(2)}</span>
                                      <button 
                                          onClick={(e) => { e.stopPropagation(); handleDownloadReceipt(record); }}
                                          className="size-8 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 flex items-center justify-center transition-colors"
                                          title="Descargar Recibo"
                                      >
                                          <span className="material-symbols-outlined text-lg">description</span>
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>

          {/* RIGHT COL: ACTIONS & BANK */}
          <div className="flex flex-col gap-6 lg:sticky lg:top-6">
              
              {/* QUICK ACTION: PAY BATCH */}
              <button 
                  onClick={() => handleOpenPaymentModal()}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold shadow-xl shadow-orange-500/20 hover:shadow-orange-500/30 hover:scale-[1.02] transition-all active:scale-95 flex items-center justify-center gap-3 group"
              >
                  <div className="size-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <span className="material-symbols-outlined text-white text-lg group-hover:rotate-90 transition-transform">add</span>
                  </div>
                  Pagar Varios Conceptos
              </button>

              {/* BANK INFO CARD */}
              <div className="bg-white rounded-[2rem] p-8 shadow-card border border-gray-200 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
                      <span className="material-symbols-outlined text-[180px] text-gray-900">account_balance</span>
                  </div>
                  <div className="relative z-10">
                      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                          <span className="material-symbols-outlined text-gray-400">account_balance_wallet</span>
                          Datos Bancarios
                      </h3>
                      
                      {bankInfo ? (
                          <div className="space-y-6">
                              <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Banco</p>
                                  <p className="text-xl font-bold text-gray-900 tracking-tight">{bankInfo.bankName}</p>
                              </div>
                              <div>
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Beneficiario</p>
                                  <p className="text-base font-medium text-gray-700">{bankInfo.accountHolder}</p>
                              </div>
                              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-2">CLABE Interbancaria</p>
                                  <div className="flex items-center justify-between">
                                      <p className="font-mono text-lg tracking-wider text-gray-900 select-all">{bankInfo.clabe}</p>
                                      <button 
                                          onClick={() => {navigator.clipboard.writeText(bankInfo.clabe); addToast('CLABE copiada', 'success')}}
                                          className="text-gray-400 hover:text-orange-500 p-1 transition-colors"
                                          title="Copiar"
                                      >
                                          <span className="material-symbols-outlined text-lg">content_copy</span>
                                      </button>
                                  </div>
                              </div>
                              {bankInfo.instructions && (
                                  <div className="text-xs text-gray-500 leading-relaxed bg-blue-50 p-3 rounded-xl border border-blue-100">
                                      <span className="font-bold text-blue-700 block mb-1">Instrucciones:</span>
                                      {bankInfo.instructions}
                                  </div>
                              )}
                          </div>
                      ) : (
                          <p className="text-gray-400 italic text-sm">Sin información bancaria configurada.</p>
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

      <TransactionDetailModal
          isOpen={!!selectedDetailRecord}
          onClose={() => setSelectedDetailRecord(null)}
          record={selectedDetailRecord}
          role="student"
          paymentHistory={selectedDetailRecord?.paymentHistory || []}
          onPay={(r) => {
              setSelectedDetailRecord(null);
              handleOpenPaymentModal(r);
          }}
          onDownloadReceipt={(r) => handleDownloadReceipt(r)}
      />
    </div>
  );
};

export default StudentPayments;