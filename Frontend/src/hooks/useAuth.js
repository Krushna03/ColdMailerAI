import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { login } from "../context/authSlice";
import { api } from "../utils";
import { queryKeys } from "./queryKeys";


// After login/register/Google the user is already in the response.


function useHydrateSession() {
  const queryClient = useQueryClient();

  return (user) => {
    if (user) {
      queryClient.setQueryData(queryKeys.currentUser, user);
    }
    queryClient.invalidateQueries({ queryKey: queryKeys.planUsage });
  };
}

function sanitizeUser(user) {
  if (!user || typeof user !== "object") return user;
  const { password, refreshToken, ...safeUser } = user;
  return safeUser;
}

// POST /api/v1/user/login
export function useLogin() {
  const dispatch = useDispatch();
  const hydrateSession = useHydrateSession();

  return useMutation({
    mutationFn: async (credentials) => {
      const res = await api.post(`/api/v1/user/login`, credentials);
      return res.data;
    },
    onSuccess: (data) => {
      const user = sanitizeUser(data?.data?.user);
      dispatch(login(user));
      localStorage.setItem("token", JSON.stringify(data?.data?.accessToken));
      hydrateSession(user);
    },
  });
}

// POST /api/v1/user/register
export function useRegister() {
  const dispatch = useDispatch();
  const hydrateSession = useHydrateSession();

  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(`/api/v1/user/register`, payload);
      return res.data;
    },
    onSuccess: (data) => {
      const user = sanitizeUser(data?.data?.user);
      dispatch(login(user));
      localStorage.setItem("token", JSON.stringify(data?.data?.accessToken));
      hydrateSession(user);
    },
  });
}

// GET /api/v1/user/google/callback
export function useGoogleLogin() {
  const dispatch = useDispatch();
  const hydrateSession = useHydrateSession();

  return useMutation({
    mutationFn: async (credential) => {
      const res = await api.get(
        `/api/v1/user/google/callback?token=${credential}`
      );
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.success) {
        const user = sanitizeUser(data?.data?.user);
        dispatch(login(user));
        localStorage.setItem("token", JSON.stringify(data.token));
        hydrateSession(user);
      }
    },
  });
}

// POST /api/v1/contact/new-contact
export function useContactMutation() {
  return useMutation({
    mutationFn: async (formData) => {
      const res = await api.post(`/api/v1/contact/new-contact`, formData);
      return res;
    },
  });
}
