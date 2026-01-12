
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import { TuitionRecord, TuitionStatus } from '../../types';
import { exportToCSV } from '../../utils/csvExport';
import { generateReceipt } from '../../utils/pdfGenerator';
import { formatDateDisplay } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'framer-motion';
import EmptyState from '../../components/ui/EmptyState';
import CreateChargeModal from '../../components/finance/CreateChargeModal';

// --- HELPER COMPONENTS ---

const StatusBadge: React.FC<{ status: TuitionStatus; amount: number; penalty: number }> = ({ status, amount, penalty }) => {
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
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wider uppercase animate-pulse">
                    <span className="material-symbols-outlined text-[12px]">hourglass_top</span>
                    REVISAR
                </span>
            );
        case 'overdue':
            return (
                <div className="flex flex-col items-start">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-500/10 text-red-400 border border-red-500/20 tracking-wider uppercase">
                        <span className="material-symbols-outlined text-[12px]">warning</span>
                        VENCIDO
                    </span>
                    {penalty > 0 && <span className="text-[10px] text-red-500/80 font-medium mt-0.5 ml-1">+${penalty} Recargo</span>}
                </div>
            );
        case 'partial':
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-500/10 text-orange-400 border border-orange-500/20 tracking-wider uppercase">
                    <span className="material-symbols-outlined text-[12px]">pie_chart</span>
                    RESTANTE
                </span>
            );
        default: // pending
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-white/5 text-gray-400 border border-white/10 tracking-wider uppercase">
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
    <div className="flex flex-col h-full bg-background text-text-main">
        
        {/* --- HEADER --- */}
        <div className="bg-background-paper border-b border-border px-6 py-6 md:px-10 sticky top-0 z-20 shadow-premium">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white">Control Financiero</h1>
                    <p className="text-text-secondary mt-1">Valida pagos, gestiona cobros y revisa el historial.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={handleExport} className="px-4 py-2.5 bg-background-subtle border border-border text-text-secondary hover:text-white hover:bg-white/5 font-bold rounded-xl transition-all text-sm flex items-center gap-2">
                        <span className="material-symbols-outlined text-lg">download</span> Exportar
                    </button>
                    <button onClick={() => setIsChargeModalOpen(true)} className="px-5 py-2.5 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-all text-sm flex items-center gap-2 shadow-glow active:scale-95">
                        <span className="material-symbols-outlined text-lg">add_circle</span> Nuevo Cargo
                    </button>
                    <button onClick={handleGenerateBilling} className="px-5 py-2.5 bg-background-elevated border border-border text-white font-bold rounded-xl hover:bg-background-subtle transition-all text-sm flex items-center gap-2 shadow-lg">
                        <span className="material-symbols-outlined text-lg">payments</span> Generar Mensualidad
                    </button>
                </div>
            </div>

            {/* --- TABS --- */}
            <div className="max-w-[1600px] mx-auto mt-8 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex bg-background-subtle p-1 rounded-xl w-full md:w-auto overflow-x-auto no-scrollbar border border-border">
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
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                                activeTab === tab.id 
                                ? 'bg-background-paper text-primary shadow-sm border border-border' 
                                : 'text-text-secondary hover:text-white hover:bg-white/5'
                            }`}
                        >
                            <span className={`material-symbols-outlined text-[18px] ${activeTab === tab.id ? 'filled' : ''}`}>{tab.icon}</span>
                            {tab.label}
                            {tab.count !== null && tab.count > 0 && (
                                <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                    tab.id === 'review' ? 'bg-amber-500/20 text-amber-400' : 
                                    tab.id === 'overdue' ? 'bg-red-500/20 text-red-400' : 'bg-white/10 text-white'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-72">
                    <span className="absolute left-3 top-2.5 text-gray-500 material-symbols-outlined text-[20px]">search</span>
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        placeholder="Buscar alumno, monto..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/5 rounded-xl text-sm text-white focus:ring-1 focus:ring-primary focus:border-primary placeholder-gray-600 transition-all" 
                    />
                </div>
            </div>
        </div>

        {/* --- LIST CONTENT --- */}
        <div className="flex-1 overflow-y-auto p-6 md:px-10">
            <div className="max-w-[1600px] mx-auto bg-background-paper rounded-3xl shadow-card border border-border overflow-hidden min-h-[400px]">
                {groupedTransactions.length === 0 ? (
                    <EmptyState 
                        title="Sin movimientos" 
                        description={activeTab === 'review' ? "¡Excelente! No tienes pagos pendientes de revisar." : "No se encontraron registros con estos filtros."}
                        icon="check_circle"
                    />
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#1a1a1a] border-b border-border sticky top-0 backdrop-blur-sm z-10">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Alumno</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Concepto</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Monto Declarado</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {groupedTransactions.map((group, idx) => {
                                const { mainRecord, isBatch, totalAmount, declaredAmount } = group;
                                const displayAmount = declaredAmount !== undefined ? declaredAmount : totalAmount;
                                
                                return (
                                    <tr key={group.id} className={`hover:bg-white/5 transition-colors group ${idx % 2 === 0 ? 'bg-transparent' : 'bg-background-subtle/30'}`}>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-white text-sm">{formatDateDisplay(mainRecord.dueDate)}</span>
                                                {mainRecord.paymentDate && (
                                                    <span className="text-[10px] text-text-secondary mt-0.5">
                                                        Pagado: {formatDateDisplay(mainRecord.paymentDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white text-sm">{mainRecord.studentName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-text-secondary">
                                            {isBatch ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-white text-xs uppercase tracking-wide flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px] text-purple-400">layers</span>
                                                        Pago Lote ({group.itemCount} items)
                                                    </span>
                                                    <span className="text-xs mt-0.5 truncate max-w-[200px] opacity-70">
                                                        {group.records.map(r => r.concept).join(', ')}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span>{mainRecord.concept}</span>
                                            )}
                                            {mainRecord.method && <span className="ml-2 text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-gray-400">{mainRecord.method}</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={mainRecord.status} amount={mainRecord.amount} penalty={mainRecord.penaltyAmount} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-black text-sm ${mainRecord.status === 'paid' ? 'text-green-400' : 'text-white'}`}>
                                                ${displayAmount.toFixed(2)}
                                            </span>
                                            {declaredAmount !== undefined && declaredAmount < totalAmount && (
                                                <div className="text-[10px] text-orange-400 font-bold">Parcial (Deuda: ${totalAmount})</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {mainRecord.status === 'in_review' ? (
                                                <button 
                                                    onClick={() => setSelectedGroup(group)}
                                                    className="bg-primary hover:bg-primary-hover text-white text-xs font-bold px-4 py-2 rounded-lg shadow-glow transition-all active:scale-95"
                                                >
                                                    Revisar
                                                </button>
                                            ) : mainRecord.status === 'paid' ? (
                                                <button 
                                                    onClick={() => generateReceipt(mainRecord, academySettings, currentUser)}
                                                    className="text-gray-500 hover:text-primary p-2 rounded-lg transition-colors"
                                                    title="Descargar Recibo"
                                                >
                                                    <span className="material-symbols-outlined">receipt_long</span>
                                                </button>
                                            ) : (
                                                <span className="text-gray-600 text-xs">-</span>
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

        {/* --- REVIEW MODAL (IMPROVED WATERFALL PREVIEW) --- */}
        {selectedGroup && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-background-paper rounded-[2rem] w-full max-w-4xl h-[85vh] shadow-2xl flex overflow-hidden animate-in zoom-in-95 duration-200 border border-white/10">
                    
                    {/* Left: Proof Image */}
                    <div className="w-1/2 bg-[#09090b] flex items-center justify-center relative p-4 border-r border-white/5">
                        {selectedGroup.mainRecord.proofUrl ? (
                            selectedGroup.mainRecord.proofType?.includes('pdf') ? (
                                <iframe src={selectedGroup.mainRecord.proofUrl} className="w-full h-full rounded-xl border border-white/10" />
                            ) : (
                                <img src={selectedGroup.mainRecord.proofUrl} className="max-w-full max-h-full object-contain rounded-lg shadow-lg border border-white/10" />
                            )
                        ) : (
                            <div className="text-white/20 flex flex-col items-center">
                                <span className="material-symbols-outlined text-6xl mb-2">broken_image</span>
                                <p>Sin comprobante visible</p>
                            </div>
                        )}
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                            Comprobante {selectedGroup.isBatch ? '(Lote)' : ''}
                        </div>
                    </div>

                    {/* Right: Validation & Waterfall Preview */}
                    <div className="w-1/2 flex flex-col bg-background-paper">
                        <div className="p-8 border-b border-white/5 flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-black text-white mb-1">Revisión de Pago</h2>
                                <p className="text-text-secondary text-sm">Distribución automática de fondos.</p>
                            </div>
                            <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8">
                            
                            {/* Total Amount Display */}
                            <div className="bg-background-subtle rounded-2xl p-6 border border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-text-secondary uppercase">Monto Declarado</p>
                                    <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-lg text-xs font-bold text-white shadow-sm">
                                        {selectedGroup.mainRecord.method}
                                    </span>
                                </div>
                                <p className="text-4xl font-black text-white tracking-tight">
                                    ${(selectedGroup.declaredAmount !== undefined ? selectedGroup.declaredAmount : selectedGroup.totalAmount).toFixed(2)}
                                </p>
                                {selectedGroup.declaredAmount !== undefined && selectedGroup.declaredAmount < selectedGroup.totalAmount && (
                                    <p className="text-xs text-orange-400 font-bold mt-2 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-[14px]">warning</span>
                                        Pago parcial. Deuda total era ${selectedGroup.totalAmount}
                                    </p>
                                )}
                            </div>

                            {/* PREVIEW: Waterfall Distribution */}
                            <div>
                                <h4 className="text-xs font-bold text-text-secondary uppercase mb-3 ml-1">Aplicación de Fondos</h4>
                                <div className="space-y-3">
                                    {previewDistribution.map((item: any) => (
                                        <div key={item.id} className="flex flex-col p-3 bg-[#1a1a1a] border border-white/5 rounded-xl relative overflow-hidden">
                                            {/* Status Indicator Bar */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                item._status === 'paid' ? 'bg-green-500' : item._status === 'partial' ? 'bg-orange-500' : 'bg-red-500'
                                            }`}></div>
                                            
                                            <div className="flex justify-between items-start pl-3">
                                                <div>
                                                    <span className="text-sm font-bold text-white block">{item.concept}</span>
                                                    <span className="text-xs text-text-secondary">Deuda Total: ${(item.amount + item.penaltyAmount).toFixed(2)}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`font-mono font-bold text-sm ${item._status === 'paid' ? 'text-green-400' : 'text-orange-400'}`}>
                                                        ${item._paid.toFixed(2)}
                                                    </span>
                                                    <div className="text-[10px] font-bold uppercase mt-0.5 text-gray-500">
                                                        {item._status === 'paid' ? 'Cubierto' : item._status === 'partial' ? 'Abono' : 'Pendiente'}
                                                    </div>
                                                </div>
                                            </div>

                                            {item._remaining > 0 && (
                                                <div className="mt-2 pl-3 pt-2 border-t border-white/5 flex items-center gap-2 text-xs text-orange-400 font-medium">
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
                                const { isLate, diffDays } = getTimeValidation(selectedGroup.mainRecord);
                                return (
                                    <div className={`rounded-2xl p-4 border-l-4 text-xs ${isLate ? 'bg-red-500/10 border-red-500 text-red-400' : 'bg-green-500/10 border-green-500 text-green-400'}`}>
                                        <div className="flex items-center gap-2 font-bold mb-1">
                                            <span className="material-symbols-outlined text-base">{isLate ? 'history_toggle_off' : 'verified_user'}</span>
                                            {isLate ? 'Pago Tardío' : 'A Tiempo'}
                                        </div>
                                        <p>{isLate ? `Subido ${diffDays} días después del vencimiento.` : `Subido antes de la fecha límite.`}</p>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="p-8 border-t border-white/5 bg-[#18181b] flex gap-4">
                            <button onClick={handleReject} className="flex-1 py-4 rounded-xl border border-white/10 text-red-400 font-bold hover:bg-red-500/10 transition-all">Rechazar</button>
                            <button onClick={handleApprove} className="flex-[2] py-4 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2">
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
