
import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const RoleSelection: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#000000] flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden selection:bg-primary/30">
      
      {/* Ambient Background */}
      <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/10 rounded-[100%] blur-[120px]"></div>
      </div>

      {/* Botón Volver Minimalista */}
      <Link 
        to="/" 
        className="absolute top-8 left-8 z-50 flex items-center justify-center size-10 rounded-full bg-zinc-900/50 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all group backdrop-blur-md border border-white/5"
      >
        <span className="material-symbols-outlined text-xl group-hover:-translate-x-0.5 transition-transform">arrow_back_ios_new</span>
      </Link>

      <div className="max-w-5xl w-full flex flex-col items-center gap-12 relative z-10">
        
        {/* Header */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center space-y-4"
        >
            <div className="flex items-center justify-center gap-3 mb-2">
                <span className="px-3 py-1 rounded-full border border-white/5 bg-white/5 text-[10px] font-bold uppercase tracking-widest text-zinc-400 backdrop-blur-md">
                    Comienza tu viaje
                </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
                Elige tu <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-200">Camino.</span>
            </h1>
            <p className="text-zinc-400 text-lg max-w-lg mx-auto leading-relaxed font-light">
                Selecciona cómo interactuarás con la plataforma.
            </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl px-4">
            
            {/* Master Card */}
            <Link to="/register/master" className="block h-full">
                <motion.div 
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="group relative flex flex-col items-center text-center p-10 h-full rounded-3xl apple-glass border-transparent hover:border-primary/50 transition-all duration-300 cursor-pointer"
                >
                    <div className="relative z-10 size-20 rounded-2xl bg-white/5 border border-white/10 text-zinc-500 flex items-center justify-center mb-8 group-hover:text-primary group-hover:bg-primary/10 group-hover:border-primary/30 transition-all duration-300">
                        <span className="material-symbols-outlined text-4xl">sports_martial_arts</span>
                    </div>
                    
                    <h3 className="relative z-10 text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors">Soy Maestro</h3>
                    <p className="relative z-10 text-zinc-500 text-sm leading-relaxed max-w-[260px] mx-auto group-hover:text-zinc-400 transition-colors">
                        Administra tu academia, gestiona alumnos, finanzas y calendarios. Control total.
                    </p>
                    
                    <div className="relative z-10 mt-10 w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-bold text-xs uppercase tracking-wider group-hover:bg-primary group-hover:text-white group-hover:border-primary group-hover:shadow-lg group-hover:shadow-primary/25 transition-all flex items-center justify-center gap-2">
                        <span>Crear Cuenta</span>
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </div>
                </motion.div>
            </Link>

            {/* Student Card */}
            <Link to="/register/student" className="block h-full">
                <motion.div 
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="group relative flex flex-col items-center text-center p-10 h-full rounded-3xl apple-glass border-transparent hover:border-blue-400/50 transition-all duration-300 cursor-pointer"
                >
                    <div className="relative z-10 size-20 rounded-2xl bg-white/5 border border-white/10 text-zinc-500 flex items-center justify-center mb-8 group-hover:text-blue-400 group-hover:bg-blue-400/10 group-hover:border-blue-400/30 transition-all duration-300">
                        <span className="material-symbols-outlined text-4xl">school</span>
                    </div>
                    
                    <h3 className="relative z-10 text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">Soy Alumno</h3>
                    <p className="relative z-10 text-zinc-500 text-sm leading-relaxed max-w-[260px] mx-auto group-hover:text-zinc-400 transition-colors">
                        Accede a tu perfil estudiantil. Consulta tu progreso, asistencias y material técnico.
                    </p>

                    <div className="relative z-10 mt-10 w-full py-3.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-bold text-xs uppercase tracking-wider group-hover:bg-blue-500 group-hover:text-white group-hover:border-blue-500 group-hover:shadow-lg group-hover:shadow-blue-500/25 transition-all flex items-center justify-center gap-2">
                        <span>Registrarme</span>
                        <span className="material-symbols-outlined text-base">arrow_forward</span>
                    </div>
                </motion.div>
            </Link>
        </div>
        
        <div className="mt-8 flex items-center gap-2">
            <span className="text-zinc-600 text-sm">¿Ya tienes cuenta?</span>
            <Link to="/login" className="text-zinc-400 hover:text-white transition-colors text-sm font-bold border-b border-zinc-700 hover:border-white pb-0.5">
                Iniciar Sesión
            </Link>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
