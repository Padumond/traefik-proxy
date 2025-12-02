import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { User } from "./services/authApi";

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  refreshTokenExpiresAt: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  refreshTokenExpiresAt: null,
  isAuthenticated: false,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        user: User;
        token: string;
        refreshToken?: string;
        refreshTokenExpiresAt?: string;
      }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken || null;
      state.refreshTokenExpiresAt =
        action.payload.refreshTokenExpiresAt || null;
      state.isAuthenticated = true;

      // Save to localStorage only on client side using the centralized function
      if (typeof window !== "undefined") {
        const authStateToSave = {
          user: action.payload.user,
          token: action.payload.token,
          refreshToken: action.payload.refreshToken,
          refreshTokenExpiresAt: action.payload.refreshTokenExpiresAt,
        };

        localStorage.setItem(
          "mas3ndi_auth_state",
          JSON.stringify(authStateToSave)
        );
        console.log("Auth state saved to localStorage:", authStateToSave);
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.refreshTokenExpiresAt = null;
      state.isAuthenticated = false;

      // Clear localStorage only on client side
      if (typeof window !== "undefined") {
        localStorage.removeItem("mas3ndi_auth_state");
        console.log("Auth state cleared from localStorage");
      }
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
