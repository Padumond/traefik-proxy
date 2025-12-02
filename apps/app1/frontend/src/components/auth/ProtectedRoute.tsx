import { useAppSelector } from "@/redux/store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const router = useRouter();
  const { isAuthenticated, token, user } = useAppSelector(
    (state) => state.auth
  );
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Give time for AuthInitializer to restore state from localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 100); // Small delay to allow AuthInitializer to run

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isInitializing) return; // Don't check auth while initializing

    if (!hasCheckedAuth) {
      setHasCheckedAuth(true);
    }

    // Only redirect if we're sure there's no authentication
    if (!isAuthenticated && !token && !user) {
      console.log(
        "ProtectedRoute: No authentication found, redirecting to login"
      );
      router.push("/login");
    }
  }, [isAuthenticated, token, user, router, isInitializing, hasCheckedAuth]);

  // Show loading while initializing or if not authenticated
  if (isInitializing || (!isAuthenticated && !token)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : null;
};

export default ProtectedRoute;
