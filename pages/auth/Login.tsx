
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
      
      <div className="w-full max-w-sm animate-in fade-in zoom-in-95 duration-500">
        <div className="flex flex-col items-center mb-12">
            {/* IKC Logo */}
            <div className="mb-2">
                <h1 className="text-6xl font-black text-primary tracking-tighter leading-none">IKC</h1>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400">Irazoqui Karate Club</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600 uppercase ml-1 mb-1">Usuario</label>
                <input 
                    type="email" 
                    required 
                    className="w-full rounded-lg bg-gray-100 px-4 py-4 text-sm text-gray-900 font-medium placeholder:text-gray-400 focus:bg-white transition-all" 
                    placeholder="correo@ejemplo.com"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                />
            </div>
            <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-600 uppercase ml-1 mb-1">Contraseña</label>
                <input 
                    type="password" 
                    required 
                    className="w-full rounded-lg bg-gray-100 px-4 py-4 text-sm text-gray-900 font-medium placeholder:text-gray-400 focus:bg-white transition-all" 
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-primary hover:bg-red-700 text-white font-bold py-4 rounded-lg transition-all mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading ? 'Accediendo...' : 'Iniciar Sesión'}
            </button>
        </form>

        <div className="mt-10 text-center">
            <p className="text-sm text-gray-500">
                ¿Nuevo ingreso? <Link to="/role-selection" className="text-primary font-bold hover:underline transition-colors">Crear cuenta</Link>
            </p>
        </div>
      </div>
      
      <p className="fixed bottom-6 text-xs text-gray-300 font-medium">IKC Management System v2.0</p>
    </div>
  );
};

export default Login;
