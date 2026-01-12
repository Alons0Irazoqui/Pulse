
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
    <div className="flex h-screen w-full bg-[#09090b] overflow-hidden text-[#f5f5f7] font-sans selection:bg-blue-500/30">
      
      {/* Sidebar Component with Glass Effect handled internally */}
      <Sidebar 
        role={role} 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10 bg-[#09090b]">
        {/* Mobile Header - Glassy */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-30">
            <div className="flex items-center gap-3">
                 <div className="flex items-center justify-center size-7 rounded-lg bg-primary text-white shadow-[0_2px_8px_rgba(10,132,255,0.3)]">
                    <span className="font-bold text-xs">A</span>
                 </div>
                 <span className="font-semibold text-sm text-white tracking-wide">AcademyPro</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-gray-400 p-2 hover:bg-white/5 rounded-lg transition-colors focus:outline-none"
            >
                <span className="material-symbols-outlined text-xl">menu</span>
            </button>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
            {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
