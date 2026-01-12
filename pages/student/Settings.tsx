
import React, { useState, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { useToast } from '../../context/ToastContext';
import EmergencyCard from '../../components/ui/EmergencyCard';
import Avatar from '../../components/ui/Avatar';

const Settings: React.FC = () => {
  const { currentUser, students, updateUserProfile, changePassword } = useStore();
  const { addToast } = useToast();
  
  // --- STATE ---
  const [activeTab, setActiveTab] = useState<'profile' | 'emergency'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const student = students.find(s => s.id === currentUser?.studentId);

  const [profileData, setProfileData] = useState({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      avatarUrl: currentUser?.avatarUrl || ''
  });

  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

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

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-10 pb-24 text-gray-200">
      
      <div className="flex flex-col md:flex-row gap-10">
          {/* Sidebar Nav */}
          <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
              <h2 className="text-2xl font-bold text-white px-2 mb-4">Ajustes</h2>
              <button onClick={() => setActiveTab('profile')} className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'profile' ? 'bg-[#2a2a2a] text-white border border-[#404040]' : 'text-gray-500 hover:text-white'}`}>
                  Perfil y Seguridad
              </button>
              {student && (
                  <button onClick={() => setActiveTab('emergency')} className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${activeTab === 'emergency' ? 'bg-[#2a2a2a] text-white border border-[#404040]' : 'text-gray-500 hover:text-white'}`}>
                      Contacto Emergencia
                  </button>
              )}
          </div>

          <div className="flex-1 min-w-0 space-y-10">
              
              {/* --- PROFILE TAB --- */}
              {activeTab === 'profile' && (
                  <>
                      {/* Identity Section */}
                      <section>
                          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Identidad</h3>
                          <div className="flex items-start gap-6">
                              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                  <Avatar src={profileData.avatarUrl} name={profileData.name} className="size-20 rounded-full text-2xl bg-[#2a2a2a] ring-2 ring-[#404040]" />
                                  <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <span className="material-symbols-outlined text-white text-sm">edit</span>
                                  </div>
                                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                              </div>
                              <form onSubmit={handleProfileSave} className="flex-1 grid grid-cols-1 gap-4">
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Nombre Público</label>
                                      <input value={profileData.name} onChange={e => setProfileData({...profileData, name: e.target.value})} className="w-full bg-[#18181b] border border-[#333] rounded-lg px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none transition-colors" />
                                  </div>
                                  <div>
                                      <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Email (Login)</label>
                                      <input value={profileData.email} disabled className="w-full bg-[#121212] border border-[#252525] rounded-lg px-4 py-2.5 text-sm text-gray-500 cursor-not-allowed" />
                                  </div>
                                  <div className="flex justify-end">
                                      <button type="submit" className="bg-white text-black text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-lg hover:bg-gray-200 transition-colors">Guardar Perfil</button>
                                  </div>
                              </form>
                          </div>
                      </section>

                      {/* Security Section */}
                      <section className="pt-6 border-t border-[#333]">
                          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Seguridad</h3>
                          <form onSubmit={handlePasswordChange} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Nueva Contraseña</label>
                                  <input type="password" value={passwords.new} onChange={e => setPasswords({...passwords, new: e.target.value})} className="w-full bg-[#18181b] border border-[#333] rounded-lg px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none transition-colors" placeholder="••••••" />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">Confirmar</label>
                                  <input type="password" value={passwords.confirm} onChange={e => setPasswords({...passwords, confirm: e.target.value})} className="w-full bg-[#18181b] border border-[#333] rounded-lg px-4 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none transition-colors" placeholder="••••••" />
                              </div>
                              <div className="md:col-span-2 flex justify-end mt-2">
                                  <button type="submit" className="bg-[#2a2a2a] border border-[#404040] text-gray-300 text-xs font-bold uppercase tracking-wider px-6 py-2.5 rounded-lg hover:bg-[#333] hover:text-white transition-colors">Actualizar Password</button>
                              </div>
                          </form>
                      </section>
                  </>
              )}

              {/* --- EMERGENCY TAB --- */}
              {activeTab === 'emergency' && student && (
                  <section>
                      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-6">Información de Contacto</h3>
                      {/* Reuse Emergency Card but wrap it to blend with dark theme if needed, or rely on its internal styles if updated globally. 
                          Assuming EmergencyCard needs dark mode update or wrapper. 
                          For now, we render it as is, but ideally it should be updated to dark theme too. 
                      */}
                      <div className="bg-[#2a2a2a] border border-[#404040] rounded-xl overflow-hidden">
                          <EmergencyCard student={student} />
                      </div>
                      <p className="text-xs text-gray-500 mt-4 text-center">Para actualizar estos datos, contacta a la administración.</p>
                  </section>
              )}
          </div>
      </div>
    </div>
  );
};

export default Settings;
