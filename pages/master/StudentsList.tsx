
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { Student, StudentStatus } from '../../types';
import { exportToCSV } from '../../utils/csvExport';
import { useNavigate } from 'react-router-dom';
import ConfirmationModal from '../../components/ConfirmationModal';

const StudentsList: React.FC = () => {
  const { students, updateStudent, deleteStudent, addStudent, academySettings, markAttendance, promoteStudent, libraryResources } = useStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, action: () => void, type?: 'danger'|'info'}>({
      isOpen: false, title: '', message: '', action: () => {}
  });
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const selectedStudent = students.find(s => s.id === selectedStudentId);

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

  const handleExport = () => {
      const dataToExport = filteredStudents.map(({ classesId, promotionHistory, ...rest }) => rest);
      exportToCSV(dataToExport, 'Listado_Alumnos');
      addToast('Archivo CSV generado', 'success');
  };

  const getStatusColor = (status: string) => {
      switch(status) {
          case 'active': return 'bg-green-50 text-green-700 border-green-200'; 
          case 'debtor': return 'bg-yellow-50 text-yellow-700 border-yellow-200';
          case 'exam_ready': return 'bg-blue-50 text-blue-700 border-blue-200';
          default: return 'bg-gray-50 text-gray-500 border-gray-200';
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
              if (selectedStudentId === id) setSelectedStudentId(null);
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
          password: '' // Don't show existing password
      });
      setShowModal(true);
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
      if (!selectedStudent) return;
      setConfirmModal({
          isOpen: true,
          title: 'Promover de Rango',
          message: `¿Estás seguro de promover a ${selectedStudent.name} al siguiente cinturón?`,
          type: 'info',
          action: () => {
              promoteStudent(selectedStudent.id);
              addToast(`${selectedStudent.name} ha sido promovido`, 'success');
              setConfirmModal(prev => ({...prev, isOpen: false}));
          }
      });
  };

  const handleSendMessage = () => {
      if (!selectedStudent) return;
      navigate('/master/communication', { state: { recipientId: selectedStudent.id } });
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
                <div key={student.id} className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100 flex flex-col gap-4 group cursor-pointer hover:shadow-lg transition-all" onClick={() => setSelectedStudentId(student.id)}>
                    <div className="flex justify-between">
                        <img src={student.avatarUrl} className="size-16 rounded-full object-cover" />
                        <span className={`px-3 py-1 rounded-full text-xs font-bold h-fit ${getStatusColor(student.status)} border`}>{student.status.toUpperCase()}</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-text-main">{student.name}</h3>
                        <p className="text-sm text-text-secondary">{student.rank}</p>
                    </div>
                    <div className="w-full bg-gray-100 h-1.5 rounded-full">
                        <div className="bg-primary h-1.5 rounded-full" style={{width: `${student.attendance}%`}}></div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleEdit(student, e)} className="p-2 hover:bg-gray-100 rounded-lg"><span className="material-symbols-outlined text-gray-500">edit</span></button>
                        <button onClick={(e) => handleDelete(student.id, e)} className="p-2 hover:bg-red-50 rounded-lg"><span className="material-symbols-outlined text-red-500">delete</span></button>
                    </div>
                </div>
            ))}
        </div>
      </div>

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
    </div>
  );
};

export default StudentsList;
