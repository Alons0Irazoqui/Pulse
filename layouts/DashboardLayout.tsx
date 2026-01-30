
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
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-[#F8F9FA]">
        {/* Mobile Header - Minimal */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white z-30 sticky top-0">
            <div className="flex flex-col">
                 <span className="font-black text-xl text-primary tracking-tighter leading-none">IKC</span>
                 <span className="text-[8px] font-bold uppercase tracking-widest text-gray-500">Management</span>
            </div>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="text-gray-600 hover:bg-gray-50 p-2 rounded-lg transition-colors focus:outline-none"
            >
                <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
        </header>

        {/* Main Content Area - Clean Canvas */}
        <main className="flex-1 overflow-y-auto scrollbar-hide">
            {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
