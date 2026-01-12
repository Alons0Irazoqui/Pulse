
import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const role = location.pathname.includes('/master') ? 'master' : 'student';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-[#09090b] overflow-hidden text-zinc-200 font-sans">
      
      {/* Background ambient glow for depth */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] opacity-20"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[30%] h-[30%] bg-blue-500/5 rounded-full blur-[100px] opacity-20"></div>
      </div>

      <Sidebar 
        role={role} 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
        {/* Mobile Header - Glassmorphism */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-xl sticky top-0 z-30">
            <div className="flex items-center gap-3">
                 <div className="flex items-center justify-center size-8 rounded-lg bg-gradient-to-br from-primary to-orange-600 text-white shadow-lg shadow-orange-500/20">
                    <span className="font-bold text-sm">A</span>
                 </div>
                 <span className="font-semibold text-lg text-white tracking-tight">Academy<span className="text-zinc-500">Pro</span></span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-zinc-400 p-2 hover:bg-white/5 rounded-lg transition-colors focus:outline-none"
            >
                <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
        </header>

        {/* Main Content - No background needed (body handles it), just structure */}
        <main className="flex-1 overflow-y-auto scrollbar-hide">
            {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
