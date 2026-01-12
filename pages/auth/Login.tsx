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
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-200/40 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-indigo-200/40 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md glass-card rounded-3xl p-10 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-8">
            <div className="size-14 bg-gradient-to-br from-primary to-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-5">
                <span className="material-symbols-outlined text-3xl">ecg_heart</span>
            </div>
            <h1 className="text-3xl font-bold text-text-main tracking-tight">Bienvenido</h1>
            <p className="text-text-secondary mt-1">Inicia sesión en tu cuenta Pulse</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Correo Electrónico</label>
                <input 
                    type="email" 
                    required 
                    className="w-full rounded-2xl border-gray-200 bg-white/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 px-5 py-3.5 text-sm transition-all" 
                    placeholder="usuario@ejemplo.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                />
            </div>
            <div className="space-y-1.5">
                <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider ml-1">Contraseña</label>
                <input 
                    type="password" 
                    required 
                    className="w-full rounded-2xl border-gray-200 bg-white/50 focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 px-5 py-3.5 text-sm transition-all" 
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/25 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
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

        <div className="mt-8 text-center text-sm text-text-secondary">
            ¿No tienes cuenta? <Link to="/role-selection" className="text-primary font-bold hover:text-blue-700 transition-colors">Regístrate gratis</Link>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-text-secondary/50 relative z-10">© 2024 Pulse Academy Systems. Secure Login.</p>
    </div>
  );
};

export default Login;