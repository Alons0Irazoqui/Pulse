
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
    if (PulseService.checkEmailExists(data.email)) {
        setError("email", { type: "manual", message: "Este correo electrónico ya está registrado." });
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
        setError("root", { message: "Error al registrar la academia." });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-[520px] bg-background-paper rounded-2xl shadow-2xl border border-border overflow-hidden">
          
          <div className="px-8 pt-10 pb-6 text-center">
            <h1 className="text-white text-3xl font-bold leading-tight tracking-tight mb-3">
                Comienza tu legado
            </h1>
            <p className="text-text-secondary text-sm font-normal leading-relaxed max-w-[400px] mx-auto">
                Crea tu perfil de maestro y registra tu academia en AcademyPro.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="px-8 pb-10 flex flex-col gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-text-secondary text-xs font-bold uppercase tracking-wider" htmlFor="name">Nombre del Maestro</label>
              <input 
                id="name" 
                {...register('name')}
                className={`w-full rounded-xl border bg-background-subtle text-white px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-colors text-sm ${errors.name ? 'border-red-500/50 focus:border-red-500' : 'border-border'}`}
                placeholder="Ej. Sensei Alejandro" 
                type="text" 
              />
              {errors.name && <p className="text-xs text-red-400 font-medium">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-text-secondary text-xs font-bold uppercase tracking-wider" htmlFor="email">Correo electrónico</label>
              <input 
                id="email" 
                {...register('email')}
                className={`w-full rounded-xl border bg-background-subtle text-white px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-colors text-sm ${errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-border'}`}
                placeholder="ejemplo@academia.com" 
                type="email"
              />
              {errors.email && <p className="text-xs text-red-400 font-medium">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-text-secondary text-xs font-bold uppercase tracking-wider" htmlFor="academyName">Nombre de la Academia</label>
              <input 
                id="academyName" 
                {...register('academyName')}
                className={`w-full rounded-xl border bg-background-subtle text-white px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-colors text-sm ${errors.academyName ? 'border-red-500/50 focus:border-red-500' : 'border-border'}`}
                placeholder="Ej. Academia Cobra Kai" 
                type="text" 
              />
              {errors.academyName && <p className="text-xs text-red-400 font-medium">{errors.academyName.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-text-secondary text-xs font-bold uppercase tracking-wider" htmlFor="password">Contraseña</label>
                    <input 
                        id="password" 
                        {...register('password')}
                        className={`w-full rounded-xl border bg-background-subtle text-white px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-colors text-sm ${errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-border'}`}
                        placeholder="••••••••" 
                        type="password" 
                    />
                    {errors.password && <p className="text-xs text-red-400 font-medium">{errors.password.message}</p>}
                </div>
                <div className="flex flex-col gap-1.5">
                    <label className="text-text-secondary text-xs font-bold uppercase tracking-wider" htmlFor="confirmPassword">Confirmar</label>
                    <input 
                        id="confirmPassword" 
                        {...register('confirmPassword')}
                        className={`w-full rounded-xl border bg-background-subtle text-white px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-colors text-sm ${errors.confirmPassword ? 'border-red-500/50 focus:border-red-500' : 'border-border'}`}
                        placeholder="••••••••" 
                        type="password" 
                    />
                    {errors.confirmPassword && <p className="text-xs text-red-400 font-medium">{errors.confirmPassword.message}</p>}
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <div className="flex items-start gap-3 mt-2">
                  <input 
                    id="termsAccepted" 
                    type="checkbox" 
                    {...register('termsAccepted')}
                    className="mt-1 h-4 w-4 rounded border-border bg-background-subtle text-primary focus:ring-primary cursor-pointer" 
                  />
                  <label className="text-sm text-text-secondary leading-snug cursor-pointer select-none" htmlFor="termsAccepted">
                      Acepto los <span className="text-primary font-bold">Términos de Servicio</span> y la Política de Privacidad.
                  </label>
                </div>
                {errors.termsAccepted && <p className="text-xs text-red-400 font-medium ml-7">{errors.termsAccepted.message}</p>}
            </div>

            {errors.root && (
                <div className="bg-red-500/10 text-red-400 text-sm p-3 rounded-lg border border-red-500/20 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg">error</span>
                    {errors.root.message}
                </div>
            )}

            <button type="submit" disabled={isSubmitting} className="mt-2 w-full rounded-xl bg-primary py-3.5 px-4 text-white font-bold shadow-lg shadow-orange-500/20 hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
              {isSubmitting && <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>}
              {isSubmitting ? 'Registrando...' : 'Crear mi Academia'}
            </button>
          </form>

          <div className="bg-background-paper border-t border-border px-8 py-5 text-center">
            <p className="text-sm text-text-secondary">
                ¿Ya tienes una cuenta? 
                <Link className="font-bold text-primary hover:text-white ml-1 transition-colors" to="/login">Inicia Sesión</Link>
            </p>
          </div>
        </div>
    </div>
  );
};

export default MasterRegistration;
