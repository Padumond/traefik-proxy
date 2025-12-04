import { useAppSelector } from "@/redux/store";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";

// Debug logging for auth state
const authDebugLog = (message: string, data?: any) => {
  const shouldLog =
    typeof window !== "undefined" &&
    (process.env.NODE_ENV === "development" ||
      localStorage.getItem("mas3ndi_debug") === "true");
  if (shouldLog) {
    console.log(
      `[MAS3NDI AUTH] ${new Date().toISOString()} - ${message}`,
      data || ""
    );
  }
};

type ProtectedRouteProps = {
  children: React.ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, token, user } = useAppSelector(
    (state) => state.auth
  );
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const mountTime = useRef(Date.now());
  const initTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Log component mount
  useEffect(() => {
    authDebugLog("ProtectedRoute mounted", {
      pathname,
      isAuthenticated,
      hasToken: !!token,
      hasUser: !!user,
    });

    return () => {
      authDebugLog("ProtectedRoute unmounted", {
        pathname,
        lifespan: `${Date.now() - mountTime.current}ms`,
      });
    };
  }, []);

  // Give time for AuthInitializer to restore state from localStorage
  useEffect(() => {
    authDebugLog("Starting auth initialization timer");

    initTimeoutRef.current = setTimeout(() => {
      authDebugLog("Auth initialization complete", {
        isAuthenticated,
        hasToken: !!token,
        hasUser: !!user,
        duration: `${Date.now() - mountTime.current}ms`,
      });
      setIsInitializing(false);
    }, 100); // Small delay to allow AuthInitializer to run

    return () => {
      if (initTimeoutRef.current) {
        clearTimeout(initTimeoutRef.current);
      }
    };
  }, []);

  // Track auth state changes
  useEffect(() => {
    authDebugLog("Auth state changed", {
      isAuthenticated,
      hasToken: !!token,
      hasUser: !!user,
      userEmail: user?.email,
      isInitializing,
      hasCheckedAuth,
    });
  }, [isAuthenticated, token, user, isInitializing, hasCheckedAuth]);

  useEffect(() => {
    if (isInitializing) {
      authDebugLog("Still initializing, waiting...");
      return;
    }

    if (!hasCheckedAuth) {
      authDebugLog("First auth check");
      setHasCheckedAuth(true);
    }

    // Only redirect if we're sure there's no authentication
    if (!isAuthenticated && !token && !user) {
      authDebugLog("No authentication found, redirecting to login", {
        pathname,
      });
      router.push("/login");
    } else {
      authDebugLog("Authentication verified", {
        isAuthenticated,
        hasToken: !!token,
        pathname,
      });
    }
  }, [
    isAuthenticated,
    token,
    user,
    router,
    isInitializing,
    hasCheckedAuth,
    pathname,
  ]);

  // Show loading while initializing or if not authenticated
  if (isInitializing || (!isAuthenticated && !token)) {
    const reason = isInitializing ? "initializing" : "not authenticated";
    authDebugLog(`Showing loading spinner: ${reason}`, {
      isInitializing,
      isAuthenticated,
      hasToken: !!token,
      waitingFor: `${Date.now() - mountTime.current}ms`,
    });

    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">
            {isInitializing ? "Initializing..." : "Checking authentication..."}
          </p>
        </div>
      </div>
    );
  }

  authDebugLog("Rendering protected content", { pathname, isAuthenticated });
  return isAuthenticated ? <>{children}</> : null;
};

export default ProtectedRoute;
