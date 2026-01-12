
import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { RankColor, Rank } from '../../types';
import ConfirmationModal from '../../components/ConfirmationModal';
import EmergencyCard from '../../components/ui/EmergencyCard';
import Avatar from '../../components/ui/Avatar';

const Settings: React.FC = () => {
  const { currentUser, students, academySettings, updateAcademySettings, updateUserProfile, changePassword } = useStore();
  const { addToast } = useToast();
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'profile' | 'academy'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const student = students.find(s => s.id === currentUser?.studentId);

  const [profileData, setProfileData] = useState({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      avatarUrl: currentUser?.avatarUrl || ''
  });

  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [academyData, setAcademyData] = useState(academySettings);
  
  useEffect(() => {
      setAcademyData(academySettings);
  }, [academySettings]);

  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, action: () => void}>({
      isOpen: false, title: '', message: '', action: () => {}
  });

  // --- HANDLERS ---

  const handleProfileSave = (e: React.FormEvent) => {
      e.preventDefault();
      updateUserProfile({ name: profileData.name, avatarUrl: profileData.avatarUrl });
      addToast('Perfil actualizado', 'success');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwords.new !== passwords.confirm) return addToast('Las contraseñas no coinciden', 'error');
      if (passwords.new.length < 6) return addToast('Mínimo 6 caracteres', 'error');
      
      changePassword(passwords.new);
      setPasswords({ current: '', new: '', confirm: '' });
      addToast('Contraseña actualizada', 'success');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setProfileData(prev => ({ ...prev, avatarUrl: reader.result as string }));
              updateUserProfile({ avatarUrl: reader.result as string });
              addToast('Foto actualizada', 'success');
          };
          reader.readAsDataURL(file);
      }
  };

  // Academy Handlers
  const isValidBillingDates = academyData.paymentSettings.lateFeeDay > academyData.paymentSettings.billingDay;

  const handleAcademySave = (e: React.FormEvent) => {
      e.preventDefault();
      if (!isValidBillingDates) return addToast('Fecha de recargo inválida', 'error');
      updateAcademySettings(academyData);
      addToast('Configuración guardada', 'success');
  };

  const handleRankChange = (id: string, field: keyof Rank, value: any) => {
      setAcademyData(prev => ({
          ...prev,
          ranks: prev.ranks.map(r => r.id === id ? { ...r, [field]: value } : r)
      }));
  };

  const handleAddRank = () => {
      const nextOrder = academyData.ranks.length > 0 ? Math.max(...academyData.ranks.map(r => r.order)) + 1 : 1;
      const newRank: Rank = {
          id: `rank-${Date.now()}`,
          name: `Nuevo Grado`,
          color: 'white',
          order: nextOrder,
          requiredAttendance: 50
      };
      setAcademyData(prev => ({ ...prev, ranks: [...prev.ranks, newRank] }));
  };

  const handleDeleteRank = (id: string) => {
      if (academyData.ranks.length <= 1) return addToast('Debe haber al menos un grado', 'error');
      setConfirmModal({
          isOpen: true,
          title: 'Eliminar Grado',
          message: 'Los alumnos en este grado quedarán desasignados.',
          action: () => {
              setAcademyData(prev => ({ ...prev, ranks: prev.ranks.filter(r => r.id !== id) }));
              setConfirmModal(prev => ({...prev, isOpen: false}));
          }
      });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(academySettings.code);
    addToast('Código copiado', 'success');
  };

  const beltColors: { value: RankColor; label: string }[] = [
      { value: 'white', label: 'Blanco' },
      { value: 'yellow', label: 'Amarillo' },
      { value: 'orange', label: 'Naranja' },
      { value: 'green', label: 'Verde' },
      { value: 'blue', label: 'Azul' },
      { value: 'purple', label: 'Morado' },
      { value: 'brown', label: 'Marrón' },
      { value: 'black', label: 'Negro' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 pb-24 text-zinc-200">
      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
        type="danger"
      />

      <div className="flex flex-col md:flex-row gap-12">
          {/* Sidebar Nav (iOS Style) */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-white px-2 mb-6 tracking-tight">Ajustes</h2>
              
              <nav className="flex flex-col gap-1">
                  <button 
                    onClick={() => setActiveTab('profile')} 
                    className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${
                        activeTab === 'profile' 
                        ? 'bg-zinc-800 text-white shadow-lg shadow-black/20' 
                        : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                    }`}
                  >
                      <span className="material-symbols-outlined text-[20px]">person</span>
                      Perfil y Seguridad
                  </button>
                  
                  {student && (
                      <button 
                        onClick={() => setActiveTab('emergency')} 
                        className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${
                            activeTab === 'emergency' 
                            ? 'bg-zinc-800 text-white shadow-lg shadow-black/20' 
                            : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                        }`}
                      >
                          <span className="material-symbols-outlined text-[20px]">emergency</span>
                          Contacto Emergencia
                      </button>
                  )}

                  {currentUser?.role === 'master' && (
                      <button 
                        onClick={() => setActiveTab('academy')} 
                        className={`text-left px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-3 ${
                            activeTab === 'academy' 
                            ? 'bg-zinc-800 text-white shadow-lg shadow-black/20' 
                            : 'text-zinc-500 hover:text-white hover:bg-zinc-900'
                        }`}
                      >
                          <span className="material-symbols-outlined text-[20px]">settings_suggest</span>
                          Academia y Pagos
                      </button>
                  )}
              </nav>
          </div>

          <div className="flex-1 min-w-0 space-y-12">
              
              {/* --- PROFILE TAB --- */}
              {activeTab === 'profile' && (
                  <>
                      {/* Identity Section */}
                      <section>
                          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6 ml-1">Identidad</h3>
                          <div className="bg-[#121212] rounded-3xl p-8 border border-white/5 flex flex-col md:flex-row items-center md:items-start gap-8 shadow-inner">
                              <div className="relative group cursor-pointer shrink-0" onClick={() => fileInputRef.current?.click()}>
                                  <Avatar src={profileData.avatarUrl} name={profileData.name} className="size-24 rounded-full text-3xl bg-zinc-800 ring-4 ring-black/50 shadow-2xl" />
                                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                      <span className="material-symbols-outlined text-white text-lg">photo_camera</span>
                                  </div>
                                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                              </div>
                              <form onSubmit={handleProfileSave} className="flex-1 grid grid-cols-1 gap-6 w-full">
                                  <div className="space-y-1.5">
                                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Nombre Público</label>
                                      <input value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-zinc-700" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Email (Login)</label>
                                      <input value={profileData.email} disabled className="w-full bg-black/20 border border-white/5 rounded-xl px-4 py-3 text-sm text-zinc-500 cursor-not-allowed" />
                                  </div>
                                  <div className="flex justify-end pt-2">
                                      <button type="submit" className="bg-white text-black text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl hover:bg-zinc-200 transition-all shadow-lg active:scale-95">Guardar Perfil</button>
                                  </div>
                              </form>
                          </div>
                      </section>

                      {/* Security Section */}
                      <section>
                          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6 ml-1">Seguridad</h3>
                          <div className="bg-[#121212] rounded-3xl p-8 border border-white/5 shadow-inner">
                              <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  <div className="space-y-1.5">
                                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Nueva Contraseña</label>
                                      <input type="password" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-zinc-700" placeholder="••••••••" />
                                  </div>
                                  <div className="space-y-1.5">
                                      <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Confirmar</label>
                                      <input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder-zinc-700" placeholder="••••••••" />
                                  </div>
                                  <div className="md:col-span-2 flex justify-end mt-2">
                                      <button type="submit" className="bg-zinc-800 border border-white/5 text-zinc-300 text-xs font-bold uppercase tracking-wider px-6 py-3 rounded-xl hover:bg-zinc-700 hover:text-white transition-all active:scale-95">Actualizar Password</button>
                                  </div>
                              </form>
                          </div>
                      </section>
                  </>
              )}

              {/* --- EMERGENCY TAB --- */}
              {activeTab === 'emergency' && student && (
                  <section>
                      <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6 ml-1">Información de Contacto</h3>
                      {/* Emergency Card Wrapper with Dark Style Override */}
                      <div className="bg-[#121212] border border-white/5 rounded-3xl overflow-hidden shadow-inner">
                          <EmergencyCard student={student} />
                      </div>
                      <p className="text-xs text-zinc-600 mt-4 text-center">Para actualizar estos datos, contacta a la administración.</p>
                  </section>
              )}

              {/* --- ACADEMY TAB (MASTER) --- */}
              {activeTab === 'academy' && currentUser?.role === 'master' && (
                  <form onSubmit={handleAcademySave} className="space-y-12">
                      
                      {/* Academy Code Card */}
                      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
                          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none"></div>
                          <div className="relative z-10">
                              <h3 className="text-white font-bold text-2xl mb-1">{academySettings.name}</h3>
                              <p className="text-zinc-500 text-sm font-medium">Código de Vinculación</p>
                          </div>
                          <div className="relative z-10 flex items-center gap-4 bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shadow-lg group cursor-pointer hover:bg-white/10 transition-all" onClick={copyCode}>
                              <span className="font-mono text-2xl text-primary tracking-widest font-black">{academySettings.code}</span>
                              <span className="material-symbols-outlined text-zinc-500 group-hover:text-white transition-colors">content_copy</span>
                          </div>
                      </div>

                      {/* Payment Config */}
                      <section>
                          <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-6 ml-1">Configuración Financiera</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#121212] p-8 rounded-3xl border border-white/5 shadow-inner">
                              <div className="space-y-1.5">
                                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Costo Mensualidad ($)</label>
                                  <div className="relative">
                                      <span className="absolute left-4 top-3 text-zinc-500 font-mono">$</span>
                                      <input type="number" value={academyData.paymentSettings.monthlyTuition} onChange={e => setAcademyData({...academyData, paymentSettings: {...academyData.paymentSettings, monthlyTuition: parseFloat(e.target.value)}})} className="w-full bg-zinc-900 border border-white/5 rounded-xl py-3 pl-8 pr-4 text-white font-mono focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" />
                                  </div>
                              </div>
                              <div className="space-y-1.5">
                                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Recargo Mora ($)</label>
                                  <div className="relative">
                                      <span className="absolute left-4 top-3 text-red-500/50 font-mono">$</span>
                                      <input type="number" value={academyData.paymentSettings.lateFeeAmount} onChange={e => setAcademyData({...academyData, paymentSettings: {...academyData.paymentSettings, lateFeeAmount: parseFloat(e.target.value)}})} className="w-full bg-zinc-900 border border-white/5 rounded-xl py-3 pl-8 pr-4 text-red-400 font-mono focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all" />
                                  </div>
                              </div>
                              <div className="space-y-1.5">
                                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Día Corte (Cargo)</label>
                                  <select value={academyData.paymentSettings.billingDay} onChange={e => setAcademyData({...academyData, paymentSettings: {...academyData.paymentSettings, billingDay: parseInt(e.target.value)}})} className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-primary outline-none appearance-none">
                                      {Array.from({length: 28}, (_, i) => i + 1).map(d => <option key={d} value={d}>Día {d} del mes</option>)}
                                  </select>
                              </div>
                              <div className="space-y-1.5">
                                  <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Día Límite (Multa)</label>
                                  <select value={academyData.paymentSettings.lateFeeDay} onChange={e => setAcademyData({...academyData, paymentSettings: {...academyData.paymentSettings, lateFeeDay: parseInt(e.target.value)}})} className="w-full bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 text-white text-sm focus:border-primary outline-none appearance-none">
                                      {Array.from({length: 28}, (_, i) => i + 1).map(d => <option key={d} value={d}>Día {d} del mes</option>)}
                                  </select>
                              </div>
                          </div>
                      </section>

                      {/* Rank System */}
                      <section>
                          <div className="flex justify-between items-end mb-6 ml-1">
                              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Sistema de Grados</h3>
                              <button type="button" onClick={handleAddRank} className="text-primary text-xs font-bold hover:text-blue-400 uppercase tracking-wide flex items-center gap-1 transition-colors">
                                  <span className="material-symbols-outlined text-sm">add_circle</span> Nuevo Grado
                              </button>
                          </div>
                          
                          <div className="space-y-3">
                              {academyData.ranks.sort((a,b) => a.order - b.order).map((rank, idx) => (
                                  <div key={rank.id} className="flex items-center gap-4 bg-[#121212] p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-all group shadow-sm">
                                      <div className="size-8 rounded-xl bg-zinc-900 text-zinc-500 flex items-center justify-center text-xs font-mono font-bold border border-white/5">{idx + 1}</div>
                                      
                                      <div className="flex-1">
                                          <input 
                                              value={rank.name} 
                                              onChange={(e) => handleRankChange(rank.id, 'name', e.target.value)}
                                              className="bg-transparent border-none text-sm text-white font-bold focus:ring-0 placeholder-zinc-700 w-full p-0"
                                              placeholder="Nombre Grado"
                                          />
                                      </div>

                                      <select 
                                          value={rank.color}
                                          onChange={(e) => handleRankChange(rank.id, 'color', e.target.value)}
                                          className="bg-zinc-900 text-zinc-300 text-xs border border-white/10 rounded-lg px-3 py-2 focus:border-primary outline-none appearance-none font-medium"
                                      >
                                          {beltColors.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                      </select>

                                      <div className="flex items-center gap-2 bg-zinc-900 px-3 py-2 rounded-lg border border-white/10">
                                          <input 
                                              type="number" 
                                              value={rank.requiredAttendance} 
                                              onChange={(e) => handleRankChange(rank.id, 'requiredAttendance', parseInt(e.target.value))}
                                              className="w-10 bg-transparent text-right text-xs text-white border-none focus:ring-0 p-0 font-mono"
                                          />
                                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wide">Clases</span>
                                      </div>

                                      <button type="button" onClick={() => handleDeleteRank(rank.id)} className="text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                                          <span className="material-symbols-outlined text-lg">delete</span>
                                      </button>
                                  </div>
                              ))}
                          </div>
                      </section>

                      {/* Save Button */}
                      <div className="sticky bottom-6 flex justify-end">
                          <button type="submit" className="bg-white text-black px-8 py-3.5 rounded-xl font-bold shadow-2xl hover:bg-zinc-200 transition-all active:scale-95 text-xs uppercase tracking-wide flex items-center gap-2">
                              <span className="material-symbols-outlined text-lg">save</span>
                              Guardar Cambios
                          </button>
                      </div>
                  </form>
              )}
          </div>
      </div>
    </div>
  );
};

export default Settings;
