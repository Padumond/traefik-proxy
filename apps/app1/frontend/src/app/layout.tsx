import "../styles/globals.css";
import "../styles/loading.css";
import type { Metadata } from "next";
import { ReduxProvider } from "../redux/provider";
import { AuthInitializer } from "../components/auth/AuthInitializer";
import { ClientOnlyToaster } from "../components/ui/ClientOnlyToaster";
import { LoadingProvider } from "../contexts/LoadingContext";
import { GlobalLoaderWrapper } from "../components/ui/GlobalLoaderWrapper";
import ErrorBoundary from "../components/ErrorBoundary";
import { ErrorHandlerInitializer } from "../components/ErrorHandlerInitializer";
import { RouterErrorHandler } from "../components/RouterErrorHandler";

export const metadata: Metadata = {
  title: "Mas3ndi - Bulk SMS Reseller Platform",
  description:
    "The leading SMS reseller platform connecting businesses with reliable SMS services",
  icons: {
    icon: ["/favicon.svg", "/favicon.ico"],
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <body suppressHydrationWarning={true}>
        <ErrorBoundary>
          <ReduxProvider>
            <LoadingProvider>
              <ErrorHandlerInitializer />
              <RouterErrorHandler />
              <AuthInitializer />
              {children}
              <ClientOnlyToaster />
              <GlobalLoaderWrapper />
            </LoadingProvider>
          </ReduxProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
