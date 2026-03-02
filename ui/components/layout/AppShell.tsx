// components/layout/AppShell.tsx

"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { NewProjectModal } from "@/components/ui/NewProjectModal";
import { ProjectTemplate } from "@/types";

type AppShellActions = {
  openNewProject: () => void;
};

const AppShellActionsContext = createContext<AppShellActions | null>(null);

export function useAppShellActions(): AppShellActions {
  const value = useContext(AppShellActionsContext);
  if (!value) {
    throw new Error("useAppShellActions must be used inside AppShell.");
  }
  return value;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [showNewProject, setShowNewProject] = useState(false);
  const actions = useMemo<AppShellActions>(
    () => ({
      openNewProject: () => setShowNewProject(true),
    }),
    []
  );

  async function handleCreateProject(
    title: string,
    format: "markdown" | "latex",
    template: ProjectTemplate
  ) {
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, format, template }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error(data.error || "Failed to create project.");
      }

      setShowNewProject(false);
      router.push(`/project/${data.project.id}`);
    } catch (error) {
      console.error(error);
    }
  }

  async function handleImportProject(file: File, title?: string) {
    try {
      const body = new FormData();
      body.set("file", file);
      if (title) {
        body.set("title", title);
      }
      const response = await fetch("/api/projects/import", {
        method: "POST",
        body,
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error(data.error || "Failed to import project.");
      }

      setShowNewProject(false);
      router.push(`/project/${data.project.id}`);
    } catch (error) {
      console.error(error);
    }
  }

  return (
    <AppShellActionsContext.Provider value={actions}>
      <div className="h-screen flex overflow-hidden bg-canvas">
        <Sidebar onNewProject={actions.openNewProject} />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>

        {showNewProject && (
          <NewProjectModal
            onClose={() => setShowNewProject(false)}
            onCreate={handleCreateProject}
            onImport={handleImportProject}
          />
        )}
      </div>
    </AppShellActionsContext.Provider>
  );
}
