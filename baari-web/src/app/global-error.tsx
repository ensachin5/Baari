"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error caught]:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-white text-black flex flex-col items-center justify-center p-6 text-center font-sans select-none">
        <div className="max-w-sm w-full flex flex-col items-center">
          <h1 className="text-2xl font-bold mb-2">Something went wrong!</h1>
          <p className="text-sm text-gray-600 mb-6">
            A critical server error occurred. Please try reloading the application.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-[#0A2540] text-white rounded-lg font-medium text-sm hover:opacity-90 transition-opacity cursor-pointer"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
