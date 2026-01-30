
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
import TransactionDetailModal from '../../components/ui/TransactionDetailModal';

// --- HELPER COMPONENTS ---

const StatusBadge: React.FC<{ status: TuitionStatus; amount: number; penalty: number }> = ({ status, amount, penalty }) => {
    switch (status) {
        case 'paid':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-green-50 text-green-700 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-[14px] filled">check_circle</span>
                    Pagado
                </span>
            );
        case 'in_review':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-50 text-blue-700 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-[14px] filled">hourglass_top</span>
                    Revisar
                </span>
            );
        case 'overdue':
            return (
                <div className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-50 text-red-700 uppercase tracking-wide">
                        <span className="material-symbols-outlined text-[14px] filled">warning</span>
                        Vencido
                    </span>
                    {penalty > 0 && <span className="text-[10px] text-primary font-bold ml-1">+${penalty} Recargo</span>}
                </div>
            );
        case 'partial':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-700 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-[14px] filled">pie_chart</span>
                    Parcial
                </span>
            );
        default: // pending
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-gray-100 text-gray-500 uppercase tracking-wide">
                    <span className="material-symbols-outlined text-[14px]">pending</span>
                    Pendiente
                </span>
            );
    }
};

/**
 * DEBT AMOUNT EDITOR
 */
const DebtAmountEditor = ({ item, onUpdate }: { item: TuitionRecord, onUpdate: (id: string, val: number) => void }) => {
    const totalDebt = item.amount + (item.penaltyAmount || 0);
    const [val, setVal] = useState(totalDebt.toString());
    const { addToast } = useToast();
    
    useEffect(() => {
        const currentTotal = item.amount + (item.penaltyAmount || 0);
        setVal(currentTotal.toString());
    }, [item.amount, item.penaltyAmount]);

    const handleSave = () => {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0) {
            onUpdate(item.id, num);
            addToast("Monto actualizado correctamente", 'success');
        }
    };

    const currentTotal = item.amount + (item.penaltyAmount || 0);
    const hasChanged = parseFloat(val) !== currentTotal;

    return (
        <div className="flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2">
                <div className="relative group">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold pointer-events-none text-sm">$</span>
                    <input 
                        type="number"
                        className="w-32 pl-7 pr-3 py-2 bg-background-input border-transparent rounded-lg text-lg font-bold text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-right"
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
                    className="flex items-center gap-1.5 bg-primary hover:bg-primary-hover text-white px-3 py-1.5 rounded-lg transition-all active:scale-95 animate-in fade-in slide-in-from-right-2 duration-300"
                >
                    <span className="material-symbols-outlined text-[16px] font-bold">check</span>
                    <span className="text-xs font-bold">Actualizar</span>
                </button>
            )}
        </div>
    );
};

