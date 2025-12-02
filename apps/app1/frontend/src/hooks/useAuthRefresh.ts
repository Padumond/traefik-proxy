import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { RootState } from "@/redux/store";
import { useRefreshMutation } from "@/redux/services/authApi";
import { setCredentials, logout as logoutAction } from "@/redux/authSlice";

const REFRESH_BUFFER_SECONDS = 60;

export const useAuthRefresh = () => {
  const dispatch = useDispatch();
  const [refresh, { isLoading }] = useRefreshMutation();
  const { refreshToken, refreshTokenExpiresAt } = useSelector(
    (state: RootState) => state.auth
  );

  useEffect(() => {
    if (!refreshToken || !refreshTokenExpiresAt) {
      console.log("useAuthRefresh: No refresh token or expiry date");
      return;
    }

    const expiresAt = new Date(refreshTokenExpiresAt).getTime();
    const now = Date.now();
    const msUntilRefresh = expiresAt - now - REFRESH_BUFFER_SECONDS * 1000;

    console.log("useAuthRefresh: Token expires at:", new Date(expiresAt));
    console.log("useAuthRefresh: Time until refresh (ms):", msUntilRefresh);

    // If token is already expired by more than 5 minutes, don't try to refresh
    if (msUntilRefresh < -300000) {
      // 5 minutes
      console.log("useAuthRefresh: Token is too old, logging out");
      dispatch(logoutAction());
      return;
    }

    if (msUntilRefresh <= 0) {
      console.log("useAuthRefresh: Token needs immediate refresh");
      doRefresh();
      return;
    }

    console.log(
      "useAuthRefresh: Setting refresh timeout for",
      msUntilRefresh,
      "ms"
    );
    const timeout = setTimeout(doRefresh, msUntilRefresh);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken, refreshTokenExpiresAt]);

  const doRefresh = async () => {
    if (!refreshToken) {
      console.log("useAuthRefresh: No refresh token available");
      return;
    }

    console.log("useAuthRefresh: Attempting to refresh token");
    try {
      const result = await refresh({ refreshToken }).unwrap();
      console.log("useAuthRefresh: Token refresh successful");
      dispatch(setCredentials(result));
    } catch (err) {
      console.error("useAuthRefresh: Token refresh failed, logging out:", err);
      dispatch(logoutAction());
    }
  };

  return { isLoading };
};
