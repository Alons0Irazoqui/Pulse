
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
    { name: 'Estudiantes', icon: 'groups', path: '/master/students' },
    { name: 'Calendario', icon: 'calendar_today', path: '/master/schedule' },
    { name: 'Biblioteca', icon: 'video_library', path: '/master/library' },
    { name: 'Finanzas', icon: 'payments', path: '/master/finance' },
    { name: 'Configuración', icon: 'settings', path: '/master/settings' },
  ];

  const studentLinks = [
    { name: 'Mi Progreso', icon: 'dashboard', path: '/student/dashboard' },
    { name: 'Clases', icon: 'class', path: '/student/classes' },
    ...(academySettings.modules.library ? [{ name: 'Biblioteca', icon: 'school', path: '/student/library' }] : []),
    { name: 'Horarios', icon: 'calendar_month', path: '/student/schedule' },
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
      <div 
        className={`fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          flex flex-col w-72 h-full bg-white
          transform transition-transform duration-300 ease-out border-r border-transparent
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full px-4 py-6 justify-between overflow-y-auto">
          <div className="flex flex-col gap-8">
            
            {/* BRANDING IKC MANAGEMENT - ENTERPRISE BOLD */}
            <div className="flex items-center justify-between px-4 mt-2">
                <div className="flex flex-col">
                    <h1 className="text-4xl font-black tracking-tighter text-primary leading-none">
                        IKC
                    </h1>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1 ml-0.5">
                        Management
                    </span>
                </div>
                <button 
                  onClick={onClose} 
                  className="md:hidden text-gray-400 hover:text-gray-900 bg-gray-50 rounded-full p-1"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
            </div>

            {/* NAVIGATION */}
            <nav className="flex flex-col gap-1.5">
              {links.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                    <Link
                        key={link.path}
                        to={link.path}
                        onClick={onClose}
                        className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all text-sm font-bold ${
                            isActive
                                ? 'bg-primary text-white shadow-none' 
                                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                    >
                        <span className={`material-symbols-outlined text-[20px] ${isActive ? 'filled' : ''}`}>
                            {link.icon}
                        </span>
                        <span>
                            {link.name}
                        </span>
                    </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-gray-50">
              <div className="flex items-center gap-3 px-3 mb-2 p-2.5 rounded-2xl bg-gray-50 border border-transparent">
                <Avatar 
                    src={currentUser?.avatarUrl} 
                    name={displayName} 
                    className="size-9 rounded-full bg-white text-gray-700 text-xs shadow-sm" 
                />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold text-gray-900 truncate">
                      {displayName}
                  </span>
                  <span className="text-[10px] text-gray-500 truncate font-medium uppercase tracking-wide">
                      {role === 'master' ? 'Director' : 'Estudiante'}
                  </span>
                </div>
              </div>

              <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 mt-2 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left text-xs font-bold uppercase tracking-wider"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>Cerrar Sesión</span>
              </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default memo(Sidebar);
