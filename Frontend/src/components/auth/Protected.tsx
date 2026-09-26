import React, { ReactNode } from "react";
import { useLocation, Navigate } from "react-router-dom";
import { fetchToken, isTokenExpired } from "../../helpers/tokenValidation";

interface ProtectedProps {
  children: ReactNode;
}

const Protected: React.FC<ProtectedProps> = ({ children }) => {
  const location = useLocation();
  const token = fetchToken();

  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("token");
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default Protected;
