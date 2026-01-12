
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
    <div className="flex h-screen w-full bg-background overflow-hidden text-text-main font-sans">
      <Sidebar 
        role={role} 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-background">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-background border-b border-border z-30 sticky top-0">
            <div className="flex items-center gap-3">
                 <div className="flex items-center justify-center size-8 bg-primary text-black">
                    <span className="font-black text-sm">A</span>
                 </div>
                 <span className="font-bold text-lg text-white tracking-tighter uppercase">Academy<span className="text-primary">Pro</span></span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-text-secondary p-2 hover:bg-background-subtle transition-colors focus:outline-none"
            >
                <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
        </header>

        <main className="flex-1 overflow-y-auto scrollbar-hide bg-black">
            {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
