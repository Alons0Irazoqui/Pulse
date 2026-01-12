
import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col relative bg-background-light font-display">
      {/* Navbar */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-5 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-primary text-white shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined text-2xl">ecg_heart</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-text-main">Pulse</span>
        </div>
        <div className="flex gap-4">
            <Link to="/login" className="hidden md:block px-5 py-2.5 text-sm font-semibold text-text-main hover:bg-white/50 rounded-xl transition-all">
                Iniciar Sesión
            </Link>
            <Link to="/role-selection" className="px-5 py-2.5 bg-text-main text-white text-sm font-semibold rounded-xl hover:bg-black transition-all shadow-lg">
                Registrarse
            </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-[1200px] bg-surface-white rounded-3xl shadow-soft-lg overflow-hidden min-h-[600px] flex flex-col lg:flex-row border border-gray-100">
          
          {/* Left Column: Visual */}
          <div className="relative w-full lg:w-5/12 bg-gray-900 flex flex-col justify-end p-8 lg:p-12 overflow-hidden group">
            <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-105 opacity-60"
                style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1555597673-b21d5c935865?q=80&w=2072&auto=format&fit=crop")' }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
            
            <div className="relative z-10 text-white space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm border border-white/10 text-xs font-medium">
                <span className="material-symbols-outlined text-sm">verified</span>
                <span>Gestión Integral de Dojo</span>
              </div>
              <h1 className="text-3xl lg:text-4xl font-black leading-tight tracking-tight">
                Potencia tu disciplina. <br/>Escala tu academia.
              </h1>
              <p className="text-gray-300 text-sm lg:text-base leading-relaxed max-w-sm">
                Únete a miles de maestros y alumnos que gestionan su progreso, pagos y comunidad en un solo lugar.
              </p>
            </div>
          </div>

          {/* Right Column: CTA */}
          <div className="w-full lg:w-7/12 p-6 lg:p-12 lg:pl-16 flex flex-col justify-center items-center text-center lg:items-start lg:text-left">
            <div className="max-w-[480px] w-full flex flex-col gap-8">
              <div className="space-y-2">
                <h2 className="text-3xl lg:text-4xl font-bold text-text-main tracking-tight">Bienvenido a Pulse</h2>
                <p className="text-text-secondary text-lg">La plataforma definitiva para artes marciales.</p>
              </div>

              <div className="flex flex-col gap-4">
                <Link to="/login" className="w-full py-4 text-base font-bold text-white bg-primary rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-hover transition-all flex items-center justify-center gap-2">
                  <span>Iniciar Sesión</span>
                  <span className="material-symbols-outlined text-lg">login</span>
                </Link>
                
                <Link to="/role-selection" className="w-full py-4 text-base font-bold text-text-main bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                  Crear Cuenta Nueva
                </Link>
              </div>

              <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-gray-200"></div>
                  <span className="flex-shrink-0 mx-4 text-xs font-medium text-text-secondary">Enterprise Solutions</span>
                  <div className="flex-grow border-t border-gray-200"></div>
              </div>

               <div className="grid grid-cols-2 gap-3 opacity-60">
                    <div className="flex items-center justify-center gap-2 h-10">
                        <span className="font-bold text-xl text-gray-400">Google</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 h-10">
                        <span className="font-bold text-xl text-gray-400">Apple</span>
                    </div>
                </div>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
