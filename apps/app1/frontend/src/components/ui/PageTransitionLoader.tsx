"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { usePageLoading } from "@/contexts/LoadingContext";

export function PageTransitionLoader() {
  const pathname = usePathname();
  const { startPageTransition, endPageTransition } = usePageLoading();
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // Start loading when pathname changes
    setIsTransitioning(true);
    startPageTransition("Loading page...");

    // Simulate page load time and then hide loader
    const timer = setTimeout(() => {
      endPageTransition();
      setIsTransitioning(false);
    }, 500); // Adjust timing as needed

    return () => {
      clearTimeout(timer);
      if (isTransitioning) {
        endPageTransition();
        setIsTransitioning(false);
      }
    };
  }, [pathname, startPageTransition, endPageTransition]);

  return null; // This component doesn't render anything visible
}

// Alternative approach using router events (for app router)
export function useRouterLoading() {
  const pathname = usePathname();
  const { startPageTransition, endPageTransition } = usePageLoading();
  const [previousPathname, setPreviousPathname] = useState(pathname);

  useEffect(() => {
    if (pathname !== previousPathname) {
      startPageTransition("Navigating...");
      
      // Small delay to show the loader
      const timer = setTimeout(() => {
        endPageTransition();
        setPreviousPathname(pathname);
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [pathname, previousPathname, startPageTransition, endPageTransition]);
}
