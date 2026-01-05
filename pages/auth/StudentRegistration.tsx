import React from 'react';
import { useStore } from '../../context/StoreContext';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentRegistrationSchema, StudentRegistrationForm } from '../../schemas/authSchemas';

const StudentRegistration: React.FC = () => {
  const { registerStudent } = useStore();
  const navigate = useNavigate();
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    setError
  } = useForm<StudentRegistrationForm>({
    resolver: zodResolver(studentRegistrationSchema)
  });

  const onSubmit = async (data: StudentRegistrationForm) => {
      const success = await registerStudent({
          name: data.name,
          email: data.email,
          phone: data.phone,
          academyCode: data.academyCode,
          password: data.password
      });

      if (success) {
          navigate('/student/dashboard');
      } else {
          // General fallback error if context doesn't throw specific field errors
          setError("root", { message: "Error al registrar. Verifica el código de academia." });
      }
  };

  return (
    <div className="bg-background-light min-h-screen flex flex-col items-center justify-center p-6 font-display">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
        <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
             <h2 className="text-2xl font-bold text-text-main">Registro de Alumno</h2>
             <p className="text-text-secondary text-sm mt-1">Ingresa el código de tu academia para vincularte.</p>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-8 flex flex-col gap-5">
            {/* Academy Link */}
            <div>
                <label className="text-sm font-bold text-text-main mb-1.5 block">Código de Academia</label>
                <div className="relative">
                    <span className="absolute left-4 top-3 text-gray-400 material-symbols-outlined text-[20px]">vpn_key</span>
                    <input 
                        {...register('academyCode')}
                        className={`w-full rounded-xl border pl-11 pr-4 py-3 text-sm focus:ring-primary placeholder:text-gray-400 transition-colors ${errors.academyCode ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-primary'}`}
                        placeholder="Ej. ACAD-1234" 
                        type="text"
                    />
                </div>
                {errors.academyCode && <p className="text-xs text-red-500 mt-1 font-medium">{errors.academyCode.message}</p>}
                <p className="text-xs text-text-secondary mt-1 ml-1">Solicita este código a tu maestro.</p>
            </div>

            {/* Personal Info */}
            <div className="flex flex-col gap-4">
                <div>
                    <label className="text-sm font-semibold text-text-main mb-1.5 block">Nombre Completo</label>
                    <input 
                        {...register('name')}
                        className={`w-full rounded-xl border px-4 py-3 text-sm focus:ring-primary transition-colors ${errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-primary'}`}
                        placeholder="Ej. Juan Pérez" 
                        type="text"
                    />
                    {errors.name && <p className="text-xs text-red-500 mt-1 font-medium">{errors.name.message}</p>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-semibold text-text-main mb-1.5 block">Correo Electrónico</label>
                        <input 
                            {...register('email')}
                            className={`w-full rounded-xl border px-4 py-3 text-sm focus:ring-primary transition-colors ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-primary'}`}
                            placeholder="tu@email.com" 
                            type="email"
                        />
                        {errors.email && <p className="text-xs text-red-500 mt-1 font-medium">{errors.email.message}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-text-main mb-1.5 block">Teléfono</label>
                        <input 
                            {...register('phone')}
                            className={`w-full rounded-xl border px-4 py-3 text-sm focus:ring-primary transition-colors ${errors.phone ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-primary'}`}
                            placeholder="+52 ..." 
                            type="tel"
                        />
                        {errors.phone && <p className="text-xs text-red-500 mt-1 font-medium">{errors.phone.message}</p>}
                    </div>
                </div>
            </div>

            {/* Security */}
            <div className="flex flex-col gap-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-semibold text-text-main mb-1.5 block">Contraseña</label>
                        <input 
                            {...register('password')}
                            className={`w-full rounded-xl border px-4 py-3 text-sm focus:ring-primary transition-colors ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-primary'}`}
                            placeholder="••••••••" 
                            type="password"
                        />
                        {errors.password && <p className="text-xs text-red-500 mt-1 font-medium">{errors.password.message}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-semibold text-text-main mb-1.5 block">Confirmar Contraseña</label>
                        <input 
                            {...register('confirmPassword')}
                            className={`w-full rounded-xl border px-4 py-3 text-sm focus:ring-primary transition-colors ${errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-primary'}`}
                            placeholder="••••••••" 
                            type="password"
                        />
                        {errors.confirmPassword && <p className="text-xs text-red-500 mt-1 font-medium">{errors.confirmPassword.message}</p>}
                    </div>
                </div>
            </div>

            {errors.root && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">error</span>
                    {errors.root.message}
                </div>
            )}

            <button type="submit" disabled={isSubmitting} className="w-full bg-primary hover:bg-primary-hover disabled:opacity-70 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-primary/30 transition-all mt-4 flex items-center justify-center gap-2">
                {isSubmitting && <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
                {isSubmitting ? 'Creando cuenta...' : 'Registrarme'}
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