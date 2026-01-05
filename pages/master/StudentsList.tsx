
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Student, StudentStatus } from '../../types';
import { exportToCSV } from '../../utils/csvExport';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from '../../components/ConfirmationModal';

const StudentsList: React.FC = () => {
  const { students, updateStudent, deleteStudent, addStudent, academySettings, promoteStudent, payments } = useStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [activeTab, setActiveTab] = useState<'info' | 'attendance' | 'finance'>('info');
  
  // Modal States
  const [showModal, setShowModal] = useState(false); 
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null); 
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, action: () => void, type?: 'danger'|'info'}>({
      isOpen: false, title: '', message: '', action: () => {}
  });
  
  const initialFormState = {
      name: '', email: '', rank: 'White Belt', status: 'active' as StudentStatus, program: 'Adults', balance: 0, avatarUrl: '', password: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // Filter Students
  const filteredStudents = useMemo(() => {
      return students.filter(student => {
        const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              student.email.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
        return matchesSearch && matchesStatus;
      });
  }, [students, searchTerm, filterStatus]);

  // --- REACTIVE DATA ENGINE ---
  
  // 1. Get the LIVE version of the student from the store (to ensure balance updates instantly)
  const reactiveViewingStudent = useMemo(() => {
      if (!viewingStudent) return null;
      return students.find(s => s.id === viewingStudent.id) || viewingStudent;
  }, [students, viewingStudent]);

  // 2. Split Financial History into Charges and Payments (Reactive from global payments)
  const financialHistory = useMemo(() => {
      if (!reactiveViewingStudent) return { charges: [], payments: [] };
      
      const records = payments.filter(p => p.studentId === reactiveViewingStudent.id);
      
      return {
          charges: records
              .filter(r => r.type === 'charge')
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
          payments: records
              .filter(r => r.type === 'payment')
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      };
  }, [reactiveViewingStudent, payments]);

  const handleExport = () => {
      const dataToExport = filteredStudents.map(({ classesId, promotionHistory, ...rest }) => rest);
      exportToCSV(dataToExport, 'Listado_Alumnos');
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

  const getStatusLabel = (status: string) => {
      switch(status) {
          case 'active': return 'ACTIVO';
          case 'debtor': return 'ADEUDO';
          case 'exam_ready': return 'LISTO EXAMEN';
          case 'inactive': return 'INACTIVO';
          default: return status.toUpperCase();
      }
  };

  const handleDelete = (id: string, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setConfirmModal({
          isOpen: true,
          title: 'Eliminar Alumno',
          message: '¿Estás seguro? Esta acción es irreversible y eliminará el historial del alumno.',
          type: 'danger',
          action: () => {
              deleteStudent(id);
              addToast('Alumno eliminado correctamente', 'success');
              setConfirmModal(prev => ({...prev, isOpen: false}));
          }
      });
  };

  const handleEdit = (student: Student, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setEditingStudent(student);
      setFormData({
          name: student.name,
          email: student.email,
          rank: student.rank,
          status: student.status,
          program: student.program,
          balance: student.balance,
          avatarUrl: student.avatarUrl || '',
          password: '' 
      });
      setShowModal(true);
  };

  const handleViewDetails = (student: Student, e?: React.MouseEvent) => {
      e?.stopPropagation();
      setViewingStudent(student);
      setActiveTab('info'); 
  };

  const handleCreate = () => {
      setEditingStudent(null);
      setFormData({ ...initialFormState, avatarUrl: `https://i.pravatar.cc/150?u=${Date.now()}` });
      setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingStudent) {
          updateStudent({ ...editingStudent, ...formData });
          addToast('Alumno actualizado', 'success');
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
          addToast('Alumno creado y cuenta generada', 'success');
      }
      setShowModal(false);
  };

  const handlePromote = () => {
      if (!viewingStudent) return;
      setConfirmModal({
          isOpen: true,
          title: 'Promover de Rango',
          message: `¿Estás seguro de promover a ${viewingStudent.name} al siguiente cinturón?`,
          type: 'info',
          action: () => {
              promoteStudent(viewingStudent.id);
              addToast(`${viewingStudent.name} ha sido promovido`, 'success');
              setConfirmModal(prev => ({...prev, isOpen: false}));
              setViewingStudent(null); 
          }
      });
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:px-10 h-full">
      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
        type={confirmModal.type}
      />

      <div className="max-w-[1600px] mx-auto flex flex-col gap-8">
        {/* Header & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-2">
          <div>
              <h2 className="text-3xl font-bold text-text-main">Gestión de Alumnos</h2>
              <p className="text-text-secondary text-sm mt-1">Administra tu lista de estudiantes.</p>
          </div>
          
          <div className="flex flex-wrap gap-3 items-center">
              {/* View Toggle */}
              <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-gray-100 text-primary shadow-sm' : 'text-text-secondary hover:bg-gray-50'}`}
                    title="Vista Cuadrícula"
                  >
                      <span className="material-symbols-outlined">grid_view</span>
                  </button>
                  <button 
                    onClick={() => setViewMode('table')}
                    className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-gray-100 text-primary shadow-sm' : 'text-text-secondary hover:bg-gray-50'}`}
                    title="Vista Tabla"
                  >
                      <span className="material-symbols-outlined">table_rows</span>
                  </button>
              </div>

              {/* Create Button */}
              <button onClick={handleCreate} className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined">person_add</span> 
                <span className="hidden sm:inline">Nuevo Alumno</span>
              </button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100 items-center">
            <div className="relative flex-1 w-full">
                <span className="absolute left-3 top-2.5 text-gray-400 material-symbols-outlined">search</span>
                <input 
                    type="text" 
                    placeholder="Buscar por nombre o email..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20"
                />
            </div>
            <div className="w-px h-8 bg-gray-200 hidden md:block"></div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                {['all', 'active', 'debtor', 'inactive'].map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase whitespace-nowrap transition-all border ${
                            filterStatus === status 
                            ? 'bg-black text-white border-black' 
                            : 'bg-white text-text-secondary border-gray-200 hover:bg-gray-50'
                        }`}
                    >
                        {status === 'all' ? 'Todos' : getStatusLabel(status)}
                    </button>
                ))}
            </div>
        </div>

        {/* --- GRID VIEW --- */}
        {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {filteredStudents.map((student) => (
                    <div key={student.id} className="bg-white p-6 rounded-[1.5rem] shadow-card border border-gray-100 flex flex-col gap-4 group hover:-translate-y-1 transition-all relative overflow-hidden">
                        {/* Status Badge */}
                        <div className={`absolute top-4 right-4 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(student.status)}`}>
                            {getStatusLabel(student.status)}
                        </div>

                        <div className="flex gap-4 items-center">
                            <img src={student.avatarUrl} className="size-16 rounded-2xl object-cover bg-gray-100 shadow-sm" />
                            <div>
                                <h3 className="text-lg font-bold text-text-main leading-tight line-clamp-1">{student.name}</h3>
                                <p className="text-sm text-text-secondary font-medium">{student.rank}</p>
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs text-text-secondary font-semibold">
                                <span>Asistencia</span>
                                <span>{student.attendance} Clases</span>
                            </div>
                            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <div className="bg-primary h-full rounded-full" style={{width: `${Math.min(student.attendance, 100)}%`}}></div>
                            </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex justify-end gap-2 pt-4 border-t border-gray-50 mt-auto">
                            <button onClick={(e) => handleViewDetails(student, e)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg transition-colors" title="Ver Perfil">
                                <span className="material-symbols-outlined text-[20px]">visibility</span>
                            </button>
                            <button onClick={(e) => handleEdit(student, e)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-text-main transition-colors" title="Editar">
                                <span className="material-symbols-outlined text-[20px]">edit</span>
                            </button>
                            <button onClick={(e) => handleDelete(student.id, e)} className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors" title="Eliminar">
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* --- TABLE VIEW --- */}
        {viewMode === 'table' && (
            <div className="bg-white rounded-[1.5rem] shadow-card border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Alumno</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Rango & Programa</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Asistencia</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Saldo</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredStudents.map((student) => (
                                <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={(e) => handleViewDetails(student, e)}>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <img src={student.avatarUrl} className="size-10 rounded-full object-cover bg-gray-100" />
                                            <div>
                                                <p className="font-bold text-sm text-text-main">{student.name}</p>
                                                <p className="text-xs text-text-secondary">{student.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-semibold text-sm text-text-main">{student.rank}</p>
                                        <p className="text-xs text-text-secondary">{student.program}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getStatusColor(student.status)}`}>
                                            {getStatusLabel(student.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 w-48">
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-primary h-full rounded-full" style={{width: `${Math.min(student.attendance, 100)}%`}}></div>
                                            </div>
                                            <span className="text-xs font-bold text-text-secondary">{student.attendance}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-bold text-sm ${student.balance > 0 ? 'text-red-500' : 'text-green-600'}`}>
                                            ${student.balance.toFixed(2)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={(e) => handleEdit(student, e)} className="p-1.5 hover:bg-gray-100 rounded text-gray-500 hover:text-primary transition-colors">
                                                <span className="material-symbols-outlined text-[18px]">edit</span>
                                            </button>
                                            <button onClick={(e) => handleDelete(student.id, e)} className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500 transition-colors">
                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredStudents.length === 0 && (
                        <div className="p-12 text-center text-text-secondary">
                            <span className="material-symbols-outlined text-4xl opacity-30 mb-2">person_off</span>
                            <p>No se encontraron alumnos.</p>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {showModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl p-8 w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                  <h2 className="text-2xl font-bold mb-6 text-text-main">{editingStudent ? 'Editar Alumno' : 'Nuevo Alumno'}</h2>
                  <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                      <div className="grid grid-cols-2 gap-4">
                          <label className="block">
                              <span className="text-sm font-semibold text-text-main">Nombre</span>
                              <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 focus:border-primary focus:ring-primary" />
                          </label>
                          <label className="block">
                              <span className="text-sm font-semibold text-text-main">Email</span>
                              <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 focus:border-primary focus:ring-primary" />
                          </label>
                      </div>
                      
                      {!editingStudent && (
                          <label className="block">
                              <span className="text-sm font-semibold text-text-main">Contraseña de Acceso</span>
                              <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 focus:border-primary focus:ring-primary" placeholder="••••••••" />
                          </label>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                          <label className="block">
                              <span className="text-sm font-semibold text-text-main">Rango</span>
                              <select value={formData.rank} onChange={e => setFormData({...formData, rank: e.target.value})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 focus:border-primary focus:ring-primary">
                                  <option>White Belt</option>
                                  <option>Blue Belt</option>
                                  <option>Purple Belt</option>
                                  <option>Brown Belt</option>
                                  <option>Black Belt</option>
                              </select>
                          </label>
                          <label className="block">
                              <span className="text-sm font-semibold text-text-main">Estado</span>
                              <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})} className="mt-1 block w-full rounded-xl border-gray-300 p-2.5 focus:border-primary focus:ring-primary">
                                  <option value="active">Activo</option>
                                  <option value="debtor">Deudor</option>
                                  <option value="exam_ready">Examen Listo</option>
                                  <option value="inactive">Inactivo</option>
                              </select>
                          </label>
                      </div>
                      <div className="flex gap-3 mt-6">
                          <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 rounded-xl border border-gray-300 font-medium hover:bg-gray-50">Cancelar</button>
                          <button type="submit" className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover shadow-lg">Guardar</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* STUDENT DETAIL MODAL WITH TABS */}
      {reactiveViewingStudent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] w-full max-w-4xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                  {/* Header */}
                  <div className="relative h-32 bg-gradient-to-r from-gray-900 to-gray-800 shrink-0">
                      <button onClick={() => setViewingStudent(null)} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-colors z-10">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                      
                      <div className="absolute -bottom-10 left-8 flex items-end gap-6">
                          <img src={reactiveViewingStudent.avatarUrl} className="size-28 rounded-full border-4 border-white shadow-xl object-cover bg-white" />
                          <div className="pb-10">
                              <h2 className="text-3xl font-bold text-white drop-shadow-md leading-none">{reactiveViewingStudent.name}</h2>
                              <div className="flex items-center gap-2 mt-2">
                                  <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-white text-xs font-bold">{reactiveViewingStudent.rank}</span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase border border-white/20 ${reactiveViewingStudent.status === 'active' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                      {getStatusLabel(reactiveViewingStudent.status)}
                                  </span>
                              </div>
                          </div>
                      </div>
                  </div>
                  
                  {/* Tabs Navigation */}
                  <div className="pt-14 px-8 border-b border-gray-100 flex gap-6 shrink-0">
                      <button onClick={() => setActiveTab('info')} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'info' ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>General</button>
                      <button onClick={() => setActiveTab('attendance')} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'attendance' ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>Historial Asistencia</button>
                      <button onClick={() => setActiveTab('finance')} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'finance' ? 'text-primary border-primary' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>Finanzas ({financialHistory.charges.length + financialHistory.payments.length})</button>
                  </div>

                  <div className="p-8 overflow-y-auto">
                      {/* --- TAB: INFO --- */}
                      {activeTab === 'info' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div className="space-y-6">
                                  <div>
                                      <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Información de Contacto</h4>
                                      <div className="space-y-4">
                                          <div className="flex items-center gap-4 text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
                                              <div className="size-10 rounded-full bg-white flex items-center justify-center text-primary shadow-sm"><span className="material-symbols-outlined text-[20px]">email</span></div>
                                              <div>
                                                  <p className="text-xs text-text-secondary">Correo Electrónico</p>
                                                  <p className="font-semibold text-text-main">{reactiveViewingStudent.email}</p>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-4 text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
                                              <div className="size-10 rounded-full bg-white flex items-center justify-center text-primary shadow-sm"><span className="material-symbols-outlined text-[20px]">phone</span></div>
                                              <div>
                                                  <p className="text-xs text-text-secondary">Teléfono</p>
                                                  <p className="font-semibold text-text-main">{reactiveViewingStudent.phone || 'No registrado'}</p>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-4 text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
                                              <div className="size-10 rounded-full bg-white flex items-center justify-center text-primary shadow-sm"><span className="material-symbols-outlined text-[20px]">calendar_month</span></div>
                                              <div>
                                                  <p className="text-xs text-text-secondary">Miembro Desde</p>
                                                  <p className="font-semibold text-text-main">{reactiveViewingStudent.joinDate}</p>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              <div className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-6 border border-gray-100">
                                  <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4">Acciones Rápidas</h4>
                                  <div className="flex flex-col gap-3">
                                      <button onClick={() => { navigate('/master/communication', { state: { recipientId: reactiveViewingStudent.id } }) }} className="w-full py-3 px-4 rounded-xl border border-gray-200 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all flex items-center justify-between group">
                                          <span className="font-semibold text-sm">Enviar Mensaje</span>
                                          <span className="material-symbols-outlined text-gray-400 group-hover:text-blue-500">mail</span>
                                      </button>
                                      <button onClick={handlePromote} className="w-full py-3 px-4 rounded-xl border border-gray-200 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all flex items-center justify-between group">
                                          <span className="font-semibold text-sm">Promover de Rango</span>
                                          <span className="material-symbols-outlined text-gray-400 group-hover:text-purple-500">workspace_premium</span>
                                      </button>
                                  </div>
                              </div>
                          </div>
                      )}

                      {/* --- TAB: ATTENDANCE HISTORY --- */}
                      {activeTab === 'attendance' && (
                          <div className="space-y-6">
                              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                                  <div>
                                      <p className="text-xs font-bold text-text-secondary uppercase">Total Asistencias</p>
                                      <p className="text-3xl font-black text-text-main">{reactiveViewingStudent.attendance}</p>
                                  </div>
                                  <div className="w-48">
                                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                          <div className="bg-primary h-full rounded-full" style={{width: '75%'}}></div>
                                      </div>
                                      <p className="text-xs text-right mt-1 text-text-secondary">Progreso de rango</p>
                                  </div>
                              </div>

                              <div className="border rounded-2xl overflow-hidden">
                                  <table className="w-full text-left">
                                      <thead className="bg-gray-50 border-b border-gray-100">
                                          <tr>
                                              <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Fecha</th>
                                              <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Estado</th>
                                              <th className="px-6 py-3 text-xs font-bold text-gray-400 uppercase">Hora Registro</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-50">
                                          {reactiveViewingStudent.attendanceHistory && reactiveViewingStudent.attendanceHistory.length > 0 ? (
                                              [...reactiveViewingStudent.attendanceHistory]
                                              .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                              .map((record, idx) => (
                                                  <tr key={idx} className="hover:bg-gray-50">
                                                      <td className="px-6 py-3 text-sm font-semibold text-text-main">
                                                          {new Date(record.date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                                                      </td>
                                                      <td className="px-6 py-3">
                                                          <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${
                                                              record.status === 'present' ? 'bg-green-50 text-green-600 border-green-200' :
                                                              record.status === 'late' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                                                              record.status === 'excused' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                                                              'bg-red-50 text-red-600 border-red-200'
                                                          }`}>
                                                              {record.status === 'present' ? 'Presente' :
                                                               record.status === 'late' ? 'Retardo' :
                                                               record.status === 'excused' ? 'Justificado' : 'Falta'}
                                                          </span>
                                                      </td>
                                                      <td className="px-6 py-3 text-xs text-text-secondary font-mono">
                                                          {new Date(record.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                      </td>
                                                  </tr>
                                              ))
                                          ) : (
                                              <tr>
                                                  <td colSpan={3} className="px-6 py-8 text-center text-text-secondary">
                                                      No hay registros de asistencia aún.
                                                  </td>
                                              </tr>
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      )}

                      {/* --- TAB: FINANCE (REFACTORED) --- */}
                      {activeTab === 'finance' && (
                          <div className="space-y-8">
                              {/* Balance Card */}
                              {reactiveViewingStudent.balance > 0 ? (
                                  <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex justify-between items-center">
                                      <div className="flex items-center gap-4">
                                          <div className="size-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                                              <span className="material-symbols-outlined text-2xl">warning</span>
                                          </div>
                                          <div>
                                              <p className="text-red-800 font-bold text-lg">Saldo Pendiente</p>
                                              <p className="text-red-600 text-sm">El alumno tiene pagos atrasados.</p>
                                          </div>
                                      </div>
                                      <p className="text-4xl font-black text-red-600">${reactiveViewingStudent.balance.toFixed(2)}</p>
                                  </div>
                              ) : (
                                  <div className="bg-green-50 p-6 rounded-2xl border border-green-100 flex items-center gap-4">
                                      <div className="size-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                          <span className="material-symbols-outlined text-2xl">check_circle</span>
                                      </div>
                                      <div>
                                          <p className="text-green-800 font-bold text-lg">Al Corriente</p>
                                          <p className="text-green-600 text-sm">No existen deudas registradas.</p>
                                      </div>
                                  </div>
                              )}

                              {/* Navigation Hint */}
                              <div className="flex justify-end">
                                  <button 
                                      onClick={() => navigate('/master/finance')}
                                      className="text-sm font-bold text-primary hover:text-primary-hover flex items-center gap-1 bg-blue-50 px-4 py-2 rounded-lg transition-colors"
                                  >
                                      Ir al Módulo Financiero
                                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                  </button>
                              </div>

                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                  {/* Charges Column */}
                                  <div className="space-y-4">
                                      <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-gray-100 pb-2">
                                          Historial de Cargos
                                      </h4>
                                      <div className="space-y-2">
                                          {financialHistory.charges.map(charge => (
                                              <div key={charge.id} className="p-3 bg-gray-50 border border-gray-100 rounded-xl flex justify-between items-center">
                                                  <div>
                                                      <p className="font-bold text-text-main text-sm">{charge.category}</p>
                                                      <p className="text-xs text-text-secondary">{charge.description} • {new Date(charge.date).toLocaleDateString()}</p>
                                                  </div>
                                                  <p className="font-bold text-red-500 text-sm">-${charge.amount.toFixed(2)}</p>
                                              </div>
                                          ))}
                                          {financialHistory.charges.length === 0 && <p className="text-xs text-gray-400">Sin cargos registrados.</p>}
                                      </div>
                                  </div>

                                  {/* Payments Column */}
                                  <div className="space-y-4">
                                      <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider border-b border-gray-100 pb-2">
                                          Historial de Pagos
                                      </h4>
                                      <div className="space-y-2">
                                          {financialHistory.payments.map(payment => (
                                              <div key={payment.id} className="p-3 bg-white border border-gray-200 rounded-xl flex justify-between items-center shadow-sm">
                                                  <div>
                                                      <div className="flex items-center gap-2">
                                                          <p className="font-bold text-text-main text-sm">{payment.method || 'Pago'}</p>
                                                          {/* Status Badge */}
                                                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                                              payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                              payment.status === 'pending_approval' ? 'bg-yellow-100 text-yellow-700' :
                                                              'bg-red-100 text-red-700'
                                                          }`}>
                                                              {payment.status === 'paid' ? 'Aprobado' : payment.status === 'pending_approval' ? 'Pendiente' : 'Rechazado'}
                                                          </span>
                                                      </div>
                                                      <p className="text-xs text-text-secondary">{new Date(payment.date).toLocaleDateString()}</p>
                                                  </div>
                                                  <p className="font-bold text-green-600 text-sm">+${payment.amount.toFixed(2)}</p>
                                              </div>
                                          ))}
                                          {financialHistory.payments.length === 0 && <p className="text-xs text-gray-400">Sin pagos registrados.</p>}
                                      </div>
                                  </div>
                              </div>
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
