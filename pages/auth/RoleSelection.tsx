import React from 'react';
import { Link } from 'react-router-dom';

const RoleSelection: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 font-display relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-orange-100/50 rounded-full blur-[100px] pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
      
      <div className="max-w-4xl w-full flex flex-col items-center gap-12 relative z-10">
        <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-6">
                <div className="size-12 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                    <span className="material-symbols-outlined text-3xl">school</span>
                </div>
                <span className="text-3xl font-bold text-gray-900 tracking-tight">Academy Pro</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">Elige tu Camino</h1>
            <p className="text-gray-500 text-lg max-w-lg mx-auto leading-relaxed">Selecciona cómo quieres interactuar con la plataforma para personalizar tu experiencia.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
            {/* Master Option */}
            <Link to="/register/master" className="group relative bg-white hover:border-orange-200 border border-gray-100 p-10 rounded-2xl shadow-xl shadow-gray-200/40 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 flex flex-col gap-6 cursor-pointer overflow-hidden transform hover:-translate-y-1">
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0 translate-x-4">
                    <span className="material-symbols-outlined text-orange-500 text-2xl">arrow_forward</span>
                </div>
                <div className="size-16 bg-gray-50 text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500 rounded-2xl flex items-center justify-center transition-colors duration-300">
                    <span className="material-symbols-outlined text-4xl">sports_martial_arts</span>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors">Soy Maestro</h3>
                    <p className="text-gray-500 leading-relaxed text-sm">
                        Gestiona tu academia, alumnos, finanzas y clases. Toma el control total de tu dojo.
                    </p>
                </div>
            </Link>

            {/* Student Option */}
            <Link to="/register/student" className="group relative bg-white hover:border-orange-200 border border-gray-100 p-10 rounded-2xl shadow-xl shadow-gray-200/40 hover:shadow-2xl hover:shadow-orange-500/10 transition-all duration-300 flex flex-col gap-6 cursor-pointer overflow-hidden transform hover:-translate-y-1">
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity transform group-hover:translate-x-0 translate-x-4">
                    <span className="material-symbols-outlined text-orange-500 text-2xl">arrow_forward</span>
                </div>
                <div className="size-16 bg-gray-50 text-gray-400 group-hover:bg-orange-50 group-hover:text-orange-500 rounded-2xl flex items-center justify-center transition-colors duration-300">
                    <span className="material-symbols-outlined text-4xl">school</span>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors">Soy Alumno</h3>
                    <p className="text-gray-500 leading-relaxed text-sm">
                        Inscríbete en clases, sigue tu progreso de cinturones y gestiona tus pagos.
                    </p>
                </div>
            </Link>
        </div>
        
        <Link to="/" className="text-gray-400 font-bold hover:text-gray-900 transition-colors flex items-center gap-2 py-2 px-4 rounded-xl hover:bg-gray-100">
            <span className="material-symbols-outlined text-lg">arrow_back</span>
            <span className="text-sm">Volver al inicio</span>
        </Link>
      </div>
    </div>
  );
};

export default RoleSelection;