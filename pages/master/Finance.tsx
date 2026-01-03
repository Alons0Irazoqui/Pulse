
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Payment, PaymentCategory } from '../../types';
import { exportToCSV } from '../../utils/csvExport';
import { generateReceipt } from '../../utils/pdfGenerator';
import ConfirmationModal from '../../components/ConfirmationModal';

const Finance: React.FC = () => {
  const { payments, recordPayment, students, academySettings, currentUser, generateMonthlyCharges } = useStore();
  const { addToast } = useToast();
  
  // Filtering States
  const [filterTime, setFilterTime] = useState<'all' | 'month' | 'week'>('month');
  const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'pending_approval'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal States
  const [showModal, setShowModal] = useState(false); // For manual recording
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  
  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, action: () => void}>({
      isOpen: false, title: '', message: '', action: () => {}
  });

  // New Payment Form State (Manual Entry by Master)
  const initialPaymentState = {
      studentId: '',
      amount: '',
      concept: '',
      category: 'Mensualidad' as PaymentCategory,
      method: 'Efectivo',
      status: 'paid' as const,
      date: new Date().toISOString().split('T')[0]
  };
  const [newPayment, setNewPayment] = useState(initialPaymentState);

  // --- DYNAMIC FILTERING LOGIC ---
  const filteredPayments = useMemo(() => {
      return payments.filter(p => {
          // Search
          const studentName = p.studentName || students.find(s => s.id === p.studentId)?.name || 'Unknown';
          const matchesSearch = studentName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                p.description.toLowerCase().includes(searchQuery.toLowerCase());

          // Status
          const matchesStatus = filterStatus === 'all' || p.status === filterStatus;

          // Time (Simple logic for demo)
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

          return matchesSearch && matchesStatus && matchesTime;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [payments, searchQuery, filterStatus, filterTime, students]);

  // --- REAL-TIME STATS ---
  const stats = useMemo(() => {
      const total = filteredPayments.filter(p => p.status === 'paid').reduce((acc, curr) => acc + curr.amount, 0);
      const pendingApproval = filteredPayments.filter(p => p.status === 'pending_approval').length;
      const count = filteredPayments.length;
      return { total, pendingApproval, count };
  }, [filteredPayments]);

  const handleExport = () => {
      exportToCSV(filteredPayments, 'Reporte_Financiero');
      addToast('Reporte generado exitosamente', 'success');
  };

  const handleGenerateMonthly = () => {
      setConfirmModal({
          isOpen: true,
          title: 'Generar Cobros Mensuales',
          message: '¿Deseas generar automáticamente los cargos de mensualidad para todos los alumnos activos? Esto afectará sus balances.',
          action: () => {
              if (generateMonthlyCharges) {
                  generateMonthlyCharges();
                  addToast('Cargos mensuales generados.', 'success');
                  setConfirmModal(prev => ({...prev, isOpen: false}));
              }
          }
      });
  };

  const handleRegisterPayment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newPayment.studentId || !newPayment.amount) return;

      const student = students.find(s => s.id === newPayment.studentId);
      
      const paymentData: Payment = {
          id: '', // Empty ID tells StoreContext to generate one
          academyId: '', 
          studentId: newPayment.studentId,
          studentName: student?.name || 'Unknown',
          amount: parseFloat(newPayment.amount),
          date: newPayment.date,
          status: newPayment.status,
          description: newPayment.concept,
          category: newPayment.category,
          method: newPayment.method
      };

      recordPayment(paymentData);
      setShowModal(false);
      setNewPayment(initialPaymentState);
      addToast('Ingreso registrado y balance actualizado', 'success');
  };

  // Helper to approve payment - NOW USES UPDATED STORE LOGIC + CONFIRM MODAL
  const handleApprovePayment = (payment: Payment) => {
      const isCash = payment.method === 'Efectivo en Academia';
      const msg = isCash 
        ? '¿Confirmas que has recibido el dinero en efectivo?'
        : '¿Has verificado el comprobante? Esto marcará el pago como completado.';

      setConfirmModal({
          isOpen: true,
          title: isCash ? 'Confirmar Recepción' : 'Aprobar Transferencia',
          message: msg,
          action: () => {
              recordPayment({ ...payment, status: 'paid' }); 
              setSelectedTransactionId(null);
              addToast(isCash ? 'Pago en efectivo confirmado' : 'Comprobante verificado. Pago aprobado.', 'success');
              setConfirmModal(prev => ({...prev, isOpen: false}));
          }
      });
  };

  const selectedTransaction = payments.find(t => t.id === selectedTransactionId);
  const selectedTxStudent = students.find(s => s.id === selectedTransaction?.studentId);

  const handleDownloadPDF = () => {
      if (selectedTransaction) {
          generateReceipt(selectedTransaction, academySettings, currentUser);
      }
  };

  return (
    <div className="max-w-[1600px] w-full mx-auto p-6 md:p-10 flex flex-col gap-8 h-full animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
        
        <ConfirmationModal 
            isOpen={confirmModal.isOpen}
            title={confirmModal.title}
            message={confirmModal.message}
            onConfirm={confirmModal.action}
            onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
            type="info"
        />

        {/* Header & Actions */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
                <h2 className="text-4xl font-black tracking-tight text-text-main">Control Financiero</h2>
                <p className="text-text-secondary text-lg">Ingresos, cuentas por cobrar y revisión de transferencias.</p>
            </div>
            <div className="flex gap-3 flex-wrap md:flex-nowrap">
                <button 
                    onClick={handleGenerateMonthly}
                    className="glass-panel hover:bg-white px-5 py-3 rounded-xl font-semibold shadow-sm flex items-center gap-2 transition-all text-text-main"
                >
                    <span className="material-symbols-outlined text-[20px]">calendar_add_on</span>
                    Generar Cobros
                </button>
                <button 
                    onClick={handleExport}
                    className="glass-panel hover:bg-white px-5 py-3 rounded-xl font-semibold shadow-sm flex items-center gap-2 transition-all text-text-main"
                >
                    <span className="material-symbols-outlined text-[20px]">download</span>
                    Exportar CSV
                </button>
                <button 
                    onClick={() => setShowModal(true)}
                    className="bg-text-main hover:bg-black text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-black/10 flex items-center gap-2 transition-all active:scale-95"
                >
                    <span className="material-symbols-outlined text-[20px]">add_circle</span>
                    Registrar Manual
                </button>
            </div>
        </header>

        {/* Dynamic Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-3xl p-6 flex flex-col gap-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <span className="material-symbols-outlined text-6xl text-primary">account_balance_wallet</span>
                </div>
                <p className="text-text-secondary text-sm font-bold uppercase tracking-wider">Ingresos Aprobados</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-text-main text-3xl font-black tracking-tight">${stats.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    <span className="text-sm font-semibold text-text-secondary">MXN</span>
                </div>
            </div>
            <div className="glass-card rounded-3xl p-6 flex flex-col gap-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <span className="material-symbols-outlined text-6xl text-blue-500">notifications_active</span>
                </div>
                <p className="text-text-secondary text-sm font-bold uppercase tracking-wider">Acciones Pendientes</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-text-main text-3xl font-black tracking-tight text-blue-600">{stats.pendingApproval}</p>
                    <span className="text-sm font-semibold text-text-secondary">revisión / cobro</span>
                </div>
            </div>
            <div className="glass-card rounded-3xl p-6 flex flex-col gap-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <span className="material-symbols-outlined text-6xl text-gray-400">receipt_long</span>
                </div>
                <p className="text-text-secondary text-sm font-bold uppercase tracking-wider">Total Transacciones</p>
                <div className="flex items-baseline gap-2">
                    <p className="text-text-main text-3xl font-black tracking-tight">{stats.count}</p>
                    <span className="text-sm font-semibold text-text-secondary">registros</span>
                </div>
            </div>
        </section>

        {/* Smart Filters Toolbar */}
        <section className="glass-panel p-2 rounded-2xl flex flex-col lg:flex-row gap-4 items-center">
            <div className="w-full lg:flex-1 relative">
                <span className="material-symbols-outlined text-text-secondary absolute left-4 top-3.5">search</span>
                <input 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-transparent border-none rounded-xl text-text-main placeholder:text-text-secondary focus:ring-0 text-sm font-medium" 
                    placeholder="Buscar por alumno o concepto..." 
                />
            </div>
            <div className="flex gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 px-2 lg:px-0 scrollbar-hide">
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="bg-white/50 border-none rounded-xl px-4 py-3 text-sm font-bold text-text-main cursor-pointer hover:bg-white transition-colors focus:ring-2 focus:ring-primary/20">
                    <option value="all">Todos los Estados</option>
                    <option value="pending_approval">Por Revisar / Por Cobrar</option>
                    <option value="paid">Aprobados/Pagados</option>
                    <option value="pending">Deudas Pendientes</option>
                </select>
                <select value={filterTime} onChange={(e) => setFilterTime(e.target.value as any)} className="bg-white/50 border-none rounded-xl px-4 py-3 text-sm font-bold text-text-main cursor-pointer hover:bg-white transition-colors focus:ring-2 focus:ring-primary/20">
                    <option value="all">Todo el Historial</option>
                    <option value="month">Este Mes</option>
                    <option value="week">Esta Semana</option>
                </select>
            </div>
        </section>

        {/* Transactions Table */}
        <section className="glass-card rounded-3xl overflow-hidden flex flex-col flex-1 min-h-[400px]">
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-white/40 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-5 text-xs font-bold text-text-secondary uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-5 text-xs font-bold text-text-secondary uppercase tracking-wider">Alumno</th>
                            <th className="px-6 py-5 text-xs font-bold text-text-secondary uppercase tracking-wider">Concepto</th>
                            <th className="px-6 py-5 text-xs font-bold text-text-secondary uppercase tracking-wider">Método</th>
                            <th className="px-6 py-5 text-xs font-bold text-text-secondary uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-5 text-xs font-bold text-text-secondary uppercase tracking-wider text-right">Monto</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50">
                        {filteredPayments.map((tx) => {
                            const student = students.find(s => s.id === tx.studentId);
                            // Determine display status logic
                            let statusBadge;
                            if (tx.status === 'paid') {
                                statusBadge = <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-green-100 text-green-700 shadow-sm"><span className="size-1.5 rounded-full bg-green-600"></span>Pagado</span>;
                            } else if (tx.status === 'pending_approval') {
                                if (tx.method === 'Efectivo en Academia') {
                                    statusBadge = <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-purple-100 text-purple-700 shadow-sm animate-pulse"><span className="size-1.5 rounded-full bg-purple-600"></span>Cobrar en Caja</span>;
                                } else {
                                    statusBadge = <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-blue-100 text-blue-700 shadow-sm animate-pulse"><span className="size-1.5 rounded-full bg-blue-600"></span>Revisar Comp.</span>;
                                }
                            } else {
                                statusBadge = <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-orange-100 text-orange-700 shadow-sm"><span className="size-1.5 rounded-full bg-orange-600"></span>Pendiente</span>;
                            }

                            return (
                                <tr key={tx.id} onClick={() => setSelectedTransactionId(tx.id)} className={`hover:bg-white/60 transition-colors cursor-pointer group ${tx.status === 'pending_approval' ? 'bg-blue-50/10' : ''}`}>
                                    <td className="px-6 py-4 text-sm font-medium text-text-secondary whitespace-nowrap">{tx.date}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-full bg-gray-100 overflow-hidden ring-2 ring-white shadow-sm">
                                                {student?.avatarUrl ? <img src={student.avatarUrl} className="w-full h-full object-cover" /> : null}
                                            </div>
                                            <span className="text-sm font-bold text-text-main group-hover:text-primary transition-colors">{tx.studentName || student?.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-semibold text-text-main">{tx.description}</span>
                                            <span className="text-xs text-text-secondary">{tx.category}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-secondary">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">
                                                {tx.method.includes('Efectivo') ? 'payments' : 'account_balance'}
                                            </span>
                                            {tx.method}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {statusBadge}
                                    </td>
                                    <td className="px-6 py-4 text-right text-sm font-black text-text-main">
                                        ${tx.amount.toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredPayments.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-text-secondary">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="material-symbols-outlined text-4xl opacity-20">search_off</span>
                                        <p>No se encontraron transacciones.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
             </div>
        </section>

        {/* REGISTER MANUAL PAYMENT MODAL */}
        {showModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden border border-white/20">
                    <div className="p-8 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-2xl font-bold text-text-main">Registrar Ingreso Manual</h2>
                        <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                    <form onSubmit={handleRegisterPayment} className="p-8 flex flex-col gap-6">
                        {/* Student Selector */}
                        <div>
                            <label className="block text-sm font-bold text-text-main mb-2">Seleccionar Alumno</label>
                            <select 
                                required
                                value={newPayment.studentId} 
                                onChange={(e) => setNewPayment({...newPayment, studentId: e.target.value})}
                                className="w-full rounded-2xl border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm focus:bg-white focus:border-primary focus:ring-primary transition-all cursor-pointer"
                            >
                                <option value="">-- Buscar Alumno --</option>
                                {students.filter(s => s.status !== 'inactive').map(s => (
                                    <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-text-main mb-2">Monto (MXN)</label>
                                <input 
                                    required
                                    type="number" 
                                    min="0"
                                    step="0.01"
                                    value={newPayment.amount}
                                    onChange={(e) => setNewPayment({...newPayment, amount: e.target.value})}
                                    className="w-full rounded-2xl border-gray-200 px-4 py-3.5 font-mono text-sm focus:border-primary focus:ring-primary"
                                    placeholder="0.00" 
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-text-main mb-2">Fecha</label>
                                <input 
                                    required
                                    type="date" 
                                    value={newPayment.date}
                                    onChange={(e) => setNewPayment({...newPayment, date: e.target.value})}
                                    className="w-full rounded-2xl border-gray-200 px-4 py-3.5 text-sm focus:border-primary focus:ring-primary" 
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-text-main mb-2">Concepto / Descripción</label>
                            <input 
                                required
                                type="text" 
                                value={newPayment.concept}
                                onChange={(e) => setNewPayment({...newPayment, concept: e.target.value})}
                                className="w-full rounded-2xl border-gray-200 px-4 py-3.5 text-sm focus:border-primary focus:ring-primary"
                                placeholder="Ej. Mensualidad Efectivo" 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-bold text-text-main mb-2">Categoría</label>
                                <select 
                                    value={newPayment.category} 
                                    onChange={(e) => setNewPayment({...newPayment, category: e.target.value as PaymentCategory})}
                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm focus:bg-white focus:border-primary focus:ring-primary"
                                >
                                    <option value="Mensualidad">Mensualidad</option>
                                    <option value="Torneo">Torneo</option>
                                    <option value="Examen/Promoción">Examen</option>
                                    <option value="Equipo/Uniforme">Equipo</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-text-main mb-2">Método de Pago</label>
                                <select 
                                    value={newPayment.method} 
                                    onChange={(e) => setNewPayment({...newPayment, method: e.target.value})}
                                    className="w-full rounded-2xl border-gray-200 bg-gray-50/50 px-4 py-3.5 text-sm focus:bg-white focus:border-primary focus:ring-primary"
                                >
                                    <option value="Efectivo">Efectivo</option>
                                    <option value="Transferencia">Transferencia</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-4 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3.5 rounded-2xl border border-gray-200 font-bold hover:bg-gray-50 text-text-secondary transition-colors">Cancelar</button>
                            <button type="submit" className="flex-1 py-3.5 rounded-2xl bg-text-main text-white font-bold hover:bg-black shadow-lg shadow-black/20 transition-all">Guardar</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* TRANSACTION DETAIL / APPROVAL MODAL */}
        {selectedTransaction && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-center justify-center p-4">
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-white/20 relative flex flex-col md:flex-row">
                    <button onClick={() => setSelectedTransactionId(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10 p-2 bg-white/50 rounded-full backdrop-blur-md">
                        <span className="material-symbols-outlined text-2xl">close</span>
                    </button>
                    
                    {/* Left Side: Proof or Icon */}
                    <div className={`w-full md:w-1/2 flex items-center justify-center p-4 relative min-h-[200px] ${selectedTransaction.method.includes('Efectivo') ? 'bg-emerald-50/50' : 'bg-gray-900'}`}>
                        {selectedTransaction.method.includes('Efectivo') ? (
                            <div className="flex flex-col items-center text-emerald-600">
                                <div className="size-24 rounded-full bg-white shadow-lg flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-5xl">storefront</span>
                                </div>
                                <p className="font-bold text-xl">Pago en Academia</p>
                                <p className="text-sm opacity-75">Cobro físico en recepción</p>
                            </div>
                        ) : selectedTransaction.proofUrl ? (
                            <div className="text-center w-full relative z-10">
                                {selectedTransaction.proofType?.includes('image') ? (
                                    <img src={selectedTransaction.proofUrl} className="max-h-[300px] object-contain rounded-lg shadow-2xl mx-auto border border-white/10" alt="Comprobante" />
                                ) : (
                                    <div className="flex flex-col items-center text-white">
                                        <span className="material-symbols-outlined text-7xl opacity-80">description</span>
                                        <span className="mt-2 text-sm font-medium">Archivo Documento</span>
                                    </div>
                                )}
                                <a 
                                    href={selectedTransaction.proofUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs text-white transition-colors backdrop-blur-md border border-white/10"
                                >
                                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                                    Ver archivo original
                                </a>
                            </div>
                        ) : (
                            <div className="text-white/50 flex flex-col items-center">
                                <span className="material-symbols-outlined text-5xl">image_not_supported</span>
                                <span className="text-sm mt-2">Sin comprobante digital</span>
                            </div>
                        )}
                    </div>

                    {/* Right Side: Details & Actions */}
                    <div className="w-full md:w-1/2 flex flex-col">
                        <div className="p-8 border-b border-gray-100">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-3 shadow-sm ${
                                selectedTransaction.status === 'paid' ? 'bg-green-100 text-green-700' : 
                                selectedTransaction.status === 'pending_approval' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                                {selectedTransaction.status === 'paid' ? 'Pagado' : selectedTransaction.status === 'pending_approval' ? 'Por Procesar' : 'Pendiente'}
                            </span>
                            <h2 className="text-4xl font-black text-text-main tracking-tight">${selectedTransaction.amount.toFixed(2)}</h2>
                            <p className="text-text-secondary text-sm font-medium mt-1">{selectedTransaction.date}</p>
                        </div>

                        <div className="p-8 space-y-5 flex-1">
                            <div>
                                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Alumno</span>
                                <p className="text-lg font-bold text-text-main">{selectedTransaction.studentName || selectedTxStudent?.name}</p>
                            </div>
                            <div>
                                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Concepto</span>
                                <p className="text-base font-medium text-text-main">{selectedTransaction.description}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Categoría</span>
                                    <p className="text-sm font-semibold text-text-main">{selectedTransaction.category}</p>
                                </div>
                                <div>
                                    <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">Método</span>
                                    <p className="text-sm font-semibold text-text-main">{selectedTransaction.method}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50/50 border-t border-gray-100 flex flex-col gap-3">
                            {selectedTransaction.status === 'pending_approval' ? (
                                <button 
                                    onClick={() => handleApprovePayment(selectedTransaction)}
                                    className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 ${
                                        selectedTransaction.method === 'Efectivo en Academia'
                                        ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/30'
                                        : 'bg-green-600 hover:bg-green-700 shadow-green-500/30'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-xl">
                                        {selectedTransaction.method === 'Efectivo en Academia' ? 'payments' : 'check_circle'}
                                    </span>
                                    {selectedTransaction.method === 'Efectivo en Academia' ? 'Confirmar Recepción de Efectivo' : 'Verificar y Aprobar Pago'}
                                </button>
                            ) : (
                                <button 
                                    onClick={handleDownloadPDF}
                                    className="w-full py-4 rounded-2xl border border-gray-200 bg-white hover:bg-gray-50 text-text-main font-bold transition-all flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <span className="material-symbols-outlined">print</span>
                                    Imprimir Recibo
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Finance;
