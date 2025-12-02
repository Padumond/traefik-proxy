"use client";

import { useCallback, useState, useEffect, memo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useAuthRefresh } from "@/hooks/useAuthRefresh";
import { useLogout } from "@/hooks/useLogout";
import { useSelector } from "react-redux";
import { RootState } from "@/redux/store";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import Logo from "@/components/ui/Logo";
import Avatar from "@/components/ui/Avatar";
import { useGetCurrentUserQuery } from "@/redux/services/userApi";
import { SkeletonLoader } from "@/components/ui/OptimizedLoader";

// Lazy load heavy components
const AvatarUpload = dynamic(() => import("@/components/ui/AvatarUpload"), {
  loading: () => <SkeletonLoader className="w-10 h-10 rounded-full" />,
  ssr: false,
});

// Memoized Icon components for better performance
const DashboardIcon = memo(() => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
    ></path>
  </svg>
));
DashboardIcon.displayName = "DashboardIcon";

const MessagesIcon = memo(() => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
    ></path>
  </svg>
));
MessagesIcon.displayName = "MessagesIcon";

const WalletIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
    ></path>
  </svg>
);

const APIIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
    ></path>
  </svg>
);

const SettingsIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    ></path>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    ></path>
  </svg>
);

const LogoutIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    ></path>
  </svg>
);

const MenuIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M4 6h16M4 12h16M4 18h16"
    ></path>
  </svg>
);

const CloseIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M6 18L18 6M6 6l12 12"
    ></path>
  </svg>
);

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAuthRefresh();
  const logout = useLogout();

  // Get the complete Redux state for debugging
  const authState = useSelector((state: RootState) => state.auth);

  // Check if the auth state is populated
  const isAuthenticated = !!authState.token;

  // Auth state is available for debugging if needed

  // Get user with proper fallback handling - only use fallback for display purposes
  // Don't use the fallback for authentication checks
  const user =
    useSelector((state: RootState) => state.auth.user) ||
    ({
      name: "Guest User",
      email: "guest@example.com",
      avatar: "/images/avatar.png",
    } as const);

  // Get current user data with avatar
  const { data: currentUserData, refetch: refetchUser } =
    useGetCurrentUserQuery();

  // If no actual user data, redirect to login page (but be less aggressive)
  useEffect(() => {
    // Add a small delay to allow AuthInitializer to restore state
    const timer = setTimeout(() => {
      if (
        !authState.user &&
        !authState.token &&
        typeof window !== "undefined"
      ) {
        console.log(
          "AuthenticatedLayout: No auth state found, redirecting to login"
        );
        // Use window.location for a hard redirect instead of router.push
        // This ensures a full page reload and avoids hydration issues
        window.location.href = "/login";
      }
    }, 200); // Give AuthInitializer time to restore state

    return () => clearTimeout(timer);
  }, [authState.user, authState.token]);

  // Sidebar state
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const pathname = usePathname();

  // Active route check
  const isActive = useCallback(
    (path: string) => {
      return pathname === path || pathname.startsWith(`${path}/`);
    },
    [pathname]
  );

  // Get the current page title from the pathname
  const getPageTitle = useCallback(() => {
    if (!pathname) return "Dashboard";

    // Remove leading slash and split by remaining slashes
    const parts = pathname.slice(1).split("/");
    if (parts.length === 0) return "Dashboard";

    // Capitalize the first letter of the first part
    let title = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);

    // Replace hyphens with spaces and capitalize each word
    title = title.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

    return title;
  }, [pathname]);

  // Mark as client-side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle window resize - only on client side
  useEffect(() => {
    if (!isClient) return;

    const checkIsMobile = () => {
      const width = window.innerWidth;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;

      setIsMobileView(isMobile);

      // Better responsive sidebar behavior
      if (isMobile) {
        setSidebarOpen(false); // Always closed on mobile by default
      } else if (isTablet) {
        setSidebarOpen(false); // Collapsed on tablet for more space
      } else {
        setSidebarOpen(true); // Open on desktop
      }
    };

    // Set initial value
    checkIsMobile();

    // Add event listener
    window.addEventListener("resize", checkIsMobile);

    // Clean up
    return () => window.removeEventListener("resize", checkIsMobile);
  }, [isClient]);

  // Navigation items based on user role
  const getNavItems = () => {
    const baseItems = [
      {
        name: "Dashboard",
        path: "/dashboard",
        icon: <DashboardIcon />,
      },
    ];

    if (authState.user?.role === "ADMIN") {
      return [
        ...baseItems,
        {
          name: "Clients",
          path: "/clients",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          ),
        },
        {
          name: "All Messages",
          path: "/admin/messages",
          icon: <MessagesIcon />,
        },
        {
          name: "Sender IDs",
          path: "/admin/sender-ids",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          ),
        },
        {
          name: "Wallet Management",
          path: "/admin/wallets",
          icon: <WalletIcon />,
        },
        {
          name: "System Reports",
          path: "/admin/reports",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          ),
        },
        {
          name: "Profile",
          path: "/profile",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          ),
        },
        {
          name: "Settings",
          path: "/settings",
          icon: <SettingsIcon />,
        },
      ];
    } else {
      // Client navigation
      return [
        ...baseItems,
        {
          name: "Contacts",
          path: "/contacts",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          ),
        },
        {
          name: "Messages",
          path: "/messages",
          icon: <MessagesIcon />,
        },

        {
          name: "Analytics",
          path: "/analytics",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          ),
        },
        {
          name: "Balance",
          path: "/balance",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
              />
            </svg>
          ),
        },
        {
          name: "Delivery Reports",
          path: "/delivery-reports",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          ),
        },
        {
          name: "Sender IDs",
          path: "/sender-ids",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          ),
        },
        {
          name: "Packages",
          path: "/packages",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          ),
        },
        {
          name: "Wallet",
          path: "/wallet",
          icon: <WalletIcon />,
        },
        {
          name: "Transactions",
          path: "/transactions",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        },
        {
          name: "API Keys",
          path: "/api-keys",
          icon: <APIIcon />,
        },
        {
          name: "Reports",
          path: "/reports",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          ),
        },
        {
          name: "Support",
          path: "/support",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          ),
        },
        {
          name: "Profile",
          path: "/profile",
          icon: (
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          ),
        },
        {
          name: "Settings",
          path: "/settings",
          icon: <SettingsIcon />,
        },
      ];
    }
  };

  const navItems = getNavItems();

  // Animation variants for the sidebar
  const sidebarVariants = {
    open: {
      x: 0,
      opacity: 1,
      width: isClient && isMobileView ? 288 : 288, // 72 * 4 = 288px (w-72)
    },
    closed: {
      x: isClient && isMobileView ? -288 : 0,
      opacity: isClient && isMobileView ? 0 : 1,
      width: isClient && isMobileView ? 0 : 80, // w-20
    },
  };

  // Animation variants for the content
  const contentVariants = {
    open: {
      marginLeft: isClient && isMobileView ? 0 : 288,
      paddingLeft: isClient && isMobileView ? 16 : 24, // Better mobile padding
    },
    closed: {
      marginLeft: isClient && isMobileView ? 0 : 80,
      paddingLeft: isClient && isMobileView ? 16 : 24,
    },
  };

  // Animation for nav items text
  const navTextVariants = {
    open: { opacity: 1, display: "block" },
    closed: {
      opacity: 0,
      transitionEnd: { display: "none" },
    },
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-50">
        {/* Mobile overlay */}
        {isClient && isMobileView && isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <motion.div
          className={`fixed inset-y-0 left-0 z-30 bg-primary-900 text-white shadow-lg flex flex-col ${
            isSidebarOpen ? "w-72" : "w-20"
          }`}
          animate={isSidebarOpen ? "open" : "closed"}
          variants={sidebarVariants}
          transition={{ duration: 0.3, type: "tween" }}
        >
          {/* Logo and toggle */}
          <div className="flex items-center justify-between p-4 border-b border-primary-700">
            <motion.div
              className="flex items-center"
              animate={isSidebarOpen ? "open" : "closed"}
            >
              <Logo
                variant="white"
                size="sm"
                showText={isSidebarOpen}
                animated={false}
                className="transition-all duration-300"
              />
            </motion.div>
            <button
              type="button"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              className="p-1 rounded-md hover:bg-primary-800 focus:outline-none"
              aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-2 px-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`flex items-center p-3 rounded-md transition-colors ${
                      isActive(item.path)
                        ? "bg-primary-700 text-white"
                        : "text-primary-100 hover:bg-primary-800"
                    }`}
                  >
                    <span className="inline-block">{item.icon}</span>
                    <motion.span
                      className="ml-4 font-medium"
                      variants={navTextVariants}
                      animate={isSidebarOpen ? "open" : "closed"}
                      transition={{ duration: 0.2 }}
                    >
                      {item.name}
                    </motion.span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* User profile */}
          <div className="p-4 border-t border-primary-700">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Avatar
                  src={currentUserData?.data?.avatar || user.avatar}
                  name={currentUserData?.data?.name || user.name}
                  size="md"
                  showBorder={true}
                  showStatus={true}
                  status="online"
                  animated={true}
                  fallbackBg="bg-primary-400"
                />
              </div>
              {isSidebarOpen && (
                <motion.div
                  className="ml-3 overflow-hidden"
                  variants={navTextVariants}
                  animate={isSidebarOpen ? "open" : "closed"}
                >
                  <p className="text-sm font-medium text-white truncate">
                    {currentUserData?.data?.name || user.name}
                  </p>
                  <p className="text-xs text-primary-300 truncate">
                    {currentUserData?.data?.email || user.email}
                  </p>
                </motion.div>
              )}
            </div>

            <button
              type="button"
              onClick={logout}
              className={`mt-4 flex items-center w-full p-2 rounded-md transition-colors text-primary-100 hover:bg-primary-800 ${
                !isSidebarOpen && "justify-center"
              }`}
              aria-label="Logout"
            >
              <LogoutIcon />
              <motion.span
                className="ml-3 text-sm"
                variants={navTextVariants}
                animate={isSidebarOpen ? "open" : "closed"}
              >
                Logout
              </motion.span>
            </button>
          </div>
        </motion.div>

        {/* Main content */}
        <motion.main
          className={`flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 ${
            isClient && isMobileView ? "p-4 pb-20" : "p-6 pb-20 pt-6"
          }`}
          animate={isSidebarOpen ? "open" : "closed"}
          variants={contentVariants}
          transition={{ duration: 0.3, type: "tween" }}
        >
          {/* Mobile header */}
          {isClient && isMobileView && (
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg bg-white shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                aria-label="Open navigation menu"
              >
                <MenuIcon />
              </button>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate px-2">
                {getPageTitle()}
              </h1>
              <div className="w-10 flex-shrink-0"></div>{" "}
              {/* Empty div for flex spacing */}
            </div>
          )}

          {/* Content */}
          {children}
        </motion.main>
      </div>
    </ProtectedRoute>
  );
}
