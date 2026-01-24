
import React, { useMemo } from 'react';
import { TuitionRecord, PaymentHistoryItem } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';

interface TransactionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: TuitionRecord | null;
  role: 'master' | 'student';
  paymentHistory?: PaymentHistoryItem[];
  // Actions
  onPay?: (record: TuitionRecord) => void;
  onDownloadReceipt?: (record: TuitionRecord) => void;
  onApprove?: (record: TuitionRecord) => void;
  onReject?: (record: TuitionRecord) => void;
  onReview?: (record: TuitionRecord) => void; // New prop for master review flow
  onDelete?: () => void; // New prop for deletion
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

  // --- CALCULATIONS ---
  
  // Determine original total cost
  const originalTotal = record.originalAmount !== undefined 
    ? record.originalAmount + (record.penaltyAmount || 0)
    : record.amount + (record.penaltyAmount || 0);

  // Determine total paid from history
  const totalPaid = useMemo(() => {
    return paymentHistory.reduce((acc, curr) => acc + curr.amount, 0);
  }, [paymentHistory]);

  // Determine remaining debt
  const remainingDebt = record.amount + (record.penaltyAmount || 0);

  // Status Helpers
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid': return { label: 'Pagado', color: 'text-green-600', bg: 'bg-green-50', icon: 'check_circle' };
      case 'overdue': return { label: 'Vencido', color: 'text-red-600', bg: 'bg-red-50', icon: 'warning' };
      case 'partial': return { label: 'Parcial', color: 'text-orange-600', bg: 'bg-orange-50', icon: 'pie_chart' };
      case 'in_review': return { label: 'En Revisión', color: 'text-amber-600', bg: 'bg-amber-50', icon: 'hourglass_top' };
      default: return { label: 'Pendiente', color: 'text-gray-600', bg: 'bg-gray-100', icon: 'pending' };
    }
  };

  const statusConfig = getStatusConfig(record.status);

  // Format Currency Helper
  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative border border-gray-100 animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* --- HEADER --- */}
        <div className="flex items-start justify-between p-6 md:p-8 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose} 
              className="size-10 rounded-full bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors"
            >
              <span className="material-symbols-outlined text-xl">arrow_back</span>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${statusConfig.bg} ${statusConfig.color}`}>
                  <span className="material-symbols-outlined text-sm filled">{statusConfig.icon}</span>
                  {statusConfig.label}
                </span>
                <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded">
                  {record.category || 'General'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-gray-900 mt-2 leading-tight">
                {record.concept}
              </h2>
            </div>
          </div>
          
          {/* Desktop Total Display */}
          <div className="hidden md:block text-right">
             <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Global</p>
             <p className="text-3xl font-black text-gray-900">{formatMoney(originalTotal)}</p>
          </div>
        </div>

        {/* --- SCROLLABLE CONTENT --- */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#F9FAFB]">
          
          {/* 1. FINANCIAL SUMMARY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-28">
               <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <span className="material-symbols-outlined text-lg">receipt_long</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Costo Orig.</span>
               </div>
               <span className="text-2xl font-bold text-gray-900">{formatMoney(originalTotal)}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-28">
               <div className="flex items-center gap-2 text-green-600 mb-1">
                  <span className="material-symbols-outlined text-lg">payments</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Pagado</span>
               </div>
               <span className="text-2xl font-bold text-green-600">{formatMoney(totalPaid)}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-28">
               <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <span className="material-symbols-outlined text-lg">pie_chart</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Pendiente</span>
               </div>
               <span className="text-2xl font-bold text-orange-600">{formatMoney(remainingDebt)}</span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between h-28">
               <div className="flex items-center gap-2 text-gray-400 mb-1">
                  <span className="material-symbols-outlined text-lg">event</span>
                  <span className="text-xs font-bold uppercase tracking-wider">Vence</span>
               </div>
               <span className="text-xl font-bold text-gray-900">{formatDateDisplay(record.dueDate)}</span>
            </div>
          </div>

          {/* 2. TIMELINE HISTORY */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-gray-400">history</span>
              Historial de Movimientos
            </h3>

            {paymentHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-2xl">
                <span className="material-symbols-outlined text-4xl mb-2 opacity-50">savings</span>
                <p className="text-sm font-medium">Aún no se han registrado pagos.</p>
              </div>
            ) : (
              <div className="space-y-0 relative">
                {/* Vertical Line */}
                <div className="absolute top-2 bottom-2 left-[19px] w-0.5 bg-gray-100"></div>

                {paymentHistory.map((item, idx) => (
                  <div key={idx} className="relative pl-12 pb-8 last:pb-0 group">
                    {/* Dot */}
                    <div className="absolute left-0 top-1 size-10 rounded-full bg-white border-4 border-blue-50 flex items-center justify-center z-10">
                       <div className="size-3 bg-blue-500 rounded-full"></div>
                    </div>

                    {/* Card Content */}
                    <div className="flex justify-between items-start bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-colors">
                        <div>
                            <p className="text-sm font-bold text-gray-900 capitalize">
                                {formatDateDisplay(item.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-medium text-gray-500 bg-white px-2 py-0.5 rounded border border-gray-200">
                                    {item.method || 'Sistema'}
                                </span>
                                <span className="text-[10px] text-gray-400">
                                    {new Date(item.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-lg font-bold text-gray-900">{formatMoney(item.amount)}</span>
                            <p className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Aplicado</p>
                        </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* --- FOOTER ACTIONS --- */}
        <div className="p-6 border-t border-gray-100 bg-white flex flex-col md:flex-row justify-between items-center gap-4">
            
            {/* Student Info (Visible for Master or always valid context) */}
            <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="size-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold border border-gray-200">
                    {record.studentName.charAt(0)}
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-900">{record.studentName}</p>
                    <p className="text-xs text-gray-500">Alumno</p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 w-full md:w-auto items-center">
                
                {/* DELETE ACTION (Master Only) */}
                {role === 'master' && onDelete && (
                    <button 
                        onClick={onDelete}
                        className="mr-2 p-3 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-95"
                        title="Eliminar Registro"
                    >
                        <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                )}

                {/* STUDENT ROLE ACTIONS */}
                {role === 'student' && (
                    <>
                        {/* Pay Button Logic */}
                        {remainingDebt > 0 && onPay && (
                            <button 
                                onClick={() => record.status !== 'in_review' && onPay(record)}
                                disabled={record.status === 'in_review'}
                                className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                                    record.status === 'in_review'
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                    : 'bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 shadow-lg shadow-orange-500/20 active:scale-95'
                                }`}
                            >
                                <span className="material-symbols-outlined text-lg">
                                    {record.status === 'in_review' ? 'hourglass_top' : 'credit_card'}
                                </span>
                                {record.status === 'in_review' ? 'En Revisión' : 'Pagar'}
                            </button>
                        )}
                        
                        {/* Download Logic */}
                        {(record.status === 'paid' || record.status === 'partial') && onDownloadReceipt && (
                            <button 
                                onClick={() => onDownloadReceipt(record)}
                                className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">download</span>
                                Recibo
                            </button>
                        )}
                    </>
                )}

                {/* MASTER ROLE ACTIONS */}
                {role === 'master' && (
                    <>
                        {record.status === 'in_review' ? (
                            /* Master Review Action - Launches Parent Modal */
                            <button 
                                onClick={() => {
                                    if (onReview) {
                                        onReview(record);
                                        onClose(); // Close details to show full review modal
                                    }
                                }}
                                className="flex-1 md:flex-none px-6 py-3 rounded-xl bg-gray-900 text-white font-bold hover:bg-black shadow-lg shadow-gray-900/10 transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <span className="material-symbols-outlined text-lg">fact_check</span>
                                Revisar Comprobante
                            </button>
                        ) : (
                            /* Standard Receipt Action */
                            <button 
                                onClick={() => onDownloadReceipt && onDownloadReceipt(record)}
                                className="flex-1 md:flex-none px-6 py-3 rounded-xl border border-gray-200 font-bold text-gray-700 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">print</span>
                                Imprimir Recibo
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
