
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
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-black border border-green-500 text-green-500 text-[10px] font-bold tracking-widest uppercase rounded-none">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    PAGADO
                </span>
            );
        case 'in_review':
            return (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-black border border-amber-500 text-amber-500 text-[10px] font-bold tracking-widest uppercase rounded-none animate-pulse">
                    <span className="material-symbols-outlined text-[12px]">hourglass_top</span>
                    REVISAR
                </span>
            );
        case 'overdue':
            return (
                <div className="flex flex-col items-start gap-1">
                    <span className="inline-flex items-center gap-2 px-3 py-1 bg-black border border-red-500 text-red-500 text-[10px] font-bold tracking-widest uppercase rounded-none">
                        <span className="material-symbols-outlined text-[12px]">warning</span>
                        VENCIDO
                    </span>
                    {penalty > 0 && <span className="text-[10px] text-red-500 font-mono">+${penalty} PENALTY</span>}
                </div>
            );
        case 'partial':
            return (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-black border border-orange-500 text-orange-500 text-[10px] font-bold tracking-widest uppercase rounded-none">
                    <span className="material-symbols-outlined text-[12px]">pie_chart</span>
                    RESTANTE
                </span>
            );
        default: // pending
            return (
                <span className="inline-flex items-center gap-2 px-3 py-1 bg-black border border-zinc-700 text-zinc-400 text-[10px] font-bold tracking-widest uppercase rounded-none">
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
    <div className="flex flex-col h-full bg-black text-white">
        
        {/* --- HEADER --- */}
        <div className="bg-[#000000] border-b border-[#1A1A1A] px-6 py-6 md:px-10 sticky top-0 z-20">
            <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white uppercase">Control Financiero</h1>
                    <p className="text-zinc-500 mt-1 font-medium tracking-wide">Valida pagos y gestiona cobros.</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button onClick={handleExport} className="px-6 py-3 bg-black border border-primary text-primary hover:bg-[#0D0D0D] font-bold uppercase tracking-wider text-xs flex items-center gap-2 rounded-none transition-colors">
                        <span className="material-symbols-outlined text-sm">download</span> Exportar
                    </button>
                    <button onClick={() => setIsChargeModalOpen(true)} className="px-6 py-3 bg-primary text-black font-black uppercase tracking-wider text-xs flex items-center gap-2 hover:bg-white transition-colors rounded-none">
                        <span className="material-symbols-outlined text-sm">add_circle</span> Nuevo Cargo
                    </button>
                    <button onClick={handleGenerateBilling} className="px-6 py-3 bg-[#0D0D0D] border border-[#333] text-white hover:border-primary hover:text-primary font-bold uppercase tracking-wider text-xs flex items-center gap-2 transition-colors rounded-none">
                        <span className="material-symbols-outlined text-sm">payments</span> Mensualidad
                    </button>
                </div>
            </div>

            {/* --- TABS --- */}
            <div className="max-w-[1600px] mx-auto mt-8 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex bg-[#0D0D0D] border border-[#1A1A1A] p-1 w-full md:w-auto overflow-x-auto no-scrollbar rounded-none">
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
                            className={`flex items-center gap-3 px-6 py-3 text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap rounded-none border-b-2 ${
                                activeTab === tab.id 
                                ? 'bg-black text-primary border-primary' 
                                : 'text-zinc-500 border-transparent hover:text-white hover:bg-[#1A1A1A]'
                            }`}
                        >
                            <span className={`material-symbols-outlined text-[16px] ${activeTab === tab.id ? 'filled' : ''}`}>{tab.icon}</span>
                            {tab.label}
                            {tab.count !== null && tab.count > 0 && (
                                <span className={`ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-none ${
                                    tab.id === 'review' ? 'bg-amber-500 text-black' : 
                                    tab.id === 'overdue' ? 'bg-red-500 text-black' : 'bg-white text-black'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="relative w-full md:w-80">
                    <span className="absolute left-3 top-3.5 text-zinc-500 material-symbols-outlined text-[18px]">search</span>
                    <input 
                        type="text" 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        placeholder="BUSCAR TRANSACCIÓN..." 
                        className="w-full pl-10 pr-4 py-3 bg-black border border-[#333] text-xs font-bold text-white focus:border-primary placeholder-zinc-700 transition-all rounded-none uppercase tracking-wide" 
                    />
                </div>
            </div>
        </div>

        {/* --- LIST CONTENT --- */}
        <div className="flex-1 overflow-y-auto p-6 md:px-10 bg-black">
            <div className="max-w-[1600px] mx-auto border border-[#1A1A1A] bg-[#0D0D0D] min-h-[400px]">
                {groupedTransactions.length === 0 ? (
                    <EmptyState 
                        title="Sin movimientos" 
                        description={activeTab === 'review' ? "No tienes pagos pendientes de revisar." : "No se encontraron registros con estos filtros."}
                        icon="check_circle"
                    />
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#000000] border-b border-[#1A1A1A] sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Fecha</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Alumno</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Concepto</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Monto Declarado</th>
                                <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1A1A]">
                            {groupedTransactions.map((group, idx) => {
                                const { mainRecord, isBatch, totalAmount, declaredAmount } = group;
                                const displayAmount = declaredAmount !== undefined ? declaredAmount : totalAmount;
                                
                                return (
                                    <tr key={group.id} className="hover:bg-[#1A1A1A] transition-colors group bg-black">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-mono font-bold text-white text-xs">{formatDateDisplay(mainRecord.dueDate)}</span>
                                                {mainRecord.paymentDate && (
                                                    <span className="text-[10px] text-zinc-500 mt-1 uppercase">
                                                        Pagado: {formatDateDisplay(mainRecord.paymentDate)}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white text-xs uppercase tracking-wide">{mainRecord.studentName}</div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-zinc-400">
                                            {isBatch ? (
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-primary text-xs uppercase tracking-wide flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[14px]">layers</span>
                                                        Lote ({group.itemCount} items)
                                                    </span>
                                                    <span className="text-[10px] mt-1 truncate max-w-[200px] opacity-70 font-mono">
                                                        {group.records.map(r => r.concept).join(', ')}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="font-medium">{mainRecord.concept}</span>
                                            )}
                                            {mainRecord.method && <span className="ml-2 text-[10px] border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-zinc-500 uppercase tracking-wider">{mainRecord.method}</span>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={mainRecord.status} amount={mainRecord.amount} penalty={mainRecord.penaltyAmount} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={`font-mono font-bold text-sm ${mainRecord.status === 'paid' ? 'text-green-500' : 'text-white'}`}>
                                                ${displayAmount.toFixed(2)}
                                            </span>
                                            {declaredAmount !== undefined && declaredAmount < totalAmount && (
                                                <div className="text-[10px] text-orange-500 font-bold uppercase tracking-wider mt-1">Parcial (Deuda: ${totalAmount})</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {mainRecord.status === 'in_review' ? (
                                                <button 
                                                    onClick={() => setSelectedGroup(group)}
                                                    className="bg-primary hover:bg-white hover:text-black text-black text-xs font-black uppercase tracking-wider px-4 py-2 shadow-[0_0_15px_rgba(249,115,22,0.3)] transition-all rounded-none"
                                                >
                                                    Revisar
                                                </button>
                                            ) : mainRecord.status === 'paid' ? (
                                                <button 
                                                    onClick={() => generateReceipt(mainRecord, academySettings, currentUser)}
                                                    className="text-zinc-600 hover:text-white p-2 transition-colors border border-transparent hover:border-zinc-700 rounded-none"
                                                    title="Descargar Recibo"
                                                >
                                                    <span className="material-symbols-outlined">receipt_long</span>
                                                </button>
                                            ) : (
                                                <span className="text-zinc-800 text-xs">-</span>
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-none animate-in fade-in duration-200">
                <div className="bg-[#0D0D0D] w-full max-w-6xl h-[85vh] flex overflow-hidden border border-[#333] shadow-[0_0_50px_rgba(0,0,0,1)] rounded-none">
                    
                    {/* Left: Proof Image */}
                    <div className="w-1/2 bg-black flex items-center justify-center relative p-8 border-r border-[#1A1A1A]">
                        {selectedGroup.mainRecord.proofUrl ? (
                            selectedGroup.mainRecord.proofType?.includes('pdf') ? (
                                <iframe src={selectedGroup.mainRecord.proofUrl} className="w-full h-full border border-[#333]" />
                            ) : (
                                <img src={selectedGroup.mainRecord.proofUrl} className="max-w-full max-h-full object-contain border border-[#333]" />
                            )
                        ) : (
                            <div className="text-zinc-700 flex flex-col items-center">
                                <span className="material-symbols-outlined text-6xl mb-2">broken_image</span>
                                <p className="font-mono text-xs uppercase">Sin comprobante visual</p>
                            </div>
                        )}
                        <div className="absolute top-6 left-6 bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-wider border border-primary shadow-[0_0_10px_rgba(249,115,22,0.2)]">
                            Evidencia {selectedGroup.isBatch ? 'LOTE' : 'ÚNICA'}
                        </div>
                    </div>

                    {/* Right: Validation & Waterfall Preview */}
                    <div className="w-1/2 flex flex-col bg-[#0D0D0D]">
                        <div className="p-8 border-b border-[#1A1A1A] flex justify-between items-start bg-black">
                            <div>
                                <h2 className="text-2xl font-black text-white mb-1 uppercase tracking-tight">Revisión de Pago</h2>
                                <div className="h-1 w-12 bg-primary"></div>
                            </div>
                            <button onClick={() => setSelectedGroup(null)} className="p-2 hover:bg-[#1A1A1A] text-zinc-500 hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                            
                            {/* Total Amount Display */}
                            <div className="bg-[#111] p-6 border border-[#222]">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Monto Declarado</p>
                                    <span className="bg-black border border-[#333] px-3 py-1 text-xs font-mono font-bold text-primary shadow-sm">
                                        {selectedGroup.mainRecord.method?.toUpperCase()}
                                    </span>
                                </div>
                                <p className="text-5xl font-black text-white tracking-tight font-mono">
                                    ${(selectedGroup.declaredAmount !== undefined ? selectedGroup.declaredAmount : selectedGroup.totalAmount).toFixed(2)}
                                </p>
                                {selectedGroup.declaredAmount !== undefined && selectedGroup.declaredAmount < selectedGroup.totalAmount && (
                                    <p className="text-xs text-orange-500 font-bold mt-2 flex items-center gap-1 uppercase tracking-wider">
                                        <span className="material-symbols-outlined text-[14px]">warning</span>
                                        Pago parcial detectado (Total: ${selectedGroup.totalAmount})
                                    </p>
                                )}
                            </div>

                            {/* PREVIEW: Waterfall Distribution */}
                            <div>
                                <h4 className="text-xs font-bold text-zinc-500 uppercase mb-4 ml-1 tracking-widest">Aplicación de Fondos</h4>
                                <div className="space-y-1">
                                    {previewDistribution.map((item: any) => (
                                        <div key={item.id} className="flex flex-col p-4 bg-black border border-[#1A1A1A] relative overflow-hidden group hover:border-[#333] transition-colors">
                                            {/* Status Indicator Bar */}
                                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                                item._status === 'paid' ? 'bg-green-500' : item._status === 'partial' ? 'bg-orange-500' : 'bg-red-600'
                                            }`}></div>
                                            
                                            <div className="flex justify-between items-start pl-4">
                                                <div>
                                                    <span className="text-sm font-bold text-white block uppercase tracking-wide">{item.concept}</span>
                                                    <span className="text-[10px] text-zinc-500 font-mono">DEUDA: ${(item.amount + item.penaltyAmount).toFixed(2)}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`font-mono font-bold text-sm ${item._status === 'paid' ? 'text-green-500' : 'text-orange-500'}`}>
                                                        ${item._paid.toFixed(2)}
                                                    </span>
                                                    <div className={`text-[9px] font-black uppercase mt-1 tracking-widest ${
                                                        item._status === 'paid' ? 'text-green-700' : item._status === 'partial' ? 'text-orange-700' : 'text-red-800'
                                                    }`}>
                                                        {item._status === 'paid' ? 'CUBIERTO' : item._status === 'partial' ? 'PARCIAL' : 'PENDIENTE'}
                                                    </div>
                                                </div>
                                            </div>

                                            {item._remaining > 0 && (
                                                <div className="mt-3 pl-4 pt-2 border-t border-[#1A1A1A] flex items-center gap-2 text-[10px] text-orange-500 font-bold uppercase tracking-wider">
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
                                    <div className={`p-4 border text-xs font-mono uppercase tracking-wide flex items-center gap-4 ${isLate ? 'bg-red-950/20 border-red-900 text-red-500' : 'bg-green-950/20 border-green-900 text-green-500'}`}>
                                        <span className="material-symbols-outlined text-xl">{isLate ? 'history_toggle_off' : 'verified_user'}</span>
                                        <div>
                                            <span className="font-bold block mb-1">{isLate ? 'Pago Tardío' : 'A Tiempo'}</span>
                                            <span className="opacity-70">{isLate ? `+${diffDays} días de retraso` : `Dentro del plazo`}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>

                        <div className="p-8 border-t border-[#1A1A1A] bg-black flex gap-4">
                            <button onClick={handleReject} className="flex-1 py-4 border border-red-900/50 text-red-500 font-black uppercase tracking-wider hover:bg-red-950/20 transition-all rounded-none text-xs">
                                Rechazar
                            </button>
                            <button onClick={handleApprove} className="flex-[2] py-4 bg-primary text-black font-black uppercase tracking-wider hover:bg-white transition-all rounded-none text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
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
