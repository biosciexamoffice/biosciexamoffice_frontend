import { useSelector } from 'react-redux';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { selectCurrentRoles, selectCurrentToken } from '../../store';

const RequireAuth = ({ allowedRoles }) => {
  const token = useSelector(selectCurrentToken);
  const roles = useSelector(selectCurrentRoles);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length) {
    const hasRole = roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <Outlet />;
};

export default RequireAuth;
