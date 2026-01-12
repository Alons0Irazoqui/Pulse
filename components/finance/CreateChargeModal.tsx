
import React, { useState, useEffect, useMemo } from 'react';
import { useAcademy } from '../../context/AcademyContext';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { ChargeCategory } from '../../types';
import StudentSearch from '../ui/StudentSearch';
import { getLocalDate } from '../../utils/dateUtils';

interface CreateChargeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type CategoryGroup = 'event' | 'equipment' | 'other';

const CreateChargeModal: React.FC<CreateChargeModalProps> = ({ isOpen, onClose }) => {
    const { students, getStudentEnrolledEvents } = useAcademy();
    const { createManualCharge } = useFinance();
    const { addToast } = useToast();

    // --- FORM STATE ---
    const [studentId, setStudentId] = useState<string>('');
    const [categoryGroup, setCategoryGroup] = useState<CategoryGroup>('event');
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [customTitle, setCustomTitle] = useState('');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>(getLocalDate());
    const [canBePaidInParts, setCanBePaidInParts] = useState(false);

    // --- DERIVED STATE ---
    const availableEvents = useMemo(() => studentId ? getStudentEnrolledEvents(studentId) : [], [studentId, getStudentEnrolledEvents]);
    const selectedEvent = useMemo(() => availableEvents.find(e => e.id === selectedEventId), [availableEvents, selectedEventId]);

    useEffect(() => {
        setSelectedEventId(''); setCustomTitle(''); setDescription('');
    }, [studentId]);

    useEffect(() => {
        if (categoryGroup === 'event' && selectedEvent) setCustomTitle(selectedEvent.title);
        else if (categoryGroup === 'event' && !selectedEvent) setCustomTitle('');
    }, [selectedEvent, categoryGroup]);

    const handleSubmit = () => {
        if (!studentId) return addToast('Debes seleccionar un alumno.', 'error');
        if (!amount || parseFloat(amount) <= 0) return addToast('Ingresa un monto válido.', 'error');
        
        let finalCategory: ChargeCategory = 'Otro';
        if (categoryGroup === 'event') {
            if (!selectedEventId) return addToast('Selecciona el evento.', 'error');
            finalCategory = selectedEvent?.type === 'tournament' ? 'Torneo' : selectedEvent?.type === 'exam' ? 'Examen/Promoción' : 'Otro';
        } else if (categoryGroup === 'equipment') {
            finalCategory = 'Equipo/Uniforme';
            if (!customTitle) return addToast('Nombre del equipo requerido.', 'error');
        } else {
            if (!customTitle) return addToast('Concepto requerido.', 'error');
        }

        createManualCharge({
            studentId, category: finalCategory, title: customTitle, description,
            amount: parseFloat(amount), dueDate, canBePaidInParts,
            relatedEventId: categoryGroup === 'event' ? selectedEventId : undefined
        });
        handleClose();
    };

    const handleClose = () => {
        setStudentId(''); setCategoryGroup('event'); setAmount(''); setCustomTitle(''); setDescription(''); setCanBePaidInParts(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity" onClick={handleClose}></div>
            
            <div className="relative w-full max-w-2xl apple-glass rounded-3xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] border border-white/10 animate-in zoom-in-95 duration-300">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/10 bg-white/5 flex justify-between items-center">
                    <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary">add_card</span>
                        Generar Cargo
                    </h2>
                    <button onClick={handleClose} className="text-zinc-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-2 rounded-full">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* 1. Student Selector */}
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Alumno</label>
                        <div className="bg-zinc-900/50 rounded-xl border border-white/5 p-1">
                            <StudentSearch students={students} value={studentId} onChange={setStudentId} placeholder="Buscar alumno..." />
                        </div>
                    </div>

                    {/* 2. Type Selector */}
                    <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Categoría</label>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { id: 'event', icon: 'emoji_events', label: 'Evento' },
                                { id: 'equipment', icon: 'checkroom', label: 'Equipo' },
                                { id: 'other', icon: 'receipt', label: 'Otro' }
                            ].map(cat => (
                                <button 
                                    key={cat.id} 
                                    onClick={() => setCategoryGroup(cat.id as any)}
                                    className={`py-3 px-2 rounded-xl flex flex-col items-center gap-1 transition-all border ${
                                        categoryGroup === cat.id 
                                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                                        : 'bg-zinc-900/50 text-zinc-500 border-white/5 hover:bg-zinc-800 hover:text-zinc-300'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-xl">{cat.icon}</span>
                                    <span className="text-[10px] font-bold uppercase tracking-wide">{cat.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3. Dynamic Fields */}
                    <div className="bg-zinc-900/30 rounded-2xl p-5 border border-white/5 space-y-4">
                        {categoryGroup === 'event' ? (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Evento Inscrito</label>
                                <div className="relative">
                                    <select 
                                        value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}
                                        className="w-full bg-zinc-900 border border-white/10 text-white text-sm rounded-xl px-4 py-3 appearance-none outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {availableEvents.map(evt => <option key={evt.id} value={evt.id}>{evt.title}</option>)}
                                    </select>
                                    <span className="material-symbols-outlined absolute right-4 top-3.5 text-zinc-500 pointer-events-none text-lg">arrow_drop_down</span>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Concepto</label>
                                <input 
                                    value={customTitle} onChange={e => setCustomTitle(e.target.value)}
                                    placeholder={categoryGroup === 'equipment' ? "Ej. Gi Blanco A2" : "Concepto del cobro"}
                                    className="w-full bg-zinc-900 border border-white/10 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-zinc-600 transition-all"
                                />
                            </div>
                        )}
                        
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Notas / Descripción</label>
                            <textarea 
                                rows={2}
                                value={description} onChange={e => setDescription(e.target.value)}
                                placeholder="Detalles opcionales..."
                                className="w-full bg-zinc-900 border border-white/10 text-white text-sm rounded-xl px-4 py-3 outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-zinc-600 resize-none transition-all"
                            />
                        </div>
                    </div>

                    {/* 4. Financials */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Monto ($)</label>
                            <div className="relative">
                                <span className="absolute left-4 top-3 text-zinc-500 font-mono text-lg">$</span>
                                <input 
                                    type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)}
                                    className="w-full bg-zinc-900 border border-white/10 text-white text-xl font-mono font-bold py-2.5 pl-8 pr-4 rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary placeholder-zinc-700 transition-all"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Fecha Límite</label>
                            <input 
                                type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                                className="w-full bg-zinc-900 border border-white/10 text-white text-sm py-3 px-4 rounded-xl outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer" onClick={() => setCanBePaidInParts(!canBePaidInParts)}>
                        <div className={`size-5 rounded border flex items-center justify-center transition-all ${canBePaidInParts ? 'bg-primary border-primary' : 'bg-transparent border-zinc-600'}`}>
                            {canBePaidInParts && <span className="material-symbols-outlined text-white text-xs">check</span>}
                        </div>
                        <div>
                            <span className="block text-sm font-bold text-zinc-200">Permitir Pagos Parciales</span>
                            <span className="text-[10px] text-zinc-500">El alumno podrá abonar a esta deuda en partes.</span>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 bg-black/20 flex gap-3">
                    <button 
                        onClick={handleClose}
                        className="flex-1 py-3.5 rounded-xl border border-white/10 font-bold text-zinc-400 hover:text-white hover:bg-white/5 transition-all text-xs uppercase tracking-wider"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSubmit}
                        className="flex-[2] py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover transition-all shadow-lg shadow-primary/20 text-xs uppercase tracking-wider active:scale-95"
                    >
                        Confirmar Cargo
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateChargeModal;
