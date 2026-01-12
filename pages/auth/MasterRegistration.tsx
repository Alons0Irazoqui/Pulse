
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { masterRegistrationSchema, MasterRegistrationForm } from '../../schemas/authSchemas';
import { PulseService } from '../../services/pulseService';

const MasterRegistration: React.FC = () => {
  const { registerMaster } = useStore();
  const navigate = useNavigate();
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors, isSubmitting },
    setError
  } = useForm<MasterRegistrationForm>({
    resolver: zodResolver(masterRegistrationSchema),
    defaultValues: {
      termsAccepted: false
    }
  });

  const onSubmit = async (data: MasterRegistrationForm) => {
    // SECURITY CHECK: Global Email Uniqueness
    if (PulseService.checkEmailExists(data.email)) {
        setError("email", { type: "manual", message: "Este correo electrónico ya está registrado en la plataforma." });
        return;
    }

    const success = await registerMaster({
        name: data.name,
        email: data.email,
        academyName: data.academyName,
        password: data.password
    });

    if (success) {
        alert("Academia creada exitosamente. Bienvenido Sensei.");
        navigate('/master/dashboard');
    } else {
        setError("root", { message: "Error al registrar la academia. El correo podría estar en uso." });
    }
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

          <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-10 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-text-main text-sm font-semibold" htmlFor="name">Nombre del Maestro</label>
              <input 
                id="name" 
                {...register('name')}
                className={`w-full rounded-lg border px-4 py-3 focus:ring-primary transition-colors ${errors.name ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-primary'}`}
                placeholder="Ej. Sensei Alejandro" 
                type="text" 
              />
              {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-text-main text-sm font-semibold" htmlFor="email">Correo electrónico</label>
              <input 
                id="email" 
                {...register('email')}
                className={`w-full rounded-lg border px-4 py-3 focus:ring-primary transition-colors ${errors.email ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-primary'}`}
                placeholder="ejemplo@academia.com" 
                type="email"
              />
              {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-text-main text-sm font-semibold" htmlFor="academyName">Nombre de la Academia</label>
              <input 
                id="academyName" 
                {...register('academyName')}
                className={`w-full rounded-lg border px-4 py-3 focus:ring-primary transition-colors ${errors.academyName ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-primary'}`}
                placeholder="Ej. Academia Cobra Kai" 
                type="text" 
              />
              {errors.academyName && <p className="text-xs text-red-500 font-medium">{errors.academyName.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-text-main text-sm font-semibold" htmlFor="password">Contraseña</label>
                    <input 
                        id="password" 
                        {...register('password')}
                        className={`w-full rounded-lg border px-4 py-3 focus:ring-primary transition-colors ${errors.password ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-primary'}`}
                        placeholder="••••••••" 
                        type="password" 
                    />
                    {errors.password && <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-text-main text-sm font-semibold" htmlFor="confirmPassword">Confirmar</label>
                    <input 
                        id="confirmPassword" 
                        {...register('confirmPassword')}
                        className={`w-full rounded-lg border px-4 py-3 focus:ring-primary transition-colors ${errors.confirmPassword ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-gray-200 focus:border-primary'}`}
                        placeholder="••••••••" 
                        type="password" 
                    />
                    {errors.confirmPassword && <p className="text-xs text-red-500 font-medium">{errors.confirmPassword.message}</p>}
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex items-start gap-3 mt-2">
                  <input 
                    id="termsAccepted" 
                    type="checkbox" 
                    {...register('termsAccepted')}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer" 
                  />
                  <label className="text-sm text-text-secondary leading-snug cursor-pointer select-none" htmlFor="termsAccepted">
                      Acepto los <span className="text-primary font-bold">Términos de Servicio</span> y la Política de Privacidad.
                  </label>
                </div>
                {errors.termsAccepted && <p className="text-xs text-red-500 font-medium ml-7">{errors.termsAccepted.message}</p>}
            </div>

            {errors.root && (
                <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">error</span>
                    {errors.root.message}
                </div>
            )}

            <button type="submit" disabled={isSubmitting} className="mt-2 w-full rounded-lg bg-primary py-3.5 px-4 text-white font-bold shadow-lg shadow-primary/25 hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
              {isSubmitting && <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
              {isSubmitting ? 'Registrando...' : 'Crear mi Academia'}
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
