import { useCallback } from "react";
import { useDispatch } from "react-redux";
import { logout } from "../context/authSlice";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../hooks/use-toast";
import { api } from "../utils";

export const fetchToken = (): string | null => {
  const storedToken = localStorage.getItem("token");
  let token: string | null = null;
  try {
    token = storedToken ? JSON.parse(storedToken) : null;
  } catch {
    token = storedToken;
  }
  return token;
};

export const isTokenExpired = (token: string | null = fetchToken()): boolean => {
  if (!token) return true;
  
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch (error) {
    console.error("Error decoding token:", error);
    return true;
  }
};

interface EnsureAuthenticatedOptions {
  missingMessage?: string;
  expiredMessage?: string;
}

export const ensureAuthenticated = (
  token: string | null,
  logoutUser: (message: string) => void,
  {
    missingMessage = "No authentication token found.",
    expiredMessage = "Session expired. Please log in again.",
  }: EnsureAuthenticatedOptions = {}
): boolean => {
  if (!token) {
    logoutUser(missingMessage);
    return false;
  }
  if (isTokenExpired(token)) {
    logoutUser(expiredMessage);
    return false;
  }
  return true;
};

export interface LogoutOptions {
  message?: string;
  title?: string;
  variant?: "default" | "destructive";
  redirectTo?: string;
  showToast?: boolean;
}

export const useLogout = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useCallback(async (options: string | LogoutOptions = {}) => {
    const {
      message = "Session expired. Please log in again.",
      title = "Authentication Required",
      variant = "destructive",
      redirectTo = "/sign-in",
      showToast = true,
    }: LogoutOptions = typeof options === "string" ? { message: options } : options;

    try {
      await api.post(`/api/v1/user/logout`, {});
    } catch (error) {
      console.error("Error invalidating session on logout:", error);
    }

    localStorage.removeItem("token");
    dispatch(logout());
    navigate(redirectTo);
    queryClient.clear();

    if (showToast) {
      toast({ title, description: message, variant });
    }
  }, [dispatch, navigate, toast, queryClient]);
};
