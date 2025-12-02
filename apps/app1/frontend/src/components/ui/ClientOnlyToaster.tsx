"use client";

import { useEffect, useState } from "react";
import { Toaster } from "sonner";

export function ClientOnlyToaster() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      duration={4000}
    />
  );
}
