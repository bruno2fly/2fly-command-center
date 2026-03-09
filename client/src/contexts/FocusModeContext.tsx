"use client";

import { createContext, useContext, useState } from "react";

type FocusModeContextType = {
  focusMode: boolean;
  setFocusMode: (v: boolean) => void;
};

const FocusModeContext = createContext<FocusModeContextType | null>(null);

export function FocusModeProvider({ children }: { children: React.ReactNode }) {
  const [focusMode, setFocusMode] = useState(true);
  return (
    <FocusModeContext.Provider value={{ focusMode, setFocusMode }}>
      {children}
    </FocusModeContext.Provider>
  );
}

export function useFocusMode() {
  const ctx = useContext(FocusModeContext);
  if (!ctx) return { focusMode: false, setFocusMode: () => {} };
  return ctx;
}
