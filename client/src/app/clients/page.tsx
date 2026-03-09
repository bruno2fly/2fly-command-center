"use client";

import { useTheme } from "@/contexts/ThemeContext";
import { ClientTriageTable } from "@/components/ClientTriageTable";

export default function ClientsPage() {
  const { isDark } = useTheme();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className={`text-2xl font-bold ${isDark ? "text-[#c4b8a8]" : "text-gray-900"}`}>
          All Clients
        </h2>
        <p className={`text-sm mt-1 ${isDark ? "text-[#5a5040]" : "text-gray-500"}`}>
          Triage table · sorted by urgency
        </p>
      </div>

      <ClientTriageTable />
    </div>
  );
}
