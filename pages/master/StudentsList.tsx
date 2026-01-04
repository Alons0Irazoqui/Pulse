
import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Student, StudentStatus } from '../../types';
import { exportToCSV } from '../../utils/csvExport';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from '../../components/ConfirmationModal';

const StudentsList: React.FC = () => {
  const { students, updateStudent, deleteStudent, addStudent, academySettings, markAttendance, promoteStudent, payments } = useStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Modal States
  const [showModal, setShowModal] = useState(false); // Create/Edit Modal
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null); // Detail Modal
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, action: () => void, type?: 'danger'|'info'}>({
      isOpen: false, title: '', message: '', action: () => {}
  });
  
  const initialFormState = {
      name: '', email: '', rank: 'White Belt', status: 'active' as StudentStatus, program: 'Adults', balance: 0, avatarUrl: '', password: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          student.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || student.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Calculate debts for viewing student
  const studentDebts = useMemo(() => {
      if (!viewingStudent) return [];
      return payments.filter(p => p.studentId === viewingStudent.id && p.status !== 'paid');
  }, [viewingStudent, payments]);

  const totalDebt = studentDebts.reduce((acc, curr) => acc + curr.amount, 0);

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
        <div className="flex justify-between items-center pb-2">
          <h2 className="text-3xl font-bold text-text-main">Gestión de Alumnos</h2>
          <button onClick={handleCreate} className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all flex items-center gap-2">
            <span className="material-symbols-outlined">person_add</span> Nuevo Alumno
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((student) => (
                <div key={student.id} className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 flex flex-col gap-4 group transition-all relative">
                    <div className="flex justify-between">
                        <img src={student.avatarUrl} className="size-16 rounded-full object-cover" />
                        <span className={`px-3 py-1 rounded-full text-xs font-bold h-fit ${getStatusColor(student.status)} border`}>{getStatusLabel(student.status)}</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-text-main">{student.name}</h3>
                        <p className="text-sm text-text-secondary">{student.rank}</p>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full">
                        <div className="bg-primary h-1.5 rounded-full" style={{width: `${student.attendance}%`}}></div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-50">
                        <button onClick={(e) => handleViewDetails(student, e)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg flex items-center gap-1 text-sm font-semibold transition-colors" title="Ver Información Completa">
                            <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        <button onClick={(e) => handleEdit(student, e)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors" title="Editar">
                            <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button onClick={(e) => handleDelete(student.id, e)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors" title="Eliminar">
                            <span className="material-symbols-outlined text-[20px]">delete</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
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

      {/* STUDENT DETAIL & DEBT INFO MODAL */}
      {viewingStudent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                  {/* Header */}
                  <div className="relative h-32 bg-gradient-to-r from-gray-900 to-gray-800">
                      <button onClick={() => setViewingStudent(null)} className="absolute top-4 right-4 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full backdrop-blur-md transition-colors">
                          <span className="material-symbols-outlined">close</span>
                      </button>
                      <div className="absolute -bottom-12 left-8">
                          <img src={viewingStudent.avatarUrl} className="size-24 rounded-full border-4 border-white shadow-lg object-cover bg-white" />
                      </div>
                  </div>
                  
                  <div className="pt-16 px-8 pb-8 overflow-y-auto">
                      <div className="flex justify-between items-start mb-6">
                          <div>
                              <h2 className="text-3xl font-bold text-text-main">{viewingStudent.name}</h2>
                              <div className="flex items-center gap-2 mt-1">
                                  <span className="text-primary font-semibold">{viewingStudent.rank}</span>
                                  <span className="text-gray-300">•</span>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${getStatusColor(viewingStudent.status)}`}>
                                      {getStatusLabel(viewingStudent.status)}
                                  </span>
                              </div>
                          </div>
                          <div className="flex gap-2">
                              <button onClick={() => { navigate('/master/communication', { state: { recipientId: viewingStudent.id } }) }} className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                                  <span className="material-symbols-outlined">mail</span>
                              </button>
                              <button onClick={handlePromote} className="p-2.5 rounded-xl bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors" title="Promover">
                                  <span className="material-symbols-outlined">workspace_premium</span>
                              </button>
                          </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                          <div className="space-y-4">
                              <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Información de Contacto</h4>
                              <div className="space-y-3">
                                  <div className="flex items-center gap-3 text-sm">
                                      <div className="size-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"><span className="material-symbols-outlined text-[18px]">email</span></div>
                                      <span className="text-text-main">{viewingStudent.email}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm">
                                      <div className="size-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"><span className="material-symbols-outlined text-[18px]">phone</span></div>
                                      <span className="text-text-main">{viewingStudent.phone || 'Sin teléfono'}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm">
                                      <div className="size-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400"><span className="material-symbols-outlined text-[18px]">calendar_month</span></div>
                                      <span className="text-text-main">Miembro desde {viewingStudent.joinDate}</span>
                                  </div>
                              </div>
                          </div>

                          <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Estado Financiero</h4>
                              {totalDebt > 0 ? (
                                  <div>
                                      <div className="flex items-baseline gap-2 mb-4">
                                          <span className="text-3xl font-black text-red-600">${totalDebt.toFixed(2)}</span>
                                          <span className="text-xs font-bold text-red-400 uppercase">Pendiente</span>
                                      </div>
                                      <div className="space-y-2">
                                          <p className="text-xs font-semibold text-gray-600 mb-1">Conceptos por pagar:</p>
                                          {studentDebts.map(debt => (
                                              <div key={debt.id} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-gray-100 shadow-sm">
                                                  <span className="text-text-main">{debt.category}</span>
                                                  <span className="font-bold text-gray-800">${debt.amount}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ) : (
                                  <div className="h-full flex flex-col items-center justify-center text-center py-4">
                                      <div className="size-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-2">
                                          <span className="material-symbols-outlined">check</span>
                                      </div>
                                      <p className="text-sm font-bold text-green-700">Al Corriente</p>
                                      <p className="text-xs text-green-600">No hay deudas pendientes.</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default StudentsList;
