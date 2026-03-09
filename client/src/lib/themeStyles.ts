/**
 * Theme-aware style helpers for dark/light mode.
 * Use with useTheme() isDark.
 */

export const panel = {
  dark: "bg-[#0a0a0e] border-[#1a1810]",
  light: "bg-white border-gray-100",
};

export const panelInner = {
  dark: "bg-[#0c0c10] border-[#1a1810]",
  light: "bg-gray-50 border-gray-100",
};

export const text = {
  primary: { dark: "text-[#c4b8a8]", light: "text-gray-900" },
  secondary: { dark: "text-[#8a7e6d]", light: "text-gray-600" },
  muted: { dark: "text-[#5a5040]", light: "text-gray-500" },
};

export const input = {
  dark: "bg-[#0a0a0e] border-[#1a1810] text-[#c4b8a8] placeholder-[#5a5040]",
  light: "border-gray-200 placeholder-gray-400",
};

export const button = {
  tabActive: {
    dark: "bg-emerald-500/20 text-emerald-400",
    light: "bg-blue-100 text-blue-700",
  },
  tabInactive: {
    dark: "bg-[#141210] text-[#8a7e6d] hover:bg-[#1a1810] hover:text-[#c4b8a8]",
    light: "bg-gray-100 text-gray-600 hover:bg-gray-200",
  },
};

export const tagColors: {
  light: Record<string, string>;
  dark: Record<string, string>;
} = {
  light: {
    urgent: "bg-red-100 text-red-700",
    approval: "bg-amber-100 text-amber-700",
    payment: "bg-emerald-100 text-emerald-700",
    content: "bg-blue-100 text-blue-700",
    ads: "bg-purple-100 text-purple-700",
    support: "bg-gray-100 text-gray-700",
  },
  dark: {
    urgent: "bg-red-500/20 text-red-400",
    approval: "bg-amber-500/20 text-amber-400",
    payment: "bg-emerald-500/20 text-emerald-400",
    content: "bg-blue-500/20 text-blue-400",
    ads: "bg-purple-500/20 text-purple-400",
    support: "bg-[#1a1810] text-[#8a7e6d]",
  },
};
