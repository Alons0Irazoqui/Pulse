
import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col relative bg-background text-text-main font-sans selection:bg-primary/30">
      
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-5 lg:px-12 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="font-black text-white text-lg leading-none">A</span>
                </div>
                <span className="text-lg font-bold tracking-tight">Academy<span className="text-primary">Pro</span></span>
            </div>
            <div className="flex gap-4">
                <Link to="/login" className="hidden md:block px-6 py-2 text-sm font-medium text-text-secondary hover:text-white transition-colors">
                    Iniciar Sesión
                </Link>
                <Link to="/role-selection" className="px-5 py-2 bg-white text-black text-sm font-bold rounded-lg hover:bg-gray-200 transition-all shadow-glow">
                    Comenzar Ahora
                </Link>
            </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center p-6 lg:p-12 mt-20 relative">
        {/* Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-7xl grid lg:grid-cols-2 gap-16 items-center relative z-10">
          
          {/* Text Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-background-subtle border border-border text-xs font-medium text-primary">
                <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                <span>Software de gestión para Dojos Modernos</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-black leading-tight tracking-tight text-white">
              Domina tu <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-orange-400">Academia.</span>
            </h1>
            
            <p className="text-text-secondary text-lg leading-relaxed max-w-lg">
              Control total de alumnos, finanzas automatizadas y seguimiento de cinturones en una interfaz oscura diseñada para la excelencia.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/role-selection" className="px-8 py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                  <span>Crear Cuenta Gratis</span>
                  <span className="material-symbols-outlined">arrow_forward</span>
                </Link>
                <Link to="/login" className="px-8 py-4 bg-background-paper border border-border hover:bg-background-subtle text-white font-bold rounded-xl transition-all flex items-center justify-center">
                  Acceder al Portal
                </Link>
            </div>

            <div className="pt-8 border-t border-border flex gap-8">
                <div>
                    <p className="text-3xl font-black text-white">2k+</p>
                    <p className="text-xs text-text-secondary uppercase tracking-wider font-bold">Academias</p>
                </div>
                <div>
                    <p className="text-3xl font-black text-white">50k+</p>
                    <p className="text-xs text-text-secondary uppercase tracking-wider font-bold">Alumnos</p>
                </div>
            </div>
          </div>

          {/* Visual Content */}
          <div className="relative">
             <div className="relative bg-background-paper border border-border rounded-[2rem] overflow-hidden shadow-2xl">
                 <div className="aspect-[4/3] relative bg-background-subtle flex items-center justify-center">
                    <span className="material-symbols-outlined text-[100px] text-border">dashboard</span>
                    
                    {/* Floating Cards UI Simulation */}
                    <div className="absolute bottom-8 left-8 right-8 space-y-3">
                        <div className="bg-background/90 backdrop-blur-md p-4 rounded-xl border border-border flex items-center justify-between shadow-lg transform translate-y-2">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-background-subtle"></div>
                                <div>
                                    <div className="h-2 w-24 bg-background-elevated rounded full mb-1"></div>
                                    <div className="h-2 w-16 bg-background-subtle rounded full"></div>
                                </div>
                            </div>
                            <div className="h-8 w-20 bg-primary/20 rounded-lg"></div>
                        </div>
                        <div className="bg-background-paper p-4 rounded-xl border border-border flex items-center justify-between shadow-2xl">
                            <div className="flex items-center gap-3">
                                <div className="size-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">A</div>
                                <div>
                                    <p className="text-sm font-bold text-white">Nuevo Ingreso</p>
                                    <p className="text-xs text-text-secondary">Hace 2 minutos</p>
                                </div>
                            </div>
                            <span className="text-status-success text-sm font-bold">+$850.00</span>
                        </div>
                    </div>
                 </div>
             </div>
          </div>

        </div>
      </main>
      
      <footer className="py-8 text-center text-text-muted text-sm border-t border-border bg-background">
        &copy; 2024 AcademyPro Systems. Enterprise Grade Dojo Management.
      </footer>
    </div>
  );
};

export default LandingPage;
