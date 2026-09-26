import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { login } from "../context/authSlice";
import { api } from "../utils";
import { queryKeys } from "./queryKeys";
import { User, LoginCredentials, RegisterData, AuthApiResponse } from "../types/user";

function useHydrateSession() {
  const queryClient = useQueryClient();

  return (user: User | null) => {
    if (user) {
      queryClient.setQueryData(queryKeys.currentUser, user);
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.planUsage });
  };
}

function sanitizeUser(user: any): User | null {
  if (!user || typeof user !== "object") return null;
  const { password, refreshToken, ...safeUser } = user;
  return safeUser as User;
}

// POST /api/v1/user/login
export function useLogin() {
  const dispatch = useDispatch();
  const hydrateSession = useHydrateSession();

  return useMutation<AuthApiResponse, Error, LoginCredentials>({
    mutationFn: async (credentials) => {
      const res = await api.post<AuthApiResponse>(`/api/v1/user/login`, credentials);
      return res.data;
    },
    onSuccess: (data) => {
      const user = sanitizeUser(data?.data?.user);
      if (user) {
        dispatch(login(user));
        hydrateSession(user);
      }
      if (data?.data?.accessToken) {
        localStorage.setItem("token", JSON.stringify(data.data.accessToken));
      }
    },
  });
}

// POST /api/v1/user/register
export function useRegister() {
  const dispatch = useDispatch();
  const hydrateSession = useHydrateSession();

  return useMutation<AuthApiResponse, Error, RegisterData>({
    mutationFn: async (payload) => {
      const res = await api.post<AuthApiResponse>(`/api/v1/user/register`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      const user = sanitizeUser(data?.data?.user);
      if (user) {
        dispatch(login(user));
        hydrateSession(user);
      }
      if (data?.data?.accessToken) {
        localStorage.setItem("token", JSON.stringify(data.data.accessToken));
      }
    },
  });
}

// GET /api/v1/user/google/callback
export function useGoogleLogin() {
  const dispatch = useDispatch();
  const hydrateSession = useHydrateSession();

  return useMutation<any, Error, string>({
    mutationFn: async (credential) => {
      const res = await api.get(
        `/api/v1/user/google/callback?token=${credential}`
      );
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        const user = sanitizeUser(data?.data?.user);
        if (user) {
          dispatch(login(user));
          hydrateSession(user);
        }
        if (data.token) {
          localStorage.setItem("token", JSON.stringify(data.token));
        }
      }
    },
  });
}

// POST /api/v1/contact/new-contact
export function useContactMutation() {
  return useMutation<any, Error, any>({
    mutationFn: async (formData) => {
      const res = await api.post(`/api/v1/contact/new-contact`, formData);
      return res;
    },
  });
}
