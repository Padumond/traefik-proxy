/**
 * Helper functions to store and retrieve authentication state from localStorage
 */

// Key for storing auth data in localStorage
const AUTH_STATE_KEY = "mas3ndi_auth_state";

// Debug flag - set to true to see detailed logs
const DEBUG = false;

// Check if code is running in browser environment
const isBrowser = typeof window !== "undefined";

// Save auth state to localStorage
export const saveAuthState = (state: any) => {
  if (!isBrowser) return; // Don't try to use localStorage on server

  try {
    if (!state.user) {
      if (DEBUG) console.log("Not saving auth state - user is null");
      return;
    }

    // Create a cleaned state object for storage
    const stateToStore = {
      user: state.user,
      token: state.token,
      refreshToken: state.refreshToken,
      refreshTokenExpiresAt: state.refreshTokenExpiresAt,
    };

    // Log state being saved
    if (DEBUG) console.log("Saving auth state to localStorage:", stateToStore);

    const serializedState = JSON.stringify(stateToStore);
    localStorage.setItem(AUTH_STATE_KEY, serializedState);

    if (DEBUG) console.log("Auth state saved successfully");
  } catch (error) {
    console.error("Could not save auth state to localStorage:", error);
  }
};

// Load auth state from localStorage
export const loadAuthState = () => {
  if (!isBrowser) {
    if (DEBUG) console.log("Not loading auth state - not in browser");
    return undefined; // Return undefined on server
  }

  try {
    const serializedState = localStorage.getItem(AUTH_STATE_KEY);

    if (!serializedState) {
      if (DEBUG) console.log("No auth state found in localStorage");
      return undefined;
    }

    const parsedState = JSON.parse(serializedState);

    if (DEBUG) console.log("Loaded auth state from localStorage:", parsedState);
    if (DEBUG) console.log("User from localStorage:", parsedState?.user);

    return parsedState;
  } catch (error) {
    console.error("Could not load auth state from localStorage:", error);
    return undefined;
  }
};

// Clear auth state from localStorage
export const clearAuthState = () => {
  if (!isBrowser) return; // Don't try to use localStorage on server

  try {
    if (DEBUG) console.log("Clearing auth state from localStorage");
    localStorage.removeItem(AUTH_STATE_KEY);
    if (DEBUG) console.log("Auth state cleared successfully");
  } catch (error) {
    console.error("Could not clear auth state from localStorage:", error);
  }
};

// Force save a specific user state (useful for debugging)
export const forceSetAuthState = (userData: any) => {
  if (!isBrowser) return;

  try {
    const stateToStore = {
      user: userData,
      token: "debug-token",
      refreshToken: "debug-refresh-token",
      refreshTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    if (DEBUG) console.log("Force-setting auth state:", stateToStore);

    const serializedState = JSON.stringify(stateToStore);
    localStorage.setItem(AUTH_STATE_KEY, serializedState);

    if (DEBUG) console.log("Auth state force-set successfully");
    return stateToStore;
  } catch (error) {
    console.error("Could not force-set auth state:", error);
    return undefined;
  }
};
