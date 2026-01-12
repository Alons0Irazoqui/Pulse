
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler, UseFormRegister, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentRegistrationSchema, StudentRegistrationForm } from '../../schemas/authSchemas';
import { useToast } from '../../context/ToastContext';
import { PulseService } from '../../services/pulseService';

// --- SUB-COMPONENTS (Redesigned for Premium Look) ---

interface InputFieldProps {
  label: string;
  name: keyof StudentRegistrationForm;
  register: UseFormRegister<StudentRegistrationForm>;
  errors: FieldErrors<StudentRegistrationForm>;
  type?: string;
  placeholder?: string;
  icon?: string;
  cols?: 1 | 2;
}

const InputField: React.FC<InputFieldProps> = ({ 
  label, 
  name, 
  register, 
  errors, 
  type = 'text', 
  placeholder, 
  icon,
  cols = 1 
}) => (
  <div className={cols === 2 ? 'col-span-1' : 'col-span-1 md:col-span-2'}>
    <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 ml-1 tracking-wide">{label}</label>
    <div className="relative group">
      {icon && (
          <span className="absolute left-4 top-3.5 text-zinc-500 group-focus-within:text-primary transition-colors material-symbols-outlined text-[20px]">
              {icon}
          </span>
      )}
      <input
        {...register(name)}
        type={type}
        placeholder={placeholder}
        className={`w-full rounded-lg border bg-zinc-950/50 py-3 text-sm font-medium text-white transition-all placeholder:text-zinc-600 outline-none ${
          errors[name]
            ? 'border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500'
            : 'border-zinc-800 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 hover:border-zinc-700'
        } ${icon ? 'pl-11 pr-4' : 'px-4'}`}
      />
    </div>
    {errors[name] && (
      <p className="mt-1.5 ml-1 text-xs font-bold text-red-400 animate-in slide-in-from-top-1 fade-in flex items-center gap-1">
        <span className="material-symbols-outlined text-[10px]">error</span>
        {errors[name]?.message}
      </p>
    )}
  </div>
);

const STEPS = [
  { id: 1, title: 'Cuenta', icon: 'vpn_key' },
  { id: 2, title: 'Alumno', icon: 'person' },
  { id: 3, title: 'Tutor', icon: 'family_restroom' },
];

