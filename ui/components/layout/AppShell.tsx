// components/layout/AppShell.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { NewProjectModal } from "@/components/ui/NewProjectModal";

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [showNewProject, setShowNewProject] = useState(false);

  async function handleCreateProject(title: string, format: "markdown" | "latex") {
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, format }),
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
