"use client";

interface AgentStatusBadgeProps {
  online: boolean;
  size?: "sm" | "md";
}

export function AgentStatusBadge({ online, size = "sm" }: AgentStatusBadgeProps) {
  const dim = size === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";

  return (
    <span className="relative inline-flex">
      {online && (
        <span
          className={`absolute inline-flex ${dim} rounded-full bg-emerald-400/40 animate-ping`}
        />
      )}
      <span
        className={`relative inline-flex ${dim} rounded-full ${
          online ? "bg-emerald-400" : "bg-gray-500"
        }`}
      />
    </span>
  );
}