const StudentRegistration: React.FC = () => {
  const { registerStudent } = useStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    setError,
    formState: { errors },
    watch
  } = useForm<StudentRegistrationForm>({
    resolver: zodResolver(studentRegistrationSchema),
    mode: 'onChange',
    defaultValues: {
        guardianRelationship: 'Padre'
    }
  });

  const nextStep = async () => {
    let fieldsToValidate: (keyof StudentRegistrationForm)[] = [];

    if (currentStep === 1) {
      fieldsToValidate = ['academyCode', 'email', 'password', 'confirmPassword'];
    } else if (currentStep === 2) {
      fieldsToValidate = ['name', 'age', 'birthDate', 'cellPhone'];
    }

    const isStepValid = await trigger(fieldsToValidate);
    
    if (currentStep === 1 && isStepValid) {
        const email = watch('email');
        if (PulseService.checkEmailExists(email)) {
            setError('email', { type: 'manual', message: 'Este correo ya está registrado.' });
            addToast('El correo ya está en uso.', 'error');
            return;
        }
    }

    if (isStepValid) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const onSubmit: SubmitHandler<StudentRegistrationForm> = async (data) => {
    setIsSubmitting(true);
    
    if (PulseService.checkEmailExists(data.email)) {
        setIsSubmitting(false);
        setError('email', { type: 'manual', message: 'Correo duplicado.' });
        return;
    }

    try {
        const success = await registerStudent({
            academyCode: data.academyCode,
            name: data.name,
            email: data.email,
            phone: data.cellPhone,
            password: data.password,
        });

        if (success) {
            addToast('Registro completado con éxito', 'success');
            navigate('/student/dashboard');
        } else {
            addToast('Error al registrar. Verifica el código.', 'error');
        }
    } catch (error) {
        console.error(error);
        addToast(error instanceof Error ? error.message : 'Error inesperado', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 md:p-6 font-sans relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Main Card */}
      <div className="w-full max-w-2xl bg-zinc-900/70 backdrop-blur-xl rounded-[2rem] shadow-2xl shadow-black/50 border border-white/10 relative z-10 flex flex-col overflow-hidden">
        
        {/* Header & Stepper */}
        <div className="bg-black/20 border-b border-white/5 p-8 pb-6">
            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Alta de Alumno</h1>
                    <p className="text-zinc-400 text-sm mt-1 font-medium">Completa tu perfil para unirte al dojo.</p>
                </div>
                <div className="size-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
                    <span className="material-symbols-outlined">school</span>
                </div>
            </div>

            {/* Stepper UI */}
            <div className="flex items-center relative px-2">
                {/* Track */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-zinc-800 rounded-full -z-10"></div>
                {/* Progress */}
                <div 
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-primary rounded-full -z-10 transition-all duration-500 ease-out"
                    style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
                ></div>
                
                <div className="flex justify-between w-full">
                    {STEPS.map((step) => {
                        const isActive = step.id === currentStep;
                        const isCompleted = step.id < currentStep;
                        
                        return (
                            <div key={step.id} className="flex flex-col items-center gap-2 group">
                                <div className={`size-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 relative z-10 ${
                                    isActive ? 'bg-zinc-900 border-primary text-primary shadow-lg shadow-primary/20 scale-110' : 
                                    isCompleted ? 'bg-primary border-primary text-black' : 
                                    'bg-zinc-900 border-zinc-700 text-zinc-600'
                                }`}>
                                    <span className="material-symbols-outlined text-sm font-bold">
                                        {isCompleted ? 'check' : step.icon}
                                    </span>
                                </div>
                                <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-primary' : isCompleted ? 'text-white' : 'text-zinc-600'}`}>
                                    {step.title}
                                </span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-8">
            
            {/* --- STEP 1: ACCOUNT --- */}
            {currentStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="md:col-span-2 p-4 bg-blue-500/10 rounded-xl border border-blue-500/20 flex gap-3 items-start mb-2">
                        <span className="material-symbols-outlined text-blue-400 mt-0.5 text-lg">info</span>
                        <div>
                            <h4 className="text-sm font-bold text-blue-400">Código de Academia</h4>
                            <p className="text-xs text-blue-200/70 mt-1 leading-relaxed">Solicita este código a tu maestro. Es necesario para vincular tu perfil.</p>
                        </div>
                    </div>

                    <InputField register={register} errors={errors} label="Código de Academia" name="academyCode" icon="vpn_key" placeholder="Ej. ACAD-1234" cols={2} />
                    <InputField register={register} errors={errors} label="Correo Electrónico (Login)" name="email" type="email" icon="mail" placeholder="usuario@email.com" />
                    
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <InputField register={register} errors={errors} label="Contraseña" name="password" type="password" icon="lock" placeholder="Mínimo 6 caracteres" cols={2} />
                        <InputField register={register} errors={errors} label="Confirmar Contraseña" name="confirmPassword" type="password" icon="lock_reset" placeholder="Repite la contraseña" cols={2} />
                    </div>
                </div>
            )}

            {/* --- STEP 2: STUDENT PROFILE --- */}
            {currentStep === 2 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="md:col-span-2 flex justify-center mb-4">
                        <div className="size-24 bg-zinc-950/50 rounded-full flex items-center justify-center border border-zinc-800 text-zinc-700 shadow-inner">
                            <span className="material-symbols-outlined text-4xl">add_a_photo</span>
                        </div>
                    </div>

                    <InputField register={register} errors={errors} label="Nombre Completo" name="name" icon="badge" placeholder="Nombre y Apellidos" />
                    <InputField register={register} errors={errors} label="Celular del Alumno" name="cellPhone" type="tel" icon="smartphone" placeholder="10 dígitos" />
                    
                    <InputField register={register} errors={errors} label="Edad" name="age" type="number" icon="cake" placeholder="Años" cols={2} />
                    <InputField register={register} errors={errors} label="Fecha de Nacimiento" name="birthDate" type="date" icon="calendar_month" cols={2} />
                </div>
            )}

            {/* --- STEP 3: GUARDIAN INFO --- */}
            {currentStep === 3 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    
                    {/* Sección Tutor */}
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-lg">supervisor_account</span>
                            Datos del Responsable
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <InputField register={register} errors={errors} label="Nombre del Tutor" name="guardianName" placeholder="Nombre completo" />
                            <div className="col-span-1">
                                <label className="block text-xs font-bold text-zinc-400 uppercase mb-2 ml-1 tracking-wide">Parentesco</label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-3.5 text-zinc-500 group-focus-within:text-primary transition-colors material-symbols-outlined text-[20px]">diversity_3</span>
                                    <select
                                        {...register('guardianRelationship')}
                                        className="w-full rounded-lg border border-zinc-800 bg-zinc-950/50 py-3 pl-11 pr-4 text-sm font-medium text-white focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all appearance-none outline-none"
                                    >
                                        <option value="Padre">Padre</option>
                                        <option value="Madre">Madre</option>
                                        <option value="Tutor Legal">Tutor Legal</option>
                                        <option value="Familiar">Familiar</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                            </div>
                            <InputField register={register} errors={errors} label="Email del Tutor" name="guardianEmail" type="email" icon="alternate_email" />
                        </div>
                    </div>

                    {/* Sección Teléfonos */}
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-green-500 text-lg">call</span>
                            Teléfonos de Contacto
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InputField register={register} errors={errors} label="Principal (Obligatorio)" name="guardianMainPhone" type="tel" icon="phone_iphone" cols={2} />
                            <InputField register={register} errors={errors} label="Secundario (Opcional)" name="guardianSecondaryPhone" type="tel" icon="call" cols={2} />
                            <InputField register={register} errors={errors} label="Terciario (Opcional)" name="guardianTertiaryPhone" type="tel" icon="call" cols={2} />
                        </div>
                    </div>

                    {/* Sección Dirección */}
                    <div>
                        <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                            <span className="material-symbols-outlined text-red-500 text-lg">home_pin</span>
                            Dirección de Emergencia
                        </h3>
                        <div className="grid grid-cols-6 gap-4">
                            <div className="col-span-4"><InputField register={register} errors={errors} label="Calle" name="street" placeholder="Av. Principal" cols={2} /></div>
                            <div className="col-span-2"><InputField register={register} errors={errors} label="No. Ext" name="exteriorNumber" placeholder="123" cols={2} /></div>
                            
                            <div className="col-span-2"><InputField register={register} errors={errors} label="No. Int" name="interiorNumber" placeholder="Apt 1" cols={2} /></div>
                            <div className="col-span-2"><InputField register={register} errors={errors} label="Colonia" name="colony" placeholder="Centro" cols={2} /></div>
                            <div className="col-span-2"><InputField register={register} errors={errors} label="C.P." name="zipCode" placeholder="00000" cols={2} /></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- FOOTER ACTIONS --- */}
            <div className="flex items-center gap-4 mt-10 pt-6 border-t border-white/5">
                {currentStep > 1 ? (
                    <button
                        type="button"
                        onClick={prevStep}
                        className="px-6 py-3.5 rounded-xl border border-white/10 text-zinc-400 font-bold hover:bg-white/5 hover:text-white active:scale-95 transition-all flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        Atrás
                    </button>
                ) : (
                    <Link to="/login" className="px-6 py-3.5 rounded-xl border border-transparent text-zinc-500 font-bold hover:text-white transition-all text-sm uppercase tracking-wider">
                        Cancelar
                    </Link>
                )}

                <button
                    type="button"
                    onClick={currentStep === 3 ? handleSubmit(onSubmit) : nextStep}
                    disabled={isSubmitting}
                    className="flex-1 bg-primary hover:bg-orange-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wide"
                >
                    {isSubmitting ? (
                        <span className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                        <>
                            {currentStep === 3 ? 'Finalizar Registro' : 'Siguiente'}
                            <span className="material-symbols-outlined text-lg">
                                {currentStep === 3 ? 'check' : 'arrow_forward'}
                            </span>
                        </>
                    )}
                </button>
            </div>

        </form>
      </div>
      
      <p className="fixed bottom-6 text-xs text-zinc-700 font-medium tracking-wide">© 2024 AcademyPro Systems</p>
    </div>
  );
};

export default StudentRegistration;
