import React from 'react'
import { useLocation, Navigate } from 'react-router-dom';
import { fetchToken, isTokenExpired } from '../../helpers/tokenValidation';

const Protected = ({ children }) => {

  const location = useLocation()

  const token = fetchToken();

  if (!token || isTokenExpired(token)) {
    localStorage.removeItem('token');
    return (
        <Navigate to="/sign-in" state={{ from: location }} replace />
      ) 
  }

  return children;
}

export default Protected
