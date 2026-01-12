
import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { useNavigate, Link } from 'react-router-dom';
import { useForm, SubmitHandler, UseFormRegister, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentRegistrationSchema, StudentRegistrationForm } from '../../schemas/authSchemas';
import { useToast } from '../../context/ToastContext';
import { PulseService } from '../../services/pulseService';
import { motion, AnimatePresence } from 'framer-motion';

// --- STYLED INPUT COMPONENT (APPLE DARK GLASS) ---
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
  label, name, register, errors, type = 'text', placeholder, icon, cols = 1 
}) => (
  <div className={cols === 2 ? 'col-span-1' : 'col-span-1 md:col-span-2'}>
    <label className="block text-[11px] font-bold text-zinc-500 uppercase mb-1.5 ml-1 tracking-wider">{label}</label>
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
        className={`w-full rounded-xl border bg-black/40 py-3.5 text-sm font-medium text-white transition-all placeholder:text-zinc-600 outline-none ${
          errors[name]
            ? 'border-red-500/50 focus:border-red-500'
            : 'border-zinc-800 focus:border-primary focus:ring-1 focus:ring-primary hover:border-zinc-700'
        } ${icon ? 'pl-11 pr-4' : 'px-4'}`}
      />
    </div>
    {errors[name] && (
      <p className="mt-1.5 ml-1 text-[10px] font-bold text-red-400 flex items-center gap-1">
        {errors[name]?.message}
      </p>
    )}
  </div>
);

const STEPS = [
  { id: 1, title: 'Cuenta', icon: 'vpn_key', desc: 'Credenciales' },
  { id: 2, title: 'Alumno', icon: 'person', desc: 'Datos Personales' },
  { id: 3, title: 'Tutor', icon: 'family_restroom', desc: 'Emergencia' },
];

