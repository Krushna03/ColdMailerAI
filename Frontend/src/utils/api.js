import axios from "axios";
import { getToken, removeToken } from "./localStorage";

const API_BASE_URL = import.meta.env.VITE_BASE_URL;

const AUTH_FREE_PATHS = [
  "/api/v1/user/login",
  "/api/v1/user/register",
  "/api/v1/user/logout",
  "/api/v1/user/google",
  "/api/v1/contact",
  "/api/v1/community",
];

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isAuthFree = AUTH_FREE_PATHS.some((path) => requestUrl.includes(path));

    if (error.response?.status === 401 && !isAuthFree) {
      removeToken();
      window.location.href = "/sign-in";
    }

    return Promise.reject(error);
  }
);
