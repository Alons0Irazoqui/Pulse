
import React, { useMemo } from 'react';
import { TuitionRecord, PaymentHistoryItem } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: TuitionRecord | null;
  role: 'master' | 'student';
  paymentHistory?: PaymentHistoryItem[];
  onPay?: (record: TuitionRecord) => void;
  onDownloadReceipt?: (record: TuitionRecord) => void;
  onApprove?: (record: TuitionRecord) => void;
  onReject?: (record: TuitionRecord) => void;
  onReview?: (record: TuitionRecord) => void; 
  onDelete?: () => void; 
}

const TransactionDetailModal: React.FC<TransactionDetailModalProps> = ({
  isOpen,
  onClose,
  record,
  role,
  paymentHistory = [],
  onPay,
  onDownloadReceipt,
  onApprove,
  onReject,
  onReview,
  onDelete
}) => {
  if (!isOpen || !record) return null;

  const totalPaid = useMemo(() => {
    return paymentHistory.reduce((acc, curr) => acc + curr.amount, 0);
  }, [paymentHistory]);

  const originalTotal = useMemo(() => {
      const baseCalculation = (record.originalAmount ?? record.amount) + (record.penaltyAmount || 0);
      if (record.status === 'paid') {
          return totalPaid > baseCalculation ? totalPaid : baseCalculation;
      }
      return baseCalculation;
  }, [record, totalPaid]);

  const remainingDebt = record.amount + (record.penaltyAmount || 0);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid': return { label: 'Pagado', color: 'text-emerald-700', bg: 'bg-emerald-50', icon: 'check_circle' };
      case 'overdue': return { label: 'Vencido', color: 'text-red-700', bg: 'bg-red-50', icon: 'warning' };
      case 'partial': return { label: 'Parcial', color: 'text-amber-700', bg: 'bg-amber-50', icon: 'pie_chart' };
      case 'in_review': return { label: 'Revisión', color: 'text-blue-700', bg: 'bg-blue-50', icon: 'hourglass_top' };
      default: return { label: 'Pendiente', color: 'text-gray-600', bg: 'bg-gray-100', icon: 'pending' };
    }
  };

  const statusConfig = getStatusConfig(record.status);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl w-full max-w-4xl shadow-soft flex flex-col max-h-[90vh] overflow-hidden relative border border-gray-100 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 md:p-8 border-b border-gray-50 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose} 
              className="size-10 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-slate-900 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 border border-transparent ${statusConfig.bg} ${statusConfig.color}`}>
                  <span className="material-symbols-outlined text-sm filled">{statusConfig.icon}</span>
                  {statusConfig.label}
                </span>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                  {record.category || 'General'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 mt-2 leading-tight">
                {record.concept}
              </h2>
            </div>
          </div>
          
          <div className="hidden md:block text-right">
             <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Global</p>
             <p className="text-3xl font-black text-slate-900 tabular-nums">{formatMoney(originalTotal)}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-white">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-28">
               <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <span className="material-symbols-outlined text-lg">receipt_long</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Costo Orig.</span>
               </div>
               <span className="text-2xl font-bold text-slate-900 tabular-nums">{formatMoney(originalTotal)}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-28">
               <div className="flex items-center gap-2 text-emerald-600 mb-1">
                  <span className="material-symbols-outlined text-lg">payments</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Pagado</span>
               </div>
               <span className="text-2xl font-bold text-emerald-700 tabular-nums">{formatMoney(totalPaid)}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-28">
               <div className="flex items-center gap-2 text-slate-600 mb-1">
                  <span className="material-symbols-outlined text-lg">pie_chart</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Pendiente</span>
               </div>
               <span className="text-2xl font-bold text-slate-900 tabular-nums">{formatMoney(remainingDebt)}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-28">
               <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <span className="material-symbols-outlined text-lg">event</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">Vence</span>
               </div>
               <span className="text-xl font-bold text-slate-900 tabular-nums">{formatDateDisplay(record.dueDate)}</span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-400">history</span>
              Historial de Movimientos
            </h3>

            {paymentHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">savings</span>
                <p className="text-sm font-medium">Aún no se han registrado pagos.</p>
              </div>
            ) : (
              <div className="space-y-0 relative">
                <div className="absolute top-2 bottom-2 left-[19px] w-0.5 bg-gray-200"></div>
                {paymentHistory.map((item, idx) => (
                  <div key={idx} className="relative pl-12 pb-8 last:pb-0 group">
                    <div className="absolute left-0 top-1 size-10 rounded-full bg-white border-4 border-gray-100 flex items-center justify-center z-10 shadow-sm">
                       <div className="size-3 bg-slate-400 rounded-full"></div>
                    </div>
                    <div className="flex justify-between items-start bg-white p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors shadow-sm">
                        <div>
                            <p className="text-sm font-bold text-slate-900 capitalize">
                                {formatDateDisplay(item.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-200 uppercase tracking-wide">
                                    {item.method || 'Sistema'}
                                </span>
                                <span className="text-[10px] text-gray-400 tabular-nums">
                                    {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-lg font-bold text-slate-900 tabular-nums">{formatMoney(item.amount)}</span>
                            <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">Aplicado</p>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-50 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="size-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 font-bold border border-gray-100">
                    {record.studentName.charAt(0)}
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-900">{record.studentName}</p>
                    <p className="text-xs text-gray-500">Alumno</p>
                </div>
            </div>

            <div className="flex gap-3 w-full md:w-auto items-center">
                {role === 'master' && onDelete && (
                    <button 
                        onClick={onDelete}
                        className="mr-2 p-3 rounded-xl border border-red-100 text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors active:scale-95"
                        title="Eliminar Registro (Crítico)"
                    >
                        <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                )}

                {role === 'student' && (
                    <>
                        {remainingDebt > 0 && onPay && (
                            <button 
                                onClick={() => record.status !== 'in_review' && onPay(record)}
                                disabled={record.status === 'in_review'}
                                className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all uppercase tracking-wide text-xs ${
                                    record.status === 'in_review'
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-br from-red-600 to-red-700 text-white shadow-lg shadow-red-600/20 active:scale-95'
                                }`}
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {record.status === 'in_review' ? 'hourglass_top' : 'credit_card'}
                                </span>
                                {record.status === 'in_review' ? 'En Revisión' : 'Pagar'}
                            </button>
                        )}
                        {(record.status === 'paid' || record.status === 'partial') && onDownloadReceipt && (
                            <button 
                                onClick={() => onDownloadReceipt(record)}
                                className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-gray-200 font-bold text-slate-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
                            >
                                <span className="material-symbols-outlined text-lg">download</span>
                                Recibo
                            </button>
                        )}
                    </>
                )}

                {role === 'master' && (
                    <>
                        {record.status === 'in_review' ? (
                            <button 
                                onClick={() => {
                                    if (onReview) {
                                        onReview(record);
                                        onClose(); 
                                    }
                                }}
                                className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-gradient-to-br from-red-600 to-red-700 text-white font-bold transition-all flex items-center justify-center gap-2 active:scale-95 text-xs uppercase tracking-wide shadow-lg shadow-red-600/20"
                            >
                                <span className="material-symbols-outlined text-lg">fact_check</span>
                                Revisar
                            </button>
                        ) : (
                            <button 
                                onClick={() => onDownloadReceipt && onDownloadReceipt(record)}
                                className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-gray-200 font-bold text-slate-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wide"
                            >
                                <span className="material-symbols-outlined text-lg">print</span>
                                Imprimir
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>

      </div>
    </div>
  );
};

export default TransactionDetailModal;
