
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { TuitionRecord } from '../../types';
import { generateReceipt } from '../../utils/pdfGenerator';
import { formatDateDisplay } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';

const MotionDiv = motion.div as any;

// --- MINIMAL BADGE ---
const StatusBadge: React.FC<{ status: TuitionRecord['status'] }> = ({ status }) => {
    const baseClasses = "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide border";
    
    switch (status) {
        case 'paid':
            return <span className={`${baseClasses} bg-zinc-500/5 border-emerald-500/20 text-emerald-500`}><div className="size-1 rounded-full bg-emerald-500"></div>Pagado</span>;
        case 'in_review':
            return <span className={`${baseClasses} bg-zinc-500/5 border-orange-500/20 text-orange-400`}><div className="size-1 rounded-full bg-orange-500"></div>Revisión</span>;
        case 'overdue':
            return <span className={`${baseClasses} bg-zinc-500/5 border-red-500/20 text-red-400`}><div className="size-1 rounded-full bg-red-500"></div>Vencido</span>;
        case 'partial':
            return <span className={`${baseClasses} bg-zinc-500/5 border-blue-500/20 text-blue-400`}><div className="size-1 rounded-full bg-blue-500"></div>Parcial</span>;
        default:
            return <span className={`${baseClasses} bg-zinc-500/5 border-zinc-700 text-zinc-400`}><div className="size-1 rounded-full bg-zinc-500"></div>Por Pagar</span>;
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
    const [selectedDebts, setSelectedDebts] = useState<TuitionRecord[]>([]);
    const [isPartialEnabled, setIsPartialEnabled] = useState(false);
    const [customAmount, setCustomAmount] = useState<string>('');

    const isSinglePaymentMode = !!preSelectedRecord;

    useEffect(() => {
        if (isOpen) {
            setFile(null);
            setMethod('Transferencia');
            setIsPartialEnabled(false);
            setCustomAmount('');
            if (preSelectedRecord) setSelectedDebts([preSelectedRecord]);
            else setSelectedDebts([]);
        }
    }, [isOpen, preSelectedRecord]);

    const totalDebtSum = useMemo(() => selectedDebts.reduce((sum, d) => sum + d.amount + d.penaltyAmount, 0), [selectedDebts]);
    const mandatorySum = useMemo(() => selectedDebts.filter(d => !d.canBePaidInParts).reduce((sum, d) => sum + d.amount + d.penaltyAmount, 0), [selectedDebts]);
    const canCustomizeAmount = useMemo(() => selectedDebts.some(d => d.canBePaidInParts), [selectedDebts]);
    const finalAmount = isPartialEnabled && customAmount ? parseFloat(customAmount) : totalDebtSum;
    
    const isAmountValid = useMemo(() => {
        if (!isPartialEnabled) return true;
        return finalAmount >= mandatorySum - 0.01 && finalAmount <= totalDebtSum + 0.01;
    }, [finalAmount, mandatorySum, totalDebtSum, isPartialEnabled]);

    const availableOptions = useMemo(() => pendingDebts.filter(d => !selectedDebts.find(s => s.id === d.id)), [pendingDebts, selectedDebts]);

    const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        const debt = pendingDebts.find(d => d.id === id);
        if (debt) {
            setSelectedDebts(prev => [...prev, debt]);
            setIsPartialEnabled(false); setCustomAmount('');
        }
        e.target.value = "";
    };

    const handleRemoveDebt = (id: string) => {
        if (isSinglePaymentMode) return; 
        setSelectedDebts(prev => prev.filter(d => d.id !== id));
        setIsPartialEnabled(false); setCustomAmount('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
    };

    const handleSubmit = () => {
        if (selectedDebts.length === 0) return;
        if (method === 'Transferencia' && !file) return;
        if (!isAmountValid) {
            addToast('Monto inválido para los conceptos seleccionados.', 'error');
            return;
        }
        const ids = selectedDebts.map(d => d.id);
        onConfirm(ids, file, method, finalAmount);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
            <div className="bg-[#09090b] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/10 rounded-2xl" onClick={(e) => e.stopPropagation()}>
                
                <div className="p-6 border-b border-white/5 flex justify-between items-start bg-[#09090b]">
                    <div>
                        <h3 className="text-lg font-bold text-white">Reportar Pago</h3>
                        <p className="text-xs text-zinc-500 mt-1">Adjunta comprobante o notifica efectivo.</p>
                    </div>
                    <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-full">
                        <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex flex-col gap-6 bg-[#09090b]">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Conceptos</label>
                        {!isSinglePaymentMode && (
                            <div className="relative">
                                <select 
                                    defaultValue=""
                                    onChange={handleSelectChange}
                                    className="w-full border border-white/10 bg-[#18181b] py-3 pl-4 pr-10 text-sm font-medium text-white focus:border-zinc-500 focus:ring-0 transition-all appearance-none outline-none rounded-xl"
                                >
                                    <option value="" disabled>+ Agregar concepto</option>
                                    {availableOptions.map(debt => (
                                        <option key={debt.id} value={debt.id}>{debt.concept} - ${debt.amount + debt.penaltyAmount}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        <div className="flex flex-col gap-2">
                            <AnimatePresence>
                                {selectedDebts.map(debt => (
                                    <MotionDiv key={debt.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center justify-between p-3 bg-[#121212] border border-white/5 rounded-xl">
                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-zinc-300 truncate">{debt.concept}</p>
                                            <p className="text-[10px] text-zinc-600 font-bold uppercase">{debt.canBePaidInParts ? 'Abonable' : 'Pago Exacto'}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-mono font-bold text-sm text-zinc-400">${(debt.amount + debt.penaltyAmount).toFixed(2)}</span>
                                            {!isSinglePaymentMode && (
                                                <button onClick={() => handleRemoveDebt(debt.id)} className="text-zinc-600 hover:text-red-500"><span className="material-symbols-outlined text-lg">close</span></button>
                                            )}
                                        </div>
                                    </MotionDiv>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox" checked={isPartialEnabled} onChange={(e) => {setIsPartialEnabled(e.target.checked); if(e.target.checked) setCustomAmount(totalDebtSum.toFixed(2)); else setCustomAmount('');}} disabled={!canCustomizeAmount || selectedDebts.length === 0} className="size-4 rounded border-zinc-700 bg-[#121212] text-zinc-500 focus:ring-0 cursor-pointer" />
                                <span className={`text-xs font-bold uppercase tracking-wide ${!canCustomizeAmount ? 'text-zinc-700' : 'text-zinc-400'}`}>Editar Monto</span>
                            </label>
                        </div>
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-zinc-500 font-bold">$</span>
                            <input 
                                type="number" 
                                value={isPartialEnabled ? customAmount : totalDebtSum.toFixed(2)}
                                onChange={(e) => setCustomAmount(e.target.value)}
                                disabled={!isPartialEnabled}
                                className={`w-full border py-3 pl-8 pr-4 text-lg font-bold text-white focus:ring-0 transition-all rounded-xl font-mono ${!isPartialEnabled ? 'bg-[#121212] border-white/5 text-zinc-500' : 'bg-[#18181b] border-zinc-700'}`}
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block">Método</label>
                        <div className="flex gap-2">
                            {['Transferencia', 'Efectivo'].map((m) => (
                                <button 
                                    key={m}
                                    onClick={() => setMethod(m as any)}
                                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-all rounded-lg border ${method === m ? 'bg-white text-black border-white' : 'bg-[#121212] text-zinc-500 border-white/5 hover:border-zinc-700'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                        {method === 'Transferencia' && (
                            <div onClick={() => fileInputRef.current?.click()} className={`border border-dashed p-6 text-center cursor-pointer transition-all mt-2 rounded-xl ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/10 bg-[#121212] hover:bg-[#18181b]'}`}>
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileChange} />
                                {file ? <p className="text-xs font-bold text-emerald-500">{file.name}</p> : <p className="text-xs font-bold text-zinc-500 uppercase">Adjuntar Comprobante</p>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-white/5 bg-[#09090b] flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-3 border border-white/10 font-bold text-zinc-400 hover:text-white hover:bg-[#18181b] transition-all uppercase tracking-wider text-[10px] rounded-xl">Cancelar</button>
                    <button onClick={handleSubmit} disabled={selectedDebts.length === 0 || (method === 'Transferencia' && !file)} className="flex-[2] py-3 bg-white text-black font-bold disabled:opacity-50 transition-all uppercase tracking-wider text-[10px] rounded-xl hover:bg-zinc-200">Confirmar</button>
                </div>
            </div>
        </div>
    );
};

// --- MAIN PAGE ---

const StudentPayments: React.FC = () => {
  const { currentUser, records, academySettings, getStudentPendingDebts, registerBatchPayment } = useStore();
  const { addToast } = useToast();
  const [selectedRecord, setSelectedRecord] = useState<TuitionRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const myRecords = useMemo(() => records.filter(r => r.studentId === currentUser?.studentId).sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()), [records, currentUser]);
  const pendingDebts = useMemo(() => currentUser?.studentId ? getStudentPendingDebts(currentUser.studentId) : [], [records, currentUser]);
  const activeRecords = myRecords.filter(r => ['pending', 'overdue', 'charged', 'partial'].includes(r.status));
  const historyRecords = myRecords.filter(r => r.status === 'paid' || r.status === 'in_review');
  const totalDebt = activeRecords.reduce((acc, r) => acc + (r.status === 'overdue' ? r.amount + r.penaltyAmount : r.amount), 0);

  return (
    <div className="max-w-[1200px] mx-auto p-6 md:p-10 w-full min-h-full flex flex-col gap-10 pb-24 text-zinc-200">
      <header className="flex flex-wrap justify-between items-end gap-6 bg-gradient-to-r from-[#18181b] to-[#121212] p-8 border border-white/5 rounded-3xl relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-2xl font-black text-white">Mis Pagos</h1>
            <p className="text-zinc-500 mt-1 text-sm font-medium">Historial y deudas pendientes.</p>
          </div>
          <div className="text-right relative z-10">
            <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest block mb-1">Deuda Total</span>
            <div className={`text-4xl font-black font-mono tracking-tighter ${totalDebt > 0 ? 'text-red-400' : 'text-emerald-500'}`}>
                ${totalDebt.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </div>
          </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          <div className="lg:col-span-2 flex flex-col gap-8">
              {activeRecords.length === 0 && (
                  <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-zinc-600 text-sm">
                      No tienes pagos pendientes.
                  </div>
              )}
              {activeRecords.map((record) => (
                  <MotionDiv key={record.id} layout className="bg-[#121212] p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all flex justify-between items-center group">
                      <div>
                          <div className="flex items-center gap-3 mb-2">
                              <StatusBadge status={record.status} />
                              <span className="text-[10px] text-zinc-600 font-mono uppercase">Vence: {formatDateDisplay(record.dueDate)}</span>
                          </div>
                          <h4 className="text-base font-bold text-white">{record.concept}</h4>
                          {record.status === 'overdue' && <p className="text-[10px] text-red-500 mt-1 font-mono">+${record.penaltyAmount} Recargo</p>}
                      </div>
                      <div className="text-right">
                          <span className="block text-xl font-black text-white font-mono mb-2">${(record.amount + record.penaltyAmount).toFixed(2)}</span>
                          <button onClick={() => { setSelectedRecord(record); setIsModalOpen(true); }} className="bg-white text-black px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-zinc-200">
                              Pagar
                          </button>
                      </div>
                  </MotionDiv>
              ))}

              {historyRecords.length > 0 && (
                  <div className="pt-8 border-t border-white/5">
                      <h3 className="text-xs font-bold text-zinc-600 uppercase tracking-widest mb-4">Historial Reciente</h3>
                      <div className="flex flex-col gap-2">
                          {historyRecords.map((record) => (
                              <div key={record.id} className="flex justify-between items-center p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                  <div className="flex items-center gap-4">
                                      <div className={`size-8 rounded-full flex items-center justify-center ${record.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                          <span className="material-symbols-outlined text-sm">{record.status === 'paid' ? 'check' : 'hourglass_top'}</span>
                                      </div>
                                      <div>
                                          <p className="text-sm font-bold text-zinc-300">{record.concept}</p>
                                          <p className="text-[10px] text-zinc-600 uppercase">{formatDateDisplay(record.paymentDate || '')}</p>
                                      </div>
                                  </div>
                                  <span className="font-mono text-sm font-bold text-zinc-500">${(record.originalAmount || record.amount).toFixed(2)}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>

          <div className="flex flex-col gap-4">
              <button onClick={() => { setSelectedRecord(null); setIsModalOpen(true); }} className="w-full py-4 bg-white text-black font-bold uppercase tracking-wider text-[10px] rounded-xl hover:bg-zinc-200 transition-all shadow-lg active:scale-95">
                  Pagar Múltiples Conceptos
              </button>
              
              {academySettings.bankDetails && (
                  <div className="bg-[#18181b] p-6 rounded-2xl border border-white/5 text-zinc-400 text-xs">
                      <h3 className="text-zinc-200 font-bold mb-4 flex items-center gap-2 uppercase tracking-wider text-[10px]">
                          <span className="material-symbols-outlined text-sm">account_balance</span> Datos Bancarios
                      </h3>
                      <div className="space-y-3 font-mono">
                          <div className="flex justify-between border-b border-white/5 pb-2"><span>Banco:</span> <span className="text-white">{academySettings.bankDetails.bankName}</span></div>
                          <div className="flex justify-between border-b border-white/5 pb-2"><span>Cuenta:</span> <span className="text-white select-all">{academySettings.bankDetails.accountNumber}</span></div>
                          <div className="flex justify-between"><span>CLABE:</span> <span className="text-white select-all">{academySettings.bankDetails.clabe}</span></div>
                      </div>
                  </div>
              )}
          </div>
      </div>

      <PaymentModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={(ids, file, method, total) => {
              const fileToSend = file || new File([""], "pago_efectivo.txt", { type: "text/plain" });
              registerBatchPayment(ids, fileToSend, method, total);
              setIsModalOpen(false); setSelectedRecord(null);
          }}
          preSelectedRecord={selectedRecord}
          pendingDebts={pendingDebts}
      />
    </div>
  );
};

export default StudentPayments;
