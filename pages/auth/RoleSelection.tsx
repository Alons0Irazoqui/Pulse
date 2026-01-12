
import React from 'react';
import { Link } from 'react-router-dom';

const RoleSelection: React.FC = () => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-900/10 rounded-full blur-[150px]"></div>
      </div>

      <div className="max-w-5xl w-full flex flex-col items-center gap-16 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="font-black text-white text-xl">A</span>
                </div>
                <span className="text-2xl font-bold text-white tracking-tight">Academy<span className="text-zinc-500">Pro</span></span>
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                Selecciona tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">Perfil</span>
            </h1>
            <p className="text-zinc-400 text-lg">Elige cómo quieres interactuar con la plataforma.</p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            
            {/* Master Card */}
            <Link to="/register/master" className="group relative flex flex-col items-center text-center p-10 rounded-3xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/10 transition-all duration-300 cursor-pointer overflow-hidden">
                <div className="size-24 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300 border border-primary/10">
                    <span className="material-symbols-outlined text-5xl">sports_martial_arts</span>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-primary transition-colors">Soy Maestro</h3>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">
                    Administra tu academia, gestiona alumnos, finanzas y calendarios. Control total del dojo.
                </p>
                
                <div className="mt-8 flex items-center gap-2 text-sm font-bold text-zinc-500 group-hover:text-white transition-colors uppercase tracking-wider">
                    <span>Crear Cuenta</span>
                    <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
            </Link>

            {/* Student Card */}
            <Link to="/register/student" className="group relative flex flex-col items-center text-center p-10 rounded-3xl bg-zinc-900 border border-white/5 hover:bg-zinc-800 hover:border-white/30 hover:shadow-2xl hover:shadow-white/5 transition-all duration-300 cursor-pointer overflow-hidden">
                <div className="size-24 rounded-full bg-white/5 text-zinc-300 flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-white/10 group-hover:text-white transition-all duration-300 border border-white/5">
                    <span className="material-symbols-outlined text-5xl">school</span>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-white transition-colors">Soy Alumno</h3>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-xs mx-auto">
                    Accede a tu perfil estudiantil. Consulta tu progreso, asistencias y material técnico exclusivo.
                </p>

                <div className="mt-8 flex items-center gap-2 text-sm font-bold text-zinc-500 group-hover:text-white transition-colors uppercase tracking-wider">
                    <span>Registrarme</span>
                    <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                </div>
            </Link>
        </div>
        
        <Link to="/login" className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-sm font-medium">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Volver al inicio de sesión
        </Link>
      </div>
    </div>
  );
};

export default RoleSelection;
