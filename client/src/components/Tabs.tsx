"use client";

type Tab = {
  id: string;
  label: string;
  icon?: React.ReactNode;
};

type Props = {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
};

export function Tabs({ tabs, activeTab, onTabChange }: Props) {
  return (
    <nav className="flex gap-6 border-b border-gray-200 bg-transparent px-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-1.5 py-4 px-1 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === tab.id
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </nav>
  );
}
