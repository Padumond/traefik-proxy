import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { useDispatch, useSelector, TypedUseSelectorHook } from "react-redux";
import { messagesApi } from "./services/messagesApi";
import { authApi } from "./services/authApi";
import { dashboardApi } from "./services/dashboardApi";
import { adminApi } from "./services/adminApi";
import { userApi } from "./services/userApi";
import { balanceApi } from "./services/balanceApi";
import { deliveryReportsApi } from "./services/deliveryReportsApi";
import { apiKeysApi } from "./services/apiKeysApi";
import { senderIdApi } from "./services/senderIdApi";
import { smsPackagesApi } from "./services/smsPackagesApi";
import { transactionsApi } from "./services/transactionsApi";
import authReducer from "./authSlice";
import { loadAuthState, saveAuthState } from "./localStorage";
import {
  loadingMiddleware,
  loadingReducer,
} from "./middleware/loadingMiddleware";

// Create the store with optimized middleware
export const store = configureStore({
  reducer: {
    // Add the generated reducers as specific top-level slices
    [messagesApi.reducerPath]: messagesApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [adminApi.reducerPath]: adminApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [balanceApi.reducerPath]: balanceApi.reducer,
    [deliveryReportsApi.reducerPath]: deliveryReportsApi.reducer,
    [apiKeysApi.reducerPath]: apiKeysApi.reducer,
    [senderIdApi.reducerPath]: senderIdApi.reducer,
    [smsPackagesApi.reducerPath]: smsPackagesApi.reducer,
    [transactionsApi.reducerPath]: transactionsApi.reducer,
    auth: authReducer,
    loading: loadingReducer,
  },
  // Optimized middleware configuration
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
        // Ignore these field paths in all actions
        ignoredActionsPaths: ["meta.arg", "payload.timestamp"],
        // Ignore these paths in the state
        ignoredPaths: ["items.dates"],
      },
      // Optimize immutability checks for production
      immutableCheck: process.env.NODE_ENV === "development",
    }).concat(
      loadingMiddleware,
      messagesApi.middleware,
      authApi.middleware,
      dashboardApi.middleware,
      adminApi.middleware,
      userApi.middleware,
      balanceApi.middleware,
      deliveryReportsApi.middleware,
      apiKeysApi.middleware,
      senderIdApi.middleware,
      smsPackagesApi.middleware,
      transactionsApi.middleware
    ),
  // Enable Redux DevTools only in development
  devTools: process.env.NODE_ENV === "development",
});

// Note: Auth state is now saved directly in the authSlice reducers
// to avoid double-saving and ensure consistency

// Optional, but required for refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Use throughout your app instead of plain `useDispatch` and `useSelector`
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Client-side initialization already handled by preloadedState
// and the subscribe function above, no need for additional initialization
