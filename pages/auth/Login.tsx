
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { motion } from 'framer-motion';

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
          const user = JSON.parse(localStorage.getItem('pulse_current_session') || '{}');
          if (user.role === 'master') navigate('/master/dashboard');
          else navigate('/student/dashboard');
      }
      setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden text-white selection:bg-primary/30">
      
      {/* Botón Volver Minimalista */}
      <Link 
        to="/" 
        className="absolute top-8 left-8 z-50 flex items-center justify-center size-10 rounded-full bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all group backdrop-blur-md border border-white/5"
      >
        <span className="material-symbols-outlined text-xl group-hover:-translate-x-0.5 transition-transform">arrow_back_ios_new</span>
      </Link>

      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/20 rounded-full blur-[150px] mix-blend-screen opacity-40"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-900/20 rounded-full blur-[150px] mix-blend-screen opacity-40"></div>
      </div>

      {/* Login Card - Apple Glass */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-[420px] apple-glass p-10 relative z-10 rounded-3xl shadow-2xl"
      >
        
        <div className="flex flex-col items-center mb-10 text-center">
            <div className="size-14 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center mb-6 shadow-lg shadow-primary/30">
                <span className="font-bold text-white text-2xl">A</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Bienvenido</h1>
            <p className="text-zinc-400 text-sm mt-2 font-medium">Ingresa tus credenciales para continuar.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Correo Electrónico</label>
                <div className="relative group">
                    <span className="absolute left-4 top-3.5 text-zinc-500 group-focus-within:text-primary transition-colors material-symbols-outlined text-[20px]">mail</span>
                    <input 
                        type="email" 
                        required 
                        className="w-full rounded-xl bg-black/40 border border-zinc-800 py-3.5 pl-12 pr-4 text-sm text-white transition-all placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                        placeholder="usuario@academy.pro"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                </div>
            </div>
            
            <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider ml-1">Contraseña</label>
                <div className="relative group">
                    <span className="absolute left-4 top-3.5 text-zinc-500 group-focus-within:text-primary transition-colors material-symbols-outlined text-[20px]">lock_open</span>
                    <input 
                        type="password" 
                        required 
                        className="w-full rounded-xl bg-black/40 border border-zinc-800 py-3.5 pl-12 pr-4 text-sm text-white transition-all placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/25 transition-all flex items-center justify-center gap-2 mt-6 disabled:opacity-50 disabled:cursor-not-allowed text-sm active:scale-[0.98]"
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

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
            <Link to="/role-selection" className="text-zinc-500 text-xs font-medium hover:text-white transition-colors flex items-center justify-center gap-1.5 group">
                ¿No tienes cuenta? <span className="text-primary group-hover:underline">Regístrate aquí</span>
            </Link>
        </div>
      </motion.div>
      
      <div className="absolute bottom-8 text-[10px] font-bold text-zinc-800 uppercase tracking-widest flex gap-4 pointer-events-none">
          <span>Secured by Pulse</span>
          <span>•</span>
          <span>AcademyPro v2.0</span>
      </div>
    </div>
  );
};

export default Login;
