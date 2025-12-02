"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Redirect page for /transactions/topup
 * This redirects to the wallet topup page since that's where the actual functionality is
 */
export default function TransactionsTopupRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the actual wallet topup page
    router.replace('/wallet/topup');
  }, [router]);

  // Show a loading state while redirecting
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to wallet top-up...</p>
      </div>
    </div>
  );
}
