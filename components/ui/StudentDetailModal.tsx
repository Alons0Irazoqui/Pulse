
import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student, TuitionRecord } from '../../types';
import { formatDateDisplay } from '../../utils/dateUtils';
import { useAcademy } from '../../context/AcademyContext';
import Avatar from './Avatar';

interface StudentDetailModalProps {
    isOpen: boolean;
    student: Student | null;
    onClose: () => void;
    onEdit: (student: Student) => void;
    onMessage: (studentId: string) => void;
    financialRecords: TuitionRecord[];
}

const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
    isOpen,
    student,
    onClose,
    onEdit,
    onMessage,
    financialRecords
}) => {
    const { academySettings } = useAcademy();

    if (!student) return null;

    // --- Lógica Académica ---
    const currentRankConfig = academySettings.ranks.find(r => r.id === student.rankId) || academySettings.ranks[0];
    const nextRankConfig = academySettings.ranks.find(r => r.order === currentRankConfig.order + 1);
    const requiredAttendance = currentRankConfig.requiredAttendance || 30; // Fallback
    const progressPercent = Math.min((student.attendance / requiredAttendance) * 100, 100);

    // --- Lógica Financiera ---
    const lastMovements = financialRecords.slice(0, 3);
    const hasDebt = student.balance > 0;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="fixed inset-0 z-50 bg-[#F9FAFB] overflow-y-auto"
                >
                    {/* --- HEADER HERO --- */}
                    <header className="bg-white border-b border-gray-200 sticky top-0 z-20 px-8 py-6 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-6">
                            <Avatar 
                                src={student.avatarUrl} 
                                name={student.name} 
                                className="h-16 w-16 rounded-2xl shadow-sm text-2xl font-black" 
                            />
                            <div className="flex flex-col">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">
                                        {student.name}
                                    </h1>
                                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-slate-200">
                                        {student.rank}
                                    </span>
                                </div>
                                <p className="text-slate-400 text-sm font-medium mt-1">
                                    Alumno desde: <span className="text-slate-600">{student.joinDate}</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => onEdit(student)}
                                className="px-5 py-2.5 border-2 border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-all flex items-center gap-2 text-sm"
                            >
                                <span className="material-symbols-outlined text-lg">edit</span>
                                Editar Perfil
                            </button>
                            <button 
                                onClick={onClose}
                                className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                            >
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                        </div>
                    </header>

                    {/* --- DASHBOARD CONTENT --- */}
                    <main className="max-w-7xl mx-auto p-8">
                        <div className="grid grid-cols-12 gap-8">
                            
                            {/* SIDEBAR: Personal & Contact (Cols 1-4) */}
                            <aside className="col-span-12 lg:col-span-4 space-y-6">
                                <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Información Detallada</h3>
                                    
                                    <div className="space-y-6">
                                        <InfoItem icon="cake" label="Edad y Nacimiento">
                                            <p className="font-bold text-slate-900">{student.age} años <span className="text-slate-400 font-medium ml-1">({student.birthDate})</span></p>
                                        </InfoItem>

                                        <InfoItem icon="supervisor_account" label="Responsable (Tutor)">
                                            <p className="font-bold text-slate-900">{student.guardian.fullName}</p>
                                            <p className="text-xs text-slate-400 font-medium">{student.guardian.relationship}</p>
                                        </InfoItem>

                                        <InfoItem icon="smartphone" label="Teléfonos de Contacto">
                                            <div className="flex flex-col gap-1">
                                                <a href={`tel:${student.cellPhone}`} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-2">
                                                    {student.cellPhone} <span className="text-[10px] bg-blue-50 px-1.5 rounded">Alumno</span>
                                                </a>
                                                <a href={`tel:${student.guardian.phones.main}`} className="text-sm font-bold text-blue-600 hover:underline flex items-center gap-2">
                                                    {student.guardian.phones.main} <span className="text-[10px] bg-slate-50 text-slate-500 px-1.5 rounded">Tutor</span>
                                                </a>
                                            </div>
                                        </InfoItem>

                                        <InfoItem icon="location_on" label="Dirección de Domicilio">
                                            <p className="text-sm font-bold text-slate-700 leading-relaxed">
                                                {student.guardian.address.street} {student.guardian.address.exteriorNumber}, {student.guardian.address.colony}
                                                <br />
                                                <span className="text-slate-400">CP {student.guardian.address.zipCode}</span>
                                            </p>
                                        </InfoItem>
                                    </div>

                                    <button 
                                        onClick={() => onMessage(student.id)}
                                        className="w-full mt-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-slate-200"
                                    >
                                        Enviar Mensaje
                                    </button>
                                </section>
                            </aside>

                            {/* MAIN PANEL: Metrics & Progress (Cols 5-12) */}
                            <div className="col-span-12 lg:col-span-8 space-y-8">
                                
                                {/* CARD 1: FINANZAS (FINTECH STYLE) */}
                                <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-10">
                                        <div>
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Estado de Cuenta</h3>
                                            <div className="flex items-baseline gap-2">
                                                <span className={`text-6xl font-black tracking-tighter tabular-nums ${hasDebt ? 'text-red-600' : 'text-slate-900'}`}>
                                                    ${student.balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                </span>
                                                <span className="text-slate-400 font-bold text-sm uppercase">MXN</span>
                                            </div>
                                        </div>
                                        <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest ${hasDebt ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                            {hasDebt ? 'Pago Pendiente' : 'Al Corriente'}
                                        </div>
                                    </div>

                                    {/* Mini Activity Table */}
                                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Última Actividad</h4>
                                        <div className="space-y-3">
                                            {lastMovements.length > 0 ? (
                                                lastMovements.map(record => (
                                                    <div key={record.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm transition-all hover:scale-[1.01]">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${record.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                                <span className="material-symbols-outlined text-xl">
                                                                    {record.status === 'paid' ? 'check_circle' : 'hourglass_top'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900">{record.concept}</p>
                                                                <p className="text-[10px] font-bold text-slate-400 uppercase">{formatDateDisplay(record.dueDate)}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-sm font-black text-slate-900 tabular-nums">${record.amount}</span>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-xs text-slate-400 italic text-center py-4">No hay movimientos financieros recientes.</p>
                                            )}
                                        </div>
                                    </div>
                                </section>

                                {/* CARD 2: PROGRESO ACADÉMICO */}
                                <section className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                                    <div className="flex justify-between items-end mb-8">
                                        <div>
                                            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Evaluación de Desempeño</h3>
                                            <h2 className="text-2xl font-black text-slate-900 leading-none">Progreso de Grado</h2>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-mono text-xs font-bold text-blue-600 uppercase tracking-widest">
                                                {student.attendance} de {requiredAttendance} Clases
                                            </p>
                                        </div>
                                    </div>

                                    {/* Modern Progress Bar */}
                                    <div className="relative mb-10">
                                        <div className="h-8 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner border border-slate-200/50">
                                            <motion.div 
                                                initial={{ width: 0 }}
                                                animate={{ width: `${progressPercent}%` }}
                                                transition={{ duration: 1, ease: "easeOut" }}
                                                className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 rounded-full"
                                            />
                                        </div>
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest mix-blend-overlay">
                                                {Math.round(progressPercent)}% Completado
                                            </span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-blue-50/50 rounded-2xl p-6 border border-blue-100">
                                            <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Siguiente Objetivo</h4>
                                            <p className="text-lg font-bold text-blue-900">
                                                {nextRankConfig ? nextRankConfig.name : 'Maestría'}
                                            </p>
                                            <p className="text-xs text-blue-700 mt-1 font-medium">
                                                Te faltan {Math.max(requiredAttendance - student.attendance, 0)} clases para postular al examen.
                                            </p>
                                        </div>

                                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col justify-between">
                                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Histórico</h4>
                                            <div className="flex items-center gap-4">
                                                <span className="text-4xl font-black text-slate-900 leading-none">{student.totalAttendance}</span>
                                                <span className="text-xs font-bold text-slate-400 leading-tight uppercase">Sesiones de<br/>Entrenamiento</span>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                            </div>
                        </div>
                    </main>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Helper Sub-component for Sidebar rows
const InfoItem: React.FC<{ icon: string; label: string; children: React.ReactNode }> = ({ icon, label, children }) => (
    <div className="flex items-start gap-4">
        <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shrink-0 border border-slate-100">
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
            <div className="text-sm">
                {children}
            </div>
        </div>
    </div>
);

export default StudentDetailModal;
