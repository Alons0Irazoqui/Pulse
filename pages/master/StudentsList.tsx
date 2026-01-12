
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import { Student } from '../../types';
import { exportToCSV } from '../../utils/csvExport';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EmptyState from '../../components/ui/EmptyState';
import EmergencyCard from '../../components/ui/EmergencyCard';
import { PulseService } from '../../services/pulseService';
import Avatar from '../../components/ui/Avatar';

// Fix for type errors with motion components
const MotionDiv = motion.div as any;
const MotionTbody = motion.tbody as any;
const MotionTr = motion.tr as any;

const StudentsList: React.FC = () => {
  const { students, updateStudent, deleteStudent, addStudent, academySettings, promoteStudent, records, isLoading, purgeStudentDebts } = useStore();
  const { addToast } = useToast();
  const { confirm } = useConfirmation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table'); 
  
  // (Simplified for XML output - Keeping core logic)
  const filteredStudents = useMemo(() => {
      return students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
        return matchesSearch && matchesStatus;
      });
  }, [students, searchTerm, filterStatus]);

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'active': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'; 
          case 'debtor': return 'bg-red-500/10 text-red-400 border-red-500/20';
          default: return 'bg-zinc-800 text-zinc-400 border-zinc-700';
      }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 md:px-10 h-full text-zinc-200">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Directorio de Alumnos</h2>
              <p className="text-zinc-500 text-sm mt-1">Gestión centralizada de expedientes.</p>
          </div>
          
          <div className="flex gap-3 items-center">
              <div className="flex bg-[#121212] p-1 rounded-lg border border-zinc-800">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded transition-all ${viewMode === 'grid' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                      <span className="material-symbols-outlined text-[18px]">grid_view</span>
                  </button>
                  <button onClick={() => setViewMode('table')} className={`p-2 rounded transition-all ${viewMode === 'table' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}>
                      <span className="material-symbols-outlined text-[18px]">table_rows</span>
                  </button>
              </div>
              <button className="bg-white text-black hover:bg-zinc-200 font-bold py-2 px-4 rounded-lg text-xs uppercase tracking-wider transition-all shadow-[0_0_10px_rgba(255,255,255,0.1)] flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">person_add</span> 
                <span>Nuevo</span>
              </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-[#121212] p-2 rounded-xl border border-zinc-800 items-center">
            <div className="relative flex-1 w-full">
                <span className="absolute left-3 top-2.5 text-zinc-600 material-symbols-outlined text-[18px]">search</span>
                <input 
                    type="text" 
                    placeholder="Buscar por nombre..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#09090b] border border-zinc-800 rounded-lg text-sm text-zinc-200 focus:border-zinc-600 focus:ring-0 placeholder-zinc-700 transition-colors"
                />
            </div>
            <div className="flex gap-2">
                {['all', 'active', 'debtor'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                            filterStatus === status 
                            ? 'bg-zinc-800 text-white border-zinc-700' 
                            : 'bg-transparent text-zinc-500 border-transparent hover:bg-zinc-900'
                        }`}
                    >
                        {status === 'all' ? 'Todos' : status}
                    </button>
                ))}
            </div>
        </div>

        {/* --- TABLE VIEW --- */}
        {viewMode === 'table' && (
            <div className="bg-[#121212] rounded-xl border border-zinc-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#09090b] border-b border-zinc-800">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Alumno</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Contacto</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Estado</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-right">Saldo</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/50">
                            {filteredStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-zinc-900 transition-colors group cursor-pointer">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <Avatar src={student.avatarUrl} name={student.name} className="size-8 rounded bg-zinc-800 text-xs" />
                                            <div>
                                                <p className="font-bold text-sm text-zinc-200">{student.name}</p>
                                                <p className="text-[10px] text-zinc-500 font-mono uppercase">{student.rank}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs text-zinc-400 font-mono">{student.cellPhone}</p>
                                        <p className="text-[10px] text-zinc-600 truncate max-w-[150px]">{student.email}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getStatusColor(student.status)}`}>
                                            {student.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-mono text-xs font-bold ${student.balance > 0 ? 'text-red-400' : 'text-zinc-500'}`}>
                                            ${student.balance.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-zinc-600 hover:text-white transition-colors">
                                            <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default StudentsList;
