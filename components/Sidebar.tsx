
import React, { memo } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAcademy } from '../context/AcademyContext';
import Avatar from './ui/Avatar';

interface SidebarProps {
  role: 'master' | 'student';
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ role, isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { academySettings } = useAcademy();

  const masterLinks = [
    { name: 'Dashboard', icon: 'grid_view', path: '/master/dashboard' },
    { name: 'Students', icon: 'groups', path: '/master/students' },
    { name: 'Schedule', icon: 'calendar_month', path: '/master/schedule' },
    { name: 'Library', icon: 'video_library', path: '/master/library' },
    { name: 'Finance', icon: 'account_balance_wallet', path: '/master/finance' },
    { name: 'Settings', icon: 'settings', path: '/master/settings' },
  ];

  const studentLinks = [
    { name: 'Progress Profile', icon: 'dashboard', path: '/student/dashboard' },
    { name: 'Mis Clases', icon: 'class', path: '/student/classes' },
    ...(academySettings.modules.library ? [{ name: 'Library', icon: 'school', path: '/student/library' }] : []),
    { name: 'Schedule', icon: 'calendar_today', path: '/student/schedule' },
    ...(academySettings.modules.payments ? [{ name: 'Payments', icon: 'credit_card', path: '/student/payments' }] : []),
    { name: 'Settings', icon: 'settings', path: '/student/settings' },
  ];

  const links = role === 'master' ? masterLinks : studentLinks;

  const displayName = currentUser?.name || (role === 'master' ? 'Sensei' : 'Alumno');
  const displaySubtext = role === 'master' ? academySettings.name : 'Estudiante';
  
  const handleLogout = () => {
      logout();
      navigate('/');
  };

  return (
    <>
      {/* Mobile Backdrop - Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Container - Drawer */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          flex flex-col w-72 h-full glassmorphism border-r border-gray-200 bg-white/95 md:bg-white/50 backdrop-blur-xl
          transform transition-transform duration-300 ease-out shadow-2xl md:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full p-6 justify-between overflow-y-auto">
          <div className="flex flex-col gap-8">
            {/* Header */}
            <div className="flex justify-between items-center px-2 pt-2">
              <div className="flex gap-4 items-center">
                <Avatar 
                    src={currentUser?.avatarUrl} 
                    name={displayName} 
                    className="size-12 rounded-full shadow-sm ring-2 ring-white" 
                />
                <div className="flex flex-col">
                  <h1 className="text-text-main text-lg font-bold leading-tight truncate max-w-[140px]">
                      {displayName}
                  </h1>
                  <p className="text-text-secondary text-xs font-medium truncate max-w-[140px]">
                      {displaySubtext}
                  </p>
                </div>
              </div>
              
              {/* Close Button (Mobile Only) */}
              <button 
                onClick={onClose} 
                className="md:hidden size-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-text-secondary rounded-full transition-colors active:scale-90"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-2">
              {links.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                    <Link
                    key={link.path}
                    to={link.path}
                    onClick={onClose}
                    className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group relative overflow-hidden ${
                        isActive
                            ? 'bg-primary/10 text-primary shadow-sm'
                            : 'hover:bg-gray-50 text-text-secondary hover:text-text-main'
                        }`}
                    >
                        <span className={`material-symbols-outlined ${isActive ? 'filled' : ''} ${isActive ? 'text-primary' : 'text-text-secondary group-hover:text-primary transition-colors'}`}>
                            {link.icon}
                        </span>
                        <span className={`font-medium text-sm ${isActive ? 'text-primary font-bold' : 'transition-colors'}`}>
                            {link.name}
                        </span>
                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"></div>}
                    </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer Action */}
          <button 
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-text-secondary hover:text-red-500 cursor-pointer transition-colors group mt-8 w-full text-left"
          >
            <span className="material-symbols-outlined group-hover:text-red-500 transition-colors">logout</span>
            <span className="font-medium text-sm transition-colors">Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default memo(Sidebar);
