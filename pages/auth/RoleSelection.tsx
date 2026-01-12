
import React from 'react';
import { Link } from 'react-router-dom';

const RoleSelection: React.FC = () => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-sans relative">
      
      {/* Subtle Background Glow */}
      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none"></div>

      <div className="max-w-5xl w-full flex flex-col items-center gap-16 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
                <div className="size-10 bg-primary text-black rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="font-black text-xl">A</span>
                </div>
                <span className="text-2xl font-bold text-white tracking-tight">Academy<span className="text-primary">Pro</span></span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">
                Elige tu Perfil
            </h1>
            <p className="text-zinc-400 text-lg max-w-lg mx-auto font-medium">
                Selecciona cómo deseas interactuar con la plataforma.
            </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
            
            {/* Master Card */}
            <Link to="/register/master" className="group relative bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 p-10 rounded-3xl hover:border-primary hover:bg-zinc-900 transition-all duration-300 flex flex-col gap-8 cursor-pointer overflow-hidden text-left hover:shadow-[0_0_30px_rgba(249,115,22,0.15)]">
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 text-primary">
                    <span className="material-symbols-outlined text-4xl">arrow_forward</span>
                </div>
                
                <div className="size-20 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300 shadow-xl">
                    <span className="material-symbols-outlined text-4xl text-zinc-400 group-hover:text-black transition-colors">sports_martial_arts</span>
                </div>
                
                <div>
                    <h3 className="text-3xl font-bold text-white mb-3 group-hover:text-primary transition-colors">Soy Maestro</h3>
                    <p className="text-zinc-400 leading-relaxed font-medium">
                        Para dueños de academias y senseis. Gestiona alumnos, finanzas, asistencias y el calendario de tu dojo.
                    </p>
                </div>
            </Link>

            {/* Student Card */}
            <Link to="/register/student" className="group relative bg-zinc-900/60 backdrop-blur-sm border border-zinc-800 p-10 rounded-3xl hover:border-emerald-500 hover:bg-zinc-900 transition-all duration-300 flex flex-col gap-8 cursor-pointer overflow-hidden text-left hover:shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 text-emerald-500">
                    <span className="material-symbols-outlined text-4xl">arrow_forward</span>
                </div>
                
                <div className="size-20 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-center group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-all duration-300 shadow-xl">
                    <span className="material-symbols-outlined text-4xl text-zinc-400 group-hover:text-black transition-colors">school</span>
                </div>
                
                <div>
                    <h3 className="text-3xl font-bold text-white mb-3 group-hover:text-emerald-500 transition-colors">Soy Alumno</h3>
                    <p className="text-zinc-400 leading-relaxed font-medium">
                        Para estudiantes. Consulta tus horarios, historial de asistencia, pagos y material de estudio.
                    </p>
                </div>
            </Link>
        </div>
        
        <Link to="/" className="text-zinc-500 font-bold hover:text-white transition-colors flex items-center gap-2 text-sm uppercase tracking-widest">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default RoleSelection;
