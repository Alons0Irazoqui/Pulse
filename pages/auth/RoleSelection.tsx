
import React from 'react';
import { Link } from 'react-router-dom';

const RoleSelection: React.FC = () => {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 font-sans relative">
      
      {/* TECHNICAL GRID BACKGROUND */}
      <div 
        className="absolute inset-0 pointer-events-none z-0 opacity-40"
        style={{
            backgroundImage: 'linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)',
            backgroundSize: '30px 30px'
        }}
      ></div>

      <div className="max-w-6xl w-full flex flex-col items-center gap-20 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-4">
                <div className="size-12 bg-primary text-black flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.3)]">
                    <span className="font-black text-3xl">A</span>
                </div>
                <span className="text-3xl font-black text-white tracking-tighter uppercase">Academy<span className="text-primary">Pro</span></span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-none">
                Selecciona<br/><span className="text-zinc-800">Tu Perfil</span>
            </h1>
        </div>

        {/* Industrial Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
            
            {/* Master Card */}
            <Link to="/register/master" className="group relative h-[320px] bg-[#0D0D0D] border border-[#222222] hover:border-primary hover:shadow-[0_0_60px_-10px_rgba(249,115,22,0.2)] transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden p-10">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="material-symbols-outlined text-primary text-2xl">arrow_outward</span>
                </div>
                
                <div className="mb-8 p-6 bg-black border border-[#222] group-hover:border-primary group-hover:bg-primary/10 transition-colors duration-150">
                    <span className="material-symbols-outlined text-5xl text-zinc-500 group-hover:text-primary transition-colors duration-150">sports_martial_arts</span>
                </div>
                
                <h3 className="text-3xl font-black text-white mb-3 uppercase tracking-tighter group-hover:text-primary transition-colors">Soy Maestro</h3>
                <p className="text-zinc-500 text-sm max-w-xs font-medium leading-relaxed group-hover:text-zinc-300 transition-colors">
                    Gestión integral para Senseis y dueños de academias. Control total del dojo.
                </p>
                
                {/* Hover Line */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></div>
            </Link>

            {/* Student Card */}
            <Link to="/register/student" className="group relative h-[320px] bg-[#0D0D0D] border border-[#222222] hover:border-white hover:shadow-[0_0_60px_-10px_rgba(255,255,255,0.1)] transition-all duration-150 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden p-10">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <span className="material-symbols-outlined text-white text-2xl">arrow_outward</span>
                </div>
                
                <div className="mb-8 p-6 bg-black border border-[#222] group-hover:border-white group-hover:bg-white/10 transition-colors duration-150">
                    <span className="material-symbols-outlined text-5xl text-zinc-500 group-hover:text-white transition-colors duration-150">school</span>
                </div>
                
                <h3 className="text-3xl font-black text-white mb-3 uppercase tracking-tighter group-hover:text-white transition-colors">Soy Alumno</h3>
                <p className="text-zinc-500 text-sm max-w-xs font-medium leading-relaxed group-hover:text-zinc-300 transition-colors">
                    Acceso para estudiantes. Consulta tu progreso, asistencias y material técnico.
                </p>

                {/* Hover Line */}
                <div className="absolute bottom-0 left-0 w-full h-1 bg-white transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left"></div>
            </Link>
        </div>
        
        <Link to="/" className="text-zinc-600 font-bold hover:text-primary transition-colors flex items-center gap-3 text-xs uppercase tracking-[0.2em] border-b border-transparent hover:border-primary pb-1">
            <span className="material-symbols-outlined text-base">west</span>
            Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default RoleSelection;
