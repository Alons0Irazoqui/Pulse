
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
        className={`fixed inset-0 bg-black/90 backdrop-blur-none z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Content - INDUSTRIAL DESIGN */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          flex flex-col w-72 h-full bg-[#000000] border-r border-primary
          transform transition-transform duration-200 ease-linear shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* LOGO */}
        <div className="h-20 flex items-center px-6 border-b border-border bg-[#000000]">
            <div className="flex items-center gap-3">
                <div className="size-8 bg-primary flex items-center justify-center">
                    <span className="font-black text-black text-lg leading-none">A</span>
                </div>
                <h1 className="text-lg font-bold tracking-tighter text-white uppercase">
                    Academy<span className="text-primary">Pro</span>
                </h1>
            </div>
        </div>

        <div className="flex flex-col h-full justify-between overflow-y-auto bg-[#000000]">
          <div className="flex flex-col pt-6">
            
            {/* User Info - Squared */}
            <div className="flex items-center gap-4 px-6 mb-8">
                <Avatar 
                    src={currentUser?.avatarUrl} 
                    name={displayName} 
                    className="size-10 ring-1 ring-border" 
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate uppercase tracking-wide">{displayName}</span>
                  <span className="text-[10px] text-text-secondary truncate uppercase tracking-widest">{displaySubtext}</span>
                </div>
            </div>

            {/* Menu - Rectangular & Sharp */}
            <nav className="flex flex-col gap-1 w-full">
              <p className="px-6 text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Navegación</p>
              {links.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                    <Link
                    key={link.path}
                    to={link.path}
                    onClick={onClose}
                    className={`flex items-center gap-4 px-6 py-4 transition-all group relative border-l-2 ${
                        isActive
                            ? 'border-primary bg-background-paper text-white'
                            : 'border-transparent text-text-secondary hover:bg-background-subtle hover:text-white'
                        }`}
                    >
                        <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-primary' : ''}`}>
                            {link.icon}
                        </span>
                        <span className="font-medium text-sm tracking-wide uppercase">
                            {link.name}
                        </span>
                    </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer */}
          <div className="border-t border-border">
              <button 
                  onClick={handleLogout}
                  className="flex items-center gap-4 px-6 py-5 hover:bg-red-900/10 text-text-secondary hover:text-red-500 cursor-pointer transition-colors group w-full text-left"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                <span className="font-medium text-sm uppercase tracking-wide">Cerrar Sesión</span>
              </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default memo(Sidebar);
