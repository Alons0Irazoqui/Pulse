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
      {/* Mobile Backdrop */}
      <div 
        className={`fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-40 transition-opacity duration-300 md:hidden ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Sidebar Container - Clean White Surface */}
      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-50
          flex flex-col w-72 h-full bg-white border-r border-gray-200
          transform transition-transform duration-300 ease-out shadow-xl md:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="flex flex-col h-full p-6 justify-between overflow-y-auto">
          <div className="flex flex-col gap-8">
            {/* Branding Header */}
            <div className="flex items-center gap-3 px-2">
                <div className="size-8 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-lg flex items-center justify-center shadow-md shadow-orange-200">
                    <span className="material-symbols-outlined text-xl">school</span>
                </div>
                <h1 className="text-xl font-bold tracking-tight text-gray-900">
                    Academy Pro
                </h1>
                <button 
                  onClick={onClose} 
                  className="md:hidden ml-auto size-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-1">
              {links.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                    <Link
                        key={link.path}
                        to={link.path}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm font-medium ${
                            isActive
                                ? 'bg-orange-50 text-orange-600'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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

          {/* User Footer */}
          <div className="pt-6 border-t border-gray-100">
              <div className="flex items-center gap-3 px-2 mb-4">
                <Avatar 
                    src={currentUser?.avatarUrl} 
                    name={displayName} 
                    className="size-10 rounded-full bg-gray-100 border border-gray-200 text-gray-600" 
                />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold text-gray-900 truncate">
                      {displayName}
                  </span>
                  <span className="text-xs text-gray-500 truncate">
                      {displaySubtext}
                  </span>
                </div>
              </div>

              <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full text-left text-sm font-medium"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                <span>Cerrar Sesión</span>
              </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default memo(Sidebar);