import { useEffect } from "react";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../context/authSlice";
import { useLogout } from "../helpers/tokenValidation";
import { api, getToken, getErrorMessage } from "../utils";
import { queryKeys } from "./queryKeys";
import { User } from "../types/user";

// GET /api/v1/user/get-user-count — public landing-page counter.
export function useUserCount(): UseQueryResult<number, Error> {
  return useQuery({
    queryKey: queryKeys.userCount,
    queryFn: async () => {
      const response = await api.get(`/api/v1/user/get-user-count`);
      return response.data?.data?.totalUsers;
    },
  });
}

// GET /api/v1/user/getCurrentUser
export function useCurrentUser(): UseQueryResult<User, Error> {
  const dispatch = useDispatch();
  const logoutUser = useLogout();
  const token = getToken();
  const reduxUser = useSelector((state: any) => state.auth.userData as User | null);

  const query = useQuery<User, Error>({
    queryKey: queryKeys.currentUser,
    queryFn: async () => {
      const response = await api.get(`/api/v1/user/getCurrentUser`);
      return response.data?.data;
    },
    enabled: !!token,
    placeholderData: reduxUser ?? undefined,
  });

  const { data, isSuccess, isError, error, isPlaceholderData } = query;

  useEffect(() => {
    if (isSuccess && data && !isPlaceholderData) {
      dispatch(login(data));
    }
  }, [isSuccess, data, isPlaceholderData, dispatch]);

  useEffect(() => {
    if (isError) {
      console.error("Error while validating token:", error);
      logoutUser({
        title: "Authentication Error",
        message: getErrorMessage(error, "Please log in again"),
      });
    }
  }, [isError, error, logoutUser]);

  return query;
}
