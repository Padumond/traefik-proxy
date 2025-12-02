"use client";

import { useEffect, useState } from "react";
import { useAppDispatch } from "@/redux/store";
import { setCredentials } from "@/redux/authSlice";
import { loadAuthState } from "@/redux/localStorage";

export function AuthInitializer() {
  const dispatch = useAppDispatch();
  const [isClient, setIsClient] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Mark that we're now on the client side
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only run this effect on the client side to avoid hydration mismatch
    if (!isClient || typeof window === "undefined" || isInitialized) return;

    try {
      // Use the centralized loadAuthState function
      const savedAuthState = loadAuthState();

      if (savedAuthState && savedAuthState.user && savedAuthState.token) {
        console.log("AuthInitializer: Restoring auth state from localStorage", {
          hasUser: !!savedAuthState.user,
          hasToken: !!savedAuthState.token,
          hasRefreshToken: !!savedAuthState.refreshToken,
          userEmail: savedAuthState.user?.email,
        });

        dispatch(
          setCredentials({
            user: savedAuthState.user,
            token: savedAuthState.token,
            refreshToken: savedAuthState.refreshToken,
            refreshTokenExpiresAt: savedAuthState.refreshTokenExpiresAt,
          })
        );
      } else {
        console.log(
          "AuthInitializer: No valid auth state found in localStorage"
        );
      }

      setIsInitialized(true);
    } catch (error) {
      console.error("AuthInitializer: Failed to restore auth state:", error);
      // If parsing fails, remove the corrupted data
      try {
        localStorage.removeItem("mas3ndi_auth_state");
      } catch (e) {
        // Ignore localStorage errors
      }
      setIsInitialized(true);
    }
  }, [dispatch, isClient, isInitialized]);

  // This component doesn't render anything
  return null;
}
