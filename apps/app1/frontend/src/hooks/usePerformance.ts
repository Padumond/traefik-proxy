import { useEffect, useRef, useCallback } from "react";
import { performanceLogger } from "@/utils/logger";

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  const renderStartTime = useRef<number>(Date.now());
  const mountTime = useRef<number | null>(null);

  useEffect(() => {
    // Component mounted
    mountTime.current = Date.now();
    const mountDuration = mountTime.current - renderStartTime.current;

    performanceLogger.info(`🚀 ${componentName} mounted in ${mountDuration}ms`);

    // Cleanup
    return () => {
      const unmountTime = Date.now();
      const totalLifetime = unmountTime - (mountTime.current || unmountTime);
      performanceLogger.info(
        `🔄 ${componentName} unmounted after ${totalLifetime}ms`
      );
    };
  }, [componentName]);

  // Mark render start
  const markRenderStart = useCallback(() => {
    renderStartTime.current = Date.now();
  }, []);

  // Mark render end
  const markRenderEnd = useCallback(() => {
    const renderDuration = Date.now() - renderStartTime.current;
    if (process.env.NODE_ENV === "development" && renderDuration > 16) {
      console.warn(
        `⚠️ ${componentName} render took ${renderDuration}ms (>16ms)`
      );
    }
  }, [componentName]);

  return { markRenderStart, markRenderEnd };
};

// Web Vitals monitoring
export const useWebVitals = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Measure First Contentful Paint
    const measureFCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === "first-contentful-paint") {
            console.log(`📊 FCP: ${entry.startTime.toFixed(2)}ms`);
          }
        });
      });
      observer.observe({ entryTypes: ["paint"] });
    };

    // Measure Largest Contentful Paint
    const measureLCP = () => {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        console.log(`📊 LCP: ${lastEntry.startTime.toFixed(2)}ms`);
      });
      observer.observe({ entryTypes: ["largest-contentful-paint"] });
    };

    // Measure Cumulative Layout Shift
    const measureCLS = () => {
      let clsValue = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        console.log(`📊 CLS: ${clsValue.toFixed(4)}`);
      });
      observer.observe({ entryTypes: ["layout-shift"] });
    };

    // Measure First Input Delay
    const measureFID = () => {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const fid = (entry as any).processingStart - entry.startTime;
          console.log(`📊 FID: ${fid.toFixed(2)}ms`);
        }
      });
      observer.observe({ entryTypes: ["first-input"] });
    };

    if (process.env.NODE_ENV === "development") {
      measureFCP();
      measureLCP();
      measureCLS();
      measureFID();
    }
  }, []);
};

// Memory usage monitoring
export const useMemoryMonitor = () => {
  useEffect(() => {
    if (typeof window === "undefined" || !("memory" in performance)) return;

    const logMemoryUsage = () => {
      const memory = (performance as any).memory;
      if (memory) {
        performanceLogger.debug(`💾 Memory Usage:`, {
          used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
          total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
          limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
        });
      }
    };

    const interval = setInterval(logMemoryUsage, 30000); // Log every 30 seconds
    return () => clearInterval(interval);
  }, []);
};

// Bundle size analyzer
export const useBundleAnalyzer = () => {
  useEffect(() => {
    if (typeof window === "undefined" || process.env.NODE_ENV !== "development")
      return;

    // Analyze loaded scripts
    const scripts = Array.from(document.querySelectorAll("script[src]"));
    const totalSize = scripts.reduce((total, script) => {
      const src = script.getAttribute("src");
      if (src && src.includes("/_next/static/")) {
        // Estimate size based on script name patterns
        if (src.includes("chunks/pages/")) return total + 50; // ~50KB per page
        if (src.includes("chunks/main")) return total + 200; // ~200KB for main
        if (src.includes("chunks/framework")) return total + 150; // ~150KB for React
        return total + 25; // ~25KB for other chunks
      }
      return total;
    }, 0);

    console.log(`📦 Estimated bundle size: ~${totalSize}KB`);
    console.log(`📄 Loaded scripts: ${scripts.length}`);
  }, []);
};

// API call performance monitoring
export const useApiPerformance = () => {
  const trackApiCall = useCallback((url: string, method: string = "GET") => {
    const startTime = Date.now();

    return {
      end: (success: boolean = true) => {
        const duration = Date.now() - startTime;
        const status = success ? "✅" : "❌";

        if (process.env.NODE_ENV === "development") {
          console.log(`${status} API ${method} ${url}: ${duration}ms`);

          if (duration > 1000) {
            console.warn(`⚠️ Slow API call: ${url} took ${duration}ms`);
          }
        }
      },
    };
  }, []);

  return { trackApiCall };
};

// Component re-render tracking
export const useRenderTracker = (componentName: string, props?: any) => {
  const renderCount = useRef(0);
  const prevProps = useRef(props);

  useEffect(() => {
    renderCount.current += 1;

    if (process.env.NODE_ENV === "development") {
      console.log(`🔄 ${componentName} rendered ${renderCount.current} times`);

      if (props && prevProps.current) {
        const changedProps = Object.keys(props).filter(
          (key) => props[key] !== prevProps.current[key]
        );

        if (changedProps.length > 0) {
          console.log(`📝 ${componentName} props changed:`, changedProps);
        }
      }
    }

    prevProps.current = props;
  });

  return renderCount.current;
};
