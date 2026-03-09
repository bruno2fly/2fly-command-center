import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 bg-gray-100">
      <h1 className="text-2xl font-bold text-gray-900">404</h1>
      <p className="text-gray-600 mt-2">Page not found</p>
      <Link
        href="/"
        className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
