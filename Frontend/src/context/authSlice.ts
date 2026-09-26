import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { User } from "../types/user";

export interface AuthState {
  status: boolean;
  userData: User | null;
}

const getStoredUserData = (): User | null => {
  try {
    const raw = localStorage.getItem("data");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const storedUserData = getStoredUserData();

const initialState: AuthState = {
  status: Boolean(storedUserData),
  userData: storedUserData,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<User | null>) => {
      const userData = action.payload;
      state.status = Boolean(userData);
      state.userData = userData;
      if (userData) {
        localStorage.setItem("data", JSON.stringify(userData));
      }
    },

    logout: (state) => {
      state.status = false;
      state.userData = null;
      localStorage.removeItem("data");
    },
  },
});

export const { login, logout } = authSlice.actions;

export default authSlice.reducer;
