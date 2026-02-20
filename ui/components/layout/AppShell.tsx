// components/layout/AppShell.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { NewProjectModal } from "@/components/ui/NewProjectModal";
import { MOCK_PROJECTS } from "@/lib/mock";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [showNewProject, setShowNewProject] = useState(false);

  function handleCreateProject(title: string, format: "markdown" | "latex") {
    setShowNewProject(false);
    router.push(`/project/${MOCK_PROJECTS[0].id}`);
  }

  return (
    <div className="h-screen flex overflow-hidden bg-canvas">
      <Sidebar onNewProject={() => setShowNewProject(true)} />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>

      {showNewProject && (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreate={handleCreateProject}
        />
      )}
    </div>
  );
}
