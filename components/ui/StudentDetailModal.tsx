
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student, TuitionRecord } from '../../types';
import { useAcademy } from '../../context/AcademyContext';
import { useStore } from '../../context/StoreContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import { formatDateDisplay } from '../../utils/dateUtils';
import Avatar from './Avatar';

interface StudentDetailModalProps {
    isOpen: boolean;
    student: Student | null;
    onClose: () => void;
    onEdit: (student: Student) => void;
    financialRecords: TuitionRecord[];
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
    isOpen,
    student,
    onClose,
    onEdit,
    financialRecords
}) => {
    const { academySettings } = useAcademy();
    const { deleteStudent, purgeStudentDebts } = useStore();
    const { confirm } = useConfirmation();

    if (!student) return null;

    // --- LÓGICA DE PROGRESO ---
    const currentRankConfig = academySettings.ranks.find(r => r.id === student.rankId) || academySettings.ranks[0];
    const requiredAttendance = currentRankConfig.requiredAttendance || 30;
    const progressPercent = Math.min((student.attendance / requiredAttendance) * 100, 100);

    const hasDebt = student.balance > 0.01;

    const handleDelete = () => {
        confirm({
            title: 'Eliminar Alumno',
            message: '¿Estás seguro? Se eliminará TOTALMENTE el registro del alumno, incluyendo credenciales, clases, eventos y deudas pendientes.',
            type: 'danger',
            confirmText: 'Eliminar permanentemente',
            onConfirm: () => {
                deleteStudent(student.id);
                purgeStudentDebts(student.id);
                onClose();
            }
        });
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="fixed inset-0 z-[100] bg-[#F9FAFB] overflow-y-auto font-sans"
                >
                    {/* --- STICKY HEADER --- */}
                    <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-4">
                            <Avatar 
                                src={student.avatarUrl} 
                                name={student.name} 
                                className="size-12 rounded-full object-cover shadow-sm font-bold text-lg" 
                            />
                            <div className="flex items-center">
                                <h1 className="text-2xl font-bold text-gray-900 leading-tight">
                                    {student.name}
                                </h1>
                                <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ml-4 border border-gray-200">
                                    {student.rank}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => onEdit(student)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-all text-sm flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">edit</span>
                                Editar Perfil
                            </button>
                            <button 
                                onClick={handleDelete}
                                className="text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl transition-all text-sm font-bold flex items-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">delete</span>
                                Eliminar Alumno
                            </button>
                            <div className="w-px h-8 bg-gray-200 mx-2"></div>
                            <button 
                                onClick={onClose}
                                className="size-10 rounded-full hover:bg-gray-100 text-gray-500 transition-all flex items-center justify-center border border-gray-100"
                            >
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                        </div>
                    </header>

                    {/* --- MAIN CONTENT (CENTERED) --- */}
                    <main className="max-w-7xl mx-auto p-8 animate-in fade-in duration-500 delay-150">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                            
                            {/* SECCIÓN 1: PROGRESO ACADÉMICO (Col 1-8) */}
                            <section className="lg:col-span-8 bg-white p-8 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Estatus de Entrenamiento</h3>
                                    <h2 className="text-xl font-bold text-gray-900">Progreso de Grado Actual</h2>
                                    
                                    <div className="relative mt-6">
                                        <div className="h-8 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner border border-gray-200/50">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progressPercent}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className="h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end mt-4">
                                        <div className="flex flex-col">
                                            <span className="text-4xl font-black text-gray-900 tracking-tight">{student.attendance}</span>
                                            <span className="text-xs font-bold text-gray-400 uppercase">Clases Asistidas</span>
                                        </div>
                                        <div className="text-right flex flex-col">
                                            <span className="text-2xl font-bold text-gray-300">/ {requiredAttendance}</span>
                                            <span className="text-xs font-bold text-gray-400 uppercase">Requeridas</span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-8 pt-6 border-t border-gray-50 grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Total Histórico</p>
                                        <p className="text-lg font-bold text-gray-900">{student.totalAttendance} asistencias</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Grados (Stripes)</p>
                                        <p className="text-lg font-bold text-gray-900">{student.stripes} marcas</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase">Fecha Ingreso</p>
                                        <p className="text-lg font-bold text-gray-900">{student.joinDate}</p>
                                    </div>
                                </div>
                            </section>

                            {/* SECCIÓN 2: FINANZAS (Col 9-12) */}
                            <section className="lg:col-span-4 bg-white p-8 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-center items-center text-center">
                                <span className="material-symbols-outlined text-4xl text-gray-300 mb-2">account_balance_wallet</span>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Saldo Pendiente</h3>
                                <div className={`text-5xl font-black tracking-tighter tabular-nums mb-4 ${hasDebt ? 'text-red-600' : 'text-gray-900'}`}>
                                    ${student.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border mb-6 ${hasDebt ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                                    {hasDebt ? 'Pago Requerido' : 'Cuenta al Corriente'}
                                </div>
                                <button className="text-blue-600 hover:text-blue-700 text-xs font-bold uppercase tracking-wider hover:underline transition-all">
                                    Ver historial de pagos
                                </button>
                            </section>

                            {/* SECCIÓN 3: EXPEDIENTE COMPLETO (Col 1-12) */}
                            <section className="lg:col-span-12 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="px-8 py-5 border-b border-gray-100 bg-gray-50/50">
                                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-gray-400 text-lg">inventory_2</span>
                                        Información Personal y Contacto
                                    </h3>
                                </div>
                                
                                <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-12">
                                    
                                    {/* Columna A: Alumno */}
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Datos del Alumno</h4>
                                        <DataField label="Fecha de Nacimiento" value={formatDateDisplay(student.birthDate, { day: 'numeric', month: 'long', year: 'numeric' })} />
                                        <DataField label="Edad Actual" value={`${student.age} años`} />
                                        <div className="space-y-1">
                                            <p className="text-xs font-bold text-gray-400 uppercase">Celular Directo</p>
                                            <a href={`tel:${student.cellPhone}`} className="inline-flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                                                <span className="material-symbols-outlined text-base">smartphone</span>
                                                {student.cellPhone}
                                            </a>
                                        </div>
                                        <DataField label="Email" value={student.email} />
                                    </div>

                                    {/* Columna B: Dirección */}
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Domicilio</h4>
                                        <DataField label="Calle" value={student.guardian.address.street} />
                                        <div className="grid grid-cols-2 gap-4">
                                            <DataField label="No. Exterior" value={student.guardian.address.exteriorNumber} />
                                            <DataField label="No. Interior" value={student.guardian.address.interiorNumber || '-'} />
                                        </div>
                                        <DataField label="Colonia" value={student.guardian.address.colony} />
                                        <DataField label="Código Postal" value={student.guardian.address.zipCode} />
                                    </div>

                                    {/* Columna C: Tutor */}
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4">Responsable / Tutor</h4>
                                        <DataField label="Nombre del Tutor" value={student.guardian.fullName} />
                                        <DataField label="Parentesco" value={student.guardian.relationship} />
                                        <DataField label="Email del Tutor" value={student.guardian.email || '-'} />
                                        <div className="grid grid-cols-1 gap-4">
                                            <DataField label="Teléfono Principal" value={student.guardian.phones.main} />
                                            {student.guardian.phones.secondary && (
                                                <DataField label="Teléfono Secundario" value={student.guardian.phones.secondary} />
                                            )}
                                        </div>
                                    </div>

                                </div>
                            </section>

                        </div>
                    </main>
                    
                    {/* Espaciador inferior */}
                    <div className="h-20"></div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// --- COMPONENTE INTERNO PARA CAMPOS DE DATOS ---
const DataField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex flex-col">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</label>
        <p className="text-sm font-semibold text-gray-900 mt-1">{value || '-'}</p>
    </div>
);

export default StudentDetailModal;
