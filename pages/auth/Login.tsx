
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
          const user = JSON.parse(localStorage.getItem('pulse_current_session') || '{}');
          if (user.role === 'master') navigate('/master/dashboard');
          else navigate('/student/dashboard');
      }
      setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden text-white">
      
      {/* TECHNICAL GRID BACKGROUND */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-20"
        style={{
            backgroundImage: 'linear-gradient(#27272a 1px, transparent 1px), linear-gradient(90deg, #27272a 1px, transparent 1px)',
            backgroundSize: '40px 40px'
        }}
      ></div>
      
      {/* AMBIENT GLOW */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Container Card */}
      <div className="w-full max-w-md bg-zinc-900/70 backdrop-blur-md border border-white/10 p-10 relative z-10 shadow-2xl shadow-black/50 rounded-3xl">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-10">
            <div className="size-14 bg-gradient-to-br from-primary to-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-primary/20 border border-white/10">
                <span className="font-black text-white text-3xl leading-none">A</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Bienvenido</h1>
            <p className="text-zinc-400 text-sm mt-2 font-medium">Ingresa tus credenciales para continuar.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Usuario</label>
                <div className="relative group">
                    <span className="absolute left-4 top-3.5 text-zinc-500 group-focus-within:text-primary transition-colors material-symbols-outlined text-[20px]">person</span>
                    <input 
                        type="email" 
                        required 
                        className="w-full rounded-lg bg-zinc-950/50 border border-zinc-800 py-3 pl-12 pr-4 text-sm font-medium text-white transition-all placeholder:text-zinc-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none" 
                        placeholder="ID o Correo electrónico"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                </div>
            </div>
            
            <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Contraseña</label>
                <div className="relative group">
                    <span className="absolute left-4 top-3.5 text-zinc-500 group-focus-within:text-primary transition-colors material-symbols-outlined text-[20px]">lock</span>
                    <input 
                        type="password" 
                        required 
                        className="w-full rounded-lg bg-zinc-950/50 border border-zinc-800 py-3 pl-12 pr-4 text-sm font-medium text-white transition-all placeholder:text-zinc-600 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none" 
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wide active:scale-[0.98]"
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
            <Link to="/role-selection" className="text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors flex items-center justify-center gap-2 group">
                <span className="material-symbols-outlined text-sm group-hover:text-primary transition-colors">app_registration</span>
                Crear una cuenta nueva
            </Link>
        </div>
      </div>
      
      <div className="absolute bottom-6 text-[10px] font-bold text-zinc-700 uppercase tracking-widest flex gap-4">
          <span>Secure Connection</span>
          <span>•</span>
          <span>AcademyPro Systems</span>
      </div>
    </div>
  );
};

export default Login;
