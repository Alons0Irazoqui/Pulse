
import React, { useState, useMemo, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import { TuitionRecord, TuitionStatus } from '../../types';
import { exportToCSV } from '../../utils/csvExport';
import { generateReceipt } from '../../utils/pdfGenerator';
import { formatDateDisplay } from '../../utils/dateUtils';
import EmptyState from '../../components/ui/EmptyState';
import CreateChargeModal from '../../components/finance/CreateChargeModal';

// --- HELPER COMPONENTS ---

const StatusBadge: React.FC<{ status: TuitionStatus; amount: number; penalty: number }> = ({ status, amount, penalty }) => {
    switch (status) {
        case 'paid':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-100 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-[14px] filled">check_circle</span>
                    Pagado
                </span>
            );
        case 'in_review':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wide animate-pulse">
                    <span className="material-symbols-outlined text-[14px] filled">hourglass_top</span>
                    Revisar
                </span>
            );
        case 'overdue':
            return (
                <div className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-100 uppercase tracking-wide">
                        <span className="material-symbols-outlined text-[14px] filled">warning</span>
                        Vencido
                    </span>
                    {penalty > 0 && <span className="text-[10px] text-red-500 font-bold ml-1">+${penalty} Recargo</span>}
                </div>
            );
        case 'partial':
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-[14px] filled">pie_chart</span>
                    Restante
                </span>
            );
        default: // pending
            return (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-[14px]">pending</span>
                    Pendiente
                </span>
            );
    }
};

/**
 * DEBT AMOUNT EDITOR - REDESIGNED
 * Single input, High-end look, Explicit Action Button.
 */
const DebtAmountEditor = ({ item, onUpdate }: { item: TuitionRecord, onUpdate: (id: string, val: number) => void }) => {
    const [val, setVal] = useState(item.amount.toString());
    const { addToast } = useToast();
    
    // Sync internal state if the prop changes from outside
    useEffect(() => {
        setVal(item.amount.toString());
    }, [item.amount]);

    const handleSave = () => {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0) {
            onUpdate(item.id, num);
            addToast("Monto actualizado correctamente", 'success');
        }
    };

    // Check if local value differs from source of truth
    const hasChanged = parseFloat(val) !== item.amount;

    return (
        <div className="flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
                <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none text-sm">$</span>
                    <input 
                        type="number"
                        className="w-32 pl-7 pr-3 py-2 bg-[#F9FAFB] border border-gray-200 rounded-xl text-lg font-bold text-gray-900 outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all text-right"
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && hasChanged && handleSave()}
                        placeholder="0.00"
                    />
                </div>
            </div>
            
            {hasChanged && (
                <button 
                    onClick={handleSave}
                    className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-95 animate-in fade-in slide-in-from-right-2 duration-300"
                >
                    <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                    <span className="text-xs font-bold">Actualizar</span>
                </button>
            )}

            {item.penaltyAmount > 0 && (
                <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-0.5 rounded border border-red-100 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[10px]">add</span> ${item.penaltyAmount} recargo
                </span>
            )}
        </div>
    );
};

interface GroupedTransaction {
    id: string; // BatchID or RecordID
    isBatch: boolean;
    records: TuitionRecord[];
    mainRecord: TuitionRecord; // Representative record for sorting/display
    totalAmount: number;
    declaredAmount?: number; // What the student says they paid
    itemCount: number;
}

