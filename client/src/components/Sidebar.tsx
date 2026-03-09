"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/clients", label: "Clients", icon: "👥" },
];

export function Sidebar() {
  const pathname = usePathname() ?? "";

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col min-h-screen shrink-0">
      <div className="p-5 border-b border-gray-800">
        <h1 className="text-lg font-bold tracking-tight">2Fly</h1>
        <p className="text-xs text-gray-500 mt-0.5">Command Center</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-gray-800 text-white font-medium"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-800 text-xs text-gray-600">
        v1.0 — Built for Bruno
      </div>
    </aside>
  );
}
