import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';

const Settings: React.FC = () => {
  const { currentUser, updateUserProfile } = useStore();
  const [profile, setProfile] = useState({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      password: '',
      avatarUrl: currentUser?.avatarUrl || ''
  });

  const handleSave = (e: React.FormEvent) => {
      e.preventDefault();
      updateUserProfile({
          name: profile.name,
          email: profile.email,
          avatarUrl: profile.avatarUrl
      });
      alert('Perfil actualizado correctamente. Los cambios son visibles en todo el sistema.');
  };

  const handleImageChange = () => {
      const url = prompt("Ingresa la URL de la nueva imagen (o usa un servicio como imgur):", profile.avatarUrl);
      if (url) {
          setProfile({...profile, avatarUrl: url});
      }
  };

  return (
    <div className="max-w-[1000px] mx-auto p-6 md:p-10">
      <h2 className="text-3xl font-bold tracking-tight text-text-main mb-8">Configuración de Cuenta</h2>

      <div className="space-y-6">
        <form onSubmit={handleSave} className="bg-surface-white rounded-3xl p-8 border border-gray-200 shadow-card">
            <h3 className="text-lg font-bold text-text-main mb-6">Perfil Público</h3>
            <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center gap-4">
                    <div className="relative group cursor-pointer" onClick={handleImageChange}>
                        <img src={profile.avatarUrl} alt="Profile" className="size-24 rounded-full object-cover ring-4 ring-gray-50" />
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="material-symbols-outlined text-white">edit</span>
                        </div>
                    </div>
                    <button type="button" onClick={handleImageChange} className="text-sm font-semibold text-primary hover:underline">Cambiar Avatar</button>
                </div>
                <div className="flex-1 grid grid-cols-1 gap-6">
                    <label className="block">
                        <span className="text-sm font-medium text-text-secondary mb-1.5 block">Nombre Completo</span>
                        <input 
                            type="text" 
                            value={profile.name} 
                            onChange={e => setProfile({...profile, name: e.target.value})}
                            className="w-full rounded-xl border-gray-200 text-sm py-2.5 focus:border-primary focus:ring-primary" 
                        />
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium text-text-secondary mb-1.5 block">Correo Electrónico</span>
                        <input 
                            type="email" 
                            value={profile.email} 
                            onChange={e => setProfile({...profile, email: e.target.value})}
                            className="w-full rounded-xl border-gray-200 text-sm py-2.5 focus:border-primary focus:ring-primary" 
                        />
                    </label>
                    <label className="block">
                        <span className="text-sm font-medium text-text-secondary mb-1.5 block">Contraseña</span>
                        <input 
                            type="password" 
                            placeholder="••••••••"
                            disabled
                            className="w-full rounded-xl border-gray-200 text-sm py-2.5 bg-gray-50 text-gray-400 cursor-not-allowed" 
                        />
                        <span className="text-xs text-text-secondary mt-1 block">Contacta a tu academia para restablecer la contraseña.</span>
                    </label>
                </div>
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                <button type="submit" className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-lg shadow-primary/20">
                    Guardar Cambios
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default Settings;