const Finance: React.FC = () => {
  const { 
      records, 
      approvePayment, 
      rejectPayment, 
      generateMonthlyBilling, 
      academySettings, 
      currentUser,
      approveBatchPayment,
      rejectBatchPayment,
      updateRecordAmount
  } = useStore();
  
  const { addToast } = useToast();
  const { confirm } = useConfirmation();
  
  // -- STATES --
  const [activeTab, setActiveTab] = useState<'review' | 'pending' | 'overdue' | 'paid' | 'all'>('review');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedGroup, setSelectedGroup] = useState<GroupedTransaction | null>(null);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);

  // -- DATA PROCESSING --

  // 1. Filter Raw Records
  const rawFilteredRecords = useMemo(() => {
      let filtered = records;

      if (activeTab === 'review') filtered = filtered.filter(r => r.status === 'in_review');
      else if (activeTab === 'pending') filtered = filtered.filter(r => r.status === 'pending' || r.status === 'charged' || r.status === 'partial');
      else if (activeTab === 'overdue') filtered = filtered.filter(r => r.status === 'overdue');
      else if (activeTab === 'paid') filtered = filtered.filter(r => r.status === 'paid');

      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(r => 
              r.studentName?.toLowerCase().includes(q) || 
              r.concept.toLowerCase().includes(q) ||
              r.amount.toString().includes(q)
          );
      }
      return filtered;
  }, [records, activeTab, searchQuery]);

  // 2. Group by Batch (Smart Grouping)
  const groupedTransactions: GroupedTransaction[] = useMemo(() => {
      const groups: Record<string, TuitionRecord[]> = {};
      const result: GroupedTransaction[] = [];
      const processedIds = new Set<string>();

      // First pass: Group batch items
      rawFilteredRecords.forEach(r => {
          if (r.batchPaymentId && activeTab === 'review') { 
              if (!groups[r.batchPaymentId]) groups[r.batchPaymentId] = [];
              groups[r.batchPaymentId].push(r);
          }
      });

      // Second pass: Build display objects
      rawFilteredRecords.forEach(r => {
          if (processedIds.has(r.id)) return;

          if (r.batchPaymentId && groups[r.batchPaymentId] && activeTab === 'review') {
              // It's a batch
              const batchItems = groups[r.batchPaymentId];
              batchItems.forEach(i => processedIds.add(i.id));
              
              // Only sum amounts for display in list, logical distribution happens later
              // Look for declaredAmount in the first record of the batch (it should be consistent)
              const declared = batchItems.find(i => i.declaredAmount !== undefined)?.declaredAmount;
              
              result.push({
                  id: r.batchPaymentId,
                  isBatch: true,
                  records: batchItems,
                  mainRecord: r,
                  totalAmount: batchItems.reduce((acc, item) => acc + item.amount + item.penaltyAmount, 0),
                  declaredAmount: declared,
                  itemCount: batchItems.length
              });
          } else {
              processedIds.add(r.id);
              result.push({
                  id: r.id,
                  isBatch: false,
                  records: [r],
                  mainRecord: r,
                  totalAmount: r.amount + r.penaltyAmount,
                  declaredAmount: r.declaredAmount,
                  itemCount: 1
              });
          }
      });

      return result.sort((a, b) => new Date(b.mainRecord.dueDate).getTime() - new Date(a.mainRecord.dueDate).getTime());

  }, [rawFilteredRecords, activeTab]);

  // -- REACTIVE ACTIVE GROUP (CRITICAL FIX) --
  // Rebuilds the selected group data from fresh `records` to support live editing in modal
  const activeGroup = useMemo(() => {
      if (!selectedGroup) return null;
      
      // Find updated records that match the IDs in the selected group
      const freshRecords = records.filter(r => selectedGroup.records.some(old => old.id === r.id));
      
      if (freshRecords.length === 0) return null; // Should not happen unless deleted externally

      const mainRecord = freshRecords.find(r => r.id === selectedGroup.mainRecord.id) || freshRecords[0];
      const totalAmount = freshRecords.reduce((acc, item) => acc + item.amount + item.penaltyAmount, 0);

      return {
          ...selectedGroup,
          records: freshRecords,
          mainRecord,
          totalAmount
      };
  }, [selectedGroup, records]);

  // -- STATS --
  const stats = useMemo(() => {
      return {
          review: records.filter(r => r.status === 'in_review').length,
          overdue: records.filter(r => r.status === 'overdue').length,
          pending: records.filter(r => r.status === 'pending' || r.status === 'charged' || r.status === 'partial').length,
      };
  }, [records]);

  // -- CALCULATE PREVIEW (The Visual Waterfall) --
  const previewDistribution = useMemo(() => {
      if (!activeGroup) return [];
      
      const items = [...activeGroup.records];
      // Separate mandatory and splittable
      const mandatory = items.filter(r => !r.canBePaidInParts);
      const splittable = items.filter(r => r.canBePaidInParts)
                              .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

      // Use current live totalAmount (which updates as user edits individual items)
      // Or declaredAmount if in review.
      // Logic: If status is review, we try to satisfy the debt with the declared money.
      let available = activeGroup.declaredAmount !== undefined ? activeGroup.declaredAmount : activeGroup.totalAmount;
      
      const preview = [];

      // 1. Mandatory
      for (const item of mandatory) {
          const debt = item.amount + item.penaltyAmount;
          if (available >= debt) {
              preview.push({ ...item, _status: 'paid', _paid: debt, _remaining: 0 });
              available -= debt;
          } else {
              preview.push({ ...item, _status: 'unpaid', _paid: 0, _remaining: debt });
          }
      }

      // 2. Splittable
      for (const item of splittable) {
          const debt = item.amount + item.penaltyAmount;
          if (available <= 0) {
              preview.push({ ...item, _status: 'unpaid', _paid: 0, _remaining: debt });
              continue;
          }

          if (available >= debt) {
              preview.push({ ...item, _status: 'paid', _paid: debt, _remaining: 0 });
              available -= debt;
          } else {
              // Partial
              preview.push({ ...item, _status: 'partial', _paid: available, _remaining: debt - available });
              available = 0;
          }
      }
      
      return preview;
  }, [activeGroup]);


  // -- ACTIONS --

  const handleApprove = () => {
      if (!activeGroup) return;
      
      // Determine final amount to approve.
      // We rely on the logic that updateRecordAmount has already synced everything.
      // We just need to pass the total "paid" amount to the approve function.
      
      // If user adjusted items individually, the `amount` fields in records changed.
      // The `declaredAmount` should effectively match the sum of what's being covered if we are strict,
      // but for 'Mensualidad' or partials, we usually look at `declaredAmount`.
      
      const amountToApprove = activeGroup.declaredAmount !== undefined ? activeGroup.declaredAmount : activeGroup.totalAmount;

      if (activeGroup.isBatch) {
          approveBatchPayment(activeGroup.id, amountToApprove);
      } else {
          // If single record, use special approvePayment logic
          if (activeGroup.mainRecord.category !== 'Mensualidad' && amountToApprove < activeGroup.totalAmount) {
               // Treat as 1-item batch to trigger waterfall partial logic for NON-mensualidad items
               approveBatchPayment(activeGroup.records[0].batchPaymentId || `temp-${activeGroup.records[0].id}`, amountToApprove);
          } else {
               // For Mensualidad or Full Payment
               approvePayment(activeGroup.id, amountToApprove);
          }
      }
      setSelectedGroup(null);
  };

  const handleReject = () => {
      if (!activeGroup) return;
      confirm({
          title: activeGroup.isBatch ? 'Rechazar Lote Completo' : 'Rechazar Pago',
          message: 'El estatus volverá a Pendiente/Vencido y se notificará al alumno.',
          type: 'danger',
          confirmText: 'Rechazar',
          onConfirm: () => {
              if (activeGroup.isBatch) {
                  rejectBatchPayment(activeGroup.id);
              } else {
                  rejectPayment(activeGroup.id);
              }
              setSelectedGroup(null);
          }
      });
  };

  const handleGenerateBilling = () => {
      confirm({
          title: 'Generar Mensualidades',
          message: `¿Generar el cargo de mensualidad para todos los alumnos activos?`,
          type: 'info',
          confirmText: 'Generar Cargos',
          onConfirm: () => generateMonthlyBilling()
      });
  };

  const handleExport = () => {
      const data = groupedTransactions.map(g => ({
          Fecha: g.mainRecord.dueDate,
          Alumno: g.mainRecord.studentName,
          Concepto: g.isBatch ? `Lote (${g.itemCount} items)` : g.mainRecord.concept,
          Monto: g.totalAmount,
          Estado: g.mainRecord.status,
          Metodo: g.mainRecord.method || '-'
      }));
      exportToCSV(data, `Finanzas_${activeTab}`);
      addToast('Reporte descargado', 'success');
  };

  const getTimeValidation = (record: TuitionRecord) => {
      if (!record.paymentDate) return { isLate: false, diffDays: 0 };
      const due = new Date(record.dueDate);
      const paid = new Date(record.paymentDate);
      due.setHours(23, 59, 59, 999); 
      const isLate = paid > due;
      const diffTime = Math.abs(paid.getTime() - due.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return { isLate, diffDays };
  };

  return (
    <div className="flex flex-col h-full bg-[#F5F5F7]">
        
        {/* --- HEADER --- */}
        <div className="bg-white border-b border-gray-200 px-6 py-6 md:px-10 sticky top-0 z-20 shadow-sm">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900">Control Financiero</h1>
                    <p className="text-gray-500 mt-1 font-medium">Valida pagos, gestiona cobros y revisa el historial.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={handleExport} className="px-4 py-2.5 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all text-sm flex items-center gap-2 active:scale-95">
                        <span className="material-symbols-outlined text-lg">download</span> Exportar
                    </button>
                    <button onClick={() => setIsChargeModalOpen(true)} className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all text-sm flex items-center gap-2 shadow-lg shadow-orange-500/30 active:scale-95">
                        <span className="material-symbols-outlined text-lg">add_circle</span> Nuevo Cargo
                    </button>
                    <button onClick={handleGenerateBilling} className="px-5 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all text-sm flex items-center gap-2 shadow-lg active:scale-95">
                        <span className="material-symbols-outlined text-lg">payments</span> Generar Mensualidad
                    </button>
                </div>
            </div>

            {/* --- TABS --- */}
            <div className="max-w-[1600px] mx-auto mt-8 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex bg-gray-100 p-1.5 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar shadow-inner">
                    {[
                        { id: 'review', label: 'Por Revisar', count: stats.review, icon: 'rate_review' },
                        { id: 'pending', label: 'Pendientes', count: stats.pending, icon: 'pending' },
                        { id: 'overdue', label: 'Vencidos', count: stats.overdue, icon: 'warning' },
                        { id: 'paid', label: 'Historial', count: null, icon: 'history' },
                        { id: 'all', label: 'Todos', count: null, icon: 'list' },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${
                                activeTab === tab.id 
                                ? 'bg-white text-orange-600 shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'
                            }`}
                        >
                            <span className={`material-symbols-outlined text-[20px] ${activeTab === tab.id ? 'filled' : ''}`}>{tab.icon}</span>
                            {tab.label}
                            {tab.count !== null && tab.count > 0 && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${
                                    tab.id === 'review' ? 'bg-amber-100 text-amber-700' : 
                                    tab.id === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-80 group">
                    <span className="absolute left-4 top-3 text-gray-400 group-focus-within:text-orange-500 material-symbols-outlined text-[20px] transition-colors">search</span>
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        placeholder="Buscar alumno, monto..." 
                        className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm font-medium focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all" 
                    />
                </div>
            </div>
        </div>

        {/* --- LIST CONTENT --- */}
        <div className="flex-1 overflow-y-auto p-6 md:px-10">
            <div className="max-w-[1600px] mx-auto bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden min-h-[400px]">
                {groupedTransactions.length === 0 ? (
                    <EmptyState 
                        title="Sin movimientos" 
                        description={activeTab === 'review' ? "¡Excelente! No tienes pagos pendientes de revisar." : "No se encontraron registros con estos filtros."}
                        icon="check_circle"
                    />
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#F9FAFB] border-b border-gray-100 sticky top-0 backdrop-blur-sm z-10">
                            <tr>
                                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Fecha</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Alumno</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Concepto</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Estado</th>
                                <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Monto</th>
                                <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {groupedTransactions.map(group => {
                                const { mainRecord, isBatch, totalAmount, declaredAmount } = group;
                                const displayAmount = declaredAmount !== undefined ? declaredAmount : totalAmount;
                                
                                return (
                                    <tr key={group.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900 text-sm">{formatDateDisplay(mainRecord.dueDate)}</span>
                                                {mainRecord.paymentDate && (
                                                    <span className="text-[10px] text-gray-400 font-medium mt-0.5">
                                                        Pagado: {formatDateDisplay(mainRecord.paymentDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-gray-900 text-sm">{mainRecord.studentName}</div>
                                        </td>
                                        <td className="px-6 py-5 text-sm text-gray-500 font-medium">
                                            {isBatch ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 text-xs uppercase tracking-wide flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px] text-purple-500">layers</span>
                                                        Pago Lote ({group.itemCount} items)
                                                    </span>
                                                    <span className="text-xs mt-0.5 truncate max-w-[200px] text-gray-400">
                                                        {group.records.map(r => r.concept).join(', ')}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span>{mainRecord.concept}</span>
                                            )}
                                            {mainRecord.method && <span className="ml-2 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 border border-gray-200">{mainRecord.method}</span>}
                                        </td>
                                        <td className="px-6 py-5">
                                            <StatusBadge status={mainRecord.status} amount={mainRecord.amount} penalty={mainRecord.penaltyAmount} />
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            {mainRecord.status === 'in_review' && !isBatch ? (
                                                <div className="flex justify-end">
                                                    {/* SINGLE INPUT EDITOR */}
                                                    <DebtAmountEditor 
                                                        item={mainRecord} 
                                                        onUpdate={(id, val) => updateRecordAmount(id, val)} 
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <span className={`font-black text-sm tracking-tight ${mainRecord.status === 'paid' ? 'text-green-600' : 'text-gray-900'}`}>
                                                        ${displayAmount.toFixed(2)}
                                                    </span>
                                                    {declaredAmount !== undefined && declaredAmount < totalAmount && (
                                                        <div className="text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-0.5 rounded-lg inline-block mt-1">
                                                            Parcial (Total: ${totalAmount})
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            {mainRecord.status === 'in_review' ? (
                                                <button 
                                                    onClick={() => setSelectedGroup(group)}
                                                    className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-gray-900/10 transition-all active:scale-95 flex items-center gap-2 ml-auto"
                                                >
                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                    Revisar
                                                </button>
                                            ) : mainRecord.status === 'paid' ? (
                                                <button 
                                                    onClick={() => generateReceipt(mainRecord, academySettings, currentUser)}
                                                    className="size-9 bg-gray-50 hover:bg-white text-gray-400 hover:text-orange-600 border border-gray-200 rounded-xl transition-all shadow-sm flex items-center justify-center ml-auto"
                                                    title="Descargar Recibo"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                                </button>
                                            ) : (
                                                <span className="text-gray-300 text-xs font-medium">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>

        {/* --- REVIEW MODAL --- */}
        {activeGroup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-[2rem] w-full max-w-4xl h-[85vh] shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
                    
                    {/* Left: Proof Image */}
                    <div className="w-1/2 bg-gray-50 flex items-center justify-center relative p-6 border-r border-gray-100">
                        {activeGroup.mainRecord.proofUrl ? (
                            activeGroup.mainRecord.proofType?.includes('pdf') ? (
                                <iframe src={activeGroup.mainRecord.proofUrl} className="w-full h-full rounded-2xl border border-gray-200 shadow-sm" />
                            ) : (
                                <img src={activeGroup.mainRecord.proofUrl} className="max-w-full max-h-full object-contain rounded-xl shadow-lg" />
                            )
                        ) : (
                            <div className="text-gray-300 flex flex-col items-center">
                                <span className="material-symbols-outlined text-6xl mb-2">broken_image</span>
                                <p className="font-medium text-sm">Sin comprobante visible</p>
                            </div>
                        )}
                        <div className="absolute top-6 left-6 bg-white/80 backdrop-blur-md text-gray-900 px-4 py-1.5 rounded-full text-xs font-bold border border-gray-200 shadow-sm">
                            Comprobante {activeGroup.isBatch ? '(Lote)' : ''}
                        </div>
                    </div>

                    {/* Right: Validation & Waterfall Preview */}
                    <div className="w-1/2 flex flex-col bg-white">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">Revisión de Pago</h2>
                                <p className="text-gray-500 text-sm font-medium">Distribución automática de fondos.</p>
                            </div>
                            <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            
                            {/* Total Amount Display */}
                            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Monto Declarado</p>
                                    <span className="bg-white border border-gray-200 px-3 py-1 rounded-lg text-xs font-bold text-gray-700 shadow-sm">
                                        {activeGroup.mainRecord.method}
                                    </span>
                                </div>
                                <p className="text-4xl font-black text-gray-900 tracking-tight">
                                    ${(activeGroup.declaredAmount !== undefined ? activeGroup.declaredAmount : activeGroup.totalAmount).toFixed(2)}
                                </p>
                                {activeGroup.declaredAmount !== undefined && activeGroup.declaredAmount < activeGroup.totalAmount && (
                                    <p className="text-xs text-orange-600 font-bold mt-2 flex items-center gap-1 bg-orange-50 w-fit px-2 py-1 rounded-lg border border-orange-100">
                                        <span className="material-symbols-outlined text-[14px]">warning</span>
                                        Pago parcial. Deuda total era ${activeGroup.totalAmount}
                                    </p>
                                )}
                            </div>

                            {/* REMOVED DUPLICATE INPUT - CLEAN INTERFACE */}

                            {/* PREVIEW: Waterfall Distribution */}
                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 ml-1 tracking-wider">Aplicación de Fondos</h4>
                                <div className="space-y-3">
                                    {previewDistribution.map((item: any) => (
                                        <div key={item.id} className="flex flex-col p-4 bg-white border border-gray-100 rounded-2xl relative overflow-hidden shadow-sm transition-all hover:border-gray-200">
                                            {/* Status Indicator Bar */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                                                item._status === 'paid' ? 'bg-green-500' : item._status === 'partial' ? 'bg-orange-500' : 'bg-red-300'
                                            }`}></div>
                                            
                                            <div className="flex justify-between items-start pl-3">
                                                <div>
                                                    <span className="text-sm font-bold text-gray-900 block">{item.concept}</span>
                                                    {/* SINGLE TRUTH EDITABLE DEBT */}
                                                    <div className="mt-2">
                                                        <DebtAmountEditor 
                                                            item={item} 
                                                            onUpdate={(id, val) => updateRecordAmount(id, val)}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`font-mono font-bold text-sm ${item._status === 'paid' ? 'text-green-600' : 'text-orange-600'}`}>
                                                        ${item._paid.toFixed(2)}
                                                    </span>
                                                    <div className="text-[10px] font-bold uppercase mt-0.5 tracking-wide text-gray-400">
                                                        {item._status === 'paid' ? 'Cubierto' : item._status === 'partial' ? 'Abono' : 'Pendiente'}
                                                    </div>
                                                </div>
                                            </div>

                                            {item._remaining > 0 && (
                                                <div className="mt-3 pl-3 pt-2 border-t border-gray-50 flex items-center gap-2 text-xs text-orange-600 font-bold">
                                                    <span className="material-symbols-outlined text-[14px]">pie_chart</span>
                                                    Restarán ${item._remaining.toFixed(2)} por cobrar
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Time Validation */}
                            {(() => {
                                const { isLate, diffDays } = getTimeValidation(activeGroup.mainRecord);
                                return (
                                    <div className={`rounded-2xl p-4 border text-xs ${isLate ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
                                        <div className="flex items-center gap-2 font-bold mb-1 uppercase tracking-wide">
                                            <span className="material-symbols-outlined text-base">{isLate ? 'history_toggle_off' : 'verified_user'}</span>
                                            {isLate ? 'Pago Tardío' : 'A Tiempo'}
                                        </div>
                                        <p className="font-medium opacity-80">{isLate ? `Subido ${diffDays} días después del vencimiento.` : `Subido antes de la fecha límite.`}</p>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="p-8 border-t border-gray-100 bg-gray-50 flex gap-4">
                            <button onClick={handleReject} className="flex-1 py-4 rounded-xl border border-gray-200 bg-white text-gray-600 font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-all shadow-sm">Rechazar</button>
                            <button onClick={handleApprove} className="flex-[2] py-4 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">check_circle</span>
                                Confirmar Distribución
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <CreateChargeModal isOpen={isChargeModalOpen} onClose={() => setIsChargeModalOpen(false)} />
    </div>
  );
};

export default Finance;
