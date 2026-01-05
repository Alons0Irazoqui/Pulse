import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import { Payment, PaymentCategory } from '../../types';
import { exportToCSV } from '../../utils/csvExport';
import { generateReceipt } from '../../utils/pdfGenerator';

const Finance: React.FC = () => {
  const { payments, recordPayment, approvePayment, rejectPayment, students, academySettings, currentUser, generateMonthlyBilling } = useStore();
  const { addToast } = useToast();
  const { confirm } = useConfirmation();
  
  // Filtering States
  const [filterTime, setFilterTime] = useState<'all' | 'month' | 'week'>('month');
  const [filterType, setFilterType] = useState<'all' | 'charge' | 'payment'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [showModal, setShowModal] = useState(false); // For manual charge/payment
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);

  // Manual Entry State
  const initialEntryState = {
      studentId: '',
      amount: '',
      concept: '',
      category: 'Mensualidad' as PaymentCategory,
      type: 'charge' as 'charge' | 'payment',
      method: 'Efectivo' as 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'System',
      date: new Date().toISOString().split('T')[0]
  };
  const [newEntry, setNewEntry] = useState(initialEntryState);

  // --- DYNAMIC FILTERING LOGIC ---
  const filteredTransactions = useMemo(() => {
      return payments.filter(p => {
          // Search
          const studentName = p.studentName || students.find(s => s.id === p.studentId)?.name || 'Unknown';
          const matchesSearch = studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                p.description.toLowerCase().includes(searchQuery.toLowerCase());

          // Filter by Type
          const matchesType = filterType === 'all' || p.type === filterType;

          // Time (Simple logic)
          let matchesTime = true;
          const txDate = new Date(p.date);
          const now = new Date();
          if (filterTime === 'month') {
              matchesTime = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
          } else if (filterTime === 'week') {
              const oneWeekAgo = new Date();
              oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
              matchesTime = txDate >= oneWeekAgo;
          }

          return matchesSearch && matchesType && matchesTime;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, searchQuery, filterType, filterTime, students]);

  // --- REAL-TIME STATS ---
  const stats = useMemo(() => {
      // Income = PAYMENTS that are PAID
      const totalIncome = payments.filter(p => p.type === 'payment' && p.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
      
      // Pending Approvals = Payments with 'pending_approval'
      const pendingApproval = payments.filter(p => p.type === 'payment' && p.status === 'pending_approval').length;
      
      // Pending Debt = Sum of all derived student balances (Reactive)
      const totalDebt = students.reduce((acc, s) => acc + (s.balance > 0 ? s.balance : 0), 0);
      
      return { totalIncome, pendingApproval, totalDebt };
  }, [filteredTransactions, payments, students]);

  const handleExport = () => {
      exportToCSV(filteredTransactions, 'Reporte_Financiero');
      addToast('Reporte generado exitosamente', 'success');
  };

  const handleGenerateMonthly = () => {
      confirm({
          title: 'Generar Cargos Mensuales',
          message: '¿Generar deuda de mensualidad a todos los alumnos activos? Esto aumentará el saldo deudor de cada alumno.',
          type: 'info',
          onConfirm: () => {
              if (generateMonthlyBilling) {
                  generateMonthlyBilling();
              }
          }
      });
  };

  const handleRegisterEntry = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newEntry.studentId || !newEntry.amount) return;
      const student = students.find(s => s.id === newEntry.studentId);
      
      const transactionData: Payment = {
          id: '', 
          academyId: '', 
          studentId: newEntry.studentId,
          studentName: student?.name || 'Unknown',
          amount: parseFloat(newEntry.amount),
          date: newEntry.date,
          type: newEntry.type,
          status: newEntry.type === 'charge' ? 'charged' : 'paid',
          description: newEntry.concept,
          category: newEntry.category,
          method: newEntry.type === 'payment' ? newEntry.method : 'System'
      };

      recordPayment(transactionData);
      setShowModal(false);
      setNewEntry(initialEntryState);
  };

  const handleApprovePayment = (payment: Payment) => {
      confirm({
          title: 'Aprobar Pago',
          message: `¿Confirmas haber recibido $${payment.amount}? Esto reducirá el saldo del alumno.`,
          type: 'info',
          onConfirm: () => {
              approvePayment(payment.id);
              setSelectedTransactionId(null);
          }
      });
  };

  const handleRejectPayment = (payment: Payment) => {
      confirm({
          title: 'Rechazar Pago',
          message: '¿Rechazar este pago? No afectará el saldo del alumno.',
          type: 'info',
          onConfirm: () => {
              rejectPayment(payment.id);
              setSelectedTransactionId(null);
          }
      });
  };

  const selectedTransaction = payments.find(t => t.id === selectedTransactionId);

  return (
    <div className="max-w-[1600px] w-full mx-auto p-6 md:p-10 flex flex-col gap-8 h-full z-10">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
                <h2 className="text-4xl font-black tracking-tight text-text-main">Finanzas</h2>
                <p className="text-text-secondary text-lg">Administra cargos, pagos y deudas.</p>
            </div>
            <div className="flex gap-3">
                <button onClick={handleGenerateMonthly} className="bg-white text-text-main hover:bg-gray-50 px-5 py-3 rounded-xl font-bold shadow-sm border border-gray-200 flex gap-2">
                    <span className="material-symbols-outlined">calendar_add_on</span> Generar Mensualidad
                </button>
                <button onClick={() => setShowModal(true)} className="bg-text-main text-white px-6 py-3 rounded-xl font-bold shadow-lg flex gap-2 hover:bg-black">
                    <span className="material-symbols-outlined">add_circle</span> Nuevo Movimiento
                </button>
            </div>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                <span className="text-sm font-bold text-gray-400 uppercase">Ingresos Totales (Cobrado)</span>
                <span className="text-3xl font-black text-green-600">${stats.totalIncome.toLocaleString()}</span>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                 <div className="absolute right-0 top-0 p-4 opacity-5"><span className="material-symbols-outlined text-6xl">pending_actions</span></div>
                <span className="text-sm font-bold text-gray-400 uppercase">Pagos por Aprobar</span>
                <span className="text-3xl font-black text-blue-600">{stats.pendingApproval}</span>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
                <span className="text-sm font-bold text-gray-400 uppercase">Deuda Total (Por Cobrar)</span>
                <span className="text-3xl font-black text-red-500">${stats.totalDebt.toLocaleString()}</span>
            </div>
        </section>

        {/* Filters */}
        <section className="flex gap-4 items-center bg-white p-2 rounded-2xl shadow-sm border border-gray-100 w-full md:w-fit">
            <span className="material-symbols-outlined text-gray-400 ml-2">filter_list</span>
            <select value={filterType} onChange={e => setFilterType(e.target.value as any)} className="border-none text-sm font-bold text-gray-600 focus:ring-0 cursor-pointer bg-transparent">
                <option value="all">Todo</option>
                <option value="charge">Cargos</option>
                <option value="payment">Pagos</option>
            </select>
            <div className="w-px h-6 bg-gray-200"></div>
            <select value={filterTime} onChange={e => setFilterTime(e.target.value as any)} className="border-none text-sm font-bold text-gray-600 focus:ring-0 cursor-pointer bg-transparent">
                <option value="month">Este Mes</option>
                <option value="week">Esta Semana</option>
                <option value="all">Histórico</option>
            </select>
            <div className="w-px h-6 bg-gray-200"></div>
            <input 
                placeholder="Buscar alumno..." 
                className="border-none text-sm focus:ring-0 bg-transparent min-w-[200px]"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
            />
        </section>

        {/* Table */}
        <div className="bg-white rounded-3xl shadow-card overflow-hidden flex-1 border border-gray-100">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50/50 border-b border-gray-100">
                        <tr>
                            <th className="p-5 text-xs font-bold text-gray-400 uppercase">Fecha</th>
                            <th className="p-5 text-xs font-bold text-gray-400 uppercase">Alumno</th>
                            <th className="p-5 text-xs font-bold text-gray-400 uppercase">Tipo</th>
                            <th className="p-5 text-xs font-bold text-gray-400 uppercase">Concepto</th>
                            <th className="p-5 text-xs font-bold text-gray-400 uppercase">Estado</th>
                            <th className="p-5 text-xs font-bold text-gray-400 uppercase text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredTransactions.map(tx => {
                             const student = students.find(s => s.id === tx.studentId);
                             return (
                                <tr key={tx.id} onClick={() => setSelectedTransactionId(tx.id)} className="hover:bg-gray-50 cursor-pointer transition-colors group">
                                    <td className="p-5 text-sm font-medium text-gray-500">{tx.date}</td>
                                    <td className="p-5 font-bold text-text-main flex items-center gap-3">
                                        <div className="size-8 rounded-full bg-gray-200 overflow-hidden"><img src={student?.avatarUrl} className="w-full h-full object-cover" /></div>
                                        {tx.studentName}
                                    </td>
                                    <td className="p-5">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${tx.type === 'charge' ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                            {tx.type === 'charge' ? 'Cargo' : 'Pago'}
                                        </span>
                                    </td>
                                    <td className="p-5 text-sm text-gray-600">{tx.description}</td>
                                    <td className="p-5">
                                        {tx.status === 'pending_approval' ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded w-fit animate-pulse">
                                                <span className="size-2 rounded-full bg-blue-500"></span> Revisar
                                            </span>
                                        ) : tx.status === 'paid' ? ( 
                                             <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded w-fit">Aplicado</span>
                                        ) : tx.status === 'charged' ? (
                                            <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded w-fit uppercase">Deuda</span>
                                        ) : (
                                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded w-fit uppercase">{tx.status}</span>
                                        )}
                                    </td>
                                    <td className={`p-5 text-right font-bold ${tx.type === 'charge' ? 'text-red-500' : 'text-green-600'}`}>
                                        {tx.type === 'charge' ? '+' : '-'}${tx.amount.toFixed(2)}
                                    </td>
                                </tr>
                             );
                        })}
                    </tbody>
                </table>
            </div>
        </div>

        {/* CREATE MODAL */}
        {showModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
                    <h2 className="text-2xl font-bold mb-6 text-text-main">Registrar Movimiento</h2>
                    <form onSubmit={handleRegisterEntry} className="flex flex-col gap-4">
                        <div className="bg-gray-100 p-1 rounded-xl flex mb-2">
                            <button type="button" onClick={() => setNewEntry({...newEntry, type: 'charge'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newEntry.type === 'charge' ? 'bg-white shadow text-red-600' : 'text-gray-500'}`}>Generar Cargo (Deuda)</button>
                            <button type="button" onClick={() => setNewEntry({...newEntry, type: 'payment'})} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${newEntry.type === 'payment' ? 'bg-white shadow text-green-600' : 'text-gray-500'}`}>Registrar Pago (Abono)</button>
                        </div>
                        
                        <select required value={newEntry.studentId} onChange={e => setNewEntry({...newEntry, studentId: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm">
                            <option value="">-- Seleccionar Alumno --</option>
                            {students.map(s => <option key={s.id} value={s.id}>{s.name} (Deuda: ${s.balance.toFixed(2)})</option>)}
                        </select>

                        <div className="grid grid-cols-2 gap-4">
                             <input required type="number" value={newEntry.amount} onChange={e => setNewEntry({...newEntry, amount: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm" placeholder="Monto $" />
                             <input required type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm" />
                        </div>

                        <input required value={newEntry.concept} onChange={e => setNewEntry({...newEntry, concept: e.target.value})} className="w-full rounded-xl border-gray-200 p-3 text-sm" placeholder="Descripción (ej. Uniforme)" />

                        {newEntry.type === 'payment' && (
                            <select value={newEntry.method} onChange={e => setNewEntry({...newEntry, method: e.target.value as any})} className="w-full rounded-xl border-gray-200 p-3 text-sm">
                                <option value="Efectivo">Efectivo</option>
                                <option value="Transferencia">Transferencia</option>
                                <option value="Tarjeta">Tarjeta</option>
                            </select>
                        )}

                        <div className="flex gap-3 mt-4">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 rounded-xl border border-gray-200 font-bold text-gray-500">Cancelar</button>
                            <button type="submit" className="flex-1 py-3 rounded-xl bg-primary text-white font-bold">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* APPROVAL / DETAIL MODAL */}
        {selectedTransaction && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
                    <div className="w-full md:w-1/2 bg-gray-900 flex items-center justify-center p-6">
                        {selectedTransaction.proofUrl ? (
                            <img src={selectedTransaction.proofUrl} className="max-h-[300px] object-contain rounded" />
                        ) : (
                            <div className="text-white text-center opacity-50">
                                <span className="material-symbols-outlined text-6xl">image_not_supported</span>
                                <p className="mt-2 text-sm">Sin comprobante digital</p>
                            </div>
                        )}
                    </div>
                    <div className="w-full md:w-1/2 p-8 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-2xl font-bold text-text-main">${selectedTransaction.amount.toFixed(2)}</h3>
                                <button onClick={() => setSelectedTransactionId(null)} className="text-gray-400 hover:text-gray-600"><span className="material-symbols-outlined">close</span></button>
                            </div>
                            <p className="font-bold text-text-main text-lg mb-1">{selectedTransaction.studentName}</p>
                            <p className="text-gray-500 text-sm mb-6">{selectedTransaction.description}</p>
                            
                            <div className="space-y-2 text-sm text-gray-600">
                                <div className="flex justify-between"><span>Fecha:</span> <span className="font-medium text-black">{selectedTransaction.date}</span></div>
                                <div className="flex justify-between"><span>Método:</span> <span className="font-medium text-black">{selectedTransaction.method}</span></div>
                                <div className="flex justify-between"><span>Tipo:</span> <span className="font-medium uppercase">{selectedTransaction.type === 'charge' ? 'Cargo' : 'Pago'}</span></div>
                            </div>
                        </div>

                        {selectedTransaction.status === 'pending_approval' && selectedTransaction.type === 'payment' && (
                             <div className="flex gap-2 mt-8">
                                <button onClick={() => handleRejectPayment(selectedTransaction)} className="w-1/3 py-3 rounded-xl border border-red-200 text-red-600 font-bold hover:bg-red-50">
                                    Rechazar
                                </button>
                                <button onClick={() => handleApprovePayment(selectedTransaction)} className="flex-1 py-3 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 shadow-lg shadow-green-500/30">
                                    Aprobar Pago
                                </button>
                             </div>
                        )}
                        {selectedTransaction.status === 'paid' && selectedTransaction.type === 'payment' && (
                             <button onClick={() => generateReceipt(selectedTransaction, academySettings, currentUser)} className="mt-8 w-full py-3 rounded-xl border border-gray-200 text-text-main font-bold hover:bg-gray-50">
                                 Imprimir Recibo
                             </button>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Finance;