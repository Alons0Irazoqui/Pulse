
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
  const displaySubtext = role === 'master' ? academySettings.name : 'Estudiante';
  
  const handleLogout = () => {
      logout();
      navigate('/');
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/90 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Content */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          flex flex-col w-72 h-full bg-background border-r border-border
          transform transition-transform duration-300 ease-out shadow-2xl md:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* LOGO */}
        <div className="h-20 flex items-center px-8 border-b border-border">
            <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="font-black text-white text-lg leading-none">A</span>
                </div>
                <h1 className="text-lg font-bold tracking-tight text-white">
                    Academy<span className="text-primary">Pro</span>
                </h1>
            </div>
        </div>

        <div className="flex flex-col h-full p-6 justify-between overflow-y-auto">
          <div className="flex flex-col gap-8">
            
            {/* User Info */}
            <div className="flex items-center gap-3 px-2">
                <Avatar 
                    src={currentUser?.avatarUrl} 
                    name={displayName} 
                    className="size-10 rounded-full ring-2 ring-border" 
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate">{displayName}</span>
                  <span className="text-xs text-text-secondary truncate">{displaySubtext}</span>
                </div>
            </div>

            {/* Menu */}
            <nav className="flex flex-col gap-1">
              <p className="px-4 text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Menú Principal</p>
              {links.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                    <Link
                    key={link.path}
                    to={link.path}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative ${
                        isActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-text-secondary hover:bg-background-subtle hover:text-white'
                        }`}
                    >
                        <span className={`material-symbols-outlined ${isActive ? 'filled' : ''} text-[20px]`}>
                            {link.icon}
                        </span>
                        <span className="font-medium text-sm">
                            {link.name}
                        </span>
                        {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-primary rounded-r-full"></div>}
                    </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-border">
              <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-text-secondary hover:text-red-500 cursor-pointer transition-colors group w-full text-left"
              >
                <span className="material-symbols-outlined group-hover:text-red-500 transition-colors">logout</span>
                <span className="font-medium text-sm transition-colors">Cerrar Sesión</span>
              </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default memo(Sidebar);
