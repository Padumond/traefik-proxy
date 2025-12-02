"use client";

import { useState } from "react";
import { useLoginMutation } from "@/redux/services/authApi";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/redux/authSlice";
import { useRouter } from "next/navigation";

export default function TestLoginPage() {
  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("Password123!");
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useDispatch();
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      console.log("Attempting login with:", { email, password });
      const apiResponse = await login({ email, password }).unwrap();
      console.log("Login API response:", apiResponse);

      // Extract auth data (same logic as main login page)
      let authData;
      if (apiResponse.data) {
        authData = apiResponse.data;
      } else {
        authData = apiResponse;
      }

      console.log("Auth data to save:", authData);

      // Save to Redux (which will also save to localStorage)
      dispatch(setCredentials(authData));

      setSuccess("Login successful! Check localStorage and Redux state.");
      
      // Don't redirect automatically, let user test persistence
      setTimeout(() => {
        router.push("/auth-test");
      }, 2000);

    } catch (err: any) {
      console.error("Login error:", err);
      setError(err?.data?.message || err?.message || "Login failed");
    }
  };

  const testPersistence = () => {
    // Reload the page to test if auth state persists
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-2xl font-bold text-center">Test Login</h2>
          <p className="text-sm text-gray-600 text-center mt-2">
            Simple login form for testing authentication persistence
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="text-green-600 text-sm bg-green-50 p-3 rounded">
              {success}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div className="space-y-2">
          <button
            onClick={testPersistence}
            className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Test Persistence (Reload Page)
          </button>
          
          <button
            onClick={() => router.push("/auth-test")}
            className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Go to Auth Test Page
          </button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Test Credentials:</strong></p>
          <p>Email: test@example.com</p>
          <p>Password: Password123!</p>
          <p className="mt-2">
            <strong>Note:</strong> If login fails, the test user might not exist. 
            Use the "Set Test Auth" button on the auth-test page instead.
          </p>
        </div>
      </div>
    </div>
  );
}
