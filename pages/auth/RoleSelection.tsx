import React from 'react';
import { Link } from 'react-router-dom';

const RoleSelection: React.FC = () => {
  return (
    <div className="min-h-screen bg-background-light flex flex-col items-center justify-center p-6 font-display">
      <div className="max-w-4xl w-full flex flex-col items-center gap-12">
        <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-6">
                <div className="size-12 bg-primary text-white rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                    <span className="material-symbols-outlined text-3xl">ecg_heart</span>
                </div>
                <span className="text-3xl font-bold text-text-main">Pulse</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-text-main tracking-tight">Elige tu Camino</h1>
            <p className="text-text-secondary text-lg max-w-lg mx-auto">Selecciona cómo quieres interactuar con la plataforma para personalizar tu experiencia.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
            {/* Master Option */}
            <Link to="/register/master" className="group relative bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-primary/30 p-8 rounded-3xl shadow-soft hover:shadow-xl transition-all duration-300 flex flex-col gap-6 cursor-pointer overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-primary text-2xl">arrow_forward</span>
                </div>
                <div className="size-16 bg-blue-100 text-primary rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-4xl">sports_martial_arts</span>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-text-main mb-2">Soy Maestro</h3>
                    <p className="text-text-secondary leading-relaxed">
                        Gestiona tu academia, alumnos, finanzas y clases. Toma el control total de tu dojo.
                    </p>
                </div>
            </Link>

            {/* Student Option */}
            <Link to="/register/student" className="group relative bg-white hover:bg-emerald-50/50 border border-gray-200 hover:border-emerald-500/30 p-8 rounded-3xl shadow-soft hover:shadow-xl transition-all duration-300 flex flex-col gap-6 cursor-pointer overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="material-symbols-outlined text-emerald-600 text-2xl">arrow_forward</span>
                </div>
                <div className="size-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <span className="material-symbols-outlined text-4xl">school</span>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-text-main mb-2">Soy Alumno</h3>
                    <p className="text-text-secondary leading-relaxed">
                        Inscríbete en clases, sigue tu progreso de cinturones y gestiona tus pagos.
                    </p>
                </div>
            </Link>
        </div>
        
        <Link to="/" className="text-text-secondary font-medium hover:text-primary transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default RoleSelection;
