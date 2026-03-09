"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 bg-gray-100">
      <h1 className="text-xl font-bold text-gray-900">Something went wrong</h1>
      <p className="text-sm text-gray-600 mt-2">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
      >
        Try again
      </button>
    </div>
  );
}
