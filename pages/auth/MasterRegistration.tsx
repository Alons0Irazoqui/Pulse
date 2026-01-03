import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';

const MasterRegistration: React.FC = () => {
  const { registerMaster } = useStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    academyName: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
        alert("Las contraseñas no coinciden.");
        return;
    }

    setLoading(true);
    const success = await registerMaster({
        name: formData.name,
        email: formData.email,
        academyName: formData.academyName,
        password: formData.password
    });

    if (success) {
        alert("Academia creada exitosamente. Bienvenido Sensei.");
        navigate('/master/dashboard');
    }
    setLoading(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className="min-h-screen bg-background-light flex flex-col items-center justify-center p-6 font-display">
      <div className="w-full max-w-[520px] bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
          
          <div className="px-8 pt-10 pb-6 text-center">
            <h1 className="text-text-main text-3xl font-bold leading-tight tracking-tight mb-3">
                Comienza tu legado
            </h1>
            <p className="text-text-secondary text-base font-normal leading-relaxed max-w-[400px] mx-auto">
                Crea tu perfil de maestro y registra tu academia.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="px-8 pb-10 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-text-main text-sm font-semibold" htmlFor="name">Nombre del Maestro</label>
              <input id="name" value={formData.name} onChange={handleChange} className="w-full rounded-lg border-gray-200 focus:border-primary focus:ring-primary px-4 py-3" placeholder="Ej. Sensei Alejandro" type="text" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-text-main text-sm font-semibold" htmlFor="email">Correo electrónico</label>
              <input id="email" type="email" value={formData.email} onChange={handleChange} className="w-full rounded-lg border-gray-200 focus:border-primary focus:ring-primary px-4 py-3" placeholder="ejemplo@academia.com" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-text-main text-sm font-semibold" htmlFor="academyName">Nombre de la Academia</label>
              <input id="academyName" value={formData.academyName} onChange={handleChange} className="w-full rounded-lg border-gray-200 focus:border-primary focus:ring-primary px-4 py-3" placeholder="Ej. Academia Cobra Kai" type="text" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-text-main text-sm font-semibold" htmlFor="password">Contraseña</label>
                    <input id="password" value={formData.password} onChange={handleChange} className="w-full rounded-lg border-gray-200 focus:border-primary focus:ring-primary px-4 py-3" placeholder="••••••••" type="password" required />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-text-main text-sm font-semibold" htmlFor="confirmPassword">Confirmar</label>
                    <input id="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full rounded-lg border-gray-200 focus:border-primary focus:ring-primary px-4 py-3" placeholder="••••••••" type="password" required />
                </div>
            </div>

            <div className="flex items-start gap-3 mt-2">
              <input id="termsAccepted" type="checkbox" checked={formData.termsAccepted} onChange={handleChange} className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" required />
              <label className="text-sm text-text-secondary leading-snug cursor-pointer" htmlFor="termsAccepted">
                  Acepto los <span className="text-primary font-bold">Términos de Servicio</span> y la Política de Privacidad.
              </label>
            </div>

            <button type="submit" disabled={!formData.termsAccepted || loading} className="mt-2 w-full rounded-lg bg-primary py-3.5 px-4 text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary-hover disabled:opacity-50 transition-all">
              {loading ? 'Registrando...' : 'Crear mi Academia'}
            </button>
          </form>

          <div className="bg-gray-50 border-t border-gray-100 px-8 py-5 text-center">
            <p className="text-sm text-text-secondary">
                ¿Ya tienes una cuenta? 
                <Link className="font-bold text-primary hover:underline ml-1" to="/login">Inicia Sesión</Link>
            </p>
          </div>
        </div>
    </div>
  );
};

export default MasterRegistration;