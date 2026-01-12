
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
      
      {/* Background Ambience: Subtle Radial Orange */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>
      
      {/* Glassmorphism Card */}
      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-2xl p-10 relative z-10 shadow-2xl">
        <div className="flex flex-col items-center mb-8">
            <div className="size-12 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)] mb-6">
                <span className="font-black text-black text-2xl leading-none">A</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Bienvenido</h1>
            <p className="text-zinc-400 mt-2 text-sm font-medium">Inicia sesión en AcademyPro</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Correo Electrónico</label>
                <input 
                    type="email" 
                    required 
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-sm transition-all text-white placeholder-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                    placeholder="usuario@ejemplo.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                />
            </div>
            <div className="space-y-2">
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Contraseña</label>
                <input 
                    type="password" 
                    required 
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3.5 text-sm transition-all text-white placeholder-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none" 
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-orange-500 text-black font-black py-4 rounded-xl shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm uppercase tracking-wide"
            >
                {loading ? (
                    <span className="size-5 border-2 border-black/30 border-t-black rounded-full animate-spin"></span>
                ) : (
                    <>
                        <span>Ingresar al Portal</span>
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </>
                )}
            </button>
        </form>

        <div className="mt-8 text-center text-sm text-zinc-500">
            ¿No tienes cuenta? <Link to="/role-selection" className="text-white font-bold hover:text-primary transition-colors ml-1">Crear Cuenta</Link>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-zinc-600 relative z-10 font-medium">© 2024 AcademyPro Systems. Enterprise Security.</p>
    </div>
  );
};

export default Login;
