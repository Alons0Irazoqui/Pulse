import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useNavigate, Link } from 'react-router-dom';

const StudentRegistration: React.FC = () => {
  const { registerStudent } = useStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    academyCode: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      
      if (formData.password !== formData.confirmPassword) {
          alert("Las contraseñas no coinciden.");
          return;
      }

      setLoading(true);
      const success = await registerStudent({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          academyCode: formData.academyCode,
          password: formData.password
      });

      if (success) {
          alert('Cuenta creada exitosamente.');
          navigate('/student/dashboard');
      }
      setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="bg-background-light min-h-screen flex flex-col items-center justify-center p-6 font-display">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
        <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
             <h2 className="text-2xl font-bold text-text-main">Registro de Alumno</h2>
             <p className="text-text-secondary text-sm mt-1">Ingresa el código de tu academia para vincularte.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 flex flex-col gap-5">
            {/* Academy Link */}
            <div>
                <label className="text-sm font-bold text-text-main mb-1.5 block">Código de Academia</label>
                <div className="relative">
                    <span className="absolute left-4 top-3 text-gray-400 material-symbols-outlined text-[20px]">vpn_key</span>
                    <input name="academyCode" value={formData.academyCode} onChange={handleInputChange} className="w-full rounded-xl border-gray-200 pl-11 pr-4 py-3 text-sm focus:border-primary focus:ring-primary placeholder:text-gray-400" placeholder="Ej. ACAD-1234" required type="text"/>
                </div>
                <p className="text-xs text-text-secondary mt-1 ml-1">Solicita este código a tu maestro.</p>
            </div>

            {/* Personal Info */}
            <div className="flex flex-col gap-4">
                <div>
                    <label className="text-sm font-semibold text-text-main mb-1.5 block">Nombre Completo</label>
                    <input name="name" value={formData.name} onChange={handleInputChange} className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:border-primary focus:ring-primary" placeholder="Ej. Juan Pérez" required type="text"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-semibold text-text-main mb-1.5 block">Correo Electrónico</label>
                        <input name="email" value={formData.email} onChange={handleInputChange} className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:border-primary focus:ring-primary" placeholder="tu@email.com" required type="email"/>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-text-main mb-1.5 block">Teléfono</label>
                        <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:border-primary focus:ring-primary" placeholder="+52 ..." required type="tel"/>
                    </div>
                </div>
            </div>

            {/* Security */}
            <div className="flex flex-col gap-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-semibold text-text-main mb-1.5 block">Contraseña</label>
                        <input name="password" value={formData.password} onChange={handleInputChange} className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:border-primary focus:ring-primary" placeholder="••••••••" required type="password"/>
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-text-main mb-1.5 block">Confirmar Contraseña</label>
                        <input name="confirmPassword" value={formData.confirmPassword} onChange={handleInputChange} className="w-full rounded-xl border-gray-200 px-4 py-3 text-sm focus:border-primary focus:ring-primary" placeholder="••••••••" required type="password"/>
                    </div>
                </div>
            </div>

            <button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary-hover disabled:opacity-70 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-primary/30 transition-all mt-4">
                {loading ? 'Creando cuenta...' : 'Registrarme'}
            </button>
        </form>

        <div className="bg-gray-50 border-t border-gray-100 px-8 py-4 text-center">
            <p className="text-sm text-text-secondary">
                ¿Ya tienes cuenta? 
                <Link className="font-semibold text-primary hover:underline ml-1" to="/login">Inicia Sesión</Link>
            </p>
        </div>
      </div>
    </div>
  );
};

export default StudentRegistration;