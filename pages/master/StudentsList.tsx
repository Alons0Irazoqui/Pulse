
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { useConfirmation } from '../../context/ConfirmationContext';
import { Student, StudentStatus } from '../../types';
import { exportToCSV } from '../../utils/csvExport';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EmptyState from '../../components/ui/EmptyState';
import EmergencyCard from '../../components/ui/EmergencyCard';
import { PulseService } from '../../services/pulseService';
import { formatDateDisplay } from '../../utils/dateUtils';
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
  const [filterRank, setFilterRank] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table'); // Default to table for data density
  const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'finance'>('info');
  
  // Modal States
  const [showModal, setShowModal] = useState(false); 
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null); 
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // --- FORM STATE ---
  const initialFormState: Partial<Student> = {
      name: '', 
      email: '', 
      cellPhone: '',
      age: undefined,
      birthDate: '',
      rank: 'White Belt', 
      status: 'active', 
      program: 'Adults', 
      balance: 0, 
      avatarUrl: '', 
      password: '',
      guardian: {
          fullName: '',
          email: '',
          relationship: 'Padre',
          phones: { main: '', secondary: '', tertiary: '' },
          address: { street: '', exteriorNumber: '', interiorNumber: '', colony: '', zipCode: '' }
      }
  };
  // We use `any` here solely to avoid massive type boilerplate for the nested form updates in a single file
  const [formData, setFormData] = useState<any>(initialFormState);

  // Animation Variants
  const containerVariants = {
      hidden: { opacity: 0 },
      show: {
          opacity: 1,
          transition: {
              staggerChildren: 0.05
          }
      }
  };

  const itemVariants = {
      hidden: { opacity: 0, y: 20 },
      show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  // Filter Students
  const filteredStudents = useMemo(() => {
      return students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              student.guardian.fullName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
        const matchesRank = filterRank === 'all' || student.rankId === filterRank;
        return matchesSearch && matchesStatus && matchesRank;
      });
  }, [students, searchTerm, filterStatus, filterRank]);

  // --- REACTIVE DATA ENGINE ---
  const reactiveViewingStudent = useMemo(() => {
      if (!viewingStudent) return null;
      return students.find(s => s.id === viewingStudent.id) || viewingStudent;
  }, [students, viewingStudent]);

  // Unified Financial Records (Correct Logic)
  const studentFinancialRecords = useMemo(() => {
      if (!reactiveViewingStudent || !records) return [];
      
      // Filter records for this student and sort by date descending
      return records
          .filter(r => r.studentId === reactiveViewingStudent.id)
          .sort((a, b) => {
              // Use paymentDate if available (transaction happened), else dueDate
              const dateA = new Date(a.paymentDate || a.dueDate).getTime();
              const dateB = new Date(b.paymentDate || b.dueDate).getTime();
              return dateB - dateA;
          });
  }, [reactiveViewingStudent, records]);

  const handleExport = () => {
      const dataToExport = filteredStudents.map(s => ({
          ID: s.id,
          Nombre: s.name,
          Email: s.email,
          Celular: s.cellPhone,
          Tutor: s.guardian.fullName,
          Tutor_Tel: s.guardian.phones.main,
          Rango: s.rank,
          Estado: s.status,
          Balance: s.balance
      }));
      exportToCSV(dataToExport, 'Listado_Alumnos_Completo');
      addToast('Archivo CSV generado', 'success');
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'active': return 'bg-green-50 text-green-700 border-green-200'; 
          case 'debtor': return 'bg-red-50 text-red-700 border-red-200';
          case 'exam_ready': return 'bg-blue-50 text-blue-700 border-blue-200';
          default: return 'bg-gray-50 text-gray-500 border-gray-200';
      }
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      confirm({
          title: 'Eliminar Alumno',
          message: '¿Estás seguro? Se eliminará TOTALMENTE el registro del alumno, incluyendo credenciales, clases, eventos y deudas pendientes. Solo se mantendrá el historial de ingresos pagados.',
          type: 'danger',
          onConfirm: () => {
              deleteStudent(id); // Handles Academy Context (Students, Classes, Events)
              purgeStudentDebts(id); // Handles Finance Context (Unpaid Debts)
          }
      });
  };

  const handleEdit = (student: Student, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setEditingStudent(student);
      // Deep copy to avoid reference issues
      setFormData(JSON.parse(JSON.stringify(student)));
      // Clear password field for editing
      setFormData((prev: any) => ({...prev, password: ''}));
      setShowModal(true);
  };

  const handleViewDetails = (student: Student, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setViewingStudent(student);
      setActiveTab('info'); 
  };

  const handleCreate = () => {
      setEditingStudent(null);
      setFormData({ ...initialFormState, avatarUrl: '' }); // Default empty for initial
      setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      // Basic validation
      if (!formData.name || !formData.email || !formData.cellPhone || !formData.guardian.fullName || !formData.guardian.phones.main) {
          addToast("Por favor completa el los campos obligatorios (*)", 'error');
          return;
      }

      // SECURITY CHECK: Email Uniqueness
      // If Creating OR If Editing AND Email Changed
      if (!editingStudent || (editingStudent && editingStudent.email !== formData.email)) {
          if (PulseService.checkEmailExists(formData.email)) {
              addToast("Este correo electrónico ya está registrado en la plataforma (Maestro o Alumno).", 'error');
              return;
          }
      }

      if (editingStudent) {
          updateStudent({ ...editingStudent, ...formData });
      } else {
          if (!formData.password) {
              addToast('La contraseña es obligatoria para nuevos alumnos', 'error');
              return;
          }
          const selectedRank = academySettings.ranks.find(r => r.name === formData.rank);
          addStudent({
              id: '', 
              userId: '', 
              academyId: '', 
              ...formData,
              rankId: selectedRank?.id || 'rank-1',
              rankColor: selectedRank?.color || 'white',
              stripes: 0,
              attendance: 0,
              totalAttendance: 0,
              joinDate: new Date().toLocaleDateString(),
              classesId: [],
              attendanceHistory: []
          });
      }
      setShowModal(false);
  };

  const handlePromote = () => {
      if (!viewingStudent) return;
      confirm({
          title: 'Promover de Rango',
          message: `¿Estás seguro de promover a ${viewingStudent.name} al siguiente cinturón?`,
          type: 'info',
          confirmText: 'Promover',
          onConfirm: () => {
              promoteStudent(viewingStudent.id);
              setViewingStudent(null); 
          }
      });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 h-full">
      <div className="max-w-[1600px] mx-auto flex flex-col gap-8">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2">
          <div>
              <h2 className="text-3xl font-bold text-text-main">Gestión de Alumnos</h2>
              <p className="text-text-secondary text-sm mt-1">Administra tu lista de estudiantes y contactos de emergencia.</p>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center">
              <button onClick={handleExport} className="p-3 bg-white border border-gray-200 rounded-xl text-text-secondary hover:text-text-main hover:bg-gray-50 active:scale-95 transition-all" title="Exportar CSV">
                  <span className="material-symbols-outlined">download</span>
              </button>
              
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                  <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all active:scale-95 ${viewMode === 'grid' ? 'bg-gray-100 text-primary shadow-sm' : 'text-text-secondary hover:bg-gray-50'}`}>
                      <span className="material-symbols-outlined">grid_view</span>
                  </button>
                  <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg transition-all active:scale-95 ${viewMode === 'table' ? 'bg-gray-100 text-primary shadow-sm' : 'text-text-secondary hover:bg-gray-50'}`}>
                      <span className="material-symbols-outlined">table_rows</span>
                  </button>
              </div>

              <button onClick={handleCreate} className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2 active:scale-95">
                <span className="material-symbols-outlined">person_add</span> 
                <span className="hidden sm:inline">Nuevo Alumno</span>
              </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 items-center">
                <div className="relative flex-1 w-full">
                    <span className="absolute left-3 top-2.5 text-gray-400 material-symbols-outlined">search</span>
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre, email o tutor..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
                    />
                </div>
                <div className="w-px h-8 bg-gray-200 hidden md:block"></div>
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide items-center">
                    {['all', 'active', 'debtor', 'inactive'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all border active:scale-95 ${
                                filterStatus === status 
                                ? 'bg-black text-white border-black' 
                                : 'bg-white text-text-secondary border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {status === 'all' ? 'Todos' : status}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        {/* --- CONTENT --- */}
        {isLoading ? (
            <div className="p-10 text-center">Cargando...</div>
        ) : filteredStudents.length === 0 ? (
            <EmptyState title="Sin resultados" description="Intenta cambiar los filtros." action={<button onClick={handleCreate} className="text-primary font-bold">Crear Alumno</button>} />
        ) : (
            <>
                {viewMode === 'grid' && (
                    <MotionDiv variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredStudents.map((student) => (
                            <MotionDiv key={student.id} variants={itemVariants} className="bg-white p-6 rounded-[1.5rem] shadow-card border border-gray-100 flex flex-col gap-4 group hover:-translate-y-1 transition-all relative overflow-hidden" onClick={(e: React.MouseEvent) => handleViewDetails(student, e)}>
                                <div className={`absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(student.status)}`}>{student.status}</div>
                                <div className="flex gap-4 items-center">
                                    <Avatar src={student.avatarUrl} name={student.name} className="size-16 rounded-2xl shadow-sm text-xl" />
                                    <div>
                                        <h3 className="text-lg font-bold text-text-main leading-tight line-clamp-1">{student.name}</h3>
                                        <p className="text-sm text-text-secondary font-medium">{student.rank}</p>
                                    </div>
                                </div>
                                <div className="text-xs text-text-secondary space-y-1 bg-gray-50 p-3 rounded-xl">
                                    <p className="flex items-center gap-2"><span className="material-symbols-outlined text-[14px]">smartphone</span> {student.cellPhone}</p>
                                    <p className="flex items-center gap-2 truncate"><span className="material-symbols-outlined text-[14px]">supervisor_account</span> {student.guardian.fullName}</p>
                                </div>
                            </MotionDiv>
                        ))}
                    </MotionDiv>
                )}

                {viewMode === 'table' && (
                    <div className="bg-white rounded-[1.5rem] shadow-card border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50/80 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Alumno</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Contacto Alumno</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Responsable</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Saldo</th>
                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <MotionTbody variants={containerVariants} initial="hidden" animate="show" className="divide-y divide-gray-50">
                                    {filteredStudents.map((student) => (
                                        <MotionTr variants={itemVariants} key={student.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={(e: React.MouseEvent) => handleViewDetails(student, e)}>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar src={student.avatarUrl} name={student.name} className="size-10 rounded-full" />
                                                    <div>
                                                        <p className="font-bold text-sm text-text-main">{student.name}</p>
                                                        <p className="text-xs text-text-secondary">{student.rank}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-semibold text-text-main">{student.cellPhone}</p>
                                                <p className="text-xs text-text-secondary truncate max-w-[150px]">{student.email}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-semibold text-text-main">{student.guardian.fullName}</p>
                                                <div className="flex items-center gap-1 text-xs text-text-secondary">
                                                    <span className="material-symbols-outlined text-[10px]">phone</span>
                                                    {student.guardian.phones.main}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(student.status)}`}>
                                                    {student.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-bold text-sm ${student.balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                                    ${student.balance.toFixed(2)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button onClick={(e) => handleEdit(student, e)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-primary transition-colors"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                                                    <button onClick={(e) => handleDelete(student.id, e)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                                                </div>
                                            </td>
                                        </MotionTr>
                                    ))}
                                </MotionTbody>
                            </table>
                        </div>
                    </div>
                )}
            </>
        )}
      </div>

      {/* --- CREATE / EDIT MODAL --- */}
      {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                      <h2 className="text-2xl font-bold text-text-main">{editingStudent ? 'Editar Expediente' : 'Nuevo Ingreso'}</h2>
                      <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-text-main"><span className="material-symbols-outlined">close</span></button>
                  </div>
                  
                  <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* SECTION 1: STUDENT DATA */}
                      <div className="space-y-5">
                          <h3 className="text-sm font-black text-primary uppercase tracking-widest border-b border-primary/20 pb-2 mb-4">Datos del Alumno</h3>
                          
                          <div className="grid grid-cols-1 gap-4">
                              <label className="block">
                                  <span className="text-xs font-bold text-text-secondary uppercase">Nombre Completo *</span>
                                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 text-sm focus:border-primary focus:ring-primary" placeholder="Nombre y Apellidos" />
                              </label>
                              <div className="grid grid-cols-2 gap-4">
                                  <label className="block">
                                      <span className="text-xs font-bold text-text-secondary uppercase">Fecha Nacimiento</span>
                                      <input type="date" value={formData.birthDate} onChange={e => setFormData({...formData, birthDate: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 text-sm focus:border-primary focus:ring-primary" />
                                  </label>
                                  <label className="block">
                                      <span className="text-xs font-bold text-text-secondary uppercase">Edad</span>
                                      <input type="number" value={formData.age || ''} onChange={e => setFormData({...formData, age: parseInt(e.target.value)})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 text-sm focus:border-primary focus:ring-primary" />
                                  </label>
                              </div>
                              <label className="block">
                                  <span className="text-xs font-bold text-text-secondary uppercase">Email *</span>
                                  <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 text-sm focus:border-primary focus:ring-primary" />
                              </label>
                              <label className="block">
                                  <span className="text-xs font-bold text-text-secondary uppercase">Celular Alumno *</span>
                                  <input required type="tel" value={formData.cellPhone} onChange={e => setFormData({...formData, cellPhone: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 text-sm focus:border-primary focus:ring-primary" placeholder="10 dígitos" />
                              </label>
                              {!editingStudent && (
                                  <label className="block">
                                      <span className="text-xs font-bold text-text-secondary uppercase">Contraseña Inicial *</span>
                                      <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 text-sm focus:border-primary focus:ring-primary" placeholder="••••••••" />
                                  </label>
                              )}
                          </div>

                          <div className="grid grid-cols-2 gap-4 pt-2">
                              <label className="block">
                                  <span className="text-xs font-bold text-text-secondary uppercase">Rango Actual</span>
                                  <select value={formData.rank} onChange={e => setFormData({...formData, rank: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 text-sm focus:border-primary focus:ring-primary">
                                      {academySettings.ranks.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
                                  </select>
                              </label>
                              <label className="block">
                                  <span className="text-xs font-bold text-text-secondary uppercase">Estado</span>
                                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 text-sm focus:border-primary focus:ring-primary">
                                      <option value="active">Activo</option>
                                      <option value="debtor">Adeudo</option>
                                      <option value="exam_ready">Examen Listo</option>
                                      <option value="inactive">Inactivo</option>
                                  </select>
                              </label>
                          </div>
                      </div>

                      {/* SECTION 2: GUARDIAN DATA */}
                      <div className="space-y-5 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                          <h3 className="text-sm font-black text-text-main uppercase tracking-widest border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                              <span className="material-symbols-outlined text-base">emergency_home</span>
                              Datos de Emergencia
                          </h3>
                          
                          <div className="grid grid-cols-1 gap-4">
                              <div className="grid grid-cols-3 gap-4">
                                  <div className="col-span-2">
                                      <label className="block">
                                          <span className="text-xs font-bold text-text-secondary uppercase">Nombre Tutor *</span>
                                          <input required value={formData.guardian.fullName} onChange={e => setFormData({...formData, guardian: {...formData.guardian, fullName: e.target.value}})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 text-sm focus:border-primary focus:ring-primary" />
                                      </label>
                                  </div>
                                  <div>
                                      <label className="block">
                                          <span className="text-xs font-bold text-text-secondary uppercase">Parentesco</span>
                                          <select value={formData.guardian.relationship} onChange={e => setFormData({...formData, guardian: {...formData.guardian, relationship: e.target.value}})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 text-sm">
                                              {['Padre', 'Madre', 'Tutor Legal', 'Familiar', 'Otro'].map(r => <option key={r} value={r}>{r}</option>)}
                                          </select>
                                      </label>
                                  </div>
                              </div>

                              <label className="block">
                                  <span className="text-xs font-bold text-text-secondary uppercase">Email Tutor</span>
                                  <input type="email" value={formData.guardian.email} onChange={e => setFormData({...formData, guardian: {...formData.guardian, email: e.target.value}})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 text-sm" />
                              </label>

                              <div className="grid grid-cols-3 gap-3">
                                  <label className="block col-span-3 sm:col-span-1">
                                      <span className="text-xs font-bold text-text-secondary uppercase">Tel. Principal *</span>
                                      <input required type="tel" value={formData.guardian.phones.main} onChange={e => setFormData({...formData, guardian: {...formData.guardian, phones: {...formData.guardian.phones, main: e.target.value}}})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 text-sm" placeholder="Obligatorio" />
                                  </label>
                                  <label className="block col-span-3 sm:col-span-1">
                                      <span className="text-xs font-bold text-text-secondary uppercase">Tel. 2</span>
                                      <input type="tel" value={formData.guardian.phones.secondary || ''} onChange={e => setFormData({...formData, guardian: {...formData.guardian, phones: {...formData.guardian.phones, secondary: e.target.value}}})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 text-sm" />
                                  </label>
                                  <label className="block col-span-3 sm:col-span-1">
                                      <span className="text-xs font-bold text-text-secondary uppercase">Tel. 3</span>
                                      <input type="tel" value={formData.guardian.phones.tertiary || ''} onChange={e => setFormData({...formData, guardian: {...formData.guardian, phones: {...formData.guardian.phones, tertiary: e.target.value}}})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 text-sm" />
                                  </label>
                              </div>

                              <div className="border-t border-gray-200 pt-4 mt-2">
                                  <span className="text-xs font-bold text-text-secondary uppercase mb-2 block">Domicilio</span>
                                  <div className="grid grid-cols-4 gap-3">
                                      <div className="col-span-3">
                                          <input placeholder="Calle" value={formData.guardian.address.street} onChange={e => setFormData({...formData, guardian: {...formData.guardian, address: {...formData.guardian.address, street: e.target.value}}})} className="block w-full rounded-xl border-gray-300 p-2.5 text-sm" />
                                      </div>
                                      <div className="col-span-1">
                                          <input placeholder="No. Ext" value={formData.guardian.address.exteriorNumber} onChange={e => setFormData({...formData, guardian: {...formData.guardian, address: {...formData.guardian.address, exteriorNumber: e.target.value}}})} className="block w-full rounded-xl border-gray-300 p-2.5 text-sm" />
                                      </div>
                                      <div className="col-span-2">
                                          <input placeholder="Colonia" value={formData.guardian.address.colony} onChange={e => setFormData({...formData, guardian: {...formData.guardian, address: {...formData.guardian.address, colony: e.target.value}}})} className="block w-full rounded-xl border-gray-300 p-2.5 text-sm" />
                                      </div>
                                      <div className="col-span-1">
                                          <input placeholder="CP" value={formData.guardian.address.zipCode} onChange={e => setFormData({...formData, guardian: {...formData.guardian, address: {...formData.guardian.address, zipCode: e.target.value}}})} className="block w-full rounded-xl border-gray-300 p-2.5 text-sm" />
                                      </div>
                                      <div className="col-span-1">
                                          <input placeholder="Int (Opt)" value={formData.guardian.address.interiorNumber || ''} onChange={e => setFormData({...formData, guardian: {...formData.guardian, address: {...formData.guardian.address, interiorNumber: e.target.value}}})} className="block w-full rounded-xl border-gray-300 p-2.5 text-sm" />
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>
                      
                      <div className="md:col-span-2 flex justify-end gap-4 pt-4 border-t border-gray-100">
                          <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl border border-gray-300 font-bold text-text-secondary hover:bg-gray-50 transition-all">Cancelar</button>
                          <button type="submit" className="px-8 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover shadow-lg transition-all active:scale-95">Guardar Expediente</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* --- STUDENT DETAIL MODAL --- */}
      {reactiveViewingStudent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                  {/* Header */}
                  <div className="relative h-32 bg-gradient-to-r from-gray-900 to-gray-800 shrink-0">
                      <button onClick={() => setViewingStudent(null)} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-colors z-10 active:scale-90">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                      
                      <div className="absolute -bottom-10 left-8 flex items-end gap-6">
                          <Avatar src={reactiveViewingStudent.avatarUrl} name={reactiveViewingStudent.name} className="size-28 rounded-full border-4 border-white shadow-xl bg-white text-4xl" />
                          <div className="pb-10">
                              <h2 className="text-3xl font-bold text-white drop-shadow-md leading-none">{reactiveViewingStudent.name}</h2>
                              <div className="flex items-center gap-2 mt-2">
                                  <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-white text-xs font-bold">{reactiveViewingStudent.rank}</span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase border border-white/20 ${reactiveViewingStudent.status === 'active' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                      {reactiveViewingStudent.status}
                                  </span>
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  {/* Tabs Navigation */}
                  <div className="pt-14 px-8 border-b border-gray-100 flex gap-6 shrink-0 overflow-x-auto">
                      <button onClick={() => setActiveTab('info')} className={`pb-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'info' ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>Datos & Emergencia</button>
                      <button onClick={() => setActiveTab('attendance')} className={`pb-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'attendance' ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>Historial Asistencia</button>
                      <button onClick={() => setActiveTab('finance')} className={`pb-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${activeTab === 'finance' ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>Finanzas ({studentFinancialRecords.length})</button>
                  </div>

                  <div className="p-8 overflow-y-auto">
                      {/* --- TAB: INFO & EMERGENCY --- */}
                      {activeTab === 'info' && (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              {/* Left Col: Contact Info */}
                              <div className="space-y-6">
                                  <div>
                                      <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Información del Alumno</h4>
                                      <div className="space-y-3">
                                          <div className="flex items-center gap-4 text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
                                              <div className="size-10 rounded-full bg-white flex items-center justify-center text-primary shadow-sm"><span className="material-symbols-outlined text-[20px]">email</span></div>
                                              <div>
                                                  <p className="text-xs text-text-secondary">Correo Electrónico</p>
                                                  <p className="font-semibold text-text-main">{reactiveViewingStudent.email}</p>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-4 text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
                                              <div className="size-10 rounded-full bg-white flex items-center justify-center text-primary shadow-sm"><span className="material-symbols-outlined text-[20px]">smartphone</span></div>
                                              <div>
                                                  <p className="text-xs text-text-secondary">Celular Personal</p>
                                                  <p className="font-semibold text-text-main">{reactiveViewingStudent.cellPhone}</p>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-4 text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
                                              <div className="size-10 rounded-full bg-white flex items-center justify-center text-primary shadow-sm"><span className="material-symbols-outlined text-[20px]">cake</span></div>
                                              <div className="flex gap-6">
                                                  <div>
                                                      <p className="text-xs text-text-secondary">Edad</p>
                                                      <p className="font-semibold text-text-main">{reactiveViewingStudent.age} años</p>
                                                  </div>
                                                  <div>
                                                      <p className="text-xs text-text-secondary">Fecha Nacimiento</p>
                                                      <p className="font-semibold text-text-main">{reactiveViewingStudent.birthDate}</p>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                                  
                                  {/* Actions */}
                                  <div className="flex flex-col gap-3">
                                      <button onClick={handlePromote} className="w-full py-3 px-4 rounded-xl border border-gray-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all flex items-center justify-between group active:scale-95">
                                          <span className="font-semibold text-sm">Promover de Rango</span>
                                          <span className="material-symbols-outlined text-gray-400 group-hover:text-purple-500">workspace_premium</span>
                                      </button>
                                  </div>
                              </div>

                              {/* Right Col: Emergency Card */}
                              <div>
                                  <EmergencyCard student={reactiveViewingStudent} />
                              </div>
                          </div>
                      )}

                      {/* --- TAB: ATTENDANCE HISTORY (Simplified Reuse) --- */}
                      {activeTab === 'attendance' && (
                          <div className="space-y-6">
                              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                                  <div>
                                      <p className="text-xs font-bold text-text-secondary uppercase">Total Asistencias</p>
                                      <p className="text-3xl font-black text-text-main">{reactiveViewingStudent.attendance}</p>
                                  </div>
                              </div>
                              <div className="border rounded-2xl overflow-hidden">
                                  <table className="w-full text-left">
                                      <thead className="bg-gray-50 border-b border-gray-100">
                                          <tr>
                                              <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Fecha</th>
                                              <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Estado</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-50">
                                          {reactiveViewingStudent.attendanceHistory?.slice().reverse().map((record, idx) => (
                                              <tr key={idx} className="hover:bg-gray-50">
                                                  <td className="px-6 py-3 text-sm font-semibold">{new Date(record.date).toLocaleDateString()}</td>
                                                  <td className="px-6 py-3 text-sm">{record.status}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      )}

                      {/* --- TAB: FINANCE (Improved Unified View) --- */}
                      {activeTab === 'finance' && (
                          <div className="space-y-4">
                              <div className="flex justify-between items-center mb-2">
                                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Historial de Movimientos</h4>
                                  <span className="text-xs font-bold text-text-secondary bg-gray-100 px-2 py-1 rounded-md">{studentFinancialRecords.length} Registros</span>
                              </div>
                              
                              {studentFinancialRecords.length === 0 ? (
                                  <div className="text-center py-10 text-gray-400">
                                      <span className="material-symbols-outlined text-4xl mb-2 opacity-50">account_balance_wallet</span>
                                      <p className="text-sm">Sin historial financiero.</p>
                                  </div>
                              ) : (
                                  <div className="space-y-3">
                                      {studentFinancialRecords.map(record => {
                                          const isPaid = record.status === 'paid';
                                          const isOverdue = record.status === 'overdue';
                                          const isPending = record.status === 'pending';
                                          
                                          // Determine visual style
                                          let icon = 'receipt';
                                          let iconBg = 'bg-gray-100 text-gray-500';
                                          let amountColor = 'text-text-main';
                                          
                                          if (isPaid) {
                                              icon = 'check_circle';
                                              iconBg = 'bg-green-100 text-green-600';
                                              amountColor = 'text-green-600';
                                          } else if (isOverdue) {
                                              icon = 'warning';
                                              iconBg = 'bg-red-100 text-red-600';
                                              amountColor = 'text-red-600';
                                          } else if (record.status === 'in_review') {
                                              icon = 'hourglass_top';
                                              iconBg = 'bg-amber-100 text-amber-600';
                                          }

                                          return (
                                              <div key={record.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:shadow-sm transition-shadow">
                                                  <div className="flex items-center gap-4">
                                                      <div className={`size-10 rounded-full flex items-center justify-center shrink-0 ${iconBg}`}>
                                                          <span className="material-symbols-outlined text-[20px]">{icon}</span>
                                                      </div>
                                                      <div>
                                                          <p className="font-bold text-text-main text-sm">{record.concept}</p>
                                                          <div className="flex items-center gap-2 text-xs text-text-secondary mt-0.5">
                                                              <span>{formatDateDisplay(record.paymentDate || record.dueDate)}</span>
                                                              {record.method && (
                                                                  <>
                                                                      <span>•</span>
                                                                      <span className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-200">{record.method}</span>
                                                                  </>
                                                              )}
                                                          </div>
                                                      </div>
                                                  </div>
                                                  <div className="text-right">
                                                      <span className={`font-black text-sm block ${amountColor}`}>
                                                          {isPaid ? '+' : '-'}${record.amount.toFixed(2)}
                                                      </span>
                                                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                                                          isPaid ? 'text-green-600' : isOverdue ? 'text-red-500' : 'text-gray-400'
                                                      }`}>
                                                          {record.status === 'in_review' ? 'Revisión' : record.status}
                                                      </span>
                                                  </div>
                                              </div>
                                          );
                                      })}
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default StudentsList;
