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
    <div className="flex h-screen w-full bg-background-light overflow-hidden font-sans">
      <Sidebar 
        role={role} 
        isOpen={isMobileMenuOpen} 
        onClose={() => setIsMobileMenuOpen(false)} 
      />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 z-30 sticky top-0">
            <div className="flex items-center gap-2">
                 <div className="flex items-center justify-center size-8 rounded-lg bg-primary text-white shadow-md shadow-orange-200">
                    <span className="material-symbols-outlined text-lg">school</span>
                 </div>
                 <span className="font-bold text-lg text-text-main tracking-tight">Academy Pro</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-text-secondary hover:text-text-main p-2 hover:bg-gray-50 rounded-lg transition-colors focus:outline-none active:scale-95"
            >
                <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
        </header>

        {/* Main Content Area - Canvas Background */}
        <main className="flex-1 overflow-y-auto scrollbar-hide bg-[#F9FAFB]">
            {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;