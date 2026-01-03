import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

interface SidebarProps {
  role: 'master' | 'student';
}

const Sidebar: React.FC<SidebarProps> = ({ role }) => {
  const navigate = useNavigate();
  const { academySettings, currentUser } = useStore();

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
    { name: 'Schedule', icon: 'calendar_month', path: '/student/schedule' },
    ...(academySettings.modules.library ? [{ name: 'Library', icon: 'school', path: '/student/library' }] : []),
    ...(academySettings.modules.payments ? [{ name: 'Payments', icon: 'credit_card', path: '/student/payments' }] : []),
    { name: 'Settings', icon: 'settings', path: '/student/settings' },
  ];

  const links = role === 'master' ? masterLinks : studentLinks;

  // Use real user data or fallbacks
  const displayName = currentUser?.name || (role === 'master' ? 'Sensei' : 'Alumno');
  const displaySubtext = role === 'master' ? academySettings.name : 'Estudiante';
  const displayAvatar = currentUser?.avatarUrl || `https://i.pravatar.cc/150?u=${role}`;

  return (
    <aside className="hidden md:flex flex-col w-72 h-full glassmorphism z-20 relative border-r border-gray-200">
      <div className="flex flex-col h-full p-6 justify-between">
        <div className="flex flex-col gap-8">
          {/* Brand/Profile Header */}
          <div className="flex gap-4 items-center px-2">
            <div 
                className="bg-center bg-no-repeat bg-cover rounded-full h-12 w-12 shadow-sm ring-2 ring-white" 
                style={{ backgroundImage: `url("${displayAvatar}")` }}
            ></div>
            <div className="flex flex-col">
              <h1 className="text-text-main text-lg font-semibold leading-tight truncate max-w-[160px]">
                  {displayName}
              </h1>
              <p className="text-text-secondary text-xs font-normal truncate max-w-[160px]">
                  {displaySubtext}
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-col gap-2">
            {links.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-4 py-3 rounded-xl transition-all group ${
                    isActive
                      ? 'bg-primary/10 shadow-sm ring-1 ring-primary/5 text-primary'
                      : 'hover:bg-white/60 text-text-secondary hover:text-text-main'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className={`material-symbols-outlined ${isActive ? 'filled' : ''} ${isActive ? 'text-primary' : 'text-text-secondary group-hover:text-primary transition-colors'}`}>
                      {link.icon}
                    </span>
                    <span className={`font-medium text-sm ${isActive ? 'text-primary font-semibold' : 'text-text-secondary group-hover:text-text-main transition-colors'}`}>
                      {link.name}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer Action */}
        <button 
            onClick={() => {
                navigate('/');
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 cursor-pointer transition-colors group mt-auto w-full text-left"
        >
          <span className="material-symbols-outlined text-text-secondary group-hover:text-red-500 transition-colors">logout</span>
          <span className="text-text-secondary font-medium text-sm group-hover:text-red-500 transition-colors">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;