
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

// --- HELPER COMPONENTS ---

const StatusBadge: React.FC<{ status: TuitionStatus; amount: number; penalty: number }> = ({ status, amount, penalty }) => {
    switch (status) {
        case 'paid':
            return (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wider uppercase rounded-lg">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    PAGADO
                </span>
            );
        case 'in_review':
            return (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold tracking-wider uppercase rounded-lg animate-pulse">
                    <span className="material-symbols-outlined text-[12px]">hourglass_top</span>
                    REVISAR
                </span>
            );
        case 'overdue':
            return (
                <div className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center gap-2 px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold tracking-wider uppercase rounded-lg">
                        <span className="material-symbols-outlined text-[12px]">warning</span>
                        VENCIDO
                    </span>
                    {penalty > 0 && <span className="text-[10px] text-red-400 font-mono pl-1">+${penalty} Multa</span>}
                </div>
            );
        case 'partial':
            return (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-bold tracking-wider uppercase rounded-lg">
                    <span className="material-symbols-outlined text-[12px]">pie_chart</span>
                    RESTANTE
                </span>
            );
        default: // pending
            return (
                <span className="inline-flex items-center gap-2 px-2.5 py-1 bg-zinc-800/50 border border-zinc-700 text-zinc-400 text-[10px] font-bold tracking-wider uppercase rounded-lg">
                    <span className="material-symbols-outlined text-[12px]">pending</span>
                    PENDIENTE
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

  // -- CALCULATE PREVIEW (The Visual Waterfall) --
  const previewDistribution = useMemo(() => {
      if (!selectedGroup) return [];
      
      const items = [...selectedGroup.records];
      // Separate mandatory and splittable
      const mandatory = items.filter(r => !r.canBePaidInParts);
      const splittable = items.filter(r => r.canBePaidInParts)
                              .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

      // Use Declared Amount if available (what student claimed they paid), else default to full debt
      let available = selectedGroup.declaredAmount !== undefined ? selectedGroup.declaredAmount : selectedGroup.totalAmount;
      
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
  }, [selectedGroup]);


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
          title: selectedGroup.isBatch ? 'Rechazar Lote Completo' : 'Rechazar Pago',
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
    <div className="flex flex-col h-full bg-[#09090b] text-zinc-200">
        
        {/* --- HEADER --- */}
        <div className="bg-[#09090b]/80 backdrop-blur-xl border-b border-zinc-800 px-6 py-6 md:px-10 sticky top-0 z-20">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white">Control Financiero</h1>
                    <p className="text-zinc-400 mt-1 font-medium">Valida pagos y gestiona cobros.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={handleExport} className="px-5 py-2.5 bg-[#18181b] border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 font-bold text-xs flex items-center gap-2 rounded-xl transition-all active:scale-95">
                        <span className="material-symbols-outlined text-lg">download</span> Exportar
                    </button>
                    <button onClick={() => setIsChargeModalOpen(true)} className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold text-xs flex items-center gap-2 transition-all rounded-xl shadow-lg shadow-primary/20 active:scale-95">
                        <span className="material-symbols-outlined text-lg">add_circle</span> Nuevo Cargo
                    </button>
                    <button onClick={handleGenerateBilling} className="px-5 py-2.5 bg-zinc-800 border border-zinc-700 text-white hover:border-primary/50 hover:bg-zinc-700 font-bold text-xs flex items-center gap-2 transition-all rounded-xl active:scale-95">
                        <span className="material-symbols-outlined text-lg">payments</span> Mensualidad
                    </button>
                </div>
            </div>

            {/* --- TABS --- */}
            <div className="max-w-[1600px] mx-auto mt-8 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex bg-[#18181b] p-1.5 rounded-2xl border border-zinc-800 w-full md:w-auto overflow-x-auto no-scrollbar">
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
                            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold transition-all whitespace-nowrap rounded-xl ${
                                activeTab === tab.id 
                                ? 'bg-zinc-700 text-white shadow-sm' 
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                            }`}
                        >
                            <span className={`material-symbols-outlined text-[18px] ${activeTab === tab.id ? 'filled' : ''}`}>{tab.icon}</span>
                            {tab.label}
                            {tab.count !== null && tab.count > 0 && (
                                <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-md ${
                                    tab.id === 'review' ? 'bg-amber-500/20 text-amber-400' : 
                                    tab.id === 'overdue' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-600 text-white'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-80">
                    <span className="absolute left-3 top-2.5 text-zinc-500 material-symbols-outlined text-[20px]">search</span>
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        placeholder="Buscar transacciones..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-[#18181b] border border-zinc-800 text-sm text-zinc-200 focus:border-primary focus:ring-1 focus:ring-primary placeholder-zinc-600 transition-all rounded-xl" 
                    />
                </div>
            </div>
        </div>

        {/* --- LIST CONTENT --- */}
        <div className="flex-1 overflow-y-auto p-6 md:px-10">
            <div className="max-w-[1600px] mx-auto bg-[#18181b] rounded-3xl border border-zinc-800 shadow-card min-h-[400px] overflow-hidden">
                {groupedTransactions.length === 0 ? (
                    <EmptyState 
                        title="Sin movimientos" 
                        description={activeTab === 'review' ? "No tienes pagos pendientes de revisar." : "No se encontraron registros con estos filtros."}
                        icon="check_circle"
                    />
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-zinc-900/50 border-b border-zinc-800 sticky top-0 z-10 backdrop-blur-sm">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Alumno</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Concepto</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Monto</th>
                                <th className="px-6 py-4 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {groupedTransactions.map((group, idx) => {
                                const { mainRecord, isBatch, totalAmount, declaredAmount } = group;
                                const displayAmount = declaredAmount !== undefined ? declaredAmount : totalAmount;
                                
                                return (
                                    <tr key={group.id} className="hover:bg-zinc-800/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-zinc-200 text-sm">{formatDateDisplay(mainRecord.dueDate)}</span>
                                                {mainRecord.paymentDate && (
                                                    <span className="text-[10px] text-zinc-500 mt-0.5">
                                                        Pagado: {formatDateDisplay(mainRecord.paymentDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white text-sm">{mainRecord.studentName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-zinc-400">
                                            {isBatch ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-primary text-xs uppercase tracking-wide flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">layers</span>
                                                        Lote ({group.itemCount})
                                                    </span>
                                                    <span className="text-[11px] mt-0.5 truncate max-w-[200px] opacity-70">
                                                        {group.records.map(r => r.concept).join(', ')}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="font-medium">{mainRecord.concept}</span>
                                            )}
                                            {mainRecord.method && <span className="ml-2 text-[10px] border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 uppercase">{mainRecord.method}</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={mainRecord.status} amount={mainRecord.amount} penalty={mainRecord.penaltyAmount} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-mono font-bold text-sm ${mainRecord.status === 'paid' ? 'text-emerald-400' : 'text-white'}`}>
                                                ${displayAmount.toFixed(2)}
                                            </span>
                                            {declaredAmount !== undefined && declaredAmount < totalAmount && (
                                                <div className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mt-1">Parcial (Deuda: ${totalAmount})</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {mainRecord.status === 'in_review' ? (
                                                <button 
                                                    onClick={() => setSelectedGroup(group)}
                                                    className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-lg shadow-lg shadow-primary/20 transition-all active:scale-95"
                                                >
                                                    Revisar
                                                </button>
                                            ) : mainRecord.status === 'paid' ? (
                                                <button 
                                                    onClick={() => generateReceipt(mainRecord, academySettings, currentUser)}
                                                    className="text-zinc-500 hover:text-white p-2 transition-colors border border-transparent hover:bg-zinc-800 rounded-lg"
                                                    title="Descargar Recibo"
                                                >
                                                    <span className="material-symbols-outlined">receipt_long</span>
                                                </button>
                                            ) : (
                                                <span className="text-zinc-600 text-xs">-</span>
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

        {/* --- REVIEW MODAL (IMPROVED ZINC STYLE) --- */}
        {selectedGroup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-[#121212] w-full max-w-5xl h-[85vh] flex overflow-hidden border border-zinc-800/50 shadow-2xl rounded-2xl">
                    
                    {/* Left: Proof Image */}
                    <div className="w-1/2 bg-[#09090b] flex items-center justify-center relative p-8 border-r border-zinc-800">
                        {selectedGroup.mainRecord.proofUrl ? (
                            selectedGroup.mainRecord.proofType?.includes('pdf') ? (
                                <iframe src={selectedGroup.mainRecord.proofUrl} className="w-full h-full border border-zinc-800 rounded-xl" />
                            ) : (
                                <img src={selectedGroup.mainRecord.proofUrl} className="max-w-full max-h-full object-contain border border-zinc-800 rounded-xl shadow-lg" />
                            )
                        ) : (
                            <div className="text-zinc-600 flex flex-col items-center">
                                <span className="material-symbols-outlined text-6xl mb-2 opacity-50">broken_image</span>
                                <p className="font-medium text-xs uppercase tracking-wider">Sin comprobante visual</p>
                            </div>
                        )}
                        <div className="absolute top-6 left-6 bg-zinc-900/90 backdrop-blur text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-zinc-700 rounded-lg shadow-sm">
                            Evidencia {selectedGroup.isBatch ? 'LOTE' : 'ÚNICA'}
                        </div>
                    </div>

                    {/* Right: Validation & Waterfall Preview */}
                    <div className="w-1/2 flex flex-col bg-[#121212]">
                        <div className="p-6 border-b border-zinc-800 flex justify-between items-start bg-[#18181b]">
                            <div>
                                <h2 className="text-xl font-bold text-white mb-1">Revisión de Pago</h2>
                                <p className="text-sm text-zinc-400">Valida y distribuye el monto recibido.</p>
                            </div>
                            <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            
                            {/* Total Amount Display */}
                            <div className="bg-zinc-900/50 p-6 rounded-2xl border border-zinc-800">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Monto Declarado</p>
                                    <span className="bg-zinc-800 border border-zinc-700 px-3 py-1 text-xs font-bold text-zinc-300 rounded-lg shadow-sm">
                                        {selectedGroup.mainRecord.method?.toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-4xl font-black text-white tracking-tight">
                                    ${(selectedGroup.declaredAmount !== undefined ? selectedGroup.declaredAmount : selectedGroup.totalAmount).toFixed(2)}
                                </p>
                                {selectedGroup.declaredAmount !== undefined && selectedGroup.declaredAmount < selectedGroup.totalAmount && (
                                    <p className="text-xs text-orange-400 font-bold mt-2 flex items-center gap-1 uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-[14px]">warning</span>
                                        Pago parcial detectado (Total: ${selectedGroup.totalAmount})
                                    </p>
                                )}
                            </div>

                            {/* PREVIEW: Waterfall Distribution */}
                            <div>
                                <h4 className="text-xs font-bold text-zinc-500 uppercase mb-3 ml-1 tracking-widest">Aplicación de Fondos</h4>
                                <div className="space-y-2">
                                    {previewDistribution.map((item: any) => (
                                        <div key={item.id} className="flex flex-col p-4 bg-[#18181b] border border-zinc-800 rounded-xl relative overflow-hidden group hover:border-zinc-700 transition-colors">
                                            {/* Status Indicator Bar */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                item._status === 'paid' ? 'bg-emerald-500' : item._status === 'partial' ? 'bg-orange-500' : 'bg-red-500'
                                            }`}></div>
                                            
                                            <div className="flex justify-between items-start pl-3">
                                                <div>
                                                    <span className="text-sm font-bold text-white block">{item.concept}</span>
                                                    <span className="text-[10px] text-zinc-500 font-mono">DEUDA: ${(item.amount + item.penaltyAmount).toFixed(2)}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`font-mono font-bold text-sm ${item._status === 'paid' ? 'text-emerald-400' : 'text-orange-400'}`}>
                                                        ${item._paid.toFixed(2)}
                                                    </span>
                                                    <div className={`text-[9px] font-black uppercase mt-1 tracking-widest ${
                                                        item._status === 'paid' ? 'text-emerald-600' : item._status === 'partial' ? 'text-orange-600' : 'text-red-600'
                                                    }`}>
                                                        {item._status === 'paid' ? 'CUBIERTO' : item._status === 'partial' ? 'PARCIAL' : 'PENDIENTE'}
                                                    </div>
                                                </div>
                                            </div>

                                            {item._remaining > 0 && (
                                                <div className="mt-3 pl-3 pt-2 border-t border-zinc-800 flex items-center gap-2 text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                                                    <span className="material-symbols-outlined text-[12px]">pie_chart</span>
                                                    Restan ${item._remaining.toFixed(2)}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Time Validation */}
                            {(() => {
                                const { isLate, diffDays } = getTimeValidation(selectedGroup.mainRecord);
                                return (
                                    <div className={`p-4 border rounded-xl text-xs font-mono uppercase tracking-wide flex items-center gap-4 ${isLate ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                                        <span className="material-symbols-outlined text-xl">{isLate ? 'history_toggle_off' : 'verified_user'}</span>
                                        <div>
                                            <span className="font-bold block mb-1">{isLate ? 'Pago Tardío' : 'A Tiempo'}</span>
                                            <span className="opacity-70">{isLate ? `+${diffDays} días de retraso` : `Dentro del plazo`}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="p-6 border-t border-zinc-800 bg-[#18181b] flex gap-4">
                            <button onClick={handleReject} className="flex-1 py-3.5 border border-red-500/30 bg-red-500/5 text-red-400 font-bold uppercase tracking-wider hover:bg-red-500/10 transition-all rounded-xl text-xs hover:border-red-500/50">
                                Rechazar
                            </button>
                            <button onClick={handleApprove} className="flex-[2] py-3.5 bg-primary hover:bg-primary-hover text-white font-bold uppercase tracking-wider transition-all rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary/20 active:scale-95">
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
