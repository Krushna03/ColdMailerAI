import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import { login } from "../context/authSlice";
import { useLogout } from "../helpers/tokenValidation";
import { api, getToken, getErrorMessage } from "../utils";
import { queryKeys } from "./queryKeys";

// GET /api/v1/user/get-user-count — public landing-page counter.
export function useUserCount() {
  return useQuery({
    queryKey: queryKeys.userCount,
    queryFn: async () => {
      const response = await api.get(`/api/v1/user/get-user-count`);
      return response.data?.data?.totalUsers;
    },
  });
}

// Validates the session via getCurrentUser when needed.
// - After login/register/Google: cache is seeded in useAuth, so this does NOT
//   refetch immediately (default staleTime is 60s).
// - On hard refresh / direct visit: cache is empty → fetches once to validate
//   the token and refresh Redux/localStorage user.
// - Redux already hydrates from localStorage on boot, so UI is not blank
//   while this request is in flight.

// GET /api/v1/user/getCurrentUser
export function useCurrentUser() {
  const dispatch = useDispatch();
  const logoutUser = useLogout();
  const token = getToken();
  const reduxUser = useSelector((state) => state.auth.userData);

  const query = useQuery({
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
