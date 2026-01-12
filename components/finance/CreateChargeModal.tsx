
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

    // --- FORM STATE ---
    const [studentId, setStudentId] = useState<string>('');
    const [categoryGroup, setCategoryGroup] = useState<CategoryGroup>('event');
    
    // Logic specific fields
    const [selectedEventId, setSelectedEventId] = useState<string>('');
    const [customTitle, setCustomTitle] = useState('');
    const [description, setDescription] = useState('');
    
    // Finance fields
    const [amount, setAmount] = useState<string>('');
    const [dueDate, setDueDate] = useState<string>(getLocalDate());
    const [canBePaidInParts, setCanBePaidInParts] = useState(false);

    // --- DERIVED STATE ---
    
    // 1. Available Events for the selected student
    const availableEvents = useMemo(() => {
        if (!studentId) return [];
        return getStudentEnrolledEvents(studentId);
    }, [studentId, getStudentEnrolledEvents]);

    // 2. Resolve final data based on selection
    const selectedEvent = useMemo(() => {
        return availableEvents.find(e => e.id === selectedEventId);
    }, [availableEvents, selectedEventId]);

    // Reset logic when Student changes
    useEffect(() => {
        setSelectedEventId('');
        setCustomTitle('');
        setDescription('');
    }, [studentId]);

    // Update fields when Event changes
    useEffect(() => {
        if (categoryGroup === 'event' && selectedEvent) {
            setCustomTitle(selectedEvent.title); // Auto-fill title
            // Determine internal category based on event type
            // Note: Amount is NOT auto-filled as costs might vary per student/late-fee
        } else if (categoryGroup === 'event' && !selectedEvent) {
            setCustomTitle('');
        }
    }, [selectedEvent, categoryGroup]);


    // --- HANDLERS ---

    const handleSubmit = () => {
        // 1. Validation
        if (!studentId) return addToast('Debes seleccionar un alumno.', 'error');
        if (!amount || parseFloat(amount) <= 0) return addToast('Ingresa un monto válido.', 'error');
        
        let finalCategory: ChargeCategory = 'Otro';
        let finalTitle = customTitle;

        // 2. Logic Mapping
        if (categoryGroup === 'event') {
            if (!selectedEventId) return addToast('Selecciona el evento a cobrar.', 'error');
            
            // Map Event Type to Charge Category
            if (selectedEvent?.type === 'tournament') finalCategory = 'Torneo';
            else if (selectedEvent?.type === 'exam') finalCategory = 'Examen/Promoción';
            else finalCategory = 'Otro';
            
        } else if (categoryGroup === 'equipment') {
            finalCategory = 'Equipo/Uniforme';
            if (!finalTitle) return addToast('Ingresa el nombre del equipo (ej. Kimono).', 'error');
        } else {
            finalCategory = 'Otro';
            if (!finalTitle) return addToast('Ingresa el concepto del cargo.', 'error');
        }

        // 3. Execution
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
        // Reset Form
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-4">
                        <div className="size-12 bg-blue-100 text-primary rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl">point_of_sale</span>
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-text-main leading-tight">Generar Cargo Manual</h2>
                            <p className="text-sm text-text-secondary">Crea una deuda específica para un alumno.</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                        
                        {/* LEFT COLUMN: CONTEXT */}
                        <div className="space-y-8">
                            
                            {/* Step 1: Student */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
                                    <span className="bg-gray-200 text-gray-600 size-5 rounded-full flex items-center justify-center text-[10px]">1</span>
                                    Seleccionar Alumno
                                </label>
                                <StudentSearch 
                                    students={students}
                                    value={studentId}
                                    onChange={setStudentId}
                                    placeholder="Buscar por nombre..."
                                />
                            </div>

                            {/* Step 2: Category */}
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
                                    <span className="bg-gray-200 text-gray-600 size-5 rounded-full flex items-center justify-center text-[10px]">2</span>
                                    Categoría del Cobro
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button 
                                        onClick={() => setCategoryGroup('event')}
                                        className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center gap-2 transition-all ${
                                            categoryGroup === 'event' 
                                            ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                                            : 'bg-white border-gray-200 text-text-secondary hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined">emoji_events</span>
                                        Evento
                                    </button>
                                    <button 
                                        onClick={() => setCategoryGroup('equipment')}
                                        className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center gap-2 transition-all ${
                                            categoryGroup === 'equipment' 
                                            ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm' 
                                            : 'bg-white border-gray-200 text-text-secondary hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined">checkroom</span>
                                        Equipo
                                    </button>
                                    <button 
                                        onClick={() => setCategoryGroup('other')}
                                        className={`p-3 rounded-xl border text-sm font-bold flex flex-col items-center gap-2 transition-all ${
                                            categoryGroup === 'other' 
                                            ? 'bg-gray-100 border-gray-300 text-gray-800 shadow-sm' 
                                            : 'bg-white border-gray-200 text-text-secondary hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined">receipt</span>
                                        Otro
                                    </button>
                                </div>
                            </div>

                            {/* Step 3: Conditional Inputs */}
                            <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
                                <label className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
                                    <span className="bg-gray-200 text-gray-600 size-5 rounded-full flex items-center justify-center text-[10px]">3</span>
                                    Detalle del Concepto
                                </label>

                                {categoryGroup === 'event' ? (
                                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                        {availableEvents.length > 0 ? (
                                            <>
                                                <label className="block text-xs font-bold text-blue-800 mb-2">Selecciona el Evento Inscrito</label>
                                                <select 
                                                    value={selectedEventId}
                                                    onChange={(e) => setSelectedEventId(e.target.value)}
                                                    className="w-full rounded-xl border-blue-200 bg-white p-3 text-sm font-medium focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="">-- Seleccionar --</option>
                                                    {availableEvents.map(evt => (
                                                        <option key={evt.id} value={evt.id}>
                                                            {evt.title} ({new Date(evt.date).toLocaleDateString()})
                                                        </option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-blue-600 mt-2">
                                                    * Solo se muestran eventos donde el alumno ya está registrado.
                                                </p>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-3 text-amber-600">
                                                <span className="material-symbols-outlined">warning</span>
                                                <p className="text-sm font-medium">Este alumno no está inscrito en eventos recientes.</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary mb-1.5">Concepto Corto</label>
                                            <input 
                                                type="text"
                                                value={customTitle}
                                                onChange={(e) => setCustomTitle(e.target.value)}
                                                placeholder={categoryGroup === 'equipment' ? "Ej. Gi Blanco Talla A2" : "Ej. Reposición de Credencial"}
                                                className="w-full rounded-xl border-gray-200 p-3 text-sm font-medium focus:border-primary focus:ring-primary"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-text-secondary mb-1.5">Descripción (Opcional)</label>
                                            <textarea 
                                                rows={2}
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                className="w-full rounded-xl border-gray-200 p-3 text-sm font-medium focus:border-primary focus:ring-primary resize-none"
                                                placeholder="Detalles adicionales para el recibo..."
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* RIGHT COLUMN: FINANCE */}
                        <div className="flex flex-col h-full bg-gray-50 rounded-3xl p-8 border border-gray-100">
                            <div className="space-y-6 flex-1">
                                <label className="flex items-center gap-2 text-xs font-bold text-text-secondary uppercase tracking-wider">
                                    <span className="bg-gray-200 text-gray-600 size-5 rounded-full flex items-center justify-center text-[10px]">4</span>
                                    Configuración Financiera
                                </label>

                                <div>
                                    <label className="block text-xs font-bold text-text-secondary mb-2">Monto a Cobrar</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-3 text-gray-400 font-bold text-lg">$</span>
                                        <input 
                                            type="number"
                                            min="0"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            className="w-full pl-10 pr-4 py-4 rounded-xl border-gray-200 text-2xl font-black text-text-main focus:border-green-500 focus:ring-green-500"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-text-secondary mb-2">Fecha Límite de Pago</label>
                                    <input 
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className="w-full p-3 rounded-xl border-gray-200 text-sm font-medium focus:border-primary focus:ring-primary"
                                    />
                                </div>

                                <div className="bg-white p-4 rounded-xl border border-gray-200">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <div>
                                            <span className="block text-sm font-bold text-text-main">Permitir Abonos</span>
                                            <span className="text-xs text-text-secondary">El alumno podrá pagar en partes.</span>
                                        </div>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={canBePaidInParts} 
                                                onChange={(e) => setCanBePaidInParts(e.target.checked)} 
                                                className="sr-only peer" 
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-200 flex gap-4">
                                <button 
                                    onClick={handleClose}
                                    className="flex-1 py-3.5 rounded-xl border border-gray-200 font-bold text-text-secondary hover:bg-white hover:text-text-main transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleSubmit}
                                    className="flex-[2] py-3.5 rounded-xl bg-black text-white font-bold hover:bg-gray-800 shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <span>Generar Cargo</span>
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
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
