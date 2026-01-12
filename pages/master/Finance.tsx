
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import { TuitionRecord, TuitionStatus } from '../../types';
import { exportToCSV } from '../../utils/csvExport';
import { generateReceipt } from '../../utils/pdfGenerator';
import { formatDateDisplay } from '../../utils/dateUtils';
import EmptyState from '../../components/ui/EmptyState';
import CreateChargeModal from '../../components/finance/CreateChargeModal';

// --- MINIMALIST STATUS BADGE (DOT INDICATOR) ---
const StatusBadge: React.FC<{ status: TuitionStatus; amount: number; penalty: number }> = ({ status, amount, penalty }) => {
    const baseClasses = "inline-flex items-center gap-2 px-2.5 py-1 rounded-md border text-[10px] font-medium uppercase tracking-wider transition-all";
    
    switch (status) {
        case 'paid':
            return (
                <span className={`${baseClasses} bg-zinc-500/5 border-emerald-500/20 text-emerald-400`}>
                    <div className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.8)]"></div>
                    Pagado
                </span>
            );
        case 'in_review':
            return (
                <span className={`${baseClasses} bg-zinc-500/5 border-orange-500/20 text-orange-400 animate-pulse`}>
                    <div className="size-1.5 rounded-full bg-orange-500"></div>
                    Revisión
                </span>
            );
        case 'overdue':
            return (
                <div className="flex flex-col items-start gap-1">
                    <span className={`${baseClasses} bg-zinc-500/5 border-red-500/20 text-red-400`}>
                        <div className="size-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]"></div>
                        Vencido
                    </span>
                    {penalty > 0 && <span className="text-[9px] text-red-500/80 font-mono ml-4">+${penalty} Multa</span>}
                </div>
            );
        case 'partial':
            return (
                <span className={`${baseClasses} bg-zinc-500/5 border-blue-500/20 text-blue-400`}>
                    <div className="size-1.5 rounded-full bg-blue-500"></div>
                    Parcial
                </span>
            );
        default: // pending
            return (
                <span className={`${baseClasses} bg-zinc-500/5 border-zinc-700 text-zinc-400`}>
                    <div className="size-1.5 rounded-full bg-zinc-500"></div>
                    Pendiente
                </span>
            );
    }
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
      rejectBatchPayment 
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

  // -- STATS --
  const stats = useMemo(() => {
      return {
          review: records.filter(r => r.status === 'in_review').length,
          overdue: records.filter(r => r.status === 'overdue').length,
          pending: records.filter(r => r.status === 'pending' || r.status === 'charged' || r.status === 'partial').length,
      };
  }, [records]);

  // -- ACTIONS --

  const handleApprove = () => {
      if (!selectedGroup) return;
      const amountToApprove = selectedGroup.declaredAmount !== undefined ? selectedGroup.declaredAmount : selectedGroup.totalAmount;

      if (selectedGroup.isBatch) {
          approveBatchPayment(selectedGroup.id, amountToApprove);
      } else {
          if (amountToApprove < selectedGroup.totalAmount) {
               approveBatchPayment(selectedGroup.records[0].batchPaymentId || `temp-${selectedGroup.records[0].id}`, amountToApprove);
          } else {
               approvePayment(selectedGroup.id);
          }
      }
      setSelectedGroup(null);
  };

  const handleReject = () => {
      if (!selectedGroup) return;
      confirm({
          title: selectedGroup.isBatch ? 'Rechazar Lote' : 'Rechazar Pago',
          message: 'El estatus volverá a Pendiente/Vencido y se notificará al alumno.',
          type: 'danger',
          confirmText: 'Rechazar',
          onConfirm: () => {
              if (selectedGroup.isBatch) {
                  rejectBatchPayment(selectedGroup.id);
              } else {
                  rejectPayment(selectedGroup.id);
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

  return (
    <div className="flex flex-col h-full bg-[#121212] text-zinc-200 font-sans">
        
        {/* --- HEADER --- */}
        <div className="bg-[#121212]/80 backdrop-blur-xl border-b border-white/5 px-6 py-6 md:px-10 sticky top-0 z-20">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white">Control Financiero</h1>
                    <p className="text-zinc-500 mt-1 font-medium text-sm">Valida pagos y gestiona cobros.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={handleExport} className="px-4 py-2 bg-transparent border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 font-bold text-xs flex items-center gap-2 rounded-lg transition-all active:scale-95">
                        <span className="material-symbols-outlined text-lg">download</span> Exportar
                    </button>
                    <button onClick={() => setIsChargeModalOpen(true)} className="px-4 py-2 bg-zinc-100 hover:bg-white text-black font-bold text-xs flex items-center gap-2 transition-all rounded-lg shadow-lg shadow-white/5 active:scale-95">
                        <span className="material-symbols-outlined text-lg">add</span> Nuevo Cargo
                    </button>
                    <button onClick={handleGenerateBilling} className="px-4 py-2 bg-[#18181b] border border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-600 font-bold text-xs flex items-center gap-2 transition-all rounded-lg active:scale-95">
                        <span className="material-symbols-outlined text-lg">payments</span> Mensualidad
                    </button>
                </div>
            </div>

            {/* --- TABS --- */}
            <div className="max-w-[1600px] mx-auto mt-8 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex bg-[#18181b] p-1 rounded-xl border border-white/5 w-full md:w-auto overflow-x-auto no-scrollbar">
                    {[
                        { id: 'review', label: 'Por Revisar', count: stats.review },
                        { id: 'pending', label: 'Pendientes', count: stats.pending },
                        { id: 'overdue', label: 'Vencidos', count: stats.overdue },
                        { id: 'paid', label: 'Historial', count: null },
                        { id: 'all', label: 'Todos', count: null },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-1.5 text-[11px] font-bold transition-all whitespace-nowrap rounded-lg ${
                                activeTab === tab.id 
                                ? 'bg-zinc-700 text-white shadow-sm' 
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                            }`}
                        >
                            {tab.label}
                            {tab.count !== null && tab.count > 0 && (
                                <span className={`ml-1 px-1.5 py-0.5 text-[9px] rounded-md ${
                                    tab.id === 'review' ? 'bg-orange-500/20 text-orange-400' : 
                                    tab.id === 'overdue' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72">
                    <span className="absolute left-3 top-2.5 text-zinc-600 material-symbols-outlined text-[18px]">search</span>
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        placeholder="Buscar..." 
                        className="w-full pl-10 pr-4 py-2 bg-[#18181b] border border-white/5 text-xs text-zinc-300 focus:border-zinc-700 focus:ring-0 placeholder-zinc-600 transition-all rounded-lg" 
                    />
                </div>
            </div>
        </div>

        {/* --- LIST CONTENT --- */}
        <div className="flex-1 overflow-y-auto p-6 md:px-10">
            <div className="max-w-[1600px] mx-auto min-h-[400px]">
                {groupedTransactions.length === 0 ? (
                    <EmptyState 
                        title="Sin movimientos" 
                        description={activeTab === 'review' ? "No tienes pagos pendientes de revisar." : "No se encontraron registros."}
                        icon="check_circle"
                    />
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 z-10 backdrop-blur-md bg-[#121212]/90 border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Fecha</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Alumno</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Concepto</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-right">Monto</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {groupedTransactions.map((group) => {
                                const { mainRecord, isBatch, totalAmount, declaredAmount } = group;
                                const displayAmount = declaredAmount !== undefined ? declaredAmount : totalAmount;
                                
                                return (
                                    <tr key={group.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-zinc-300 text-xs">{formatDateDisplay(mainRecord.dueDate)}</span>
                                                {mainRecord.paymentDate && (
                                                    <span className="text-[10px] text-zinc-600 mt-0.5 font-mono">
                                                        {formatDateDisplay(mainRecord.paymentDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-zinc-200 text-sm">{mainRecord.studentName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-zinc-400">
                                            {isBatch ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-orange-400 text-[10px] uppercase tracking-wide flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[12px]">layers</span>
                                                        Lote ({group.itemCount})
                                                    </span>
                                                    <span className="text-[10px] mt-0.5 truncate max-w-[200px] opacity-60">
                                                        {group.records.map(r => r.concept).join(', ')}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="font-medium">{mainRecord.concept}</span>
                                            )}
                                            {mainRecord.method && <span className="ml-2 text-[9px] border border-white/10 bg-white/5 px-1.5 py-0.5 rounded text-zinc-500 uppercase">{mainRecord.method}</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={mainRecord.status} amount={mainRecord.amount} penalty={mainRecord.penaltyAmount} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-mono font-bold text-sm ${mainRecord.status === 'paid' ? 'text-emerald-500' : 'text-zinc-200'}`}>
                                                ${displayAmount.toFixed(2)}
                                            </span>
                                            {declaredAmount !== undefined && declaredAmount < totalAmount && (
                                                <div className="text-[9px] text-orange-500 font-bold uppercase tracking-wider mt-0.5">Parcial</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {mainRecord.status === 'in_review' ? (
                                                <button 
                                                    onClick={() => setSelectedGroup(group)}
                                                    className="bg-zinc-100 hover:bg-white text-black text-[10px] font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95"
                                                >
                                                    Revisar
                                                </button>
                                            ) : mainRecord.status === 'paid' ? (
                                                <button 
                                                    onClick={() => generateReceipt(mainRecord, academySettings, currentUser)}
                                                    className="text-zinc-600 hover:text-white p-1.5 transition-colors rounded-lg hover:bg-white/5"
                                                    title="Recibo"
                                                >
                                                    <span className="material-symbols-outlined text-[18px]">receipt_long</span>
                                                </button>
                                            ) : (
                                                <span className="text-zinc-700 text-xs">-</span>
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
        {selectedGroup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-in fade-in duration-200">
                <div className="bg-[#09090b] w-full max-w-5xl h-[85vh] flex overflow-hidden border border-white/10 shadow-2xl rounded-2xl">
                    
                    {/* Left: Proof */}
                    <div className="w-1/2 bg-black/30 flex items-center justify-center relative p-8 border-r border-white/5">
                        {selectedGroup.mainRecord.proofUrl ? (
                            selectedGroup.mainRecord.proofType?.includes('pdf') ? (
                                <iframe src={selectedGroup.mainRecord.proofUrl} className="w-full h-full border border-white/10 rounded-xl" />
                            ) : (
                                <img src={selectedGroup.mainRecord.proofUrl} className="max-w-full max-h-full object-contain border border-white/10 rounded-xl" />
                            )
                        ) : (
                            <div className="text-zinc-700 flex flex-col items-center">
                                <span className="material-symbols-outlined text-6xl mb-2 opacity-20">broken_image</span>
                                <p className="font-bold text-xs uppercase tracking-wider">Sin imagen</p>
                            </div>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="w-1/2 flex flex-col bg-[#09090b]">
                        <div className="p-6 border-b border-white/5 flex justify-between items-start">
                            <div>
                                <h2 className="text-lg font-bold text-white mb-1">Validar Pago</h2>
                                <p className="text-xs text-zinc-500">Confirma los fondos recibidos.</p>
                            </div>
                            <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors">
                                <span className="material-symbols-outlined text-[18px]">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            <div className="bg-[#18181b] p-6 rounded-xl border border-white/5">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Monto Declarado</p>
                                <p className="text-4xl font-black text-white tracking-tight">
                                    ${(selectedGroup.declaredAmount !== undefined ? selectedGroup.declaredAmount : selectedGroup.totalAmount).toFixed(2)}
                                </p>
                                <span className="inline-block mt-3 px-2 py-1 rounded border border-white/10 bg-black/20 text-zinc-400 text-[10px] font-bold uppercase tracking-wider">
                                    {selectedGroup.mainRecord.method}
                                </span>
                            </div>

                            {/* Simple List */}
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest ml-1">Conceptos en este pago</p>
                                {selectedGroup.records.map(r => (
                                    <div key={r.id} className="flex justify-between items-center p-3 bg-[#121212] border border-white/5 rounded-lg">
                                        <span className="text-xs text-zinc-300 font-medium">{r.concept}</span>
                                        <span className="text-xs text-zinc-500 font-mono">${(r.amount + r.penaltyAmount).toFixed(2)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t border-white/5 bg-[#09090b] flex gap-3">
                            <button onClick={handleReject} className="flex-1 py-3 border border-red-900/30 text-red-500 font-bold uppercase tracking-wider hover:bg-red-900/10 transition-all rounded-lg text-[10px]">
                                Rechazar
                            </button>
                            <button onClick={handleApprove} className="flex-[2] py-3 bg-white text-black font-bold uppercase tracking-wider transition-all rounded-lg text-[10px] hover:bg-zinc-200">
                                Aprobar Pago
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
