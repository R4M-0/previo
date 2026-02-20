// app/dashboard/page.tsx

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderOpen,
  Hash,
  Clock,
  Users,
  ArrowUpRight,
  FileCode2,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { formatRelativeDate } from "@/lib/date";
import { Project, User } from "@/types";

function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(`/project/${project.id}`)}
      className="group bg-white border border-stone-200 rounded-xl p-4 cursor-pointer hover:border-stone-300 hover:shadow-md transition-all duration-200 animate-slide-up opacity-0"
      style={{ animationFillMode: "forwards" }}
    >
      {/* Format badge + actions */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold uppercase tracking-widest px-2 py-0.5 rounded-md ${
            project.format === "latex"
              ? "bg-amber-50 text-amber-600 border border-amber-200"
              : "bg-stone-100 text-stone-500 border border-stone-200"
          }`}
        >
          {project.format === "latex" ? (
            <FileCode2 className="w-3 h-3" />
          ) : (
            <Hash className="w-3 h-3" />
          )}
          {project.format === "latex" ? "LaTeX" : "Markdown"}
        </span>

        <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-ink leading-snug mb-3 line-clamp-2 group-hover:text-amber-700 transition-colors">
        {project.title}
      </h3>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-stone-400">
          <Clock className="w-3 h-3" />
          <span className="text-xs">{formatRelativeDate(project.updatedAt)}</span>
        </div>

        {project.collaborators.length > 0 && (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1.5">
              {project.collaborators.slice(0, 3).map((c) => (
                <div
                  key={c.id}
                  className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white"
                  style={{ backgroundColor: c.color }}
                  title={c.name}
                >
                  {c.name[0]}
                </div>
              ))}
            </div>
            {project.collaborators.length > 3 && (
              <span className="text-[10px] text-stone-400">+{project.collaborators.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [projectsRes, meRes] = await Promise.all([
          fetch("/api/projects"),
          fetch("/api/me"),
        ]);
        const projectsData = await projectsRes.json();
        const meData = await meRes.json();
        if (projectsRes.ok) setProjects(projectsData.projects || []);
        if (meRes.ok) setUser(meData.user || null);
      } catch {
        // Keep the dashboard rendered with empty state.
      }
    }
    void loadData();
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Writer";
  const latestProject = projects[0];

  const markdownCount = projects.filter((p) => p.format === "markdown").length;
  const latexCount = projects.filter((p) => p.format === "latex").length;
  const totalCollabs = new Set(
    projects.flatMap((p) => p.collaborators.map((c) => c.id))
  ).size;

  return (
    <AppShell>
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-8 py-10">
          {/* Header */}
          <div className="mb-10 animate-fade-in opacity-0" style={{ animationFillMode: "forwards" }}>
            <p className="text-sm text-stone-400 font-mono mb-1">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            <h1 className="font-display text-4xl text-ink">
              Welcome back, {firstName}
            </h1>
            <p className="text-stone-500 mt-2 text-sm">
              Pick up where you left off, or start something new.
            </p>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-4 mb-10">
            <Link href={latestProject ? `/project/${latestProject.id}` : "/dashboard"}>
              <div className="group bg-ink text-white rounded-xl p-5 cursor-pointer hover:bg-stone-800 transition-all animate-slide-up opacity-0 animation-delay-100" style={{ animationFillMode: "forwards" }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-white" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-stone-500 group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <p className="font-semibold text-sm mb-0.5">Continue editing</p>
                <p className="text-xs text-stone-400 line-clamp-1">
                  {latestProject ? latestProject.title : "No projects yet"}
                </p>
              </div>
            </Link>

            <button
              onClick={() => router.push("/dashboard")}
              className="group bg-white border border-stone-200 rounded-xl p-5 text-left cursor-pointer hover:border-stone-300 hover:shadow-md transition-all animate-slide-up opacity-0 animation-delay-200"
              style={{ animationFillMode: "forwards" }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 bg-stone-100 rounded-lg flex items-center justify-center">
                  <Plus className="w-5 h-5 text-ink" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-stone-300 group-hover:text-amber-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <p className="font-semibold text-sm text-ink mb-0.5">New project</p>
              <p className="text-xs text-stone-400">Start from scratch</p>
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-10">
            {[
              { label: "Total projects", value: projects.length, icon: "📁" },
              { label: "Collaborators", value: totalCollabs, icon: "👥" },
              { label: "LaTeX / Markdown", value: `${latexCount} / ${markdownCount}`, icon: "📄" },
            ].map(({ label, value, icon }, i) => (
              <div
                key={i}
                className="bg-white border border-stone-200 rounded-xl px-4 py-3 animate-slide-up opacity-0"
                style={{ animationFillMode: "forwards", animationDelay: `${i * 80 + 300}ms` }}
              >
                <p className="text-xs text-stone-400 mb-1">{icon} {label}</p>
                <p className="font-display text-2xl text-ink">{value}</p>
              </div>
            ))}
          </div>

          {/* Recent projects */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-xl text-ink">Recent projects</h2>
              <span className="text-xs text-stone-400 font-mono">{projects.length} projects</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {projects.map((project, i) => (
                <div
                  key={project.id}
                  style={{ animationDelay: `${i * 80 + 400}ms` }}
                >
                  <ProjectCard project={project} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
