
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
        className="absolute inset-0 pointer-events-none z-0 opacity-40"
        style={{
            backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)',
            backgroundSize: '30px 30px'
        }}
      ></div>
      
      {/* Container */}
      <div className="w-full max-w-md bg-[#0D0D0D] border border-[#222222] p-12 relative z-10 shadow-2xl">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-10">
            <div className="size-14 bg-primary flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(249,115,22,0.4)]">
                <span className="font-black text-black text-3xl leading-none">A</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-white uppercase">Acceso</h1>
            <div className="h-1 w-12 bg-primary mt-4"></div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="space-y-2">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Credencial de Usuario</label>
                <div className="relative group">
                    <span className="absolute left-4 top-4 text-zinc-600 group-focus-within:text-primary transition-colors material-symbols-outlined text-[20px]">person</span>
                    <input 
                        type="email" 
                        required 
                        className="w-full border border-[#222] bg-black py-4 pl-12 pr-4 text-sm font-medium text-white transition-all placeholder-zinc-800 focus:border-primary focus:ring-0 outline-none" 
                        placeholder="ID O CORREO"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                </div>
            </div>
            
            <div className="space-y-2">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Clave de Acceso</label>
                <div className="relative group">
                    <span className="absolute left-4 top-4 text-zinc-600 group-focus-within:text-primary transition-colors material-symbols-outlined text-[20px]">lock</span>
                    <input 
                        type="password" 
                        required 
                        className="w-full border border-[#222] bg-black py-4 pl-12 pr-4 text-sm font-medium text-white transition-all placeholder-zinc-800 focus:border-primary focus:ring-0 outline-none" 
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                </div>
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-white hover:text-black text-black font-black py-5 shadow-lg transition-all flex items-center justify-center gap-3 mt-4 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-widest group"
            >
                {loading ? (
                    <span className="size-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                ) : (
                    <>
                        <span>Inicializar Sesión</span>
                        <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </>
                )}
            </button>
        </form>

        <div className="mt-10 pt-6 border-t border-[#222] text-center">
            <Link to="/role-selection" className="text-zinc-500 text-xs font-bold uppercase tracking-widest hover:text-primary transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-sm">app_registration</span>
                Registrar Nueva Cuenta
            </Link>
        </div>
      </div>
      
      <div className="absolute bottom-6 flex gap-8 text-[10px] font-bold uppercase tracking-widest text-zinc-700">
          <span>Secure Server</span>
          <span>v2.4.0 (Stable)</span>
          <span>AcademyPro Inc.</span>
      </div>
    </div>
  );
};

export default Login;
