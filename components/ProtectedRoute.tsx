
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: ('master' | 'student')[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { currentUser } = useStore();

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
