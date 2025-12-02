"use client";

import { useAppSelector } from "@/redux/store";
import { loadAuthState } from "@/redux/localStorage";
import { useState, useEffect } from "react";

export default function AuthTestPage() {
  const authState = useAppSelector((state) => state.auth);
  const [localStorageState, setLocalStorageState] = useState<any>(null);
  const [rawLocalStorage, setRawLocalStorage] = useState<string | null>(null);

  useEffect(() => {
    // Load auth state from localStorage
    const savedState = loadAuthState();
    setLocalStorageState(savedState);
    
    // Get raw localStorage value
    const raw = localStorage.getItem("mas3ndi_auth_state");
    setRawLocalStorage(raw);
  }, []);

  const clearAuth = () => {
    localStorage.removeItem("mas3ndi_auth_state");
    window.location.reload();
  };

  const testAuth = () => {
    const testData = {
      user: { id: "test", name: "Test User", email: "test@example.com", role: "CLIENT", walletBalance: 0 },
      token: "test-token-123",
      refreshToken: "test-refresh-token-123",
      refreshTokenExpiresAt: new Date(Date.now() + 3600000).toISOString()
    };
    
    localStorage.setItem("mas3ndi_auth_state", JSON.stringify(testData));
    window.location.reload();
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication State Test</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Redux State */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">Redux Auth State</h2>
          <div className="space-y-2 text-sm">
            <div><strong>isAuthenticated:</strong> {authState.isAuthenticated ? "✅ Yes" : "❌ No"}</div>
            <div><strong>hasUser:</strong> {authState.user ? "✅ Yes" : "❌ No"}</div>
            <div><strong>hasToken:</strong> {authState.token ? "✅ Yes" : "❌ No"}</div>
            <div><strong>hasRefreshToken:</strong> {authState.refreshToken ? "✅ Yes" : "❌ No"}</div>
            {authState.user && (
              <div className="mt-3 p-2 bg-gray-50 rounded">
                <div><strong>User ID:</strong> {authState.user.id}</div>
                <div><strong>Name:</strong> {authState.user.name}</div>
                <div><strong>Email:</strong> {authState.user.email}</div>
                <div><strong>Role:</strong> {authState.user.role}</div>
              </div>
            )}
          </div>
        </div>

        {/* localStorage State */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-3">localStorage State</h2>
          <div className="space-y-2 text-sm">
            <div><strong>hasData:</strong> {localStorageState ? "✅ Yes" : "❌ No"}</div>
            {localStorageState && (
              <>
                <div><strong>hasUser:</strong> {localStorageState.user ? "✅ Yes" : "❌ No"}</div>
                <div><strong>hasToken:</strong> {localStorageState.token ? "✅ Yes" : "❌ No"}</div>
                <div><strong>hasRefreshToken:</strong> {localStorageState.refreshToken ? "✅ Yes" : "❌ No"}</div>
                {localStorageState.user && (
                  <div className="mt-3 p-2 bg-gray-50 rounded">
                    <div><strong>User ID:</strong> {localStorageState.user.id}</div>
                    <div><strong>Name:</strong> {localStorageState.user.name}</div>
                    <div><strong>Email:</strong> {localStorageState.user.email}</div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Raw localStorage */}
        <div className="bg-white p-4 rounded-lg shadow md:col-span-2">
          <h2 className="text-lg font-semibold mb-3">Raw localStorage Data</h2>
          <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40">
            {rawLocalStorage || "No data found"}
          </pre>
        </div>

        {/* Actions */}
        <div className="bg-white p-4 rounded-lg shadow md:col-span-2">
          <h2 className="text-lg font-semibold mb-3">Actions</h2>
          <div className="space-x-4">
            <button
              onClick={clearAuth}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear Auth & Reload
            </button>
            <button
              onClick={testAuth}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Set Test Auth & Reload
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
