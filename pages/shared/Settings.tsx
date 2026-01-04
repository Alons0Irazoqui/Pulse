
import React, { useState, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import { RankColor, Rank } from '../../types';
import ConfirmationModal from '../../components/ConfirmationModal';

const Settings: React.FC = () => {
  const { currentUser, academySettings, updateAcademySettings, updateUserProfile, changePassword } = useStore();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'academy' | 'notifications'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile Form State
  const [profileData, setProfileData] = useState({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      avatarUrl: currentUser?.avatarUrl || ''
  });

  // Password State
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  // Academy & Bank Form State
  const [academyData, setAcademyData] = useState(academySettings);
  const [bankData, setBankData] = useState(academySettings.bankDetails || { bankName: '', accountHolder: '', accountNumber: '', clabe: '', instructions: '' });
  
  // Notifications State
  const [notifications, setNotifications] = useState({ payments: true, attendance: false, events: true, newsletter: false });

  // Modal State
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, action: () => void}>({
      isOpen: false, title: '', message: '', action: () => {}
  });

  const handleProfileSave = (e: React.FormEvent) => {
      e.preventDefault();
      updateUserProfile({ name: profileData.name, avatarUrl: profileData.avatarUrl });
      addToast('Perfil actualizado correctamente', 'success');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwords.new !== passwords.confirm) {
          addToast('Las contraseñas nuevas no coinciden', 'error');
          return;
      }
      if (passwords.new.length < 6) {
          addToast('La contraseña es muy corta', 'error');
          return;
      }
      changePassword(passwords.new);
      setPasswords({ current: '', new: '', confirm: '' });
      addToast('Contraseña actualizada con éxito', 'success');
  };

  const handleAcademySave = (e: React.FormEvent) => {
      e.preventDefault();
      updateAcademySettings({ ...academyData, bankDetails: bankData });
      addToast('Configuración guardada exitosamente', 'success');
  };

  // --- RANK MANAGEMENT LOGIC (CRUD) ---

  const handleRankChange = (id: string, field: string, value: any) => {
      const updatedRanks = academyData.ranks.map(r => 
          r.id === id ? { ...r, [field]: value } : r
      );
      setAcademyData({ ...academyData, ranks: updatedRanks });
  };

  const handleAddRank = () => {
      const newOrder = academyData.ranks.length + 1;
      const newRank: Rank = {
          id: `rank-${Date.now()}`,
          name: `Grado ${newOrder}`,
          color: 'white',
          order: newOrder,
          requiredAttendance: 50 + (newOrder * 10)
      };
      setAcademyData({ ...academyData, ranks: [...academyData.ranks, newRank] });
      addToast('Nuevo grado agregado', 'info');
  };

  const handleDeleteRank = (id: string) => {
      if (academyData.ranks.length <= 1) {
          addToast('Debes mantener al menos un grado en la academia.', 'error');
          return;
      }

      setConfirmModal({
          isOpen: true,
          title: 'Eliminar Grado',
          message: '¿Estás seguro de eliminar este grado? Esta acción no se puede deshacer y reordenará los grados restantes.',
          action: () => {
              const filteredRanks = academyData.ranks.filter(r => r.id !== id);
              // Re-normalize order
              const orderedRanks = filteredRanks.map((r, index) => ({ ...r, order: index + 1 }));
              setAcademyData({ ...academyData, ranks: orderedRanks });
              setConfirmModal(prev => ({...prev, isOpen: false}));
              addToast('Grado eliminado. Guarda los cambios para confirmar.', 'success');
          }
      });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setProfileData(prev => ({ ...prev, avatarUrl: reader.result as string }));
              updateUserProfile({ avatarUrl: reader.result as string });
              addToast('Foto de perfil actualizada', 'success');
          };
          reader.readAsDataURL(file);
      }
  };
  const triggerFileInput = () => fileInputRef.current?.click();

  const copyCode = () => {
    navigator.clipboard.writeText(academySettings.code);
    addToast('Código copiado al portapapeles', 'success');
  };

  const beltColors: { value: RankColor; label: string; bg: string }[] = [
      { value: 'white', label: 'Blanco', bg: 'bg-gray-100' },
      { value: 'yellow', label: 'Amarillo', bg: 'bg-yellow-400' },
      { value: 'orange', label: 'Naranja', bg: 'bg-orange-500' },
      { value: 'green', label: 'Verde', bg: 'bg-green-600' },
      { value: 'blue', label: 'Azul', bg: 'bg-blue-600' },
      { value: 'purple', label: 'Morado', bg: 'bg-purple-600' },
      { value: 'brown', label: 'Marrón', bg: 'bg-amber-800' },
      { value: 'black', label: 'Negro', bg: 'bg-gray-900' },
  ];

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <ConfirmationModal 
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.action}
        onCancel={() => setConfirmModal(prev => ({...prev, isOpen: false}))}
        type="danger"
      />

      <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Configuración</h1>
          <p className="text-text-secondary mt-2">Gestiona tu perfil, preferencias y seguridad.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <nav className="lg:w-64 flex flex-col gap-1">
              {[
                  { id: 'profile', label: 'Perfil y Seguridad', icon: 'security' },
                  ...(currentUser?.role === 'master' ? [{ id: 'academy', label: 'Academia & Banco', icon: 'domain' }] : []),
                  { id: 'notifications', label: 'Notificaciones', icon: 'notifications' },
              ].map(item => (
                  <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${activeTab === item.id ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' : 'text-text-secondary hover:bg-white/50 hover:text-text-main'}`}>
                      <span className={`material-symbols-outlined text-[20px] ${activeTab === item.id ? 'filled' : ''}`}>{item.icon}</span>
                      {item.label}
                  </button>
              ))}
          </nav>

          <div className="flex-1">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                  <div className="flex flex-col gap-8">
                      {/* Public Profile Form */}
                       <form onSubmit={handleProfileSave} className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
                           <h3 className="text-lg font-bold text-text-main mb-6">Información Básica</h3>
                           <div className="flex items-center gap-6 mb-8">
                               <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                                   <img src={profileData.avatarUrl} className="size-24 rounded-full object-cover ring-4 ring-gray-50 bg-gray-100" />
                                   <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                                       <span className="material-symbols-outlined text-white">photo_camera</span>
                                   </div>
                               </div>
                               <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                               <button type="button" onClick={triggerFileInput} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">Cambiar Foto</button>
                           </div>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-text-main">Nombre</label>
                                    <input value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary focus:ring-primary" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-text-main">Email</label>
                                    <input value={profileData.email} disabled className="w-full rounded-xl border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed" />
                                </div>
                           </div>
                           <div className="mt-8 flex justify-end">
                                <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg hover:bg-primary-hover">Guardar Cambios</button>
                           </div>
                      </form>

                      {/* Password Form */}
                      <form onSubmit={handlePasswordChange} className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
                          <h3 className="text-lg font-bold text-text-main mb-6">Seguridad</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="space-y-2">
                                  <label className="text-sm font-semibold text-text-main">Nueva Contraseña</label>
                                  <input type="password" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:ring-primary" />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-sm font-semibold text-text-main">Confirmar Contraseña</label>
                                  <input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:ring-primary" />
                              </div>
                          </div>
                          <div className="mt-8 flex justify-end">
                                <button type="submit" className="px-6 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold shadow-lg hover:bg-black">Actualizar Contraseña</button>
                           </div>
                      </form>
                  </div>
              )}

              {/* Academy Tab */}
              {activeTab === 'academy' && currentUser?.role === 'master' && (
                  <form onSubmit={handleAcademySave} className="flex flex-col gap-8">
                      {/* Academy Code Section */}
                      <div className="bg-gradient-to-r from-primary to-blue-600 rounded-3xl p-8 text-white shadow-lg relative overflow-hidden group">
                        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div>
                                <h3 className="text-blue-100 font-bold text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-lg">vpn_key</span>
                                    Código de Vinculación
                                </h3>
                                <p className="text-white/90 text-sm max-w-md">
                                    Comparte este código con tus alumnos para que puedan registrarse y vincularse automáticamente a tu academia.
                                </p>
                            </div>
                            <div className="flex items-center gap-4 bg-white/10 p-2 pr-4 rounded-xl border border-white/20 backdrop-blur-sm">
                                <span className="text-4xl font-black tracking-widest font-mono pl-2">{academySettings.code}</span>
                                <button 
                                    type="button"
                                    onClick={copyCode}
                                    className="size-10 bg-white text-primary rounded-lg flex items-center justify-center hover:bg-blue-50 transition-colors shadow-sm"
                                    title="Copiar código"
                                >
                                    <span className="material-symbols-outlined">content_copy</span>
                                </button>
                            </div>
                        </div>
                        <div className="absolute -right-10 -bottom-10 opacity-10 rotate-12 pointer-events-none">
                             <span className="material-symbols-outlined text-[150px]">qr_code_2</span>
                        </div>
                      </div>

                      {/* General Info */}
                      <div className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
                          <h3 className="text-lg font-bold text-text-main mb-6">Configuración General</h3>
                          <div className="grid grid-cols-1 gap-6">
                              <div className="space-y-2">
                                  <label className="text-sm font-semibold text-text-main">Nombre de la Academia</label>
                                  <input value={academyData.name} onChange={e => setAcademyData({...academyData, name: e.target.value})} className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary focus:ring-primary" />
                              </div>
                              <div className="grid grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                      <label className="text-sm font-semibold text-text-main">Mensualidad Estándar ($)</label>
                                      <input type="number" value={academyData.paymentSettings.monthlyTuition} onChange={e => setAcademyData({...academyData, paymentSettings: {...academyData.paymentSettings, monthlyTuition: parseFloat(e.target.value)}})} className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary focus:ring-primary" />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-sm font-semibold text-text-main">Recargo por Retraso ($)</label>
                                      <input type="number" value={academyData.paymentSettings.lateFeeAmount} onChange={e => setAcademyData({...academyData, paymentSettings: {...academyData.paymentSettings, lateFeeAmount: parseFloat(e.target.value)}})} className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary focus:ring-primary" />
                                  </div>
                              </div>
                          </div>
                      </div>

                      {/* Bank Details */}
                      <div className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
                          <h3 className="text-lg font-bold text-text-main mb-6">Información Bancaria (Para Alumnos)</h3>
                          <div className="grid grid-cols-1 gap-6">
                              <div className="grid grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                      <label className="text-sm font-semibold text-text-main">Nombre del Banco</label>
                                      <input value={bankData.bankName} onChange={e => setBankData({...bankData, bankName: e.target.value})} className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary focus:ring-primary" placeholder="Ej. BBVA" />
                                  </div>
                                  <div className="space-y-2">
                                      <label className="text-sm font-semibold text-text-main">Beneficiario</label>
                                      <input value={bankData.accountHolder} onChange={e => setBankData({...bankData, accountHolder: e.target.value})} className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary focus:ring-primary" />
                                  </div>
                              </div>
                              <div className="space-y-2">
                                  <label className="text-sm font-semibold text-text-main">CLABE Interbancaria</label>
                                  <input value={bankData.clabe} onChange={e => setBankData({...bankData, clabe: e.target.value})} className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary focus:ring-primary" placeholder="18 dígitos" />
                              </div>
                              <div className="space-y-2">
                                  <label className="text-sm font-semibold text-text-main">Instrucciones Adicionales</label>
                                  <textarea value={bankData.instructions} onChange={e => setBankData({...bankData, instructions: e.target.value})} className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white focus:border-primary focus:ring-primary" placeholder="Ej. Enviar comprobante por WhatsApp..." rows={3} />
                              </div>
                          </div>
                      </div>

                      {/* RANK MANAGEMENT SYSTEM (CRUD) */}
                      <div className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
                          <div className="flex justify-between items-end mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-text-main">Gestión de Grados (Cinturones)</h3>
                                <p className="text-xs text-text-secondary mt-1">Configura el orden y requisitos de asistencia para ascender.</p>
                            </div>
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded font-bold uppercase">Impacta Dashboard</span>
                          </div>
                          
                          <div className="space-y-3">
                              <div className="grid grid-cols-12 gap-4 pb-2 border-b border-gray-100 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                  <div className="col-span-1 text-center">Orden</div>
                                  <div className="col-span-4">Nombre del Grado</div>
                                  <div className="col-span-3">Color</div>
                                  <div className="col-span-3">Asistencias</div>
                                  <div className="col-span-1"></div>
                              </div>

                              {academyData.ranks
                                .sort((a,b) => a.order - b.order)
                                .map((rank, idx) => (
                                  <div key={rank.id} className="grid grid-cols-12 gap-4 items-center group animate-in fade-in slide-in-from-left-2 duration-300">
                                      <div className="col-span-1 flex justify-center">
                                          <div className="size-8 rounded-full bg-gray-50 font-bold text-gray-500 flex items-center justify-center text-sm shadow-sm border border-gray-100">
                                              {idx + 1}
                                          </div>
                                      </div>
                                      <div className="col-span-4">
                                          <input 
                                            value={rank.name} 
                                            onChange={(e) => handleRankChange(rank.id, 'name', e.target.value)}
                                            className="w-full rounded-lg border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:bg-white focus:border-primary transition-all"
                                            placeholder="Nombre del grado"
                                          />
                                      </div>
                                      <div className="col-span-3">
                                          <select 
                                            value={rank.color}
                                            onChange={(e) => handleRankChange(rank.id, 'color', e.target.value)}
                                            className="w-full rounded-lg border-gray-200 bg-gray-50/50 px-2 py-2 text-sm focus:bg-white focus:border-primary transition-all"
                                          >
                                              {beltColors.map(c => (
                                                  <option key={c.value} value={c.value}>{c.label}</option>
                                              ))}
                                          </select>
                                      </div>
                                      <div className="col-span-3 relative">
                                          <input 
                                            type="number"
                                            min="0"
                                            value={rank.requiredAttendance} 
                                            onChange={(e) => handleRankChange(rank.id, 'requiredAttendance', parseInt(e.target.value))}
                                            className="w-full rounded-lg border-gray-200 bg-gray-50/50 px-3 py-2 text-sm focus:bg-white focus:border-primary text-center font-mono transition-all"
                                          />
                                          <span className="absolute right-3 top-2.5 text-xs text-gray-400 pointer-events-none">clases</span>
                                      </div>
                                      <div className="col-span-1 flex justify-end">
                                          <button 
                                            type="button" 
                                            onClick={() => handleDeleteRank(rank.id)}
                                            className="size-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                                            title="Eliminar grado"
                                          >
                                              <span className="material-symbols-outlined text-[18px]">delete</span>
                                          </button>
                                      </div>
                                  </div>
                              ))}
                          </div>

                          <button 
                            type="button" 
                            onClick={handleAddRank}
                            className="mt-6 w-full py-3 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center gap-2 text-text-secondary hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all group"
                          >
                              <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_circle</span>
                              <span className="font-semibold text-sm">Agregar Nuevo Grado</span>
                          </button>
                      </div>

                      <div className="flex justify-end pt-4">
                          <button type="submit" className="px-8 py-3 rounded-xl bg-primary text-white text-sm font-bold shadow-lg hover:bg-primary-hover transform transition-all active:scale-95">Guardar Configuración</button>
                      </div>
                  </form>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                  <div className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
                      <h3 className="text-lg font-bold text-text-main mb-6">Preferencias de Notificación</h3>
                      <div className="space-y-6">
                          {[
                              { key: 'payments', label: 'Alertas de Pago', desc: 'Recibe correos cuando un pago es aprobado o rechazado.' },
                              { key: 'attendance', label: 'Resumen de Asistencia', desc: 'Reporte semanal de tu progreso en el tatami.' },
                              { key: 'events', label: 'Nuevos Eventos', desc: 'Notificaciones sobre seminarios y exámenes próximos.' },
                              { key: 'newsletter', label: 'Boletín de la Academia', desc: 'Noticias y anuncios generales del equipo.' },
                          ].map((setting) => (
                              <div key={setting.key} className="flex items-center justify-between">
                                  <div>
                                      <p className="font-semibold text-text-main text-sm">{setting.label}</p>
                                      <p className="text-text-secondary text-xs">{setting.desc}</p>
                                  </div>
                                  <button 
                                      onClick={() => setNotifications(prev => ({ ...prev, [setting.key]: !prev[setting.key as keyof typeof notifications] }))}
                                      className={`w-12 h-7 rounded-full transition-colors relative ${notifications[setting.key as keyof typeof notifications] ? 'bg-primary' : 'bg-gray-200'}`}
                                  >
                                      <div className={`size-5 bg-white rounded-full shadow-sm absolute top-1 transition-transform ${notifications[setting.key as keyof typeof notifications] ? 'left-6' : 'left-1'}`}></div>
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default Settings;
