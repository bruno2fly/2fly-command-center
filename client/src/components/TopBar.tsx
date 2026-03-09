"use client";

export function TopBar() {
  const actionsNeeded = 6;

  return (
    <header className="bg-blue-600 text-white px-6 py-4 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">2Fly Agency Dashboard</h1>
        {actionsNeeded > 0 && (
          <span className="flex items-center gap-1.5 text-sm">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            {actionsNeeded} actions needed
          </span>
        )}
        <span className="text-sm text-blue-100">Getting Started</span>
      </div>
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button className="relative p-1.5 rounded hover:bg-blue-500 transition-colors">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {actionsNeeded > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-[10px] font-bold flex items-center justify-center">
              {actionsNeeded}
            </span>
          )}
        </button>
        <button className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
          View as Client
        </button>
        <span className="px-3 py-1.5 bg-white/10 rounded-lg text-sm font-medium">
          2flyflow
        </span>
        <button className="p-1.5 rounded hover:bg-blue-500 transition-colors">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
        <button className="px-4 py-2 bg-white text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors">
          Logout
        </button>
      </div>
    </header>
  );
}
