import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLogoutMutation } from "@/redux/services/authApi";
import { logout as logoutAction } from "@/redux/authSlice";
import { useRouter } from "next/navigation";
import { RootState } from "@/redux/store";
import { clearAuthState } from "@/redux/localStorage";

export const useLogout = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const [logoutApi] = useLogoutMutation();
  const refreshToken = useSelector(
    (state: RootState) => state.auth.refreshToken
  );

  const logout = useCallback(async () => {
    try {
      if (refreshToken) {
        await logoutApi({ refreshToken }).unwrap();
      }
    } catch (e) {
      // Ignore API errors, just clear local state
      console.log("Logout API error (ignored):", e);
    } finally {
      // Clear Redux state
      dispatch(logoutAction());

      // Clear localStorage data
      clearAuthState();

      // Clear any cached data in sessionStorage as well
      if (typeof window !== "undefined") {
        try {
          sessionStorage.clear();
        } catch (e) {
          console.log("Error clearing sessionStorage:", e);
        }
      }

      // Use window.location.href for a hard redirect to avoid chunk loading issues
      // This ensures a complete page reload and avoids Next.js routing conflicts
      window.location.href = "/";
    }
  }, [dispatch, logoutApi, refreshToken]);

  return logout;
};
