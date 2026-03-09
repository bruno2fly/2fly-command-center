"use client";

type Props = {
  name: string;
  avatarUrl?: string;
};

export function ClientHeaderCard({ name, avatarUrl }: Props) {
  return (
    <div className="bg-blue-600 rounded-t-xl px-6 py-6 flex items-center gap-4">
      <div className="w-14 h-14 rounded-lg bg-gray-300 flex items-center justify-center shrink-0 overflow-hidden">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-2xl font-bold text-gray-500">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>
      <div className="flex-1">
        <h1 className="text-2xl font-bold text-white">{name}</h1>
        <p className="text-sm text-blue-100 mt-0.5">
          Real-time status • Approvals • Requests
        </p>
      </div>
      <button className="p-2 rounded hover:bg-blue-500 text-white transition-colors">
        <svg
          className="w-5 h-5"
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="6" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="18" r="1.5" />
        </svg>
      </button>
    </div>
  );
}