interface GroupedTransaction {
    id: string; 
    isBatch: boolean;
    records: TuitionRecord[];
    mainRecord: TuitionRecord; 
    totalOriginalAmount: number; 
    totalRemainingDebt: number;  
    declaredAmount?: number;     
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
      updateRecordAmount,
      deleteRecord
  } = useStore();
  
  const { addToast } = useToast();
  const { confirm } = useConfirmation();
  
  const [activeTab, setActiveTab] = useState<'review' | 'pending' | 'overdue' | 'paid' | 'all'>('review');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedGroup, setSelectedGroup] = useState<GroupedTransaction | null>(null);
  const [viewDetailRecord, setViewDetailRecord] = useState<TuitionRecord | null>(null);
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false);

  // -- DATA PROCESSING (Simplified for brevity) --
  const rawFilteredRecords = useMemo(() => {
      let filtered = records;
      if (activeTab === 'review') filtered = filtered.filter(r => r.status === 'in_review');
      else if (activeTab === 'pending') filtered = filtered.filter(r => r.status === 'pending' || r.status === 'charged' || r.status === 'partial');
      else if (activeTab === 'overdue') filtered = filtered.filter(r => r.status === 'overdue');
      else if (activeTab === 'paid') filtered = filtered.filter(r => r.status === 'paid');

      if (searchQuery) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(r => r.studentName?.toLowerCase().includes(q) || r.concept.toLowerCase().includes(q) || r.amount.toString().includes(q));
      }
      return filtered;
  }, [records, activeTab, searchQuery]);

  const groupedTransactions: GroupedTransaction[] = useMemo(() => {
      const groups: Record<string, TuitionRecord[]> = {};
      const result: GroupedTransaction[] = [];
      const processedIds = new Set<string>();

      rawFilteredRecords.forEach(r => {
          if (r.batchPaymentId && activeTab === 'review') { 
              if (!groups[r.batchPaymentId]) groups[r.batchPaymentId] = [];
              groups[r.batchPaymentId].push(r);
          }
      });

      rawFilteredRecords.forEach(r => {
          if (processedIds.has(r.id)) return;
          if (r.batchPaymentId && groups[r.batchPaymentId] && activeTab === 'review') {
              const batchItems = groups[r.batchPaymentId];
              batchItems.forEach(i => processedIds.add(i.id));
              const declared = batchItems.find(i => i.declaredAmount !== undefined)?.declaredAmount;
              result.push({
                  id: r.batchPaymentId,
                  isBatch: true,
                  records: batchItems,
                  mainRecord: r,
                  totalOriginalAmount: batchItems.reduce((acc, item) => acc + (item.originalAmount ?? item.amount) + item.penaltyAmount, 0),
                  totalRemainingDebt: batchItems.reduce((acc, item) => acc + item.amount + item.penaltyAmount, 0),
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
                  totalOriginalAmount: (r.originalAmount ?? r.amount) + r.penaltyAmount,
                  totalRemainingDebt: r.amount + r.penaltyAmount,
                  declaredAmount: r.declaredAmount,
                  itemCount: 1
              });
          }
      });
      return result.sort((a, b) => new Date(b.mainRecord.dueDate).getTime() - new Date(a.mainRecord.dueDate).getTime());
  }, [rawFilteredRecords, activeTab]);

  const activeGroup = useMemo(() => {
      if (!selectedGroup) return null;
      const freshRecords = records.filter(r => selectedGroup.records.some(old => old.id === r.id));
      if (freshRecords.length === 0) return null;
      const mainRecord = freshRecords.find(r => r.id === selectedGroup.mainRecord.id) || freshRecords[0];
      return {
          ...selectedGroup,
          records: freshRecords,
          mainRecord,
          totalOriginalAmount: freshRecords.reduce((acc, item) => acc + (item.originalAmount ?? item.amount) + item.penaltyAmount, 0),
          totalRemainingDebt: freshRecords.reduce((acc, item) => acc + item.amount + item.penaltyAmount, 0),
          declaredAmount: freshRecords.find(i => i.declaredAmount !== undefined)?.declaredAmount
      };
  }, [selectedGroup, records]);

  const stats = useMemo(() => {
      return {
          review: records.filter(r => r.status === 'in_review').length,
          overdue: records.filter(r => r.status === 'overdue').length,
          pending: records.filter(r => r.status === 'pending' || r.status === 'charged' || r.status === 'partial').length,
      };
  }, [records]);

  const amountToApprove = useMemo(() => {
      if (!activeGroup) return 0;
      if (activeGroup.declaredAmount !== undefined && activeGroup.declaredAmount >= activeGroup.totalRemainingDebt) {
          return activeGroup.declaredAmount;
      }
      return activeGroup.totalRemainingDebt;
  }, [activeGroup]);

  const previewDistribution = useMemo(() => {
      if (!activeGroup) return [];
      const items = [...activeGroup.records].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      const mandatory = items.filter(r => !r.canBePaidInParts);
      const splittable = items.filter(r => r.canBePaidInParts);
      let available = amountToApprove;
      const preview = [];

      for (const item of mandatory) {
          const debt = item.amount + item.penaltyAmount;
          if (available >= debt - 0.01) {
              preview.push({ ...item, _status: 'paid', _paid: debt, _remaining: 0 });
              available -= debt;
          } else {
              preview.push({ ...item, _status: 'unpaid', _paid: 0, _remaining: debt });
              available = 0; 
          }
      }
      for (const item of splittable) {
          const debt = item.amount + item.penaltyAmount;
          if (available <= 0.01) {
              preview.push({ ...item, _status: 'unpaid', _paid: 0, _remaining: debt });
              continue;
          }
          if (available >= debt - 0.01) {
              preview.push({ ...item, _status: 'paid', _paid: debt, _remaining: 0 });
              available -= debt;
          } else {
              preview.push({ ...item, _status: 'partial', _paid: available, _remaining: debt - available });
              available = 0;
          }
      }
      return preview;
  }, [activeGroup, amountToApprove]);

  // -- ACTIONS --
  const handleApprove = () => {
      if (!activeGroup) return;
      previewDistribution.forEach(item => {
          if (item._paid > 0) {
              const previouslyPaid = (item.originalAmount || item.amount) - item.amount;
              const history = previouslyPaid > 0 ? [{ date: item.paymentDate || new Date().toISOString(), amount: previouslyPaid, method: 'Pago Previo' }] : [];
              generateReceipt(item, academySettings, currentUser, { paymentStatus: item._status === 'paid' ? 'completed' : 'partial', currentPaymentAmount: item._paid, paymentHistory: history });
          }
      });
      if (activeGroup.isBatch) approveBatchPayment(activeGroup.id, amountToApprove);
      else {
          if (activeGroup.mainRecord.category !== 'Mensualidad' && amountToApprove < activeGroup.totalRemainingDebt) {
               approveBatchPayment(activeGroup.records[0].batchPaymentId || `temp-${activeGroup.records[0].id}`, amountToApprove);
          } else approvePayment(activeGroup.id, amountToApprove);
      }
      setSelectedGroup(null);
  };

  const handleReject = () => {
      if (!activeGroup) return;
      confirm({
          title: activeGroup.isBatch ? 'Rechazar Lote' : 'Rechazar Pago',
          message: 'El estatus volverá a Pendiente.',
          type: 'danger',
          confirmText: 'Rechazar',
          onConfirm: () => {
              if (activeGroup.isBatch) rejectBatchPayment(activeGroup.id);
              else rejectPayment(activeGroup.id);
              setSelectedGroup(null);
          }
      });
  };

  const handleDeleteRecord = (record: TuitionRecord) => {
      setViewDetailRecord(null);
      confirm({
          title: 'Eliminar Movimiento',
          message: 'Esta acción no se puede deshacer.',
          type: 'danger',
          confirmText: 'Eliminar',
          onConfirm: () => deleteRecord(record.id)
      });
  };

  const handleGenerateBilling = () => {
      confirm({
          title: 'Generar Mensualidades',
          message: `¿Generar el cargo de mensualidad para todos los alumnos activos?`,
          type: 'info',
          confirmText: 'Generar',
          onConfirm: () => generateMonthlyBilling()
      });
  };

  const handleExport = () => {
      const data = groupedTransactions.map(g => ({
          Fecha: g.mainRecord.dueDate,
          Alumno: g.mainRecord.studentName,
          Concepto: g.isBatch ? `Lote (${g.itemCount})` : g.mainRecord.concept,
          Monto: g.totalOriginalAmount,
          Estado: g.mainRecord.status,
          Metodo: g.mainRecord.method || '-'
      }));
      exportToCSV(data, `Finanzas_${activeTab}`);
      addToast('Reporte descargado', 'success');
  };

  return (
    <div className="flex flex-col h-full bg-background-light">
        {/* --- HEADER --- */}
        <div className="bg-white border-b border-transparent px-6 py-6 md:px-10 sticky top-0 z-20">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Control Financiero</h1>
                    <p className="text-gray-500 mt-1 font-medium">Valida pagos y gestiona cobros.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={handleExport} className="px-4 py-2.5 bg-background-input text-gray-600 font-bold rounded-lg hover:bg-gray-200 transition-all text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">download</span> Exportar
                    </button>
                    {/* RED BUTTONS - NO ORANGE */}
                    <button onClick={() => setIsChargeModalOpen(true)} className="px-5 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary-hover transition-all text-sm flex items-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-lg">add_circle</span> Nuevo Cargo
                    </button>
                    <button onClick={handleGenerateBilling} className="px-5 py-2.5 bg-gray-900 text-white font-bold rounded-lg hover:bg-black transition-all text-sm flex items-center gap-2 shadow-sm">
                        <span className="material-symbols-outlined text-lg">payments</span> Generar Mensualidad
                    </button>
                </div>
            </div>

            {/* --- TABS --- */}
            <div className="max-w-[1600px] mx-auto mt-8 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex bg-background-input p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar">
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
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                                activeTab === tab.id 
                                ? 'bg-white text-primary shadow-sm' 
                                : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <span className={`material-symbols-outlined text-[20px] ${activeTab === tab.id ? 'filled' : ''}`}>{tab.icon}</span>
                            {tab.label}
                            {tab.count !== null && tab.count > 0 && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${
                                    tab.id === 'review' ? 'bg-blue-100 text-blue-700' : 
                                    tab.id === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-gray-200 text-gray-600'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-80 group">
                    <span className="absolute left-4 top-3 text-gray-400 material-symbols-outlined text-[20px]">search</span>
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        placeholder="Buscar alumno..." 
                        className="w-full pl-12 pr-4 py-3 bg-background-input border-transparent rounded-lg text-sm font-medium focus:bg-white focus:ring-0 focus:border-primary transition-all" 
                    />
                </div>
            </div>
        </div>

        {/* --- LIST CONTENT --- */}
        <div className="flex-1 overflow-y-auto p-6 md:px-10">
            <div className="max-w-[1600px] mx-auto bg-white rounded-xl border border-transparent overflow-hidden min-h-[400px]">
                {groupedTransactions.length === 0 ? (
                    <EmptyState 
                        title="Sin movimientos" 
                        description={activeTab === 'review' ? "¡Excelente! No tienes pagos pendientes." : "No se encontraron registros."}
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
                                const { mainRecord, isBatch, totalOriginalAmount, totalRemainingDebt, declaredAmount } = group;
                                const isPaid = mainRecord.status === 'paid';
                                const isPartial = mainRecord.status === 'partial' || (declaredAmount !== undefined && declaredAmount < totalOriginalAmount);
                                const paidSoFar = totalOriginalAmount - totalRemainingDebt;
                                const isMensualidad = mainRecord.category === 'Mensualidad' || mainRecord.concept.toLowerCase().includes('mensualidad');
                                const breakdownTooltip = `Total: $${totalOriginalAmount} \nPagado: $${paidSoFar} \nRestante: $${totalRemainingDebt}`;

                                return (
                                    <tr 
                                        key={group.id} 
                                        className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                        onClick={() => setViewDetailRecord(group.mainRecord)}
                                    >
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
                                                        Lote ({group.itemCount})
                                                    </span>
                                                    <span className="text-xs mt-0.5 truncate max-w-[200px] text-gray-400">
                                                        {group.records.map(r => r.concept).join(', ')}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span>{mainRecord.concept}</span>
                                            )}
                                            {mainRecord.method && <span className="ml-2 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500 border border-transparent">{mainRecord.method}</span>}
                                        </td>
                                        <td className="px-6 py-5">
                                            <StatusBadge status={mainRecord.status} amount={mainRecord.amount} penalty={mainRecord.penaltyAmount} />
                                        </td>
                                        
                                        <td className="px-6 py-5 text-right" title={breakdownTooltip}>
                                            {mainRecord.status === 'in_review' && !isBatch && isMensualidad ? (
                                                <div className="flex justify-end">
                                                    <DebtAmountEditor 
                                                        item={mainRecord} 
                                                        onUpdate={(id, val) => updateRecordAmount(id, val)} 
                                                    />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end">
                                                    <span className={`font-black text-sm tracking-tight ${isPaid ? 'text-green-700' : 'text-gray-900'}`}>
                                                        ${totalOriginalAmount.toFixed(2)}
                                                    </span>
                                                    {isPartial && !isPaid && (
                                                        <div className="mt-1 flex flex-col items-end gap-0.5">
                                                            <div className="h-1.5 w-16 bg-gray-200 rounded-full overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-primary rounded-full" 
                                                                    style={{ width: `${(paidSoFar / totalOriginalAmount) * 100}%` }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-[10px] text-primary font-bold">
                                                                Abonado: ${paidSoFar.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        
                                        <td className="px-8 py-5 text-right">
                                            {mainRecord.status === 'in_review' ? (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setSelectedGroup(group); }}
                                                    className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-all active:scale-95 flex items-center gap-2 ml-auto"
                                                >
                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                    Validar
                                                </button>
                                            ) : (mainRecord.status === 'paid' || mainRecord.status === 'partial') ? (
                                                <button 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (group.isBatch) {
                                                            group.records.forEach(r => generateReceipt(r, academySettings, currentUser));
                                                        } else {
                                                            generateReceipt(mainRecord, academySettings, currentUser);
                                                        }
                                                    }}
                                                    className="size-9 bg-gray-50 hover:bg-white text-gray-400 hover:text-primary rounded-lg transition-all flex items-center justify-center ml-auto"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">
                                                        {group.isBatch ? 'folder_open' : 'receipt_long'}
                                                    </span>
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
                <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] shadow-xl flex overflow-hidden animate-in zoom-in-95 duration-200 border border-transparent">
                    
                    <div className="w-1/2 bg-gray-50 flex items-center justify-center relative p-6 border-r border-gray-100">
                        {activeGroup.mainRecord.proofUrl ? (
                            activeGroup.mainRecord.proofType?.includes('pdf') ? (
                                <iframe src={activeGroup.mainRecord.proofUrl} className="w-full h-full rounded-xl border border-gray-200" />
                            ) : (
                                <img src={activeGroup.mainRecord.proofUrl} className="max-w-full max-h-full object-contain rounded-lg shadow-sm" />
                            )
                        ) : (
                            <div className="text-gray-300 flex flex-col items-center">
                                <span className="material-symbols-outlined text-6xl mb-2">broken_image</span>
                                <p className="font-medium text-sm">Sin comprobante visible</p>
                            </div>
                        )}
                    </div>

                    <div className="w-1/2 flex flex-col bg-white">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">Revisión de Pago</h2>
                                <p className="text-gray-500 text-sm font-medium">Distribución de fondos.</p>
                            </div>
                            <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            <div className="bg-gray-50 rounded-xl p-6 border border-transparent">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Monto a Aprobar</p>
                                    <span className="bg-white border border-transparent px-3 py-1 rounded-lg text-xs font-bold text-gray-700">
                                        {activeGroup.mainRecord.method}
                                    </span>
                                </div>
                                <p className="text-4xl font-black text-gray-900 tracking-tight">
                                    ${amountToApprove.toFixed(2)}
                                </p>
                            </div>

                            <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3 ml-1 tracking-wider">Aplicación</h4>
                                <div className="space-y-3">
                                    {previewDistribution.map((item: any) => {
                                        const isMensualidadModal = item.category === 'Mensualidad' || item.concept.toLowerCase().includes('mensualidad');
                                        return (
                                            <div key={item.id} className="flex flex-col p-4 bg-white border border-gray-100 rounded-xl relative overflow-hidden transition-all hover:border-gray-200">
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                    item._status === 'paid' ? 'bg-green-500' : item._status === 'partial' ? 'bg-primary' : 'bg-red-300'
                                                }`}></div>
                                                
                                                <div className="flex justify-between items-start pl-3">
                                                    <div>
                                                        <span className="text-sm font-bold text-gray-900 block">{item.concept}</span>
                                                        <div className="mt-2">
                                                            {isMensualidadModal ? (
                                                                <DebtAmountEditor 
                                                                    item={item} 
                                                                    onUpdate={(id, val) => updateRecordAmount(id, val)}
                                                                />
                                                            ) : (
                                                                <span className="text-xs text-gray-500 font-mono">Deuda: ${item.amount + (item.penaltyAmount || 0)}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`font-mono font-bold text-sm ${item._status === 'paid' ? 'text-green-600' : 'text-primary'}`}>
                                                            ${item._paid.toFixed(2)}
                                                        </span>
                                                        <div className="text-[10px] font-bold uppercase mt-0.5 tracking-wide text-gray-400">
                                                            {item._status === 'paid' ? 'Cubierto' : item._status === 'partial' ? 'Abono' : 'Pendiente'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-gray-100 bg-gray-50 flex gap-4">
                            <button onClick={handleReject} className="flex-1 py-4 rounded-xl border border-gray-200 bg-white text-gray-600 font-bold hover:bg-red-50 hover:text-red-600 transition-all">Rechazar</button>
                            {/* RED ACTION BUTTON */}
                            <button onClick={handleApprove} className="flex-[2] py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover transition-all active:scale-95 flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">check_circle</span>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        <CreateChargeModal isOpen={isChargeModalOpen} onClose={() => setIsChargeModalOpen(false)} />

        <TransactionDetailModal
            isOpen={!!viewDetailRecord}
            onClose={() => setViewDetailRecord(null)}
            record={viewDetailRecord}
            role="master"
            paymentHistory={viewDetailRecord?.paymentHistory || []}
            onApprove={(r) => { approvePayment(r.id); setViewDetailRecord(null); }}
            onReject={(r) => { rejectPayment(r.id); setViewDetailRecord(null); }}
            onDownloadReceipt={(r) => generateReceipt(r, academySettings, currentUser)}
            onReview={(r) => {
                const isBatch = !!r.batchPaymentId;
                let groupRecords = [r];
                if (isBatch) {
                     groupRecords = records.filter(item => item.batchPaymentId === r.batchPaymentId);
                }
                const group: GroupedTransaction = {
                    id: isBatch ? r.batchPaymentId! : r.id,
                    isBatch: isBatch,
                    records: groupRecords,
                    mainRecord: r,
                    totalOriginalAmount: groupRecords.reduce((acc, item) => acc + (item.originalAmount ?? item.amount) + item.penaltyAmount, 0),
                    totalRemainingDebt: groupRecords.reduce((acc, item) => acc + item.amount + item.penaltyAmount, 0),
                    declaredAmount: groupRecords.find(i => i.declaredAmount !== undefined)?.declaredAmount,
                    itemCount: groupRecords.length
                };
                setViewDetailRecord(null);
                setSelectedGroup(group);
            }}
            onDelete={() => {
                if (viewDetailRecord) handleDeleteRecord(viewDetailRecord);
            }}
        />
    </div>
  );
};

export default Finance;
