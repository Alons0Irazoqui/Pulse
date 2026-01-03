import React from 'react';
import Sidebar from '../components/Sidebar';
import { useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const location = useLocation();
  const role = location.pathname.includes('/master') ? 'master' : 'student';

  return (
    <div className="flex h-screen w-full bg-background-light overflow-hidden">
      <Sidebar role={role} />
      
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 z-10">
            <div className="flex items-center gap-2">
                 <span className="material-symbols-outlined text-primary">ecg_heart</span>
                 <span className="font-bold text-lg">Pulse</span>
            </div>
            <button className="text-text-main">
                <span className="material-symbols-outlined">menu</span>
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