const StudentRegistration: React.FC = () => {
  const { registerStudent } = useStore();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(1);

  const {
    register, handleSubmit, trigger, setError, formState: { errors }, watch
  } = useForm<StudentRegistrationForm>({
    resolver: zodResolver(studentRegistrationSchema),
    mode: 'onChange',
    defaultValues: { guardianRelationship: 'Padre' }
  });

  const nextStep = async () => {
    let fieldsToValidate: (keyof StudentRegistrationForm)[] = [];
    if (currentStep === 1) fieldsToValidate = ['academyCode', 'email', 'password', 'confirmPassword'];
    else if (currentStep === 2) fieldsToValidate = ['name', 'age', 'birthDate', 'cellPhone'];

    const isStepValid = await trigger(fieldsToValidate);
    
    if (currentStep === 1 && isStepValid) {
        const email = watch('email');
        if (PulseService.checkEmailExists(email)) {
            setError('email', { type: 'manual', message: 'Este correo ya está registrado.' });
            return;
        }
    }

    if (isStepValid) {
      setDirection(1);
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setDirection(-1);
    setCurrentStep((prev) => prev - 1);
  };

  const onSubmit: SubmitHandler<StudentRegistrationForm> = async (data) => {
    setIsSubmitting(true);
    try {
        if (PulseService.checkEmailExists(data.email)) {
            setError('email', { type: 'manual', message: 'Correo duplicado.' });
            setIsSubmitting(false);
            return;
        }
        const success = await registerStudent({
            academyCode: data.academyCode,
            name: data.name,
            email: data.email,
            phone: data.cellPhone,
            password: data.password,
        });
        if (success) {
            addToast('Registro completado', 'success');
            navigate('/student/dashboard');
        }
    } catch (error) {
        addToast(error instanceof Error ? error.message : 'Error inesperado', 'error');
    } finally {
        setIsSubmitting(false);
    }
  };

  const variants = {
    enter: (direction: number) => ({ x: direction > 0 ? 20 : -20, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction: number) => ({ x: direction < 0 ? 20 : -20, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center p-4 md:p-6 font-sans relative overflow-hidden selection:bg-primary/30">
      
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[150px] pointer-events-none"></div>

      {/* Botón Volver Minimalista */}
      <Link 
        to="/role-selection" 
        className="absolute top-8 left-8 z-50 flex items-center justify-center size-10 rounded-full bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all group backdrop-blur-md border border-white/5"
      >
        <span className="material-symbols-outlined text-xl group-hover:-translate-x-0.5 transition-transform">arrow_back_ios_new</span>
      </Link>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* Left Panel: Stepper */}
        <div className="lg:col-span-4 flex flex-col justify-between pt-10 lg:pt-0">
            <div className="mb-8 lg:mb-0">
                <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Crear Cuenta</h1>
                <p className="text-zinc-400 text-sm font-light">Completa tu perfil para unirte al dojo digital.</p>
            </div>

            <div className="space-y-6 hidden lg:block">
                {STEPS.map((step) => {
                    const isActive = step.id === currentStep;
                    const isCompleted = step.id < currentStep;
                    return (
                        <div key={step.id} className="flex items-center gap-4 group">
                            <div className={`size-12 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                                isActive ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20' : 
                                isCompleted ? 'bg-zinc-900 border-zinc-800 text-primary' : 
                                'bg-transparent border-zinc-800 text-zinc-600'
                            }`}>
                                <span className="material-symbols-outlined text-xl">
                                    {isCompleted ? 'check' : step.icon}
                                </span>
                            </div>
                            <div>
                                <p className={`text-xs font-bold uppercase tracking-wider transition-colors ${isActive ? 'text-white' : 'text-zinc-500'}`}>{step.title}</p>
                                <p className="text-xs text-zinc-600 font-medium">{step.desc}</p>
                            </div>
                        </div>
                    )
                })}
            </div>
            
            {/* Mobile Stepper Indicator */}
            <div className="flex gap-2 lg:hidden mb-6">
                {STEPS.map((step) => (
                    <div key={step.id} className={`h-1 flex-1 rounded-full transition-all duration-300 ${step.id <= currentStep ? 'bg-primary' : 'bg-zinc-800'}`}></div>
                ))}
            </div>
        </div>

        {/* Right Panel: Form Card - Apple Glass */}
        <div className="lg:col-span-8">
            <div className="apple-glass rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden min-h-[550px] flex flex-col">
                <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
                    <div className="flex-1 relative">
                        <AnimatePresence mode='wait' custom={direction}>
                            {currentStep === 1 && (
                                <motion.div 
                                    key="step1" custom={direction} variants={variants}
                                    initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-6 absolute w-full"
                                >
                                    <div className="md:col-span-2 p-4 bg-primary/10 rounded-xl border border-primary/20 flex gap-3 items-start mb-2">
                                        <span className="material-symbols-outlined text-primary mt-0.5 text-lg">info</span>
                                        <div>
                                            <h4 className="text-sm font-bold text-primary">Código de Academia</h4>
                                            <p className="text-xs text-blue-200/50 mt-1">Solicita este código a tu maestro para vincularte.</p>
                                        </div>
                                    </div>
                                    <InputField register={register} errors={errors} label="Código de Academia" name="academyCode" icon="vpn_key" placeholder="Ej. ACAD-1234" cols={2} />
                                    <InputField register={register} errors={errors} label="Email (Usuario)" name="email" type="email" icon="mail" placeholder="usuario@email.com" />
                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <InputField register={register} errors={errors} label="Contraseña" name="password" type="password" icon="lock" placeholder="••••••••" cols={2} />
                                        <InputField register={register} errors={errors} label="Confirmar" name="confirmPassword" type="password" icon="lock_reset" placeholder="••••••••" cols={2} />
                                    </div>
                                </motion.div>
                            )}

                            {currentStep === 2 && (
                                <motion.div 
                                    key="step2" custom={direction} variants={variants}
                                    initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}
                                    className="grid grid-cols-1 md:grid-cols-2 gap-6 absolute w-full"
                                >
                                    <div className="md:col-span-2 flex justify-center mb-4">
                                        <div className="size-20 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800 text-zinc-700 shadow-inner">
                                            <span className="material-symbols-outlined text-3xl">face</span>
                                        </div>
                                    </div>
                                    <InputField register={register} errors={errors} label="Nombre Completo" name="name" icon="badge" placeholder="Nombre y Apellidos" />
                                    <InputField register={register} errors={errors} label="Celular Alumno" name="cellPhone" type="tel" icon="smartphone" placeholder="10 dígitos" />
                                    <InputField register={register} errors={errors} label="Edad" name="age" type="number" icon="cake" placeholder="Años" cols={2} />
                                    <InputField register={register} errors={errors} label="Fecha de Nacimiento" name="birthDate" type="date" icon="calendar_month" cols={2} />
                                </motion.div>
                            )}

                            {currentStep === 3 && (
                                <motion.div 
                                    key="step3" custom={direction} variants={variants}
                                    initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}
                                    className="absolute w-full space-y-6"
                                >
                                    <div>
                                        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary">supervisor_account</span>
                                            Responsable
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputField register={register} errors={errors} label="Nombre Tutor" name="guardianName" placeholder="Nombre completo" />
                                            <div className="col-span-1">
                                                <label className="block text-[11px] font-bold text-zinc-500 uppercase mb-1.5 ml-1 tracking-wider">Parentesco</label>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-3.5 text-zinc-500 material-symbols-outlined text-[20px]">diversity_3</span>
                                                    <select {...register('guardianRelationship')} className="w-full rounded-xl border border-zinc-800 bg-black/40 py-3.5 pl-11 pr-4 text-sm font-medium text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none appearance-none">
                                                        <option value="Padre">Padre</option>
                                                        <option value="Madre">Madre</option>
                                                        <option value="Tutor Legal">Tutor Legal</option>
                                                        <option value="Otro">Otro</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <InputField register={register} errors={errors} label="Email Tutor" name="guardianEmail" type="email" icon="alternate_email" />
                                            <InputField register={register} errors={errors} label="Tel. Principal" name="guardianMainPhone" type="tel" icon="phone_iphone" />
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 border-b border-white/5 pb-2 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary">home_pin</span>
                                            Domicilio
                                        </h3>
                                        <div className="grid grid-cols-6 gap-4">
                                            <div className="col-span-4"><InputField register={register} errors={errors} label="Calle" name="street" placeholder="Av. Principal" cols={2} /></div>
                                            <div className="col-span-2"><InputField register={register} errors={errors} label="No. Ext" name="exteriorNumber" placeholder="123" cols={2} /></div>
                                            <div className="col-span-3"><InputField register={register} errors={errors} label="Colonia" name="colony" placeholder="Centro" cols={2} /></div>
                                            <div className="col-span-3"><InputField register={register} errors={errors} label="C.P." name="zipCode" placeholder="00000" cols={2} /></div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-8 mt-4 border-t border-white/5 relative z-20 bg-transparent">
                        <button
                            type="button"
                            onClick={currentStep === 1 ? () => navigate('/role-selection') : prevStep}
                            className="px-6 py-3 rounded-xl text-zinc-500 font-bold hover:text-white transition-colors text-sm"
                        >
                            {currentStep === 1 ? 'Cancelar' : 'Atrás'}
                        </button>

                        <button
                            type="button"
                            onClick={currentStep === 3 ? handleSubmit(onSubmit) : nextStep}
                            disabled={isSubmitting}
                            className="bg-primary hover:bg-primary-hover text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center gap-2 text-sm active:scale-95"
                        >
                            {isSubmitting ? <span className="size-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : (
                                <>
                                    {currentStep === 3 ? 'Finalizar' : 'Siguiente'}
                                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StudentRegistration;
