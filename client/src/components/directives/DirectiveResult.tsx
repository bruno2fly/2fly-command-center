"use client";

import { useTheme } from "@/contexts/ThemeContext";
import Link from "next/link";
import type { ApiDirective } from "@/lib/api";

type Props = {
  directive: ApiDirective;
};

export function DirectiveResult({ directive }: Props) {
  const { isDark } = useTheme();
  const isDone = directive.status === "completed";
  const isFailed = directive.status === "failed";

  const cardBg = isDark ? "bg-[#0f172a] border-[#1a1810]" : "bg-white border-gray-200";
  const textCls = isDark ? "text-[#c4b8a8]" : "text-gray-900";

  return (
    <div className={`rounded-xl border p-4 ${cardBg}`}>
      <div className="flex items-center gap-2 mb-2">
        {isDone && <span className="text-lg">✅</span>}
        {isFailed && <span className="text-lg">❌</span>}
        <span className={`text-sm font-semibold ${textCls}`}>
          {isDone ? "Directive completed" : isFailed ? "Directive failed" : directive.status}
        </span>
      </div>
      {isDone && (
        <>
          {directive.contentCreated > 0 && (
            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              📝 Created {directive.contentCreated} content item{directive.contentCreated !== 1 ? "s" : ""}
            </p>
          )}
          {directive.tasksCreated > 0 && (
            <p className={`text-xs ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              ✔️ Created {directive.tasksCreated} task{directive.tasksCreated !== 1 ? "s" : ""}
            </p>
          )}
          {directive.clientName && (
            <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Client: {directive.clientName}
            </p>
          )}
          {directive.clientId && (
            <Link
              href={`/clients/${directive.clientId}`}
              className="inline-block mt-2 text-xs font-medium text-blue-500 hover:text-blue-400"
            >
              View Client →
            </Link>
          )}
        </>
      )}
      {isFailed && directive.result && (
        <p className={`text-xs ${isDark ? "text-red-400" : "text-red-600"}`}>{directive.result}</p>
      )}
    </div>
  );
}
