
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { PaymentCategory } from '../../types';
import { generateReceipt } from '../../utils/pdfGenerator';

const StudentPayments: React.FC = () => {
  const { currentUser, students, recordPayment, academySettings, payments } = useStore();
  const { addToast } = useToast();
  
  // Get current logged-in student details
  const student = students.find(s => s.id === currentUser?.studentId);
  const balance = student?.balance || 0;
  const bankInfo = academySettings.bankDetails;

  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'academy'>('transfer');

  const [paymentForm, setPaymentForm] = useState({
      category: 'Mensualidad' as PaymentCategory,
      amount: '',
      description: '',
      otherDescription: '',
      proofFile: null as File | null
  });

  // Get Student History (Mixed Charges and Payments)
  const myTransactions = payments
    .filter(p => p.studentId === student?.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setPaymentForm({ ...paymentForm, proofFile: e.target.files[0] });
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!student) return;

      const finalDescription = paymentForm.category === 'Otro' 
        ? paymentForm.otherDescription 
        : paymentForm.description || paymentForm.category;

      if (paymentMethod === 'transfer') {
          // TRANSFER FLOW
          if (!paymentForm.proofFile) {
              addToast("Por favor sube el comprobante de pago", 'error');
              return;
          }
          const fakeUrl = URL.createObjectURL(paymentForm.proofFile);
          
          recordPayment({
              id: '', // Generated in store
              academyId: student.academyId,
              studentId: student.id,
              studentName: student.name,
              amount: parseFloat(paymentForm.amount),
              date: new Date().toISOString().split('T')[0],
              status: 'pending_approval', 
              type: 'payment', // Important: This is a PAYMENT, not a charge
              description: finalDescription,
              category: paymentForm.category,
              method: 'Transferencia',
              proofUrl: fakeUrl,
              proofType: paymentForm.proofFile.type
          });
          addToast('Comprobante enviado. En espera de aprobación.', 'success');

      } else {
          // ACADEMY CASH FLOW
          recordPayment({
              id: '',
              academyId: student.academyId,
              studentId: student.id,
              studentName: student.name,
              amount: parseFloat(paymentForm.amount),
              date: new Date().toISOString().split('T')[0],
              status: 'pending_approval',
              type: 'payment', // Payment Notification
              description: finalDescription,
              category: paymentForm.category,
              method: 'Efectivo en Academia',
          });
          addToast('Aviso de pago creado. Paga en recepción.', 'info');
      }

      // Reset
      setPaymentForm({ category: 'Mensualidad', amount: '', description: '', otherDescription: '', proofFile: null });
  };

  const handleDownloadReceipt = (payment: any) => {
      generateReceipt(payment, academySettings, currentUser);
  };

  return (
    <div className="max-w-[1400px] mx-auto p-6 md:p-10 flex flex-col gap-10">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-text-main">Pagos y Facturación</h2>
            <p className="text-text-secondary mt-1">Revisa tu saldo y reporta tus pagos.</p>
          </div>
          <div className="flex items-center gap-4 px-6 py-4 bg-white rounded-2xl shadow-sm border border-slate-100 self-start md:self-end">
            <div className={`flex flex-col items-end`}>
                <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Tu Deuda Actual</span>
                <span className={`text-2xl font-black ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                    ${balance.toFixed(2)}
                </span>
            </div>
            <div className={`size-12 rounded-full flex items-center justify-center ${balance > 0 ? 'bg-red-50 text-red-500' : 'bg-emerald-50 text-emerald-500'}`}>
                <span className="material-symbols-outlined text-2xl">{balance > 0 ? 'money_off' : 'check_circle'}</span>
            </div>
          </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Left Column: Payment Form */}
        <div className="xl:col-span-7 flex flex-col gap-6 order-1">
             <div className="rounded-[2rem] bg-white shadow-card border border-gray-100 p-8 flex flex-col gap-6">
                
                <div className="pb-2 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-text-main">Reportar Nuevo Pago</h3>
                    <p className="text-sm text-text-secondary mt-1">
                        Si tienes deuda, realiza tu pago y súbelo aquí para que tu saldo se actualice.
                    </p>
                </div>

                {/* Method Selector */}
                <div className="flex p-1 bg-gray-50 rounded-xl border border-gray-100">
                    <button 
                        onClick={() => setPaymentMethod('transfer')}
                        className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                            paymentMethod === 'transfer' 
                            ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' 
                            : 'text-text-secondary hover:text-text-main'
                        }`}
                    >
                        <span className="material-symbols-outlined">cloud_upload</span>
                        Transferencia
                    </button>
                    <button 
                        onClick={() => setPaymentMethod('academy')}
                        className={`flex-1 py-3 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                            paymentMethod === 'academy' 
                            ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-black/5' 
                            : 'text-text-secondary hover:text-text-main'
                        }`}
                    >
                        <span className="material-symbols-outlined">storefront</span>
                        Efectivo
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-bold text-text-main mb-2">Concepto</label>
                            <select 
                                required
                                value={paymentForm.category}
                                onChange={e => setPaymentForm({...paymentForm, category: e.target.value as any})}
                                className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:bg-white focus:border-primary focus:ring-primary transition-all cursor-pointer"
                            >
                                <option value="Mensualidad">Mensualidad</option>
                                <option value="Torneo">Torneo</option>
                                <option value="Examen/Promoción">Examen de Grado</option>
                                <option value="Equipo/Uniforme">Equipo / Uniforme</option>
                                <option value="Otro">Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-text-main mb-2">Monto a Pagar ($)</label>
                            <input 
                                required
                                type="number" 
                                min="0" 
                                step="0.01"
                                value={paymentForm.amount}
                                onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})}
                                className="w-full rounded-xl border-gray-200 px-4 py-3 font-mono text-sm focus:border-primary focus:ring-primary"
                                placeholder="0.00" 
                            />
                        </div>
                    </div>

                    {paymentForm.category === 'Otro' && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <label className="block text-sm font-bold text-text-main mb-2">Descripción Detallada</label>
                            <input 
                                required
                                type="text"
                                value={paymentForm.otherDescription}
                                onChange={e => setPaymentForm({...paymentForm, otherDescription: e.target.value})}
                                className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:border-primary focus:ring-primary"
                                placeholder="Especifique el motivo del pago..." 
                            />
                        </div>
                    )}

                    {paymentMethod === 'transfer' && (
                        <div className="animate-in fade-in zoom-in-95 duration-300">
                            <label className="block text-sm font-bold text-text-main mb-2">Comprobante (Imagen/PDF)</label>
                            <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${paymentForm.proofFile ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-gray-50'}`}>
                                <input 
                                    type="file" 
                                    id="proof-upload" 
                                    className="hidden" 
                                    accept="image/*,.pdf"
                                    onChange={handleFileChange}
                                />
                                <label htmlFor="proof-upload" className="cursor-pointer flex flex-col items-center gap-3">
                                    {paymentForm.proofFile ? (
                                        <>
                                            <div className="size-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
                                                <span className="material-symbols-outlined text-2xl">check</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-primary">{paymentForm.proofFile.name}</p>
                                                <p className="text-xs text-text-secondary mt-1">Click para cambiar archivo</p>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="size-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-2xl">cloud_upload</span>
                                            </div>
                                            <div>
                                                <p className="font-medium text-text-main">Arrastra tu comprobante aquí</p>
                                                <p className="text-xs text-text-secondary mt-1">Soporta JPG, PNG, PDF</p>
                                            </div>
                                        </>
                                    )}
                                </label>
                            </div>
                        </div>
                    )}

                    <button 
                        type="submit" 
                        className={`mt-2 w-full h-14 font-bold text-lg rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg transform active:scale-[0.98] text-white ${
                            paymentMethod === 'transfer' 
                            ? 'bg-primary hover:bg-primary-hover shadow-primary/30' 
                            : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30'
                        }`}
                    >
                        <span className="material-symbols-outlined">{paymentMethod === 'transfer' ? 'send' : 'payments'}</span>
                        {paymentMethod === 'transfer' ? 'Enviar Reporte de Pago' : 'Generar Aviso de Pago'}
                    </button>
                </form>
             </div>
        </div>

        {/* Right Column: Info & History */}
        <div className="xl:col-span-5 flex flex-col gap-6 order-2">
            {/* Bank Info Card */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <span className="material-symbols-outlined text-[150px]">account_balance</span>
                </div>
                <div className="relative z-10">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined">account_balance_wallet</span>
                        Datos para Transferencia
                    </h3>
                    
                    {bankInfo ? (
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wider font-bold mb-1">Banco / Beneficiario</p>
                                <p className="text-lg font-medium tracking-tight">{bankInfo.bankName} • {bankInfo.accountHolder}</p>
                            </div>
                            <div className="bg-white/10 rounded-xl p-3 border border-white/5">
                                <p className="text-[10px] text-slate-300 uppercase tracking-wider font-bold mb-1">CLABE Interbancaria</p>
                                <p className="font-mono text-lg tracking-wider select-all">{bankInfo.clabe}</p>
                            </div>
                        </div>
                    ) : (
                        <p className="text-slate-400">Sin información bancaria configurada.</p>
                    )}
                </div>
            </div>

            {/* History List */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-card flex flex-col overflow-hidden h-[500px]">
                <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-text-main">Historial de Movimientos</h3>
                </div>
                <div className="overflow-y-auto flex-1 p-2">
                    {myTransactions.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-text-secondary opacity-60">
                            <span className="material-symbols-outlined text-4xl mb-2">receipt_long</span>
                            <p className="text-sm">No hay movimientos.</p>
                        </div>
                    )}
                    {myTransactions.map((tx) => (
                        <div key={tx.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-xl transition-colors border-b border-gray-50 last:border-0">
                            <div className="flex items-center gap-3">
                                {/* Icon based on Type */}
                                <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${
                                    tx.type === 'charge' ? 'bg-red-50 text-red-500' :
                                    tx.status === 'paid' ? 'bg-green-100 text-green-600' :
                                    'bg-orange-100 text-orange-600'
                                }`}>
                                    <span className="material-symbols-outlined">
                                        {tx.type === 'charge' ? 'remove_circle_outline' : 'add_circle_outline'}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-bold text-text-main text-sm">{tx.description}</p>
                                    <p className="text-xs text-text-secondary capitalize">{tx.type === 'charge' ? 'Cargo (Deuda)' : `Pago (${tx.method})`}</p>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <p className={`font-bold text-sm ${tx.type === 'charge' ? 'text-red-500' : 'text-green-600'}`}>
                                    {tx.type === 'charge' ? '-' : '+'}${tx.amount.toFixed(2)}
                                </p>
                                
                                <div className="flex items-center gap-1">
                                    <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                                        tx.status === 'paid' ? 'bg-gray-100 text-gray-600' :
                                        tx.status === 'pending' ? 'bg-red-50 text-red-500' :
                                        'bg-orange-50 text-orange-600'
                                    }`}>
                                        {tx.status === 'pending' && tx.type === 'charge' ? 'Por Pagar' :
                                         tx.status === 'pending_approval' ? 'En Revisión' : 
                                         tx.status === 'paid' ? 'Aplicado' : 'Pendiente'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StudentPayments;
