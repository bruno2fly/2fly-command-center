"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "2fly-workspace";

export type WorkspaceId = "agency" | "saas";

type WorkspaceContextValue = {
  workspace: WorkspaceId;
  setWorkspace: (id: WorkspaceId) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspace, setWorkspaceState] = useState<WorkspaceId>("agency");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "agency" || stored === "saas") setWorkspaceState(stored);
    } catch {
      // ignore
    }
  }, []);

  const setWorkspace = useCallback((id: WorkspaceId) => {
    setWorkspaceState(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // ignore
    }
  }, []);

  const value: WorkspaceContextValue = { workspace, setWorkspace };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
