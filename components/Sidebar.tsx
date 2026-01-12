
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
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Content - ZINC / LINEAR STYLE */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          flex flex-col w-72 h-full
          bg-[#09090b]/95 backdrop-blur-2xl md:bg-transparent md:backdrop-blur-none
          border-r border-white/5
          transform transition-transform duration-300 ease-out shadow-2xl md:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* LOGO */}
        <div className="h-24 flex items-center px-8">
            <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center text-white shadow-lg shadow-primary/20">
                    <span className="font-bold text-lg leading-none">A</span>
                </div>
                <h1 className="text-lg font-semibold tracking-tight text-white">
                    Academy<span className="text-zinc-500">Pro</span>
                </h1>
            </div>
        </div>

        <div className="flex flex-col h-full justify-between overflow-y-auto px-4 pb-6">
          <div className="flex flex-col gap-8">
            
            {/* User Info - Glass Card */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
                <Avatar 
                    src={currentUser?.avatarUrl} 
                    name={displayName} 
                    className="size-10 rounded-xl ring-1 ring-white/10" 
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-zinc-100 truncate group-hover:text-white transition-colors">{displayName}</span>
                  <span className="text-xs text-zinc-500 truncate">{displaySubtext}</span>
                </div>
            </div>

            {/* Navigation - Floating Items */}
            <nav className="flex flex-col gap-1 w-full">
              <p className="px-4 text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Menu</p>
              {links.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                    <Link
                    key={link.path}
                    to={link.path}
                    onClick={onClose}
                    className={`
                        flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group
                        ${isActive
                            ? 'bg-white/10 text-white shadow-sm ring-1 ring-white/5'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                        }
                    `}
                    >
                        <span className={`material-symbols-outlined text-[20px] transition-colors ${isActive ? 'text-primary' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                            {link.icon}
                        </span>
                        <span>
                            {link.name}
                        </span>
                        {isActive && (
                            <div className="ml-auto size-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div>
                        )}
                    </Link>
                );
              })}
            </nav>
          </div>

          {/* Footer */}
          <div className="pt-6 border-t border-white/5 mt-auto">
              <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all group"
              >
                <span className="material-symbols-outlined text-[20px] group-hover:scale-110 transition-transform">logout</span>
                <span className="font-medium text-sm">Cerrar Sesión</span>
              </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default memo(Sidebar);
