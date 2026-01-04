
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
    <div className="flex h-screen w-full bg-background-light overflow-hidden">
      <Sidebar 
        role={role} 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header with Overlay Control */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-200 z-30 sticky top-0">
            <div className="flex items-center gap-2">
                 <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-white shadow-lg shadow-primary/30">
                    <span className="material-symbols-outlined text-lg">ecg_heart</span>
                 </div>
                 <span className="font-bold text-lg text-text-main">Pulse</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-text-main p-2 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none active:scale-95"
            >
                <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-hide">
            {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
