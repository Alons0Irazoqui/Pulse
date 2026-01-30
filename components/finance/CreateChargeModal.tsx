
import React, { useState, useEffect, useMemo } from 'react';
import { useAcademy } from '../../context/AcademyContext';
import { useFinance } from '../../context/FinanceContext';
import { useToast } from '../../context/ToastContext';
import { Student, Event, ChargeCategory } from '../../types';
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

    const [studentId, setStudentId] = useState<string>('');
    const [categoryGroup, setCategoryGroup] = useState<CategoryGroup>('event');
    
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [customTitle, setCustomTitle] = useState('');
    const [description, setDescription] = useState('');
    
    const [amount, setAmount] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>(getLocalDate());
    const [canBePaidInParts, setCanBePaidInParts] = useState(false);

    const availableEvents = useMemo(() => {
        if (!studentId) return [];
        return getStudentEnrolledEvents(studentId);
    }, [studentId, getStudentEnrolledEvents]);

    const selectedEvent = useMemo(() => {
        return availableEvents.find(e => e.id === selectedEventId);
    }, [availableEvents, selectedEventId]);

    useEffect(() => {
        setSelectedEventId('');
        setCustomTitle('');
        setDescription('');
    }, [studentId]);

    useEffect(() => {
        if (categoryGroup === 'event' && selectedEvent) {
            setCustomTitle(selectedEvent.title);
        } else if (categoryGroup === 'event' && !selectedEvent) {
            setCustomTitle('');
        }
    }, [selectedEvent, categoryGroup]);

    const handleSubmit = () => {
        if (!studentId) return addToast('Debes seleccionar un alumno.', 'error');
        if (!amount || parseFloat(amount) <= 0) return addToast('Ingresa un monto válido.', 'error');
        
        let finalCategory: ChargeCategory = 'Otro';
        let finalTitle = customTitle;

        if (categoryGroup === 'event') {
            if (!selectedEventId) return addToast('Selecciona el evento a cobrar.', 'error');
            if (selectedEvent?.type === 'tournament') finalCategory = 'Torneo';
            else if (selectedEvent?.type === 'exam') finalCategory = 'Examen/Promoción';
            else finalCategory = 'Otro';
        } else if (categoryGroup === 'equipment') {
            finalCategory = 'Equipo/Uniforme';
            if (!finalTitle) return addToast('Ingresa el nombre del equipo.', 'error');
        } else {
            finalCategory = 'Otro';
            if (!finalTitle) return addToast('Ingresa el concepto del cargo.', 'error');
        }

        createManualCharge({
            studentId,
            category: finalCategory,
            title: finalTitle,
            description: description,
            amount: parseFloat(amount),
            dueDate: dueDate,
            canBePaidInParts,
            relatedEventId: categoryGroup === 'event' ? selectedEventId : undefined
        });

        handleClose();
    };

    const handleClose = () => {
        setStudentId('');
        setCategoryGroup('event');
        setAmount('');
        setCustomTitle('');
        setDescription('');
        setCanBePaidInParts(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative border border-transparent" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-primary text-white rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">point_of_sale</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900 leading-tight tracking-tight">Generar Cargo Manual</h2>
                            <p className="text-sm text-gray-500 font-medium">Crea una deuda específica para un alumno.</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="size-10 flex items-center justify-center rounded-full bg-gray-50 text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-colors">
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-white">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        
                        {/* LEFT COLUMN */}
                        <div className="space-y-8">
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                    <span className="bg-gray-100 text-gray-600 size-5 rounded-full flex items-center justify-center text-[10px] font-black border border-gray-200">1</span>
                                    Seleccionar Alumno
                                </label>
                                <StudentSearch 
                                    students={students}
                                    value={studentId}
                                    onChange={setStudentId}
                                    placeholder="Buscar por nombre..."
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                    <span className="bg-gray-100 text-gray-600 size-5 rounded-full flex items-center justify-center text-[10px] font-black border border-gray-200">2</span>
                                    Categoría del Cobro
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { id: 'event', label: 'Evento', icon: 'emoji_events' },
                                        { id: 'equipment', label: 'Equipo', icon: 'checkroom' },
                                        { id: 'other', label: 'Otro', icon: 'receipt' }
                                    ].map(cat => (
                                        <button 
                                            key={cat.id}
                                            onClick={() => setCategoryGroup(cat.id as CategoryGroup)}
                                            className={`p-4 rounded-2xl border text-sm font-bold flex flex-col items-center gap-2 transition-all ${
                                                categoryGroup === cat.id 
                                                ? 'bg-primary/5 border-primary text-primary shadow-sm' 
                                                : 'bg-background-input border-transparent text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-2xl">{cat.icon}</span>
                                            {cat.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                    <span className="bg-gray-100 text-gray-600 size-5 rounded-full flex items-center justify-center text-[10px] font-black border border-gray-200">3</span>
                                    Detalle del Concepto
                                </label>

                                {categoryGroup === 'event' ? (
                                    <div className="bg-blue-50 p-5 rounded-2xl border border-transparent space-y-3">
                                        {availableEvents.length > 0 ? (
                                            <>
                                                <label className="block text-xs font-bold text-blue-800 uppercase tracking-wide">Evento Inscrito</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-3.5 text-blue-400 material-symbols-outlined text-[20px]">event</span>
                                                    <select 
                                                        value={selectedEventId}
                                                        onChange={(e) => setSelectedEventId(e.target.value)}
                                                        className="w-full rounded-xl border-transparent bg-white pl-11 pr-4 py-3.5 text-sm font-medium text-gray-900 focus:ring-4 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all cursor-pointer"
                                                    >
                                                        <option value="">-- Seleccionar --</option>
                                                        {availableEvents.map(evt => (
                                                            <option key={evt.id} value={evt.id}>
                                                                {evt.title} ({new Date(evt.date).toLocaleDateString()})
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-3 text-amber-700 bg-amber-100 p-3 rounded-xl">
                                                <span className="material-symbols-outlined text-xl">warning</span>
                                                <p className="text-xs font-bold">Este alumno no está inscrito en eventos recientes.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Concepto Corto</label>
                                            <input 
                                                type="text"
                                                value={customTitle}
                                                onChange={(e) => setCustomTitle(e.target.value)}
                                                placeholder={categoryGroup === 'equipment' ? "Ej. Gi Blanco Talla A2" : "Ej. Reposición de Credencial"}
                                                className="w-full rounded-xl border-transparent bg-background-input px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Descripción (Opcional)</label>
                                            <textarea 
                                                rows={2}
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                className="w-full rounded-xl border-transparent bg-background-input px-4 py-3 text-sm font-medium text-gray-900 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none resize-none"
                                                placeholder="Detalles adicionales..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="flex flex-col h-full bg-gray-50 rounded-3xl p-8 border border-transparent">
                            <div className="space-y-6 flex-1">
                                <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">
                                    <span className="bg-white text-gray-600 size-5 rounded-full flex items-center justify-center text-[10px] font-black border border-gray-200">4</span>
                                    Configuración Financiera
                                </label>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Monto a Cobrar</label>
                                    <div className="relative group">
                                        <span className="absolute left-4 top-4 text-gray-400 font-black text-lg group-focus-within:text-primary transition-colors">$</span>
                                        <input 
                                            type="number"
                                            min="0"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full pl-10 pr-4 py-4 rounded-xl border-transparent bg-white text-2xl font-black text-gray-900 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase ml-1">Fecha Límite de Pago</label>
                                    <input 
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full px-4 py-3 rounded-xl border-transparent bg-white text-sm font-medium text-gray-900 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                                    />
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-transparent shadow-sm">
                                    <label className="flex items-center justify-between cursor-pointer group">
                                        <div>
                                            <span className="block text-sm font-bold text-gray-900 group-hover:text-primary transition-colors">Permitir Abonos</span>
                                            <span className="text-xs text-gray-500 font-medium">El alumno podrá pagar en partes.</span>
                                        </div>
                                        <div className="relative inline-flex items-center">
                                            <input 
                                                type="checkbox" 
                                                checked={canBePaidInParts} 
                                                onChange={(e) => setCanBePaidInParts(e.target.checked)} 
                                                className="sr-only peer" 
                                            />
                                            {/* RED TOGGLE */}
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4">
                                <button 
                                    onClick={handleClose}
                                    className="flex-1 py-3.5 rounded-xl border-none bg-white font-bold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all text-sm"
                                >
                                    Cancelar
                                </button>
                                {/* PRIMARY RED SUBMIT */}
                                <button 
                                    onClick={handleSubmit}
                                    className="flex-[2] py-3.5 rounded-xl bg-primary text-white font-bold hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2 text-sm shadow-none"
                                >
                                    <span>Generar Cargo</span>
                                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateChargeModal;
