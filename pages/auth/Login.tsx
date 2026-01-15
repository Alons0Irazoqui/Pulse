import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';

const Login: React.FC = () => {
  const { login } = useStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      
      const success = await login(formData.email, formData.password);
      if (success) {
          // Retrieve user directly for instant redirect logic
          const user = JSON.parse(localStorage.getItem('pulse_current_session') || '{}');
          if (user.role === 'master') navigate('/master/dashboard');
          else navigate('/student/dashboard');
      }
      setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Ambience - Subtle Orange/Gray */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-orange-100/40 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-gray-200/40 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-gray-200/50 border border-gray-100 p-10 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-10">
            <div className="size-14 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mb-5 transform rotate-3">
                <span className="material-symbols-outlined text-3xl">school</span>
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Bienvenido</h1>
            <p className="text-gray-500 mt-2 text-sm font-medium">Inicia sesión en Academy Pro</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Correo Electrónico</label>
                <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-3.5 text-gray-400 group-focus-within:text-orange-500 transition-colors">mail</span>
                    <input 
                        type="email" 
                        required 
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" 
                        placeholder="usuario@ejemplo.com"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                </div>
            </div>
            <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Contraseña</label>
                <div className="relative group">
                    <span className="material-symbols-outlined absolute left-4 top-3.5 text-gray-400 group-focus-within:text-orange-500 transition-colors">lock</span>
                    <input 
                        type="password" 
                        required 
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-4 py-3.5 text-sm text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all outline-none" 
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading ? (
                    <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                    <>
                        <span>Iniciar Sesión</span>
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </>
                )}
            </button>
        </form>

        <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
                ¿No tienes cuenta? <Link to="/role-selection" className="text-orange-600 font-bold hover:text-orange-700 hover:underline transition-colors">Regístrate gratis</Link>
            </p>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-gray-400 font-medium relative z-10">© 2024 Academy Pro Systems.</p>
    </div>
  );
};

export default Login;