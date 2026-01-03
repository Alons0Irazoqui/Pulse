import React, { useState, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';

const Settings: React.FC = () => {
  const { currentUser, academySettings, updateAcademySettings, updateUserProfile } = useStore();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'academy' | 'notifications' | 'billing'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Profile Form State
  const [profileData, setProfileData] = useState({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      bio: 'Martial arts enthusiast.',
      avatarUrl: currentUser?.avatarUrl || ''
  });

  // Academy Form State
  const [academyData, setAcademyData] = useState(academySettings);

  // Bank Data State
  const [bankData, setBankData] = useState(academySettings.bankDetails || {
      bankName: '', accountHolder: '', accountNumber: '', clabe: '', instructions: ''
  });

  // Notifications State
  const [notifications, setNotifications] = useState({
      payments: true,
      attendance: false,
      events: true,
      newsletter: false
  });

  const handleProfileSave = (e: React.FormEvent) => {
      e.preventDefault();
      updateUserProfile({ 
          name: profileData.name,
          avatarUrl: profileData.avatarUrl 
      });
      addToast('Perfil actualizado correctamente', 'success');
  };

  // REAL IMAGE UPLOAD LOGIC
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 2 * 1024 * 1024) {
              addToast('La imagen debe pesar menos de 2MB', 'error');
              return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
              const base64String = reader.result as string;
              setProfileData(prev => ({ ...prev, avatarUrl: base64String }));
              // Auto-save/Update context immediately for snappy feel
              updateUserProfile({ avatarUrl: base64String });
              addToast('Foto de perfil actualizada', 'success');
          };
          reader.readAsDataURL(file);
      }
  };

  const triggerFileInput = () => {
      fileInputRef.current?.click();
  };

  const handleAcademySave = (e: React.FormEvent) => {
      e.preventDefault();
      updateAcademySettings({
          ...academyData,
          bankDetails: bankData
      });
      addToast('Configuración de academia guardada', 'success');
  };

  const handleRankChange = (index: number, field: string, value: any) => {
      const newRanks = [...academyData.ranks];
      newRanks[index] = { ...newRanks[index], [field]: value };
      setAcademyData({ ...academyData, ranks: newRanks });
  };

  const copyCode = () => {
      navigator.clipboard.writeText(academySettings.code);
      addToast('Código copiado al portapapeles', 'success');
  };

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-text-main">Configuración</h1>
          <p className="text-text-secondary mt-2">Gestiona tu perfil, preferencias y seguridad.</p>
      </header>

      <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <nav className="lg:w-64 flex flex-col gap-1">
              {[
                  { id: 'profile', label: 'Perfil Público', icon: 'person' },
                  ...(currentUser?.role === 'master' ? [{ id: 'academy', label: 'Academia & Banco', icon: 'domain' }] : []),
                  { id: 'notifications', label: 'Notificaciones', icon: 'notifications' },
                  ...(currentUser?.role === 'student' ? [{ id: 'billing', label: 'Historial', icon: 'history' }] : []),
              ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id as any)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        activeTab === item.id 
                        ? 'bg-white text-primary shadow-sm ring-1 ring-black/5' 
                        : 'text-text-secondary hover:bg-white/50 hover:text-text-main'
                    }`}
                  >
                      <span className={`material-symbols-outlined text-[20px] ${activeTab === item.id ? 'filled' : ''}`}>{item.icon}</span>
                      {item.label}
                  </button>
              ))}
          </nav>

          {/* Content Area */}
          <div className="flex-1">
              {activeTab === 'profile' && (
                  <form onSubmit={handleProfileSave} className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
                       <h3 className="text-lg font-bold text-text-main mb-6">Información Básica</h3>
                       
                       {/* Avatar Uploader */}
                       <div className="flex items-center gap-6 mb-8">
                           <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                               <img src={profileData.avatarUrl} alt="Profile" className="size-24 rounded-full object-cover ring-4 ring-gray-50 bg-gray-100" />
                               <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-[2px]">
                                   <span className="material-symbols-outlined text-white">photo_camera</span>
                               </div>
                           </div>
                           <div>
                               <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleImageUpload} 
                                    className="hidden" 
                                    accept="image/png, image/jpeg, image/jpg"
                               />
                               <button type="button" onClick={triggerFileInput} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                                   Cambiar Foto
                               </button>
                               <p className="text-xs text-text-secondary mt-2">JPG o PNG. Máx 2MB.</p>
                           </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main">Nombre</label>
                                <input value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-text-main">Email</label>
                                <input value={profileData.email} disabled className="w-full rounded-xl border-gray-200 bg-gray-100 px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed" />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold text-text-main">Bio</label>
                                <textarea value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} className="w-full rounded-xl border-gray-200 bg-gray-50/50 px-4 py-2.5 text-sm focus:bg-white transition-colors focus:ring-2 focus:ring-primary/20 focus:border-primary" rows={3} />
                            </div>
                       </div>
                       <div className="mt-8 flex justify-end">
                            <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/25 hover:bg-primary-hover transition-colors active:scale-95 transform">
                                Guardar Cambios
                            </button>
                       </div>
                  </form>
              )}

              {activeTab === 'academy' && currentUser?.role === 'master' && (
                  <form onSubmit={handleAcademySave} className="flex flex-col gap-8">
                      {/* Academy Code Banner */}
                      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                          <div>
                              <h3 className="text-lg font-bold text-blue-900">Código de Academia</h3>
                              <p className="text-sm text-blue-700">Comparte este código con tus alumnos para que puedan registrarse.</p>
                          </div>
                          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-blue-200 shadow-sm">
                              <span className="font-mono text-xl font-bold text-blue-600 tracking-wider">{academySettings.code}</span>
                              <button type="button" onClick={copyCode} className="text-gray-400 hover:text-blue-600 transition-colors">
                                  <span className="material-symbols-outlined text-lg">content_copy</span>
                              </button>
                          </div>
                      </div>

                      {/* Bank Details Section */}
                      <div className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
                          <h3 className="text-lg font-bold text-text-main mb-2">Datos Bancarios para Depósitos</h3>
                          <p className="text-sm text-text-secondary mb-6">Esta información será visible para tus alumnos al momento de realizar pagos.</p>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="text-sm font-semibold text-text-main block mb-2">Nombre del Banco</label>
                                  <input 
                                    value={bankData.bankName} 
                                    onChange={e => setBankData({...bankData, bankName: e.target.value})} 
                                    className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:ring-primary"
                                    placeholder="Ej. BBVA, Santander"
                                  />
                              </div>
                              <div>
                                  <label className="text-sm font-semibold text-text-main block mb-2">Titular de la Cuenta</label>
                                  <input 
                                    value={bankData.accountHolder} 
                                    onChange={e => setBankData({...bankData, accountHolder: e.target.value})} 
                                    className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:ring-primary"
                                    placeholder="Nombre completo o Razón Social"
                                  />
                              </div>
                              <div>
                                  <label className="text-sm font-semibold text-text-main block mb-2">Número de Cuenta</label>
                                  <input 
                                    value={bankData.accountNumber} 
                                    onChange={e => setBankData({...bankData, accountNumber: e.target.value})} 
                                    className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:ring-primary"
                                  />
                              </div>
                              <div>
                                  <label className="text-sm font-semibold text-text-main block mb-2">CLABE Interbancaria</label>
                                  <input 
                                    value={bankData.clabe} 
                                    onChange={e => setBankData({...bankData, clabe: e.target.value})} 
                                    className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:ring-primary"
                                    placeholder="18 dígitos"
                                  />
                              </div>
                              <div className="md:col-span-2">
                                  <label className="text-sm font-semibold text-text-main block mb-2">Instrucciones Adicionales</label>
                                  <textarea 
                                    value={bankData.instructions} 
                                    onChange={e => setBankData({...bankData, instructions: e.target.value})} 
                                    className="w-full rounded-xl border-gray-200 px-4 py-2.5 text-sm focus:border-primary focus:ring-primary"
                                    rows={2}
                                    placeholder="Ej. En el concepto pon tu nombre y mes."
                                  />
                              </div>
                          </div>
                      </div>

                      {/* Rank Configuration */}
                      <div className="bg-white rounded-3xl p-8 shadow-card border border-gray-100">
                          <h3 className="text-lg font-bold text-text-main mb-2">Sistema de Grados</h3>
                          <p className="text-sm text-text-secondary mb-6">Configura los requisitos de asistencia para cada cinturón.</p>
                          
                          <div className="space-y-4">
                              {academyData.ranks.map((rank, index) => (
                                  <div key={rank.id} className="flex flex-col md:flex-row gap-4 items-start md:items-center p-4 bg-gray-50 rounded-xl border border-gray-200">
                                      <div className={`size-8 rounded-full shadow-sm ring-2 ring-white shrink-0`} style={{ backgroundColor: rank.color }}></div>
                                      <div className="flex-1 grid grid-cols-2 gap-4 w-full">
                                          <div>
                                              <label className="text-xs font-semibold text-text-secondary">Nombre del Grado</label>
                                              <input 
                                                value={rank.name} 
                                                onChange={e => handleRankChange(index, 'name', e.target.value)}
                                                className="w-full mt-1 rounded-lg border-gray-300 text-sm py-1.5 focus:border-primary focus:ring-primary" 
                                              />
                                          </div>
                                          <div>
                                              <label className="text-xs font-semibold text-text-secondary">Clases Requeridas</label>
                                              <input 
                                                type="number"
                                                value={rank.requiredAttendance} 
                                                onChange={e => handleRankChange(index, 'requiredAttendance', parseInt(e.target.value))}
                                                className="w-full mt-1 rounded-lg border-gray-300 text-sm py-1.5 focus:border-primary focus:ring-primary" 
                                              />
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>

                      <div className="flex justify-end">
                            <button type="submit" className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/25 hover:bg-primary-hover transition-colors">Guardar Todo</button>
                       </div>
                  </form>
              )}

              {activeTab === 'notifications' && (
                  <div className="bg-white rounded-3xl p-8 shadow-card border border-gray-100 animate-fadeIn">
                      <h3 className="text-lg font-bold text-text-main mb-2">Preferencias de Alertas</h3>
                      <p className="text-sm text-text-secondary mb-6">Personaliza qué notificaciones deseas recibir.</p>

                      <div className="space-y-1">
                          {[
                              { key: 'payments', label: 'Alertas de Pagos', desc: 'Recibe avisos cuando se registren pagos exitosos o pendientes.' },
                              { key: 'attendance', label: 'Recordatorios de Asistencia', desc: 'Alertas semanales sobre el progreso de asistencia.' },
                              { key: 'events', label: 'Eventos y Exámenes', desc: 'Notificaciones sobre nuevos eventos o fechas de examen.' },
                              { key: 'newsletter', label: 'Boletín de la Academia', desc: 'Novedades y noticias generales del dojo.' }
                          ].map((item) => (
                              <label key={item.key} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
                                  <div className="flex flex-col">
                                      <span className="text-sm font-semibold text-text-main">{item.label}</span>
                                      <span className="text-xs text-text-secondary group-hover:text-text-main transition-colors">{item.desc}</span>
                                  </div>
                                  <div className="relative inline-block w-12 h-6 align-middle select-none transition duration-200 ease-in">
                                      <input 
                                        type="checkbox" 
                                        checked={notifications[item.key as keyof typeof notifications]}
                                        onChange={() => setNotifications({...notifications, [item.key]: !notifications[item.key as keyof typeof notifications]})}
                                        className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 right-6 checked:border-primary transition-all duration-300"
                                      />
                                      <label className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer transition-colors ${notifications[item.key as keyof typeof notifications] ? 'bg-primary' : 'bg-gray-300'}`}></label>
                                  </div>
                              </label>
                          ))}
                      </div>
                      <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                          <button onClick={() => addToast('Preferencias actualizadas', 'info')} className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold shadow-lg shadow-primary/25">Guardar Preferencias</button>
                      </div>
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};

export default Settings;