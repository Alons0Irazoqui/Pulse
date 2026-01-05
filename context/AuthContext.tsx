import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { PulseService } from '../services/pulseService';
import { useToast } from './ToastContext';

interface AuthContextType {
  currentUser: UserProfile | null;
  login: (email: string, pass: string) => Promise<boolean>;
  registerStudent: (data: any) => Promise<boolean>;
  registerMaster: (data: any) => Promise<boolean>;
  logout: () => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  changePassword: (newPassword: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(PulseService.getCurrentUser());
  const { addToast } = useToast();

  useEffect(() => {
      PulseService.saveCurrentUser(currentUser);
  }, [currentUser]);

  const login = async (email: string, pass: string) => {
      try {
          const user = PulseService.login(email, pass);
          setCurrentUser(user);
          addToast(`Bienvenido de nuevo, ${user.name}`, 'success');
          return true;
      } catch (error) { 
          addToast(error instanceof Error ? error.message : "Error al iniciar sesión", 'error');
          return false; 
      }
  };

  const logout = () => {
      PulseService.logout();
      setCurrentUser(null);
      addToast('Sesión cerrada correctamente', 'info');
  };

  const updateUserProfile = (updates: Partial<UserProfile>) => {
      if (!currentUser) return;
      const updatedUser = { ...currentUser, ...updates };
      setCurrentUser(updatedUser);
      // Persist to DB mockup
      const users = PulseService.getUsersDB();
      const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, ...updates } : u);
      localStorage.setItem('pulse_users_db', JSON.stringify(updatedUsers));
      addToast('Perfil actualizado', 'success');
  };

  const changePassword = (newPassword: string) => {
      if (!currentUser) return;
      const users = PulseService.getUsersDB();
      const updatedUsers = users.map(u => u.id === currentUser.id ? { ...u, password: newPassword } : u);
      localStorage.setItem('pulse_users_db', JSON.stringify(updatedUsers));
      setCurrentUser({ ...currentUser, password: newPassword });
      addToast('Contraseña actualizada', 'success');
  };

  const registerStudentAction = async (data: any) => {
      try {
          const user = PulseService.registerStudent(data);
          setCurrentUser(user);
          addToast('Cuenta de alumno creada exitosamente', 'success');
          return true;
      } catch (error) {
          addToast(error instanceof Error ? error.message : "Error al registrar", 'error');
          return false;
      }
  };

  const registerMasterAction = async (data: any) => {
      try {
          const { user } = PulseService.registerMaster(data);
          setCurrentUser(user);
          addToast('Academia registrada exitosamente', 'success');
          return true;
      } catch (error) {
          addToast(error instanceof Error ? error.message : "Error al registrar", 'error');
          return false;
      }
  };

  return (
    <AuthContext.Provider value={{ 
        currentUser, 
        login, 
        logout, 
        registerStudent: registerStudentAction, 
        registerMaster: registerMasterAction,
        updateUserProfile,
        changePassword
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};