
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
    { name: 'Alumnos', icon: 'groups', path: '/master/students' },
    { name: 'Calendario', icon: 'calendar_month', path: '/master/schedule' },
    { name: 'Biblioteca', icon: 'video_library', path: '/master/library' },
    { name: 'Finanzas', icon: 'account_balance_wallet', path: '/master/finance' },
    { name: 'Configuración', icon: 'settings', path: '/master/settings' },
  ];

  const studentLinks = [
    { name: 'Mi Progreso', icon: 'dashboard', path: '/student/dashboard' },
    { name: 'Mis Clases', icon: 'class', path: '/student/classes' },
    ...(academySettings.modules.library ? [{ name: 'Biblioteca', icon: 'school', path: '/student/library' }] : []),
    { name: 'Calendario', icon: 'calendar_today', path: '/student/schedule' },
    ...(academySettings.modules.payments ? [{ name: 'Pagos', icon: 'credit_card', path: '/student/payments' }] : []),
    { name: 'Ajustes', icon: 'settings', path: '/student/settings' },
  ];

  const links = role === 'master' ? masterLinks : studentLinks;
  const displayName = currentUser?.name || (role === 'master' ? 'Sensei' : 'Alumno');
  
  const handleLogout = () => {
      logout();
      navigate('/');
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Content - Apple Pro Glass */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          flex flex-col w-64 h-full
          apple-glass
          transform transition-transform duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* LOGO */}
        <div className="h-16 flex items-center px-6 border-b border-white/5">
            <div className="flex items-center gap-3">
                <div className="size-7 rounded-lg bg-gradient-to-b from-blue-500 to-blue-600 flex items-center justify-center text-white shadow-[0_2px_10px_rgba(10,132,255,0.4)]">
                    <span className="font-bold text-sm leading-none">A</span>
                </div>
                <h1 className="text-sm font-semibold tracking-wide text-white">
                    Academy<span className="text-blue-500">Pro</span>
                </h1>
            </div>
        </div>

        <div className="flex flex-col h-full justify-between overflow-y-auto px-4 py-6">
          <div className="flex flex-col gap-6">
            
            {/* User Info - Card */}
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/5 border border-white/5 shadow-inner">
                <Avatar 
                    src={currentUser?.avatarUrl} 
                    name={displayName} 
                    className="size-8 rounded-full ring-2 ring-white/10" 
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-semibold text-gray-200 truncate">{displayName}</span>
                  <span className="text-[10px] text-gray-500 truncate font-medium uppercase tracking-wide">{role}</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex flex-col gap-1.5 w-full">
              <p className="px-3 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 pl-1">Menu</p>
              {links.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                    <Link
                    key={link.path}
                    to={link.path}
                    onClick={onClose}
                    className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative
                        ${isActive
                            ? 'bg-[#0A84FF] text-white shadow-[0_4px_12px_rgba(10,132,255,0.3)]'
                            : 'text-gray-400 hover:text-gray-100 hover:bg-white/5'
                        }
                    `}
                    >
                        <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>
                            {link.icon}
                        </span>
                        <span>{link.name}</span>
                    </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-white/5">
              <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left text-gray-500 hover:text-white hover:bg-white/5 transition-all group"
              >
                <span className="material-symbols-outlined text-[20px] group-hover:text-red-400 transition-colors">logout</span>
                <span className="font-medium text-xs">Cerrar Sesión</span>
              </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default memo(Sidebar);
