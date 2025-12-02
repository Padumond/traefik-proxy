"use client";

import React, { memo, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { SkeletonLoader } from '@/components/ui/OptimizedLoader';

// Lazy load heavy components
const Sidebar = dynamic(() => import('./Sidebar'), {
  loading: () => <SkeletonLoader className="w-64 h-screen" />,
  ssr: false,
});

const Header = dynamic(() => import('./Header'), {
  loading: () => <SkeletonLoader className="h-16 w-full" />,
  ssr: false,
});

const Footer = dynamic(() => import('./Footer'), {
  loading: () => <SkeletonLoader className="h-12 w-full" />,
  ssr: false,
});

// Memoized navigation items to prevent re-computation
const useNavigationItems = memo(() => {
  return useMemo(() => [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: 'dashboard',
    },
    {
      name: 'Messages',
      path: '/messages',
      icon: 'messages',
    },
    {
      name: 'Contacts',
      path: '/contacts',
      icon: 'contacts',
    },
    {
      name: 'Analytics',
      path: '/analytics',
      icon: 'analytics',
    },
    {
      name: 'Packages',
      path: '/packages',
      icon: 'packages',
    },
    {
      name: 'Wallet',
      path: '/wallet',
      icon: 'wallet',
    },
  ], []);
});

// Optimized layout component
interface OptimizedLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  showHeader?: boolean;
  showFooter?: boolean;
}

const OptimizedLayout = memo(({
  children,
  showSidebar = true,
  showHeader = true,
  showFooter = false,
}: OptimizedLayoutProps) => {
  const pathname = usePathname();
  const navigationItems = useNavigationItems();

  // Memoize layout classes to prevent recalculation
  const layoutClasses = useMemo(() => ({
    container: `min-h-screen bg-gray-50 ${showSidebar ? 'lg:pl-64' : ''}`,
    main: 'flex-1 flex flex-col',
    content: 'flex-1 p-4 lg:p-6',
  }), [showSidebar]);

  // Memoize current page info
  const currentPageInfo = useMemo(() => {
    const currentItem = navigationItems.find(item => item.path === pathname);
    return {
      title: currentItem?.name || 'Page',
      path: pathname,
    };
  }, [pathname, navigationItems]);

  return (
    <div className={layoutClasses.container}>
      {/* Sidebar */}
      {showSidebar && (
        <Suspense fallback={<SkeletonLoader className="fixed inset-y-0 left-0 w-64" />}>
          <Sidebar navigationItems={navigationItems} currentPath={pathname} />
        </Suspense>
      )}

      {/* Main Content */}
      <div className={layoutClasses.main}>
        {/* Header */}
        {showHeader && (
          <Suspense fallback={<SkeletonLoader className="h-16 w-full" />}>
            <Header pageInfo={currentPageInfo} />
          </Suspense>
        )}

        {/* Page Content */}
        <main className={layoutClasses.content}>
          <Suspense fallback={<SkeletonLoader count={5} className="space-y-4" />}>
            {children}
          </Suspense>
        </main>

        {/* Footer */}
        {showFooter && (
          <Suspense fallback={<SkeletonLoader className="h-12 w-full" />}>
            <Footer />
          </Suspense>
        )}
      </div>
    </div>
  );
});

OptimizedLayout.displayName = 'OptimizedLayout';

export default OptimizedLayout;

// Optimized page wrapper for common layouts
export const DashboardPageWrapper = memo(({ children }: { children: React.ReactNode }) => (
  <OptimizedLayout showSidebar showHeader>
    {children}
  </OptimizedLayout>
));

DashboardPageWrapper.displayName = 'DashboardPageWrapper';

export const AuthPageWrapper = memo(({ children }: { children: React.ReactNode }) => (
  <OptimizedLayout showSidebar={false} showHeader={false}>
    {children}
  </OptimizedLayout>
));

AuthPageWrapper.displayName = 'AuthPageWrapper';

export const AdminPageWrapper = memo(({ children }: { children: React.ReactNode }) => (
  <OptimizedLayout showSidebar showHeader showFooter>
    {children}
  </OptimizedLayout>
));

AdminPageWrapper.displayName = 'AdminPageWrapper';
